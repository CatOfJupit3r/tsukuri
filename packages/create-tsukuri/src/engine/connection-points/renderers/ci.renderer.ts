import { injectable } from 'tsyringe';
import { stringify } from 'yaml';

import type { iCiJobContribution, iCiStepContribution } from '#~/manifest/connection-point.schema';

import { CI_WORKFLOW_FILE, NODE_VERSION_FILE } from '../connection-point.constants';
import type { iOwnedContribution } from '../connection-point.types';
import { withHashHeader } from '../generated-header';
import { GeneratedSourceFiles } from '../generated-source-files';

const VERIFY_JOB_ID = 'verify';

/** Checkout, pnpm, Node and the install every job starts with. */
const SETUP_STEPS = [
  { uses: 'actions/checkout@v4' },
  { uses: 'pnpm/action-setup@v4' },
  { uses: 'actions/setup-node@v4', with: { 'node-version-file': NODE_VERSION_FILE, cache: 'pnpm' } },
  { run: 'pnpm install --frozen-lockfile' },
];

/** The CI workflow: a verify job with every module's steps in module order, then the jobs modules add. */
@injectable()
export class CiRenderer {
  public constructor(private readonly sourceFiles: GeneratedSourceFiles) {}

  public async render(
    steps: iOwnedContribution<iCiStepContribution>[],
    jobs: iOwnedContribution<iCiJobContribution>[],
  ) {
    if (steps.length === 0 && jobs.length === 0) return [];

    const jobIds = jobs.map(({ contribution }) => contribution.id);
    this.sourceFiles.assertUnique(
      steps.length > 0 ? [VERIFY_JOB_ID, ...jobIds] : jobIds,
      (id) => `more than one CI job is called "${id}"`,
    );

    const workflow = {
      name: 'CI',
      on: {
        pull_request: null,
        push: { branches: ['main'] },
        workflow_dispatch: null,
      },
      permissions: { contents: 'read' },
      concurrency: {
        group: `${this.githubExpression('github.workflow')}-${this.githubExpression('github.ref')}`,
        'cancel-in-progress': true,
      },
      env: { CI: true },
      jobs: {
        ...(steps.length > 0 ? { [VERIFY_JOB_ID]: this.verifyJob(steps) } : {}),
        ...Object.fromEntries(jobs.map(({ contribution }) => [contribution.id, this.moduleJob(contribution)])),
      },
    };

    // Every job repeats the setup steps in full rather than through YAML aliases; multi-line scripts stay literal.
    return [
      {
        path: CI_WORKFLOW_FILE,
        content: withHashHeader(stringify(workflow, { aliasDuplicateObjects: false, blockQuote: 'literal' })),
      },
    ];
  }

  private verifyJob(steps: iOwnedContribution<iCiStepContribution>[]) {
    return {
      name: 'Verify',
      'runs-on': 'ubuntu-latest',
      'timeout-minutes': 20,
      steps: [
        ...SETUP_STEPS,
        ...steps.map(({ contribution }) => ({
          name: contribution.name,
          run: contribution.run,
          ...this.envOf(contribution.env),
        })),
      ],
    };
  }

  private moduleJob(job: iCiJobContribution) {
    return {
      name: job.name,
      'runs-on': 'ubuntu-latest',
      'timeout-minutes': job.timeoutMinutes,
      steps: [...SETUP_STEPS, ...job.steps.map(({ env, ...step }) => ({ ...step, ...this.envOf(env) }))],
    };
  }

  private envOf(env: Record<string, string>) {
    return Object.keys(env).length > 0 ? { env } : {};
  }

  /** A `${{ ... }}` GitHub Actions expression. */
  private githubExpression(expression: string) {
    return ['$', '{{ ', expression, ' }}'].join('');
  }
}
