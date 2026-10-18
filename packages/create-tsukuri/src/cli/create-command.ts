import { em } from 'enumwaii';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { inject, injectable } from 'tsyringe';

import { GeneratorError } from '@~/engine/generator-error';
import type { iResolvedModules } from '@~/engine/module-resolver';
import { ModuleResolver } from '@~/engine/module-resolver';
import { ProjectGenerator } from '@~/engine/project-generator';
import { getProjectNameProblem } from '@~/engine/project-identity';
import { ProjectTargetGuard } from '@~/engine/project-target-guard';
import { GENERATOR_ERROR_CODES } from '@~/enums/generator-error-codes.enums';
import type { ModuleId } from '@~/enums/module-ids.enums';
import type { PromptId } from '@~/enums/prompt-ids.enums';
import { PROMPT_META, promptIdsEnumwaii } from '@~/enums/prompt-ids.enums';
import type { SkillId } from '@~/enums/skill-ids.enums';

import { renderCreateCommandLine } from './command-line';
import { COMMAND_RUNNER_TOKEN } from './command-runner';
import type { iCommandRunner } from './command-runner';
import type { iCreateArgs } from './create-args';
import { parseCreateArgs } from './create-args';
import { renderCreateHelp } from './create-help';
import { CWD_TOKEN } from './cwd';
import type { iPromptAnswers } from './presets';
import { PRESETS } from './presets';
import { PROMPTER_TOKEN } from './prompter';
import type { iPrompter } from './prompter';
import { SelectionPlanner } from './selection-planner';

const summaryActionsEnumwaii = em(['CREATE', 'CHANGE', 'CANCEL']);
const SUMMARY_ACTIONS = summaryActionsEnumwaii.enum;
type SummaryAction = (typeof summaryActionsEnumwaii)['~type'];

const DEFAULT_DIRECTORY = 'my-app';

interface iCreatePlan {
  directory: string;
  targetDir: string;
  projectName: string;
  /** Answers per prompt that was asked or answered by a flag or preset. */
  answers: iPromptAnswers;
  resolved: iResolvedModules;
  excludedSkills: SkillId[];
  shouldInitGit: boolean;
  shouldInstall: boolean;
  shouldVerify: boolean;
}

async function isEmptyOrMissing(directory: string) {
  try {
    return (await readdir(directory)).length === 0;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return true;
    throw error;
  }
}

/**
 * Interactive-first `create`: every choice is a prompt, every prompt has a flag, and a prompt is
 * skipped only when its flag (or the preset) answers it. Nothing is written until the summary is
 * confirmed, so cancelling at any point leaves the disk untouched.
 */
@injectable()
export class CreateCommand {
  constructor(
    private readonly planner: SelectionPlanner,
    private readonly resolver: ModuleResolver,
    private readonly generator: ProjectGenerator,
    private readonly targetGuard: ProjectTargetGuard,
    @inject(PROMPTER_TOKEN) private readonly prompter: iPrompter,
    @inject(COMMAND_RUNNER_TOKEN) private readonly runner: iCommandRunner,
    @inject(CWD_TOKEN) private readonly cwd: string,
  ) {}

  public async run(argv: string[]) {
    const args = parseCreateArgs(argv);
    if (args.isHelp) {
      this.prompter.info(renderCreateHelp());
      return null;
    }

    this.prompter.intro('create-tsukuri');
    const plan = await this.confirmPlan(args);

    const spinner = this.prompter.spinner();
    spinner.start(`Writing ${plan.directory}`);
    await this.generator.create({
      targetDir: plan.targetDir,
      projectName: plan.projectName,
      modules: plan.resolved.modules.map((manifest) => manifest.id),
      excludedSkills: plan.excludedSkills,
    });
    spinner.stop(`Wrote ${plan.directory}`);

    await this.runPostSteps(plan);
    this.prompter.outro(`Done. Next: cd "${plan.targetDir}"`);
    return plan;
  }

  private async confirmPlan(args: iCreateArgs) {
    let previous: iCreatePlan | null = null;

    for (;;) {
      const plan = await this.collect(args, previous);
      if (!plan) continue;

      this.prompter.note(this.renderSummary(plan), 'Summary');
      if (args.isYes) return plan;

      const action = await this.prompter.select<SummaryAction>({
        message: 'Create the project?',
        options: [
          { value: SUMMARY_ACTIONS.CREATE, label: 'Create it' },
          { value: SUMMARY_ACTIONS.CHANGE, label: 'Change answers' },
          { value: SUMMARY_ACTIONS.CANCEL, label: 'Cancel' },
        ],
        initialValue: SUMMARY_ACTIONS.CREATE,
      });
      if (action === SUMMARY_ACTIONS.CREATE) return plan;
      if (action === SUMMARY_ACTIONS.CANCEL) {
        throw new GeneratorError(GENERATOR_ERROR_CODES.CANCELLED, 'Cancelled; nothing was written');
      }
      previous = plan;
    }
  }

  /** Runs every prompt once; returns null when the answers do not combine and should be asked again. */
  private async collect(args: iCreateArgs, previous: iCreatePlan | null): Promise<iCreatePlan | null> {
    const directory = await this.askDirectory(args, previous);
    const given: iPromptAnswers = new Map([
      ...(args.preset ? PRESETS.get(args.preset).answers : new Map()),
      ...args.answers,
    ]);
    const answers: iPromptAnswers = new Map();
    const selected: ModuleId[] = [];

    for (const promptId of promptIdsEnumwaii.values) {
      const answer = await this.answerPrompt(promptId, given.get(promptId), selected, args, previous);
      if (answer === null) continue;
      answers.set(promptId, answer);
      selected.push(...answer);
    }

    let resolved: iResolvedModules;
    try {
      resolved = this.resolver.resolve(selected);
    } catch (error) {
      const isInteractive = !args.isYes && error instanceof GeneratorError;
      if (!isInteractive || error.code !== GENERATOR_ERROR_CODES.MISSING_CAPABILITY) throw error;
      this.prompter.error(error.message);
      return null;
    }

    return {
      directory,
      targetDir: path.resolve(this.cwd, directory),
      projectName: path.basename(directory),
      answers,
      resolved,
      excludedSkills: await this.askSkills(args, resolved, previous),
      shouldInitGit: await this.askStep(
        args.shouldInitGit,
        args,
        'Initialize a git repository?',
        true,
        previous?.shouldInitGit,
      ),
      ...(await this.askInstallAndVerify(args, previous)),
    };
  }

  private async askDirectory(args: iCreateArgs, previous: iCreatePlan | null) {
    const problemOf = async (value: string) => {
      const nameProblem = getProjectNameProblem(path.basename(value));
      if (nameProblem) return nameProblem;
      const targetDir = path.resolve(this.cwd, value);
      const targetProblem = this.targetGuard.getTargetProblem(targetDir);
      if (targetProblem) return targetProblem;
      return (await isEmptyOrMissing(targetDir)) ? undefined : `"${value}" is not empty`;
    };

    if (args.directory !== null || args.isYes) {
      const directory = args.directory ?? DEFAULT_DIRECTORY;
      const problem = await problemOf(directory);
      if (problem) throw new GeneratorError(GENERATOR_ERROR_CODES.INVALID_ARGUMENTS, problem);
      return directory;
    }

    for (;;) {
      const answer = await this.prompter.text({
        message: 'Project name (folder to create)',
        defaultValue: previous?.directory ?? DEFAULT_DIRECTORY,
        validate: (value) => getProjectNameProblem(path.basename(value.trim())) ?? undefined,
      });
      const directory = answer.trim();
      const problem = await problemOf(directory);
      if (!problem) return directory;
      this.prompter.error(problem);
    }
  }

  /** Returns the modules chosen for a prompt, or null when the prompt has nothing to offer. */
  private async answerPrompt(
    promptId: PromptId,
    given: ModuleId[] | undefined,
    selected: readonly ModuleId[],
    args: iCreateArgs,
    previous: iCreatePlan | null,
  ): Promise<ModuleId[] | null> {
    const meta = PROMPT_META.get(promptId);
    const { options, locked } = this.planner.choicesFor(promptId, selected);

    if (given !== undefined) {
      this.planner.assertAnswer(promptId, given, selected);
      return given;
    }

    if (locked.length > 0) {
      this.prompter.info(
        `${meta.message}: ${locked.map((manifest) => manifest.name).join(', ')} (required by earlier choices)`,
      );
      if (!meta.isMultiple) return null;
    }
    if (options.length === 0) return null;
    if (args.isYes) return [];

    const previousAnswer = previous?.answers.get(promptId) ?? [];
    const toOption = (manifest: (typeof options)[number]) => ({
      value: manifest.id,
      label: manifest.name,
      hint: manifest.description,
    });

    if (meta.isMultiple) {
      return this.prompter.multiselect({
        message: meta.message,
        options: options.map(toOption),
        initialValues: previousAnswer.filter((id) => options.some((manifest) => manifest.id === id)),
      });
    }

    const choice = await this.prompter.select<ModuleId | null>({
      message: meta.message,
      options: [{ value: null, label: meta.noneLabel }, ...options.map(toOption)],
      initialValue: previousAnswer[0] ?? null,
    });
    return choice === null ? [] : [choice];
  }

  private async askSkills(args: iCreateArgs, resolved: iResolvedModules, previous: iCreatePlan | null) {
    const applicable = this.planner.applicableSkills(resolved.modules);

    if (args.skills) {
      const unknown = args.skills.filter((id) => !applicable.includes(id));
      if (unknown.length > 0) this.prompter.warn(`Not shipped by the selected modules: ${unknown.join(', ')}`);
      return applicable.filter((id) => !args.skills?.includes(id));
    }
    if (args.excludedSkills) return applicable.filter((id) => args.excludedSkills?.includes(id));
    if (args.isYes || applicable.length === 0) return [];

    const excludedBefore = previous?.excludedSkills ?? [];
    const chosen = await this.prompter.multiselect({
      message: 'Agent skills to include',
      options: applicable.map((id) => ({ value: id, label: id })),
      initialValues: applicable.filter((id) => !excludedBefore.includes(id)),
    });
    return applicable.filter((id) => !chosen.includes(id));
  }

  private async askStep(
    flag: boolean | null,
    args: iCreateArgs,
    message: string,
    defaultValue: boolean,
    previous: boolean | undefined,
  ) {
    if (flag !== null) return flag;
    if (args.isYes) return defaultValue;
    return this.prompter.confirm({ message, initialValue: previous ?? defaultValue });
  }

  private async askInstallAndVerify(args: iCreateArgs, previous: iCreatePlan | null) {
    const shouldInstall = await this.askStep(
      args.shouldInstall,
      args,
      'Install dependencies with pnpm?',
      true,
      previous?.shouldInstall,
    );
    if (!shouldInstall) {
      if (args.shouldVerify === true) {
        throw new GeneratorError(GENERATOR_ERROR_CODES.INVALID_ARGUMENTS, '--verify needs --install');
      }
      return { shouldInstall, shouldVerify: false };
    }

    const shouldVerify = await this.askStep(
      args.shouldVerify,
      args,
      'Run pnpm run verify afterwards?',
      false,
      previous?.shouldVerify,
    );
    return { shouldInstall, shouldVerify };
  }

  private renderSummary(plan: iCreatePlan) {
    const added = new Set(plan.resolved.addedIds);
    const modules = plan.resolved.modules.map(
      (manifest) => `  ${manifest.id}${added.has(manifest.id) ? ' (required)' : ''} - ${manifest.name}`,
    );
    const skills = this.planner
      .applicableSkills(plan.resolved.modules)
      .filter((id) => !plan.excludedSkills.includes(id));

    return [
      `Folder:  ${plan.targetDir}`,
      `Modules:`,
      ...modules,
      `Skills:  ${skills.length > 0 ? skills.join(', ') : 'none'}`,
      `Steps:   ${[plan.shouldInitGit && 'git init', plan.shouldInstall && 'pnpm install', plan.shouldVerify && 'pnpm run verify'].filter(Boolean).join(', ') || 'none'}`,
      '',
      'Same result without prompts:',
      renderCreateCommandLine(plan),
    ].join('\n');
  }

  private async runPostSteps(plan: iCreatePlan) {
    const steps: [boolean, string, string[]][] = [
      [plan.shouldInitGit, 'git', ['init', '--quiet']],
      [plan.shouldInstall, 'pnpm', ['install']],
      [plan.shouldVerify, 'pnpm', ['run', 'verify']],
    ];

    for (const [shouldRun, command, commandArgs] of steps) {
      if (!shouldRun) continue;
      const exitCode = await this.runner.run(command, commandArgs, plan.targetDir);
      if (exitCode !== 0) {
        this.prompter.warn(
          `\`${command} ${commandArgs.join(' ')}\` exited with ${exitCode}; the project is written, finish this step by hand.`,
        );
        return;
      }
    }
  }
}
