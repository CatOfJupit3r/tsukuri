import { injectable } from 'tsyringe';
import { stringify } from 'yaml';

import type { iCiStepContribution } from '#~/manifest/connection-point.schema';

import { CI_WORKFLOW_FILE, NODE_VERSION_FILE } from '../connection-point.constants';
import type { iConnectionPointRenderer, iOwnedContribution } from '../connection-point.types';
import { withHashHeader } from '../generated-header';

/** The CI workflow: install, then every module's steps in module order. */
@injectable()
export class CiRenderer implements iConnectionPointRenderer<iCiStepContribution> {
  public async render(items: iOwnedContribution<iCiStepContribution>[]) {
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
        group: `${this.githubExpression('github.workflow')}-${this.githubExpression('github.ref')}`,
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

  /** A `${{ ... }}` GitHub Actions expression. */
  private githubExpression(expression: string) {
    return ['$', '{{ ', expression, ' }}'].join('');
  }
}
