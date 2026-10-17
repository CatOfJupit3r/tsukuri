import { serve } from '@hono/node-server';
import { Hono } from 'hono';

import { ENV } from './constants/env';

const app = new Hono();

app.get('/health', (context) => context.json({ isHealthy: true }));

serve({ fetch: app.fetch, port: ENV.PORT });
