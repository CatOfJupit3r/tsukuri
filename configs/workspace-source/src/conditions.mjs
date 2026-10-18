/** Export condition that maps a workspace package to its TypeScript source. */
export const WORKSPACE_SOURCE_CONDITION = 'workspace-source';

/** Puts the workspace-source condition in front of `conditions`. */
export const withWorkspaceSourceCondition = (conditions) => [WORKSPACE_SOURCE_CONDITION, ...conditions];
