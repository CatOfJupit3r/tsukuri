import 'reflect-metadata';
import { container } from 'tsyringe';
import type { constructor } from 'tsyringe/dist/typings/types';

import { ModuleSourceBundler } from '#~/bundle/module-source-bundler';
import { BundledFileNames } from '#~/engine/bundled-file-names';
import { ConnectionPointGenerator } from '#~/engine/connection-points/connection-point-generator';
import { GeneratedSourceFiles } from '#~/engine/connection-points/generated-source-files';
import { CiRenderer } from '#~/engine/connection-points/renderers/ci.renderer';
import { ComposeRenderer } from '#~/engine/connection-points/renderers/compose.renderer';
import { ContextProviderRenderer } from '#~/engine/connection-points/renderers/context-provider.renderer';
import { ContractRenderer } from '#~/engine/connection-points/renderers/contract.renderer';
import { DatabaseSchemaRenderer } from '#~/engine/connection-points/renderers/database-schema.renderer';
import { DiRegistrationRenderer } from '#~/engine/connection-points/renderers/di-registration.renderer';
import { EnvRenderer } from '#~/engine/connection-points/renderers/env.renderer';
import { ErrorCodeRenderer } from '#~/engine/connection-points/renderers/error-code.renderer';
import { HttpHandlerRenderer } from '#~/engine/connection-points/renderers/http-handler.renderer';
import { RootScriptsRenderer } from '#~/engine/connection-points/renderers/root-scripts.renderer';
import { RouterRenderer } from '#~/engine/connection-points/renderers/router.renderer';
import { StartupTaskRenderer } from '#~/engine/connection-points/renderers/startup-task.renderer';
import { WebDevtoolsPluginRenderer } from '#~/engine/connection-points/renderers/web-devtools-plugin.renderer';
import { WebRootPreloadRenderer } from '#~/engine/connection-points/renderers/web-root-preload.renderer';
import { WebSlotRenderer } from '#~/engine/connection-points/renderers/web-slot.renderer';
import { ControlBlockRenderer } from '#~/engine/control-block-renderer';
import { MarkdownRenderer } from '#~/engine/markdown-renderer';
import { ModuleRegistry } from '#~/engine/module-registry';
import { ModuleResolver } from '#~/engine/module-resolver';
import { ModuleSourceReader } from '#~/engine/module-source-reader';
import { PackageJsonMerger } from '#~/engine/package-json-merger';
import { PnpmWorkspaceMerger } from '#~/engine/pnpm-workspace-merger';
import { ProjectComposer } from '#~/engine/project-composer';
import { ProjectGenerator } from '#~/engine/project-generator';
import { ProjectTargetGuard } from '#~/engine/project-target-guard';
import { ProjectUpdater } from '#~/engine/project-updater';
import { ProjectWriter } from '#~/engine/project-writer';
import { TemplateRenderer } from '#~/engine/template-renderer';
import type { SourceLayout } from '#~/enums/source-layouts.enums';
import { SOURCE_LAYOUTS } from '#~/enums/source-layouts.enums';
import type { iModuleManifestInput } from '#~/manifest/module-manifest.schema';
import { MODULE_MANIFESTS } from '#~/modules/module-manifests';
import { ProjectRecordEditor } from '#~/record/project-record-editor';
import { ProjectRecordStore } from '#~/record/project-record-store';
import { RepositoryConnectionPoints } from '#~/sync/repository-connection-points';

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
  GeneratedSourceFiles,
  RouterRenderer,
  ContractRenderer,
  DiRegistrationRenderer,
  StartupTaskRenderer,
  HttpHandlerRenderer,
  ContextProviderRenderer,
  DatabaseSchemaRenderer,
  ErrorCodeRenderer,
  WebSlotRenderer,
  WebRootPreloadRenderer,
  WebDevtoolsPluginRenderer,
  EnvRenderer,
  ComposeRenderer,
  CiRenderer,
  RootScriptsRenderer,
  ConnectionPointGenerator,
  ProjectComposer,
  ProjectWriter,
  ProjectTargetGuard,
  ProjectGenerator,
  ProjectUpdater,
  ProjectRecordStore,
  ProjectRecordEditor,
  RepositoryConnectionPoints,
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
