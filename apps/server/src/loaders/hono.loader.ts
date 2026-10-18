import { tsyringe } from '@hono/tsyringe';
import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins';
import { onError } from '@orpc/server';
import { RPCHandler } from '@orpc/server/fetch';
import { ZodToJsonSchemaConverter } from '@orpc/zod';
import { em } from 'enumwaii';
import { Hono } from 'hono';
import type { Context as HonoContext } from 'hono';
import { contextStorage } from 'hono/context-storage';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { isEmpty } from 'lodash-es';
import { container } from 'tsyringe';

import env from '@~/constants/env';
import { AuthService } from '@~/features/auth/auth.service';
import { LoggerFactory } from '@~/features/logger/logger.factory';
import { requestContextMiddleware } from '@~/features/logger/logger.middleware';
import type { iRequestContext } from '@~/features/logger/logger.types';
import { getORPCErrorMetadata, isORPCError, shouldLogORPCError } from '@~/lib/orpc-error-wrapper';
import { appRouter } from '@~/routers/app-router';
import nonContractRouter from '@~/routers/non-contract.router';

interface iCreateContextOptions {
  context: HonoContext<iRequestContext>;
}

const orpcTransportsEnumwaii = em(['API', 'RPC']);

const ORPC_TRANSPORTS = orpcTransportsEnumwaii.enum;
type ORPCTransport = (typeof orpcTransportsEnumwaii)['~type'];

function contextGenerator() {
  return async function createContext({ context }: iCreateContextOptions) {
    const session = context.get('session');
    // eslint-disable-next-line @typescript-eslint/prefer-destructuring
    const resolve = context.var.resolve;
    return {
      session,
      resolve,
    };
  };
}

function getOperationName(pathname: string | undefined) {
  if (!pathname) {
    return 'unknown-operation';
  }

  return pathname.replace(/^\/+/, '').replace(/\//g, '.');
}

function logTransportError(
  apiLogger: ReturnType<LoggerFactory['create']>,
  transport: ORPCTransport,
  error: unknown,
  pathname: string | undefined,
) {
  if (!shouldLogORPCError(error)) {
    return;
  }

  const metadata = getORPCErrorMetadata(error);
  const operation = metadata?.operation ?? getOperationName(pathname);

  apiLogger.error(`${transport} unexpected error in ${operation}`, {
    transport,
    operation,
    pathname,
    ...metadata?.context,
    ...(isORPCError(error)
      ? {
          errorCode: error.code,
          errorStatus: error.status,
          error: error.cause ?? error,
        }
      : { error }),
  });
}

export type Context = Awaited<ReturnType<ReturnType<typeof contextGenerator>>>;

export default async function honoLoader() {
  const app = new Hono<iRequestContext>();

  const auth = container.resolve(AuthService).getInstance();
  const apiLogger = container.resolve(LoggerFactory).create('API');

  const createContext = contextGenerator();

  // Request-scoped DI container - creates a child container per request
  app.use('/*', tsyringe());
  app.use('/*', requestContextMiddleware);

  app.use(contextStorage());
  app.use(
    logger((msg, ...info) => {
      const meta = isEmpty(info) ? undefined : { info };
      apiLogger.debug(msg, meta);
    }),
  );
  app.use(
    '/*',
    cors({
      origin: env.CORS_ORIGIN,
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    }),
  );
  app.on(['POST', 'GET'], '/auth/*', async (c) => auth.handler(c.req.raw));

  app.route('/', nonContractRouter);

  const apiHandler = new OpenAPIHandler(appRouter, {
    plugins: [
      new OpenAPIReferencePlugin({
        schemaConverters: [new ZodToJsonSchemaConverter()],
      }),
    ],
    interceptors: [
      onError((error, options) => {
        logTransportError(apiLogger, ORPC_TRANSPORTS.API, error, options.request.url.pathname);
      }),
    ],
  });

  const rpcHandler = new RPCHandler(appRouter, {
    interceptors: [
      onError((error, options) => {
        logTransportError(apiLogger, ORPC_TRANSPORTS.RPC, error, options.request.url.pathname);
      }),
    ],
  });

  app.use('/*', async (c, next) => {
    const context = await createContext({ context: c });

    const apiResult = await apiHandler.handle(c.req.raw, {
      context,
    });

    if (apiResult.matched) {
      return c.newResponse(apiResult.response.body, apiResult.response);
    }

    const rpcResult = await rpcHandler.handle(c.req.raw, {
      prefix: '/rpc',
      context,
    });

    if (rpcResult.matched) {
      return c.newResponse(rpcResult.response.body, rpcResult.response);
    }

    return next();
  });

  app.get('/', (c) => c.text('OK'));

  return { app, appRouter };
}
