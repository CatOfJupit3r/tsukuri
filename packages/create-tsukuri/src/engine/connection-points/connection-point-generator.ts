import path from 'node:path';
import { injectable } from 'tsyringe';
import { stringify } from 'yaml';

import { CONNECTION_POINT_KINDS } from '@~/enums/connection-point-kinds.enums';
import { GENERATOR_ERROR_CODES } from '@~/enums/generator-error-codes.enums';
import type { ModuleId } from '@~/enums/module-ids.enums';
import type {
  iCiStepContribution,
  iComposeServiceContribution,
  iConnectionPointContribution,
  iDiRegistrationContribution,
  iEnvVariableContribution,
  iRouterContribution,
} from '@~/manifest/connection-point.schema';
import type { iModuleManifest, iPackageJsonContribution } from '@~/manifest/module-manifest.schema';
import { packageJsonContributionSchema } from '@~/manifest/module-manifest.schema';

import { GeneratorError } from '../generator-error';
import { GENERATED_SOURCE_DIR, withCodeHeader, withHashHeader } from './generated-header';

export interface iGeneratedFile {
  path: string;
  content: string;
}

export interface iGeneratedConnectionPoints {
  files: iGeneratedFile[];
  /** Root scripts derived from dev/build tasks, merged into the root package.json. */
  rootPackageJson: iPackageJsonContribution;
}

interface iOwned<T> {
  moduleId: ModuleId;
  contribution: T;
}

export const COMPOSE_FILE = 'docker-compose.dev.yml';
export const CI_WORKFLOW_FILE = '.github/workflows/ci.yml';
const ENV_EXAMPLE_FILE = '.env.example';
const NODE_VERSION_FILE = '.nvmrc';

/** A `${{ ... }}` GitHub Actions expression. */
function githubExpression(expression: string) {
  return ['$', '{{ ', expression, ' }}'].join('');
}

function groupByWorkspace<T extends { workspace: string }>(items: iOwned<T>[]) {
  const groups = new Map<string, iOwned<T>[]>();
  for (const item of items) {
    const { workspace } = item.contribution;
    groups.set(workspace, [...(groups.get(workspace) ?? []), item]);
  }
  return groups;
}

function generatedSourceFile(workspace: string, fileName: string) {
  return path.posix.join(workspace, GENERATED_SOURCE_DIR, fileName);
}

/** Groups `import { a, b } from 'x'` per specifier, in first-seen order. */
function renderNamedImports(imports: { name: string; from: string }[]) {
  const bySpecifier = new Map<string, string[]>();
  for (const { name, from } of imports) {
    const names = bySpecifier.get(from) ?? [];
    if (!names.includes(name)) names.push(name);
    bySpecifier.set(from, names);
  }
  return [...bySpecifier].map(([from, names]) => `import { ${names.join(', ')} } from '${from}';`).join('\n');
}

function assertUnique(values: string[], describe: (value: string) => string) {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) throw new GeneratorError(GENERATOR_ERROR_CODES.MERGE_CONFLICT, describe(value));
    seen.add(value);
  }
}

/**
 * Builds the files where modules meet (router map, DI registrations, env schema, compose file,
 * CI workflow, root scripts) from the installed modules' contributions. Output depends only on
 * the module list, so regenerating is idempotent.
 */
@injectable()
export class ConnectionPointGenerator {
  public generate(modules: iModuleManifest[]): iGeneratedConnectionPoints {
    const contributions = modules.flatMap((manifest) =>
      manifest.contributions.map((contribution) => ({ moduleId: manifest.id, contribution })),
    );
    const ofKind = <T extends iConnectionPointContribution>(kind: T['kind']) =>
      contributions.filter((item): item is iOwned<T> => item.contribution.kind === kind);

    const files = [
      ...this.renderRouters(ofKind<iRouterContribution>(CONNECTION_POINT_KINDS.ROUTER)),
      ...this.renderDiRegistrations(ofKind<iDiRegistrationContribution>(CONNECTION_POINT_KINDS.DI_REGISTRATION)),
      ...this.renderEnv(ofKind<iEnvVariableContribution>(CONNECTION_POINT_KINDS.ENV_VARIABLE)),
      ...this.renderCompose(ofKind<iComposeServiceContribution>(CONNECTION_POINT_KINDS.COMPOSE_SERVICE)),
      ...this.renderCi(ofKind<iCiStepContribution>(CONNECTION_POINT_KINDS.CI_STEP)),
    ];

    return { files, rootPackageJson: this.renderRootScripts(contributions, files) };
  }

  private renderRouters(items: iOwned<iRouterContribution>[]) {
    return [...groupByWorkspace(items)].map(([workspace, routers]) => {
      assertUnique(
        routers.map(({ contribution }) => contribution.key),
        (key) => `${workspace}: more than one module adds a router under "${key}"`,
      );

      const imports = renderNamedImports(routers.map(({ contribution }) => contribution.router));
      const entries = routers.map(({ contribution }) => `  ${contribution.key}: ${contribution.router.name},`);
      return {
        path: generatedSourceFile(workspace, 'routers.ts'),
        content: withCodeHeader(`${imports}\n\nexport const generatedRouters = {\n${entries.join('\n')}\n};\n`),
      };
    });
  }

  private renderDiRegistrations(items: iOwned<iDiRegistrationContribution>[]) {
    return [...groupByWorkspace(items)].map(([workspace, registrations]) => {
      const sideEffects = [...new Set(registrations.flatMap(({ contribution }) => contribution.imports))];
      const bindings = registrations.flatMap(({ contribution }) => contribution.bindings);
      const imports = renderNamedImports(bindings.flatMap((binding) => [binding.token, binding.implementation]));

      const body = [
        "import type { DependencyContainer, InjectionToken } from 'tsyringe';",
        ...(imports ? ['', imports] : []),
        '',
        'const GENERATED_BINDINGS: [InjectionToken<unknown>, InjectionToken<unknown>][] = [',
        ...bindings.map((binding) => `  [${binding.token.name}, ${binding.implementation.name}],`),
        '];',
        '',
        '/** Loads every module-provided service and binds module-provided implementations to their tokens. */',
        'export async function registerGeneratedServices(container: DependencyContainer) {',
        ...sideEffects.map((specifier) => `  await import('${specifier}');`),
        '  for (const [token, implementation] of GENERATED_BINDINGS) {',
        '    container.registerSingleton(token, implementation);',
        '  }',
        '}',
        '',
      ];

      return { path: generatedSourceFile(workspace, 'di-registrations.ts'), content: withCodeHeader(body.join('\n')) };
    });
  }

  private renderEnv(items: iOwned<iEnvVariableContribution>[]) {
    return [...groupByWorkspace(items)].flatMap(([workspace, variables]) => {
      assertUnique(
        variables.map(({ contribution }) => contribution.name),
        (name) => `${workspace}: more than one module declares env variable "${name}"`,
      );

      const shape = variables.map(({ contribution }) => `  ${contribution.name}: ${contribution.schema},`);
      const example = variables.map(({ contribution }) => `${contribution.name}=${contribution.example}`);
      return [
        {
          path: generatedSourceFile(workspace, 'env.schema.ts'),
          content: withCodeHeader(
            `import z from 'zod';\n\nexport const generatedEnvShape = {\n${shape.join('\n')}\n};\n`,
          ),
        },
        {
          path: path.posix.join(workspace, ENV_EXAMPLE_FILE),
          content: withHashHeader(`${example.join('\n')}\n`),
        },
      ];
    });
  }

  private renderCompose(items: iOwned<iComposeServiceContribution>[]) {
    if (items.length === 0) return [];
    assertUnique(
      items.map(({ contribution }) => contribution.name),
      (name) => `more than one module adds the compose service "${name}"`,
    );

    const volumes = [...new Set(items.flatMap(({ contribution }) => contribution.volumes))];
    const document: Record<string, unknown> = {
      name: 'startername',
      services: Object.fromEntries(items.map(({ contribution }) => [contribution.name, contribution.service])),
    };
    if (volumes.length > 0) document.volumes = Object.fromEntries(volumes.map((volume) => [volume, {}]));

    return [{ path: COMPOSE_FILE, content: withHashHeader(stringify(document)) }];
  }

  private renderCi(items: iOwned<iCiStepContribution>[]) {
    if (items.length === 0) return [];

    const workflow = {
      name: 'CI',
      on: {
        pull_request: null,
        push: { branches: ['main'] },
        workflow_dispatch: null,
      },
      permissions: { contents: 'read' },
      concurrency: {
        group: `${githubExpression('github.workflow')}-${githubExpression('github.ref')}`,
        'cancel-in-progress': true,
      },
      env: { CI: true },
      jobs: {
        verify: {
          name: 'Verify',
          'runs-on': 'ubuntu-latest',
          'timeout-minutes': 20,
          steps: [
            { uses: 'actions/checkout@v4' },
            { uses: 'pnpm/action-setup@v4' },
            { uses: 'actions/setup-node@v4', with: { 'node-version-file': NODE_VERSION_FILE, cache: 'pnpm' } },
            { run: 'pnpm install --frozen-lockfile' },
            ...items.map(({ contribution }) => ({
              name: contribution.name,
              run: contribution.run,
              ...(Object.keys(contribution.env).length > 0 ? { env: contribution.env } : {}),
            })),
          ],
        },
      },
    };

    return [{ path: CI_WORKFLOW_FILE, content: withHashHeader(stringify(workflow)) }];
  }

  private renderRootScripts(
    contributions: iOwned<iConnectionPointContribution>[],
    files: iGeneratedFile[],
  ): iPackageJsonContribution {
    const filters = (kind: typeof CONNECTION_POINT_KINDS.DEV_TASK | typeof CONNECTION_POINT_KINDS.BUILD_TASK) => [
      ...new Set(
        contributions.flatMap(({ contribution }) =>
          contribution.kind === kind && 'filter' in contribution ? [contribution.filter] : [],
        ),
      ),
    ];

    const devFilters = filters(CONNECTION_POINT_KINDS.DEV_TASK);
    const buildFilters = filters(CONNECTION_POINT_KINDS.BUILD_TASK);
    const hasCompose = files.some((file) => file.path === COMPOSE_FILE);
    const scripts: Record<string, string> = {
      build:
        buildFilters.length > 0
          ? `pnpm ${buildFilters.map((filter) => `--filter=${filter}...`).join(' ')} run build`
          : 'pnpm --recursive run build',
    };

    if (devFilters.length > 0) {
      const run = `pnpm --parallel ${devFilters.map((filter) => `--filter=${filter}`).join(' ')} run dev`;
      scripts.dev = hasCompose ? `docker compose -f ./${COMPOSE_FILE} up -d --wait && ${run}` : run;
    }

    return packageJsonContributionSchema.parse({ workspace: '.', scripts });
  }
}
