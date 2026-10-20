import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins';
import { onError } from '@orpc/server';
import { RPCHandler } from '@orpc/server/fetch';
import { ZodToJsonSchemaConverter } from '@orpc/zod';
import { em } from 'enumwaii';
import { randomUUID } from 'node:crypto';
import { singleton } from 'tsyringe';

import { appRouter } from '#~/app-router';
import { LoggerFactory } from '#~/features/logger/logger.factory';
import type { iWithLogger, LoggerType } from '#~/features/logger/logger.types';
import { RequestContextStorage } from '#~/features/request-context/request-context.storage';
import { generatedHttpHandlers } from '#~/generated/http-handlers';
import { createApiContext } from '#~/lib/api-context';
import { getORPCErrorMetadata, isORPCError, shouldLogORPCError } from '#~/lib/orpc-error-wrapper';

import type { iHttpHandle } from './http-handler.types';

const orpcTransportsEnumwaii = em(['API', 'RPC']);

const ORPC_TRANSPORTS = orpcTransportsEnumwaii.enum;
type ORPCTransport = (typeof orpcTransportsEnumwaii)['~type'];

const RPC_PREFIX = '/rpc';
const PATH_SEPARATOR = '/';

interface iMountedHttpHandler {
  path: string;
  methods: readonly string[];
  handle: iHttpHandle;
}

/**
 * Serves one fetch `Request`: the installed modules' HTTP handlers first, then the REST (OpenAPI) and
 * RPC transports of the API router. Every backend adapter forwards requests here; `null` means no route
 * matched and the adapter may fall through.
 */
@singleton()
export class ApiRequestHandler implements iWithLogger {
  public readonly logger: LoggerType;

  private readonly httpHandlers: readonly iMountedHttpHandler[] = generatedHttpHandlers;

  private readonly openApiHandler: OpenAPIHandler<object>;

  private readonly rpcHandler: RPCHandler<object>;

  public constructor(
    loggerFactory: LoggerFactory,
    private readonly requestContext: RequestContextStorage,
  ) {
    this.logger = loggerFactory.create('API');
    this.openApiHandler = new OpenAPIHandler(appRouter, {
      plugins: [new OpenAPIReferencePlugin({ schemaConverters: [new ZodToJsonSchemaConverter()] })],
      interceptors: [
        onError((error, options) => this.logTransportError(ORPC_TRANSPORTS.API, error, options.request.url.pathname)),
      ],
    });
    this.rpcHandler = new RPCHandler(appRouter, {
      interceptors: [
        onError((error, options) => this.logTransportError(ORPC_TRANSPORTS.RPC, error, options.request.url.pathname)),
      ],
    });
  }

  public async handle(request: Request) {
    return this.requestContext.run({ requestId: randomUUID() }, async () => this.route(request));
  }

  private async route(request: Request): Promise<Response | null> {
    const httpHandler = this.findHttpHandler(request);
    if (httpHandler) return httpHandler.handle(request);

    const context = await createApiContext(request);

    const apiResult = await this.openApiHandler.handle(request, { context });
    if (apiResult.matched) return apiResult.response;

    const rpcResult = await this.rpcHandler.handle(request, { prefix: RPC_PREFIX, context });
    if (rpcResult.matched) return rpcResult.response;

    return null;
  }

  private findHttpHandler(request: Request) {
    const { pathname } = new URL(request.url);
    return this.httpHandlers.find(
      (handler) =>
        handler.methods.includes(request.method) &&
        (pathname === handler.path || pathname.startsWith(`${handler.path}${PATH_SEPARATOR}`)),
    );
  }

  private logTransportError(transport: ORPCTransport, error: unknown, pathname: string | undefined) {
    if (!shouldLogORPCError(error)) return;

    const metadata = getORPCErrorMetadata(error);
    const operation = metadata?.operation ?? this.operationName(pathname);

    this.logger.error(`${transport} unexpected error in ${operation}`, {
      transport,
      operation,
      pathname,
      ...metadata?.context,
      ...(isORPCError(error)
        ? { errorCode: error.code, errorStatus: error.status, error: error.cause ?? error }
        : { error }),
    });
  }

  private operationName(pathname: string | undefined) {
    if (!pathname) return 'unknown-operation';
    return pathname.replace(/^\/+/, '').replaceAll(PATH_SEPARATOR, '.');
  }
}
