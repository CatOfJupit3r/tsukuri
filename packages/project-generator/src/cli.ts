
import { cancel, confirm, intro, isCancel, multiselect, outro, text } from '@clack/prompts';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createProject, validateProjectName } from './create-project';
import { PROJECT_PARTS, parseProjectPart } from './project-options';
import type { ProjectPart } from './project-options';

interface iParsedArguments {
  isHelpRequested: boolean;
  outputPath?: string;
  projectName?: string;
  projectParts?: ProjectPart[];
  shouldIncludeStarter?: boolean;
}

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

class ProjectCreationCancelledError extends Error {}

function readFlagValue(arguments_: string[], argumentIndex: number, flagName: string): [string, number] {
  const argument = arguments_[argumentIndex];
  const inlineValue = argument?.startsWith(`${flagName}=`) ? argument.slice(flagName.length + 1) : undefined;
  if (inlineValue) return [inlineValue, argumentIndex];

  const nextArgument = arguments_[argumentIndex + 1];
  if (!nextArgument || nextArgument.startsWith('-')) throw new Error(`${flagName} requires a value.`);
  return [nextArgument, argumentIndex + 1];
}

function parseArguments(arguments_: string[]): iParsedArguments {
  const parsedArguments: iParsedArguments = { isHelpRequested: false };

  for (let argumentIndex = 0; argumentIndex < arguments_.length; argumentIndex += 1) {
    const argument = arguments_[argumentIndex];
    if (!argument) continue;

    if (argument === '--help' || argument === '-h') {
      parsedArguments.isHelpRequested = true;
    } else if (argument === '--starter') {
      parsedArguments.shouldIncludeStarter = true;
    } else if (argument === '--minimal') {
      parsedArguments.shouldIncludeStarter = false;
    } else if (argument === '--parts' || argument.startsWith('--parts=')) {
      const [partsValue, consumedIndex] = readFlagValue(arguments_, argumentIndex, '--parts');
      parsedArguments.projectParts = partsValue.split(/[,\s]+/).map((part) => parseProjectPart(part.trim()));
      argumentIndex = consumedIndex;
    } else if (argument === '--output' || argument.startsWith('--output=')) {
      const [outputPath, consumedIndex] = readFlagValue(arguments_, argumentIndex, '--output');
      parsedArguments.outputPath = outputPath;
      argumentIndex = consumedIndex;
    } else if (argument.startsWith('-')) {
      throw new Error(`Unknown option: ${argument}`);
    } else if (!parsedArguments.projectName) {
      parsedArguments.projectName = argument;
    } else {
      throw new Error(`Unexpected argument: ${argument}`);
    }
  }

  return parsedArguments;
}

function printHelp() {
  process.stdout.write(`Usage: pnpm run create -- [project-name] [options]\n\nOptions:\n  --parts <server,web>  Applications to include (default: server,web)\n  --starter             Include auth and domain starter boilerplate\n  --minimal             Generate the bare foundation\n  --output <path>       Exact destination (default: sibling of this repository)\n  -h, --help            Show this help\n`);
}

function unwrapPromptResult<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel('Project creation cancelled.');
    throw new ProjectCreationCancelledError();
  }
  return value;
}

async function collectOptions(parsedArguments: iParsedArguments) {
  intro('Create a project');

  const projectName =
    parsedArguments.projectName ??
    unwrapPromptResult(
      await text({
        message: 'What is the project name?',
        placeholder: 'my-project',
        validate: (value) => validateProjectName(value ?? ''),
      }),
    );

  const projectParts =
    parsedArguments.projectParts ??
    unwrapPromptResult(
      await multiselect({
        message: 'Which applications should be included?',
        options: [
          { value: PROJECT_PARTS.SERVER, label: 'Server', hint: 'Hono API' },
          { value: PROJECT_PARTS.WEB, label: 'Web', hint: 'React + TanStack Router' },
        ],
        initialValues: [PROJECT_PARTS.SERVER, PROJECT_PARTS.WEB],
        required: true,
      }),
    );

  const shouldIncludeStarter =
    parsedArguments.shouldIncludeStarter ??
    unwrapPromptResult(
      await confirm({
        message: 'Include the starter project boilerplate?',
        initialValue: true,
      }),
    );

  const normalizedProjectName = projectName.trim();
  const targetRoot = parsedArguments.outputPath
    ? path.resolve(parsedArguments.outputPath)
    : path.resolve(sourceRoot, '..', normalizedProjectName);

  return {
    projectName: normalizedProjectName,
    projectParts,
    shouldIncludeStarter,
    sourceRoot,
    targetRoot,
  };
}

async function main() {
  const parsedArguments = parseArguments(process.argv.slice(2));
  if (parsedArguments.isHelpRequested) {
    printHelp();
    return;
  }

  const options = await collectOptions(parsedArguments);
  const createdProject = await createProject(options);

  outro(`Created ${createdProject.projectName} at ${createdProject.targetRoot}\nNext:\n  cd "${createdProject.targetRoot}"\n  pnpm install`);
}

main().catch((error: unknown) => {
  if (error instanceof ProjectCreationCancelledError) return;
  cancel(error instanceof Error ? error.message : 'Project creation failed.');
  process.exitCode = 1;
});
