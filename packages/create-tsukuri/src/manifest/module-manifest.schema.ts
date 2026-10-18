import z from 'zod';

import { capabilitySchema } from '#~/enums/capabilities.enums';
import { markdownDocumentSchema } from '#~/enums/markdown-documents.enums';
import { moduleCategorySchema } from '#~/enums/module-categories.enums';
import { moduleIdSchema } from '#~/enums/module-ids.enums';
import { skillIdSchema } from '#~/enums/skill-ids.enums';

import { connectionPointContributionSchema, connectionPointHostSchema } from './connection-point.schema';
import type { iConnectionPointContributionInput } from './connection-point.schema';

const relativePathSchema = z
  .string()
  .min(1)
  .refine((value) => !value.startsWith('/') && !value.split('/').includes('..'), {
    message: 'Paths must be relative and stay inside the project',
  });

const dependencyMapSchema = z.record(z.string(), z.string());

export const moduleFileEntrySchema = z.object({
  /** File or directory in the module sources, relative to the source root. */
  source: relativePathSchema,
  /** Where the entry lands in the generated project. Defaults to `source`. */
  target: relativePathSchema.optional(),
  /** Paths relative to `source` that are not part of the module. */
  exclude: z.array(relativePathSchema).default([]),
});

export const packageJsonContributionSchema = z.object({
  /** Workspace directory relative to the project root; `.` is the root package. */
  workspace: z.string().min(1),
  fields: z.record(z.string(), z.unknown()).default({}),
  scripts: z.record(z.string(), z.string()).default({}),
  dependencies: dependencyMapSchema.default({}),
  devDependencies: dependencyMapSchema.default({}),
  peerDependencies: dependencyMapSchema.default({}),
});

export const pnpmWorkspaceContributionSchema = z.object({
  packages: z.array(z.string()).default([]),
  catalog: dependencyMapSchema.default({}),
  allowBuilds: z.record(z.string(), z.boolean()).default({}),
  onlyBuiltDependencies: z.array(z.string()).default([]),
  minimumReleaseAgeExclude: z.array(z.string()).default([]),
});

export const markdownFragmentSchema = z.object({
  document: markdownDocumentSchema,
  /** Fragment file relative to the source root. */
  source: relativePathSchema,
});

export const moduleManifestSchema = z.object({
  id: moduleIdSchema,
  /** Semver of the module itself; recorded in the project module record. */
  version: z.string().regex(/^\d+\.\d+\.\d+(?:-[\w.]+)?$/, 'Must be a semver version'),
  name: z.string().min(1),
  description: z.string().min(1),
  category: moduleCategorySchema,
  /** Installed in every project. */
  isAlwaysIncluded: z.boolean().default(false),
  requires: z.array(moduleIdSchema).default([]),
  requiresCapabilities: z.array(capabilitySchema).default([]),
  conflicts: z.array(moduleIdSchema).default([]),
  provides: z.array(capabilitySchema).default([]),
  files: z.array(moduleFileEntrySchema).default([]),
  packageJson: z.array(packageJsonContributionSchema).default([]),
  pnpmWorkspace: pnpmWorkspaceContributionSchema.default({
    packages: [],
    catalog: {},
    allowBuilds: {},
    onlyBuiltDependencies: [],
    minimumReleaseAgeExclude: [],
  }),
  skills: z.array(skillIdSchema).default([]),
  markdown: z.array(markdownFragmentSchema).default([]),
  contributions: z.array(connectionPointContributionSchema).default([]),
  hosts: z.array(connectionPointHostSchema).default([]),
});

export type iModuleManifest = z.output<typeof moduleManifestSchema>;
export type iModuleFileEntry = z.output<typeof moduleFileEntrySchema>;
export type iPackageJsonContribution = z.output<typeof packageJsonContributionSchema>;
export type iPnpmWorkspaceContribution = z.output<typeof pnpmWorkspaceContributionSchema>;
export type iMarkdownFragment = z.output<typeof markdownFragmentSchema>;

type iWithDefaults<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * What a manifest author writes: the validated shape with every defaulted field optional.
 * Written out instead of `z.input` so enum-backed fields keep their enumwaii types.
 */
export type iModuleManifestInput = iWithDefaults<
  Omit<iModuleManifest, 'files' | 'packageJson' | 'pnpmWorkspace' | 'contributions'>,
  'isAlwaysIncluded' | 'requires' | 'requiresCapabilities' | 'conflicts' | 'provides' | 'skills' | 'markdown' | 'hosts'
> & {
  files?: iWithDefaults<iModuleFileEntry, 'exclude'>[];
  packageJson?: iWithDefaults<
    iPackageJsonContribution,
    'fields' | 'scripts' | 'dependencies' | 'devDependencies' | 'peerDependencies'
  >[];
  pnpmWorkspace?: Partial<iPnpmWorkspaceContribution>;
  contributions?: iConnectionPointContributionInput[];
};
