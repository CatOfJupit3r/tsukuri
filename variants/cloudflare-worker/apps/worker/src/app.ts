import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { container } from 'tsyringe';

import type { ApiRequestHandler } from '@startername/api/features/http/api-request-handler';
import { LoggerFactory } from '@startername/api/features/logger/logger.factory';

import { env } from '#~/constants/env';

const CORS_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const CORS_HEADERS = ['Content-Type', 'Authorization'];

/** Hono serves CORS and request logging; every route itself comes from the shared API. */
export function createApp(apiRequestHandler: ApiRequestHandler) {
  const app = new Hono();
  const httpLogger = container.resolve(LoggerFactory).create('HTTP');

  app.use(logger((message) => httpLogger.debug(message)));
  app.use(
    '/*',
    cors({
      origin: env.CORS_ORIGIN,
      allowMethods: CORS_METHODS,
      allowHeaders: CORS_HEADERS,
      credentials: true,
    }),
  );

  app.use('/*', async (c, next) => (await apiRequestHandler.handle(c.req.raw)) ?? next());

  return app;
}
