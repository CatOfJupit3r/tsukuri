import path from 'node:path';
import { parseArgs } from 'node:util';
import { inject, injectable } from 'tsyringe';

import { GeneratorError } from '#~/engine/generator-error';
import { ProjectUpdater } from '#~/engine/project-updater';
import type { iUpdatePlan } from '#~/engine/project-updater';
import { FILE_CHANGE_KINDS, FILE_CHANGE_MARKERS } from '#~/enums/file-change-kinds.enums';
import { GENERATOR_ERROR_CODES } from '#~/enums/generator-error-codes.enums';
import type { ModifyAction } from '#~/enums/modify-actions.enums';
import { MODIFY_ACTIONS } from '#~/enums/modify-actions.enums';
import { moduleIdSchema } from '#~/enums/module-ids.enums';
import type { ModuleId } from '#~/enums/module-ids.enums';
import { skillIdSchema } from '#~/enums/skill-ids.enums';
import { ProjectRecordEditor } from '#~/record/project-record-editor';
import { ProjectRecordStore } from '#~/record/project-record-store';
import type { iProjectRecord } from '#~/record/project-record.schema';

import { CWD_TOKEN } from './cwd';
import { PROMPTER_TOKEN } from './prompter';
import type { iPrompter } from './prompter';

const SKILL_TARGET = 'skill';
const PACKAGE_MANIFESTS = new Set(['package.json', 'pnpm-workspace.yaml']);

interface iModifyArgs {
  isSkill: boolean;
  ids: string[];
  projectDir: string;
  isDryRun: boolean;
  isYes: boolean;
}

function invalid(message: string): never {
  throw new GeneratorError(GENERATOR_ERROR_CODES.INVALID_ARGUMENTS, message);
}

function parseWith<T>(raw: string, schema: { safeParse: (value: unknown) => { success: boolean; data?: T } }) {
  const parsed = schema.safeParse(raw);
  if (!parsed.success || parsed.data === undefined) invalid(`"${raw}" is not a known id`);
  return parsed.data;
}

export function renderPlan(plan: iUpdatePlan) {
  if (plan.changes.length === 0) return 'Nothing to change.';
  return plan.changes
    .map(
      (change) =>
        `${FILE_CHANGE_MARKERS.get(change.kind)} ${change.path}${change.detail ? `  (${change.detail})` : ''}`,
    )
    .join('\n');
}

/**
 * `add` / `remove` for modules and skills in an existing project. Computes the next module
 * record, shows the planned file changes, and applies them unless `--dry-run` is given.
 */
@injectable()
export class ModifyCommand {
  constructor(
    private readonly store: ProjectRecordStore,
    private readonly editor: ProjectRecordEditor,
    private readonly updater: ProjectUpdater,
    @inject(PROMPTER_TOKEN) private readonly prompter: iPrompter,
    @inject(CWD_TOKEN) private readonly cwd: string,
  ) {}

  public async run(action: ModifyAction, argv: string[]) {
    const args = this.parse(argv);
    this.prompter.intro(`create-tsukuri ${action}`);

    const record = await this.store.read(args.projectDir);
    const next = args.isSkill
      ? this.nextForSkills(action, record, args)
      : await this.nextForModules(action, record, args);
    if (!next) return null;

    const plan = await this.updater.plan(args.projectDir, record, next);
    this.prompter.note(renderPlan(plan), args.isDryRun ? 'Planned changes (dry run)' : 'Planned changes');
    if (args.isDryRun || plan.changes.length === 0) return plan;

    const conflicts = plan.changes.filter((change) => change.kind === FILE_CHANGE_KINDS.CONFLICT);
    if (conflicts.length > 0) {
      this.prompter.warn(
        `${conflicts.length} file(s) changed locally are left alone; compare them with the module by hand.`,
      );
    }

    const isConfirmed =
      args.isYes || (await this.prompter.confirm({ message: 'Apply these changes?', initialValue: true }));
    if (!isConfirmed) throw new GeneratorError(GENERATOR_ERROR_CODES.CANCELLED, 'Cancelled; nothing was changed');

    await this.updater.apply(args.projectDir, plan);
    const shouldInstall = plan.changes.some(
      (change) => change.kind !== FILE_CHANGE_KINDS.CONFLICT && PACKAGE_MANIFESTS.has(path.posix.basename(change.path)),
    );
    this.prompter.outro(shouldInstall ? 'Done. Run pnpm install.' : 'Done.');
    return plan;
  }

  private parse(argv: string[]): iModifyArgs {
    let parsed;
    try {
      parsed = parseArgs({
        args: argv,
        allowPositionals: true,
        strict: true,
        options: {
          'dry-run': { type: 'boolean' },
          yes: { type: 'boolean', short: 'y' },
          dir: { type: 'string' },
        },
      });
    } catch (error) {
      invalid(error instanceof Error ? error.message : String(error));
    }

    const [first, ...rest] = parsed.positionals;
    const isSkill = first === SKILL_TARGET;
    return {
      isSkill,
      ids: isSkill ? rest : parsed.positionals,
      projectDir: path.resolve(this.cwd, parsed.values.dir ?? '.'),
      isDryRun: parsed.values['dry-run'] === true,
      isYes: parsed.values.yes === true,
    };
  }

  private nextForSkills(action: ModifyAction, record: iProjectRecord, args: iModifyArgs) {
    if (args.ids.length === 0) invalid(`Usage: ${action} skill <id...>`);
    const ids = args.ids.map((raw) => parseWith(raw, skillIdSchema));
    return action === MODIFY_ACTIONS.ADD
      ? this.editor.withSkillsIncluded(record, ids)
      : this.editor.withSkillsExcluded(record, ids);
  }

  private async nextForModules(action: ModifyAction, record: iProjectRecord, args: iModifyArgs) {
    let ids: ModuleId[] = args.ids.map((raw) => parseWith(raw, moduleIdSchema));

    if (ids.length === 0) {
      if (action === MODIFY_ACTIONS.REMOVE || args.isYes) invalid(`Usage: ${action} <module...>`);
      const addable = this.editor.addableModules(record);
      if (addable.length === 0) {
        this.prompter.info('Every compatible module is already installed.');
        return null;
      }
      ids = await this.prompter.multiselect({
        message: 'Modules to add',
        options: addable.map((manifest) => ({ value: manifest.id, label: manifest.name, hint: manifest.description })),
        initialValues: [],
      });
      if (ids.length === 0) return null;
    }

    return action === MODIFY_ACTIONS.ADD
      ? this.editor.withModulesAdded(record, ids)
      : this.editor.withModulesRemoved(record, ids);
  }
}
