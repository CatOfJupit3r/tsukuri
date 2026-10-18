import { injectable } from 'tsyringe';

import type { ConnectionPointKind } from '#~/enums/connection-point-kinds.enums';
import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import type { iConnectionPointContribution } from '#~/manifest/connection-point.schema';
import type { iModuleManifest } from '#~/manifest/module-manifest.schema';

import type { iTemplateContext } from '../template-renderer';
import type { iContributionOfKind, iGeneratedConnectionPoints, iOwnedContribution } from './connection-point.types';
import { GENERATED_HEADER } from './generated-header';
import { CiRenderer } from './renderers/ci.renderer';
import { ComposeRenderer } from './renderers/compose.renderer';
import { ContextProviderRenderer } from './renderers/context-provider.renderer';
import { ContractRenderer } from './renderers/contract.renderer';
import { DatabaseSchemaRenderer } from './renderers/database-schema.renderer';
import { DiRegistrationRenderer } from './renderers/di-registration.renderer';
import { EnvRenderer } from './renderers/env.renderer';
import { ErrorCodeRenderer } from './renderers/error-code.renderer';
import { HttpHandlerRenderer } from './renderers/http-handler.renderer';
import { RootScriptsRenderer } from './renderers/root-scripts.renderer';
import { RouterRenderer } from './renderers/router.renderer';
import { StartupTaskRenderer } from './renderers/startup-task.renderer';
import { WebDevtoolsPluginRenderer } from './renderers/web-devtools-plugin.renderer';
import { WebRootPreloadRenderer } from './renderers/web-root-preload.renderer';
import { WebSlotRenderer } from './renderers/web-slot.renderer';

/**
 * Builds the files where modules meet (router and contract maps, DI registrations, startup tasks,
 * HTTP handlers, API context, database schema, error codes, env schema, compose file, CI workflow,
 * root scripts) from the installed modules' contributions. Output depends only on the module list,
 * so regenerating is idempotent.
 */
@injectable()
export class ConnectionPointGenerator {
  constructor(
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
    private readonly composeRenderer: ComposeRenderer,
    private readonly ciRenderer: CiRenderer,
    private readonly rootScriptsRenderer: RootScriptsRenderer,
  ) {}

  public async generate(modules: iModuleManifest[], context: iTemplateContext): Promise<iGeneratedConnectionPoints> {
    const templateContext = { ...context, header: GENERATED_HEADER };
    const contributions = modules.flatMap((manifest) =>
      manifest.contributions.map((contribution) => ({ moduleId: manifest.id, contribution })),
    );

    const files = [
      ...(await this.routerRenderer.render(
        this.ofKind(contributions, CONNECTION_POINT_KINDS.ROUTER),
        templateContext,
        this.hostsOf(modules, CONNECTION_POINT_KINDS.ROUTER),
      )),
      ...(await this.contractRenderer.render(
        this.ofKind(contributions, CONNECTION_POINT_KINDS.CONTRACT),
        templateContext,
        this.hostsOf(modules, CONNECTION_POINT_KINDS.CONTRACT),
      )),
      ...(await this.diRegistrationRenderer.render(
        this.ofKind(contributions, CONNECTION_POINT_KINDS.DI_REGISTRATION),
        templateContext,
        this.hostsOf(modules, CONNECTION_POINT_KINDS.DI_REGISTRATION),
      )),
      ...(await this.startupTaskRenderer.render(
        this.ofKind(contributions, CONNECTION_POINT_KINDS.STARTUP_TASK),
        templateContext,
        this.hostsOf(modules, CONNECTION_POINT_KINDS.STARTUP_TASK),
      )),
      ...(await this.httpHandlerRenderer.render(
        this.ofKind(contributions, CONNECTION_POINT_KINDS.HTTP_HANDLER),
        templateContext,
        this.hostsOf(modules, CONNECTION_POINT_KINDS.HTTP_HANDLER),
      )),
      ...(await this.contextProviderRenderer.render(
        this.ofKind(contributions, CONNECTION_POINT_KINDS.CONTEXT_PROVIDER),
        templateContext,
        this.hostsOf(modules, CONNECTION_POINT_KINDS.CONTEXT_PROVIDER),
      )),
      ...(await this.databaseSchemaRenderer.render(
        this.ofKind(contributions, CONNECTION_POINT_KINDS.DATABASE_SCHEMA),
        templateContext,
        this.hostsOf(modules, CONNECTION_POINT_KINDS.DATABASE_SCHEMA),
      )),
      ...(await this.errorCodeRenderer.render(
        this.ofKind(contributions, CONNECTION_POINT_KINDS.ERROR_CODE),
        templateContext,
        this.hostsOf(modules, CONNECTION_POINT_KINDS.ERROR_CODE),
      )),
      ...(await this.webSlotRenderer.render(
        this.ofKind(contributions, CONNECTION_POINT_KINDS.WEB_COMPONENT),
        templateContext,
        this.hostsOf(modules, CONNECTION_POINT_KINDS.WEB_COMPONENT),
      )),
      ...(await this.webRootPreloadRenderer.render(
        this.ofKind(contributions, CONNECTION_POINT_KINDS.WEB_ROOT_PRELOAD),
        templateContext,
        this.hostsOf(modules, CONNECTION_POINT_KINDS.WEB_ROOT_PRELOAD),
      )),
      ...(await this.webDevtoolsPluginRenderer.render(
        this.ofKind(contributions, CONNECTION_POINT_KINDS.WEB_DEVTOOLS_PLUGIN),
        templateContext,
        this.hostsOf(modules, CONNECTION_POINT_KINDS.WEB_DEVTOOLS_PLUGIN),
      )),
      ...(await this.envRenderer.render(
        this.ofKind(contributions, CONNECTION_POINT_KINDS.ENV_VARIABLE),
        templateContext,
        this.hostsOf(modules, CONNECTION_POINT_KINDS.ENV_VARIABLE),
      )),
      ...(await this.composeRenderer.render(this.ofKind(contributions, CONNECTION_POINT_KINDS.COMPOSE_SERVICE))),
      ...(await this.ciRenderer.render(this.ofKind(contributions, CONNECTION_POINT_KINDS.CI_STEP))),
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
