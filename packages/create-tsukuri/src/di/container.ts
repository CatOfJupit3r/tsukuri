import 'reflect-metadata';
import { container } from 'tsyringe';
import type { constructor } from 'tsyringe/dist/typings/types';

import { ModuleSourceBundler } from '#~/bundle/module-source-bundler';
import { BundledFileNames } from '#~/engine/bundled-file-names';
import { ConnectionPointGenerator } from '#~/engine/connection-points/connection-point-generator';
import { GeneratedSourceFiles } from '#~/engine/connection-points/generated-source-files';
import { ContextProviderRenderer } from '#~/engine/connection-points/renderers/api/context-provider.renderer';
import { ContractRenderer } from '#~/engine/connection-points/renderers/api/contract.renderer';
import { DatabaseSchemaRenderer } from '#~/engine/connection-points/renderers/api/database-schema.renderer';
import { DiRegistrationRenderer } from '#~/engine/connection-points/renderers/api/di-registration.renderer';
import { ErrorCodeRenderer } from '#~/engine/connection-points/renderers/api/error-code.renderer';
import { HttpHandlerRenderer } from '#~/engine/connection-points/renderers/api/http-handler.renderer';
import { RouterRenderer } from '#~/engine/connection-points/renderers/api/router.renderer';
import { StartupTaskRenderer } from '#~/engine/connection-points/renderers/api/startup-task.renderer';
import { CiRenderer } from '#~/engine/connection-points/renderers/ci.renderer';
import { ComposeRenderer } from '#~/engine/connection-points/renderers/compose.renderer';
import { EnvRenderer } from '#~/engine/connection-points/renderers/env.renderer';
import { RootScriptsRenderer } from '#~/engine/connection-points/renderers/root-scripts.renderer';
import { WebDevtoolsPluginRenderer } from '#~/engine/connection-points/renderers/web/web-devtools-plugin.renderer';
import { WebRootPreloadRenderer } from '#~/engine/connection-points/renderers/web/web-root-preload.renderer';
import { WebSlotRenderer } from '#~/engine/connection-points/renderers/web/web-slot.renderer';
import { PackageJsonMerger } from '#~/engine/merge/package-json-merger';
import { PnpmWorkspaceMerger } from '#~/engine/merge/pnpm-workspace-merger';
import { ModuleRegistry } from '#~/engine/modules/module-registry';
import { ModuleResolver } from '#~/engine/modules/module-resolver';
import { ModuleSourceReader } from '#~/engine/modules/module-source-reader';
import { ProjectComposer } from '#~/engine/project-composer';
import { ProjectGenerator } from '#~/engine/project-generator';
import { ProjectTargetGuard } from '#~/engine/project-target-guard';
import { ProjectUpdater } from '#~/engine/project-updater';
import { ProjectWriter } from '#~/engine/project-writer';
import { ControlBlockRenderer } from '#~/engine/render/control-block-renderer';
import { MarkdownRenderer } from '#~/engine/render/markdown-renderer';
import { TemplateRenderer } from '#~/engine/render/template-renderer';
import type { SourceLayout } from '#~/enums/files/source-layouts.enums';
import { SOURCE_LAYOUTS } from '#~/enums/files/source-layouts.enums';
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
