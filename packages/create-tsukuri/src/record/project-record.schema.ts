import z from 'zod';

import { moduleIdSchema } from '#~/enums/module-ids.enums';
import { skillIdSchema } from '#~/enums/skill-ids.enums';

/** File at the project root that lists what the project was generated from. */
export const PROJECT_RECORD_FILE = 'starter.json';

export const recordedModuleSchema = z.object({
  id: moduleIdSchema,
  version: z.string(),
  options: z.record(z.string(), z.unknown()).default({}),
});

export const projectRecordSchema = z.object({
  projectName: z.string().min(1),
  generator: z.object({
    name: z.string(),
    version: z.string(),
  }),
  /** Every installed module, in resolution order. */
  modules: z.array(recordedModuleSchema),
  skills: z
    .object({
      /** Skills the modules would ship that the user opted out of. */
      excluded: z.array(skillIdSchema).default([]),
    })
    .default({ excluded: [] }),
  markdown: z
    .object({
      /** Keeps the `<private>` blocks of markdown fragments in AGENTS.md and README.md. */
      includePrivate: z.boolean().default(false),
    })
    .default({ includePrivate: false }),
});

export type iProjectRecord = z.output<typeof projectRecordSchema>;
export type iRecordedModule = z.output<typeof recordedModuleSchema>;
