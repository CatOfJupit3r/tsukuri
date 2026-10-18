import 'reflect-metadata';
import { container } from 'tsyringe';
import type { constructor } from 'tsyringe/dist/typings/types';

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
import { ProjectWriter } from '@~/engine/project-writer';
import { TemplateRenderer } from '@~/engine/template-renderer';
import type { iModuleManifestInput } from '@~/manifest/module-manifest.schema';
import { MODULE_MANIFESTS } from '@~/modules/module-manifests';

import { MODULE_MANIFESTS_TOKEN, SOURCE_ROOT_TOKEN } from './tokens';

export interface iGeneratorContainerOptions {
  /** Absolute directory the module sources are read from. */
  sourceRoot: string;
  manifests?: iModuleManifestInput[];
}

const SERVICES: constructor<object>[] = [
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
  ProjectGenerator,
];

/** One container per run: services are singletons inside it, never shared across runs or tests. */
export function createGeneratorContainer({ sourceRoot, manifests = MODULE_MANIFESTS }: iGeneratorContainerOptions) {
  const child = container.createChildContainer();
  child.register(SOURCE_ROOT_TOKEN, { useValue: sourceRoot });
  child.register(MODULE_MANIFESTS_TOKEN, { useValue: manifests });
  for (const service of SERVICES) child.registerSingleton(service);
  return child;
}
