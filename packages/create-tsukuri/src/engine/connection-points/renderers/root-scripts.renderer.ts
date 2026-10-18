import { injectable } from 'tsyringe';

import type { iBuildTaskContribution, iDevTaskContribution } from '#~/manifest/connection-point.schema';
import { packageJsonContributionSchema } from '#~/manifest/module-manifest.schema';

import { COMPOSE_FILE } from '../connection-point.constants';
import type { iGeneratedFile, iOwnedContribution } from '../connection-point.types';

/** The root `dev` and `build` scripts, from the workspaces modules start and build. */
@injectable()
export class RootScriptsRenderer {
  public render(
    devTasks: iOwnedContribution<iDevTaskContribution>[],
    buildTasks: iOwnedContribution<iBuildTaskContribution>[],
    files: iGeneratedFile[],
  ) {
    const devFilters = this.uniqueFilters(devTasks);
    const buildFilters = this.uniqueFilters(buildTasks);
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

  private uniqueFilters(tasks: iOwnedContribution<iDevTaskContribution | iBuildTaskContribution>[]) {
    return [...new Set(tasks.map(({ contribution }) => contribution.filter))];
  }
}
