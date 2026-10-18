import type { ConnectionPointKind } from '#~/enums/connection-point-kinds.enums';
import type { ModuleId } from '#~/enums/module-ids.enums';
import type { iConnectionPointContribution } from '#~/manifest/connection-point.schema';
import type { iPackageJsonContribution } from '#~/manifest/module-manifest.schema';

import type { iTemplateContext } from '../template-renderer';

export interface iGeneratedFile {
  path: string;
  content: string;
}

export interface iGeneratedConnectionPoints {
  files: iGeneratedFile[];
  /** Root scripts derived from dev/build tasks, merged into the root package.json. */
  rootPackageJson: iPackageJsonContribution;
}

export interface iOwnedContribution<T extends iConnectionPointContribution> {
  moduleId: ModuleId;
  contribution: T;
}

export type iContributionOfKind<K extends ConnectionPointKind> = Extract<iConnectionPointContribution, { kind: K }>;

/** Turns every contribution of one kind into the files where those contributions meet. */
export interface iConnectionPointRenderer<T extends iConnectionPointContribution> {
  render: (
    items: iOwnedContribution<T>[],
    context: iTemplateContext,
    hostedWorkspaces: readonly string[],
  ) => Promise<iGeneratedFile[]>;
}
