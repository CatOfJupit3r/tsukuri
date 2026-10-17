import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import z from 'zod';

import { PROJECT_PARTS } from './project-options';
import type { ProjectPart } from './project-options';

export interface iCreateProjectOptions {
  projectName: string;
  projectParts: ProjectPart[];
  shouldIncludeStarter: boolean;
  sourceRoot: string;
  targetRoot: string;
}

export interface iCreatedProject {
  projectName: string;
  projectParts: ProjectPart[];
  shouldIncludeStarter: boolean;
  targetRoot: string;
}

const PROJECT_NAME_PATTERN = /^(?![.-])[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const TEXT_FILE_EXTENSIONS = new Set([
  '',
  '.cjs',
  '.css',
  '.env',
  '.example',
  '.html',
  '.js',
  '.json',
  '.jsonc',
  '.md',
  '.mjs',
  '.sql',
  '.svg',
  '.ts',
  '.tsx',
  '.txt',
  '.webmanifest',
  '.yaml',
  '.yml',
]);
const EXCLUDED_DIRECTORY_NAMES = new Set([
  '.codex',
  '.git',
  '.pnpm-store',
  '.turbo',
  'coverage',
  'dist',
  'node_modules',
  'postgres-data',
]);
const EXCLUDED_ROOT_FILES = new Set(['pnpm-lock.yaml']);
const COPYABLE_ENVIRONMENT_FILES = new Set(['.env.example', '.env.test']);
const rootPackageSchema = z
  .object({
    name: z.string(),
    scripts: z.record(z.string(), z.string()),
  })
  .loose();

function hasProjectPart(projectParts: ProjectPart[], projectPart: ProjectPart): boolean {
  return projectParts.includes(projectPart);
}

export function validateProjectName(projectName: string): string | undefined {
  if (projectName.length === 0) return 'Enter a project name.';
  if (projectName.length > 214) return 'Project names must be 214 characters or fewer.';
  if (!PROJECT_NAME_PATTERN.test(projectName)) {
    return 'Use lowercase letters, numbers, dots, hyphens, or underscores.';
  }
  return undefined;
}

function isPathInside(parentPath: string, candidatePath: string): boolean {
  const relativePath = path.relative(parentPath, candidatePath);
  return relativePath !== '' && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

function shouldCopyPath(relativePath: string, options: iCreateProjectOptions): boolean {
  const normalizedPath = relativePath.split(path.sep).join('/');
  const pathSegments = normalizedPath.split('/');
  const fileName = pathSegments[pathSegments.length - 1] ?? '';

  if (pathSegments.some((segment) => EXCLUDED_DIRECTORY_NAMES.has(segment))) return false;
  if (pathSegments[0] === 'packages' && pathSegments[1] === 'project-generator') return false;
  if (pathSegments[0] === 'mongo' && pathSegments[1] === 'data') return false;
  if (normalizedPath === '.claude/settings.local.json') return false;
  if (pathSegments.length === 1 && EXCLUDED_ROOT_FILES.has(fileName)) return false;
  if ((fileName.startsWith('.env') || fileName.endsWith('.env')) && !COPYABLE_ENVIRONMENT_FILES.has(fileName)) {
    return false;
  }

  const hasServer = hasProjectPart(options.projectParts, PROJECT_PARTS.SERVER);
  const hasWeb = hasProjectPart(options.projectParts, PROJECT_PARTS.WEB);

  if (!hasServer && (pathSegments[0] === 'mongo' || normalizedPath === 'docker-compose.dev.yml')) return false;
  if (!hasServer && normalizedPath.startsWith('apps/server')) return false;
  if (!hasWeb && normalizedPath.startsWith('apps/web')) return false;

  return true;
}

async function copySource(options: iCreateProjectOptions) {
  const sourceEntries = await readdir(options.sourceRoot);

  await mkdir(options.targetRoot, { recursive: true });

  await Promise.all(
    sourceEntries.map(async (entryName) => {
      if (!shouldCopyPath(entryName, options)) return;

      const sourcePath = path.join(options.sourceRoot, entryName);
      const targetPath = path.join(options.targetRoot, entryName);

      await cp(sourcePath, targetPath, {
        recursive: true,
        dereference: true,
        filter: (candidatePath) => {
          const relativePath = path.relative(options.sourceRoot, candidatePath);
          return shouldCopyPath(relativePath, options);
        },
      });
    }),
  );
}

async function applyMinimalTemplate(options: iCreateProjectOptions) {
  const templateRoot = path.join(options.sourceRoot, 'packages', 'project-generator', 'templates', 'minimal');

  await Promise.all([
    rm(path.join(options.targetRoot, 'packages', 'common'), { recursive: true, force: true }),
    rm(path.join(options.targetRoot, 'packages', 'server-contract'), { recursive: true, force: true }),
    rm(path.join(options.targetRoot, 'docker-compose.dev.yml'), { force: true }),
    rm(path.join(options.targetRoot, 'mongo'), { recursive: true, force: true }),
    rm(path.join(options.targetRoot, 'patches', 'better-auth.patch'), { force: true }),
  ]);

  for (const projectPart of options.projectParts) {
    const appDirectoryName = projectPart.toLowerCase();
    const targetAppPath = path.join(options.targetRoot, 'apps', appDirectoryName);
    const templateAppPath = path.join(templateRoot, 'apps', appDirectoryName);

    await rm(targetAppPath, { recursive: true, force: true });
    await cp(templateAppPath, targetAppPath, { recursive: true });
  }
}

async function updateWorkspaceConfig(options: iCreateProjectOptions) {
  if (options.shouldIncludeStarter) return;

  const workspaceConfigPath = path.join(options.targetRoot, 'pnpm-workspace.yaml');
  const workspaceConfig = await readFile(workspaceConfigPath, 'utf8');
  const minimalWorkspaceConfig = workspaceConfig.replace(/^ {2}better-auth:.*(?:\r?\n|$)/m, '');

  await writeFile(workspaceConfigPath, minimalWorkspaceConfig);
}

function createDevelopmentCommand(options: iCreateProjectOptions): string {
  const filters: string[] = [];
  const hasServer = hasProjectPart(options.projectParts, PROJECT_PARTS.SERVER);
  const hasWeb = hasProjectPart(options.projectParts, PROJECT_PARTS.WEB);

  if (hasServer) filters.push('--filter=server');
  if (hasWeb) filters.push('--filter=web');
  if (options.shouldIncludeStarter) {
    filters.push(`--filter=@${options.projectName}/common`, `--filter=@${options.projectName}/server-contract`);
  }

  const developmentCommand = `pnpm --parallel ${filters.join(' ')} run dev`;

  if (hasServer && options.shouldIncludeStarter) {
    return `docker compose -f ./docker-compose.dev.yml --profile postgres up -d --wait && ${developmentCommand}`;
  }

  return developmentCommand;
}

async function updateRootPackage(options: iCreateProjectOptions) {
  const packagePath = path.join(options.targetRoot, 'package.json');
  const packageJson = rootPackageSchema.parse(JSON.parse(await readFile(packagePath, 'utf8')));
  const hasServer = hasProjectPart(options.projectParts, PROJECT_PARTS.SERVER);
  const hasWeb = hasProjectPart(options.projectParts, PROJECT_PARTS.WEB);

  packageJson.name = options.projectName;
  packageJson.scripts.dev = createDevelopmentCommand(options);
  delete packageJson.scripts.create;

  if (hasWeb) packageJson.scripts['dev:web'] = 'pnpm --filter=web run dev';
  else delete packageJson.scripts['dev:web'];

  if (hasServer) {
    packageJson.scripts['dev:server'] = 'pnpm --filter=server run dev';
    packageJson.scripts['build:server'] = 'pnpm --filter=server... run build';
  } else {
    delete packageJson.scripts['dev:server'];
    delete packageJson.scripts['build:server'];
  }

  if (hasServer && options.shouldIncludeStarter) {
    packageJson.scripts['db:generate'] = 'pnpm --filter=server run db:generate';
    packageJson.scripts['db:migrate'] = 'pnpm --filter=server run db:migrate';
    packageJson.scripts['db:push'] = 'pnpm --filter=server run db:push';
    packageJson.scripts['db:studio'] = 'pnpm --filter=server run db:studio';
  } else {
    delete packageJson.scripts['db:generate'];
    delete packageJson.scripts['db:migrate'];
    delete packageJson.scripts['db:push'];
    delete packageJson.scripts['db:studio'];
  }

  if (options.shouldIncludeStarter) {
    packageJson.scripts['dev:common'] = `pnpm --filter=@${options.projectName}/common run dev`;
    packageJson.scripts['dev:server-contract'] = `pnpm --filter=@${options.projectName}/server-contract run dev`;
    packageJson.scripts['build:deps'] = `pnpm --filter=@${options.projectName}/server-contract... run build`;
  } else {
    delete packageJson.scripts['dev:common'];
    delete packageJson.scripts['dev:server-contract'];
    delete packageJson.scripts['build:deps'];
  }

  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

function isTextFile(filePath: string): boolean {
  const fileName = path.basename(filePath);
  if (fileName.startsWith('.env.')) return true;
  if (fileName.startsWith('.') && !fileName.includes('.', 1)) return true;
  return TEXT_FILE_EXTENSIONS.has(path.extname(fileName));
}

async function replaceProjectName(directoryPath: string, projectName: string) {
  const directoryEntries = await readdir(directoryPath, { withFileTypes: true });

  await Promise.all(
    directoryEntries.map(async (directoryEntry) => {
      const entryPath = path.join(directoryPath, directoryEntry.name);

      if (directoryEntry.isDirectory()) {
        await replaceProjectName(entryPath, projectName);
        return;
      }

      if (!directoryEntry.isFile() || !isTextFile(entryPath)) return;

      const contents = await readFile(entryPath, 'utf8');
      if (!contents.includes('startername')) return;
      await writeFile(entryPath, contents.replaceAll('startername', projectName));
    }),
  );
}

function createGeneratedReadme(options: iCreateProjectOptions): string {
  const hasServer = hasProjectPart(options.projectParts, PROJECT_PARTS.SERVER);
  const hasWeb = hasProjectPart(options.projectParts, PROJECT_PARTS.WEB);
  const selectedParts = [hasServer ? 'Hono server' : undefined, hasWeb ? 'React web app' : undefined]
    .filter((part): part is string => part !== undefined)
    .join(' and ');
  const variantDescription = options.shouldIncludeStarter
    ? 'The starter boilerplate is included.'
    : 'This is the minimal variant without Better Auth or domain sample code.';
  const integrationNote = options.shouldIncludeStarter && hasWeb && !hasServer
    ? '\n\nThe web app keeps its API and auth client. Configure `apps/web/.env` to target a compatible separately deployed server.'
    : '';
  const environmentSteps = [
    hasServer ? '- Copy `apps/server/.env.example` to `apps/server/.env`.' : undefined,
    hasWeb && options.shouldIncludeStarter ? '- Copy `apps/web/.env.example` to `apps/web/.env`.' : undefined,
  ].filter((step): step is string => step !== undefined);

  return `# ${options.projectName}\n\nA pnpm monorepo with ${selectedParts}. ${variantDescription}${integrationNote}\n\n## Getting started\n\n\`\`\`bash\npnpm install\n\`\`\`\n${environmentSteps.length > 0 ? `\n${environmentSteps.join('\n')}\n` : ''}\n\`\`\`bash\npnpm run dev\n\`\`\`\n\n## Commands\n\n- \`pnpm run dev\` starts the selected applications.\n- \`pnpm run build\` builds every workspace package.\n- \`pnpm run verify\` runs type checking and linting.\n- \`pnpm run test\` runs the available test suites.\n`;
}

async function assertDestinationIsAvailable(targetRoot: string) {
  try {
    await stat(targetRoot);
    throw new Error(`Destination already exists: ${targetRoot}`);
  } catch (error) {
    const isMissingPath = error instanceof Error && 'code' in error && error.code === 'ENOENT';
    if (!isMissingPath) throw error;
  }
}

export async function createProject(options: iCreateProjectOptions): Promise<iCreatedProject> {
  const projectNameError = validateProjectName(options.projectName);
  if (projectNameError) throw new Error(projectNameError);
  if (options.projectParts.length === 0) throw new Error('Select at least one project part.');

  const sourceRoot = path.resolve(options.sourceRoot);
  const targetRoot = path.resolve(options.targetRoot);

  if (sourceRoot === targetRoot || isPathInside(sourceRoot, targetRoot)) {
    throw new Error('Create generated projects outside the starter repository.');
  }

  await assertDestinationIsAvailable(targetRoot);

  const resolvedOptions = {
    ...options,
    projectParts: [...new Set(options.projectParts)],
    sourceRoot,
    targetRoot,
  };

  try {
    await copySource(resolvedOptions);
    if (!resolvedOptions.shouldIncludeStarter) await applyMinimalTemplate(resolvedOptions);
    await replaceProjectName(targetRoot, resolvedOptions.projectName);
    await updateWorkspaceConfig(resolvedOptions);
    await updateRootPackage(resolvedOptions);
    await writeFile(path.join(targetRoot, 'README.md'), createGeneratedReadme(resolvedOptions));
  } catch (error) {
    await rm(targetRoot, { recursive: true, force: true });
    throw error;
  }

  return {
    projectName: resolvedOptions.projectName,
    projectParts: resolvedOptions.projectParts,
    shouldIncludeStarter: resolvedOptions.shouldIncludeStarter,
    targetRoot,
  };
}
