import { injectable } from 'tsyringe';

import type { ConnectionPointKind } from '#~/enums/connection-point-kinds.enums';
import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import type { iConnectionPointContribution } from '#~/manifest/connection-point.schema';
import type { iModuleManifest } from '#~/manifest/module-manifest.schema';

import type { iTemplateContext } from '../render/template-renderer';
import type {
  iConnectionPointRenderer,
  iContributionOfKind,
  iGeneratedConnectionPoints,
  iOwnedContribution,
} from './connection-point.types';
import { GENERATED_HEADER } from './generated-header';
import { ContextProviderRenderer } from './renderers/api/context-provider.renderer';
import { ContractRenderer } from './renderers/api/contract.renderer';
import { DatabaseSchemaRenderer } from './renderers/api/database-schema.renderer';
import { DiRegistrationRenderer } from './renderers/api/di-registration.renderer';
import { ErrorCodeRenderer } from './renderers/api/error-code.renderer';
import { HttpHandlerRenderer } from './renderers/api/http-handler.renderer';
import { RouterRenderer } from './renderers/api/router.renderer';
import { StartupTaskRenderer } from './renderers/api/startup-task.renderer';
import { CiRenderer } from './renderers/ci.renderer';
import { ComposeRenderer } from './renderers/compose.renderer';
import { DevTaskRenderer } from './renderers/dev-task.renderer';
import { EnvRenderer } from './renderers/env.renderer';
import { RootScriptsRenderer } from './renderers/root-scripts.renderer';
import { WebDevtoolsPluginRenderer } from './renderers/web/web-devtools-plugin.renderer';
import { WebRootPreloadRenderer } from './renderers/web/web-root-preload.renderer';
import { WebSlotRenderer } from './renderers/web/web-slot.renderer';
import { WorkerBindingRenderer } from './renderers/worker-binding.renderer';

/**
 * Builds the files where modules meet (router and contract maps, DI registrations, startup tasks,
 * HTTP handlers, API context, database schema, error codes, env schema, Worker bindings, compose file,
 * compose services and dev tasks as data, CI workflow, root scripts) from the installed modules'
 * contributions. Output depends only on the module list, so regenerating is idempotent.
 */
@injectable()
export class ConnectionPointGenerator {
  public constructor(
    private readonly routerRenderer: RouterRenderer,
    private readonly contractRenderer: ContractRenderer,
    private readonly diRegistrationRenderer: DiRegistrationRenderer,
    private readonly startupTaskRenderer: StartupTaskRenderer,
    private readonly httpHandlerRenderer: HttpHandlerRenderer,
    private readonly contextProviderRenderer: ContextProviderRenderer,
    private readonly databaseSchemaRenderer: DatabaseSchemaRenderer,
    private readonly errorCodeRenderer: ErrorCodeRenderer,
    private readonly webSlotRenderer: WebSlotRenderer,
    private readonly webRootPreloadRenderer: WebRootPreloadRenderer,
    private readonly webDevtoolsPluginRenderer: WebDevtoolsPluginRenderer,
    private readonly envRenderer: EnvRenderer,
    private readonly workerBindingRenderer: WorkerBindingRenderer,
    private readonly composeRenderer: ComposeRenderer,
    private readonly devTaskRenderer: DevTaskRenderer,
    private readonly ciRenderer: CiRenderer,
    private readonly rootScriptsRenderer: RootScriptsRenderer,
  ) {}

  public async generate(modules: iModuleManifest[], context: iTemplateContext): Promise<iGeneratedConnectionPoints> {
    const templateContext = { ...context, header: GENERATED_HEADER };
    const contributions = modules.flatMap((manifest) =>
      manifest.contributions.map((contribution) => ({ moduleId: manifest.id, contribution })),
    );

    const renderHosted = async <K extends ConnectionPointKind>(
      renderer: iConnectionPointRenderer<iContributionOfKind<K>>,
      kind: K,
    ) => renderer.render(this.ofKind(contributions, kind), templateContext, this.hostsOf(modules, kind));

    const files = [
      ...(await renderHosted(this.routerRenderer, CONNECTION_POINT_KINDS.ROUTER)),
      ...(await renderHosted(this.contractRenderer, CONNECTION_POINT_KINDS.CONTRACT)),
      ...(await renderHosted(this.diRegistrationRenderer, CONNECTION_POINT_KINDS.DI_REGISTRATION)),
      ...(await renderHosted(this.startupTaskRenderer, CONNECTION_POINT_KINDS.STARTUP_TASK)),
      ...(await renderHosted(this.httpHandlerRenderer, CONNECTION_POINT_KINDS.HTTP_HANDLER)),
      ...(await renderHosted(this.contextProviderRenderer, CONNECTION_POINT_KINDS.CONTEXT_PROVIDER)),
      ...(await renderHosted(this.databaseSchemaRenderer, CONNECTION_POINT_KINDS.DATABASE_SCHEMA)),
      ...(await renderHosted(this.errorCodeRenderer, CONNECTION_POINT_KINDS.ERROR_CODE)),
      ...(await renderHosted(this.webSlotRenderer, CONNECTION_POINT_KINDS.WEB_COMPONENT)),
      ...(await renderHosted(this.webRootPreloadRenderer, CONNECTION_POINT_KINDS.WEB_ROOT_PRELOAD)),
      ...(await renderHosted(this.webDevtoolsPluginRenderer, CONNECTION_POINT_KINDS.WEB_DEVTOOLS_PLUGIN)),
      ...(await this.envRenderer.render(
        [
          ...this.ofKind(contributions, CONNECTION_POINT_KINDS.ENV_SHAPE),
          ...this.ofKind(contributions, CONNECTION_POINT_KINDS.ENV_VARIABLE),
        ],
        templateContext,
        this.hostsOf(modules, CONNECTION_POINT_KINDS.ENV_SHAPE),
      )),
      ...(await renderHosted(this.workerBindingRenderer, CONNECTION_POINT_KINDS.WORKER_BINDING)),
      ...(await renderHosted(this.composeRenderer, CONNECTION_POINT_KINDS.COMPOSE_SERVICE)),
      ...(await renderHosted(this.devTaskRenderer, CONNECTION_POINT_KINDS.DEV_TASK)),
      ...(await this.ciRenderer.render(
        this.ofKind(contributions, CONNECTION_POINT_KINDS.CI_STEP),
        this.ofKind(contributions, CONNECTION_POINT_KINDS.CI_JOB),
      )),
    ];

    return {
      files,
      rootPackageJson: this.rootScriptsRenderer.render(
        this.ofKind(contributions, CONNECTION_POINT_KINDS.DEV_TASK),
        this.ofKind(contributions, CONNECTION_POINT_KINDS.BUILD_TASK),
        files,
      ),
    };
  }

  private hostsOf(modules: iModuleManifest[], kind: ConnectionPointKind) {
    return modules.flatMap((manifest) =>
      manifest.hosts.filter((host) => host.kind === kind).map((host) => host.workspace),
    );
  }

  private ofKind<K extends ConnectionPointKind>(
    contributions: iOwnedContribution<iConnectionPointContribution>[],
    kind: K,
  ) {
    return contributions.filter(
      (item): item is iOwnedContribution<iContributionOfKind<K>> => item.contribution.kind === kind,
    );
  }
}
