import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';

/** `[name, example]` pairs of the variables one module declares in one workspace. */
export type iEnvVariableEntries = readonly (readonly [name: string, example: string])[];

export function envVariableContributions(workspace: string, entries: iEnvVariableEntries) {
  return entries.map(([name, example]) => ({
    kind: CONNECTION_POINT_KINDS.ENV_VARIABLE,
    workspace,
    name,
    example,
  }));
}
