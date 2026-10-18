import path from 'node:path';
import { injectable } from 'tsyringe';
import { stringify } from 'yaml';

import { templatePath } from '@~/constants/template-path';
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
import type { iTemplateContext } from '../template-renderer';
import { TemplateRenderer } from '../template-renderer';
import { GENERATED_HEADER, GENERATED_SOURCE_DIR, withHashHeader } from './generated-header';

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

/** Groups named imports per specifier, in first-seen order: `{ names: 'a, b', from: 'x' }`. */
function groupNamedImports(imports: { name: string; from: string }[]) {
  const bySpecifier = new Map<string, string[]>();
  for (const { name, from } of imports) {
    const names = bySpecifier.get(from) ?? [];
    if (!names.includes(name)) names.push(name);
    bySpecifier.set(from, names);
  }
  return [...bySpecifier].map(([from, names]) => ({ names: names.join(', '), from }));
}

const TEMPLATES = {
  routers: templatePath('connection-points/routers.ts.hbs'),
  diRegistrations: templatePath('connection-points/di-registrations.ts.hbs'),
  envSchema: templatePath('connection-points/env.schema.ts.hbs'),
  envExample: templatePath('connection-points/env.example.hbs'),
} satisfies Record<string, string>;

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
  constructor(private readonly templates: TemplateRenderer) {}

  public async generate(modules: iModuleManifest[], context: iTemplateContext): Promise<iGeneratedConnectionPoints> {
    const templateContext = { ...context, header: GENERATED_HEADER };
    const contributions = modules.flatMap((manifest) =>
      manifest.contributions.map((contribution) => ({ moduleId: manifest.id, contribution })),
    );
    const ofKind = <T extends iConnectionPointContribution>(kind: T['kind']) =>
      contributions.filter((item): item is iOwned<T> => item.contribution.kind === kind);

    const files = [
      ...(await this.renderRouters(ofKind<iRouterContribution>(CONNECTION_POINT_KINDS.ROUTER), templateContext)),
      ...(await this.renderDiRegistrations(
        ofKind<iDiRegistrationContribution>(CONNECTION_POINT_KINDS.DI_REGISTRATION),
        templateContext,
      )),
      ...(await this.renderEnv(ofKind<iEnvVariableContribution>(CONNECTION_POINT_KINDS.ENV_VARIABLE), templateContext)),
      ...this.renderCompose(ofKind<iComposeServiceContribution>(CONNECTION_POINT_KINDS.COMPOSE_SERVICE)),
      ...this.renderCi(ofKind<iCiStepContribution>(CONNECTION_POINT_KINDS.CI_STEP)),
    ];

    return { files, rootPackageJson: this.renderRootScripts(contributions, files) };
  }

  private async renderRouters(items: iOwned<iRouterContribution>[], context: iTemplateContext) {
    const files: iGeneratedFile[] = [];
    for (const [workspace, routers] of groupByWorkspace(items)) {
      assertUnique(
        routers.map(({ contribution }) => contribution.key),
        (key) => `${workspace}: more than one module adds a router under "${key}"`,
      );

      const contributions = routers.map(({ contribution }) => contribution);
      files.push({
        path: generatedSourceFile(workspace, 'routers.ts'),
        content: await this.templates.render(TEMPLATES.routers, {
          ...context,
          imports: groupNamedImports(contributions.map((contribution) => contribution.router)),
          routers: contributions,
        }),
      });
    }
    return files;
  }

  private async renderDiRegistrations(items: iOwned<iDiRegistrationContribution>[], context: iTemplateContext) {
    const files: iGeneratedFile[] = [];
    for (const [workspace, registrations] of groupByWorkspace(items)) {
      const bindings = registrations.flatMap(({ contribution }) => contribution.bindings);
      files.push({
        path: generatedSourceFile(workspace, 'di-registrations.ts'),
        content: await this.templates.render(TEMPLATES.diRegistrations, {
          ...context,
          imports: groupNamedImports(bindings.flatMap((binding) => [binding.token, binding.implementation])),
          bindings,
          sideEffects: [...new Set(registrations.flatMap(({ contribution }) => contribution.imports))],
        }),
      });
    }
    return files;
  }

  private async renderEnv(items: iOwned<iEnvVariableContribution>[], context: iTemplateContext) {
    const files: iGeneratedFile[] = [];
    for (const [workspace, owned] of groupByWorkspace(items)) {
      assertUnique(
        owned.map(({ contribution }) => contribution.name),
        (name) => `${workspace}: more than one module declares env variable "${name}"`,
      );

      const variables = owned.map(({ contribution }) => contribution);
      files.push(
        {
          path: generatedSourceFile(workspace, 'env.schema.ts'),
          content: await this.templates.render(TEMPLATES.envSchema, { ...context, variables }),
        },
        {
          path: path.posix.join(workspace, ENV_EXAMPLE_FILE),
          content: await this.templates.render(TEMPLATES.envExample, { ...context, variables }),
        },
      );
    }
    return files;
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
