import 'reflect-metadata';
import { container } from 'tsyringe';
import type { constructor } from 'tsyringe/dist/typings/types';

import { ModuleSourceBundler } from '@~/bundle/module-source-bundler';
import { BundledFileNames } from '@~/engine/bundled-file-names';
import { ConnectionPointGenerator } from '@~/engine/connection-points/connection-point-generator';
import { ControlBlockRenderer } from '@~/engine/control-block-renderer';
import { MarkdownRenderer } from '@~/engine/markdown-renderer';
import { ModuleRegistry } from '@~/engine/module-registry';
import { ModuleResolver } from '@~/engine/module-resolver';
import { ModuleSourceReader } from '@~/engine/module-source-reader';
import { PackageJsonMerger } from '@~/engine/package-json-merger';
import { PnpmWorkspaceMerger } from '@~/engine/pnpm-workspace-merger';
import { ProjectComposer } from '@~/engine/project-composer';
import { ProjectGenerator } from '@~/engine/project-generator';
import { ProjectTargetGuard } from '@~/engine/project-target-guard';
import { ProjectUpdater } from '@~/engine/project-updater';
import { ProjectWriter } from '@~/engine/project-writer';
import { TemplateRenderer } from '@~/engine/template-renderer';
import type { SourceLayout } from '@~/enums/source-layouts.enums';
import { SOURCE_LAYOUTS } from '@~/enums/source-layouts.enums';
import type { iModuleManifestInput } from '@~/manifest/module-manifest.schema';
import { MODULE_MANIFESTS } from '@~/modules/module-manifests';
import { ProjectRecordEditor } from '@~/record/project-record-editor';
import { ProjectRecordStore } from '@~/record/project-record-store';

import { MODULE_MANIFESTS_TOKEN, SOURCE_LAYOUT_TOKEN, SOURCE_ROOT_TOKEN } from './tokens';

export interface iGeneratorContainerOptions {
  /** Absolute directory the module sources are read from. */
  sourceRoot: string;
  sourceLayout?: SourceLayout;
  manifests?: iModuleManifestInput[];
}

const SERVICES: constructor<object>[] = [
  BundledFileNames,
  ModuleSourceBundler,
  ModuleRegistry,
  ModuleResolver,
  ModuleSourceReader,
  PackageJsonMerger,
  PnpmWorkspaceMerger,
  ControlBlockRenderer,
  TemplateRenderer,
  MarkdownRenderer,
  ConnectionPointGenerator,
  ProjectComposer,
  ProjectWriter,
  ProjectTargetGuard,
  ProjectGenerator,
  ProjectUpdater,
  ProjectRecordStore,
  ProjectRecordEditor,
];

/** One container per run: services are singletons inside it, never shared across runs or tests. */
export function createGeneratorContainer({
  sourceRoot,
  sourceLayout = SOURCE_LAYOUTS.REPOSITORY,
  manifests = MODULE_MANIFESTS,
}: iGeneratorContainerOptions) {
  const child = container.createChildContainer();
  child.register(SOURCE_ROOT_TOKEN, { useValue: sourceRoot });
  child.register(SOURCE_LAYOUT_TOKEN, { useValue: sourceLayout });
  child.register(MODULE_MANIFESTS_TOKEN, { useValue: manifests });
  for (const service of SERVICES) child.registerSingleton(service);
  return child;
}
