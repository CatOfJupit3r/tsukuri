import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

import { isProcessRunning } from '#~/processes/process-tree';

const RETRY_INTERVAL_MS = 500;
const CONNECT_TIMEOUT_MS = 1_000;
/** A first page request can render a lot; a slow answer still means the server is up. */
const REQUEST_TIMEOUT_MS = 30_000;
/** Answers below this status mean the server is up, even when the page itself is an error. */
const SERVER_ERROR_STATUS = 500;

export interface iWaitOptions {
  timeoutMs: number;
  /** Ends the wait early, rejecting with the signal's reason. */
  signal?: AbortSignal;
}

async function waitUntil(description: string, { timeoutMs, signal }: iWaitOptions, isReady: () => Promise<boolean>) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    signal?.throwIfAborted();
    if (await isReady()) return;
    await delay(RETRY_INTERVAL_MS, undefined, { signal });
  }
  throw new Error(`Gave up after ${timeoutMs / 1000}s waiting for ${description}`);
}

async function acceptsConnections(port: number) {
  return new Promise<boolean>((resolve) => {
    const socket = net.connect({ port, host: 'localhost', autoSelectFamily: true, timeout: CONNECT_TIMEOUT_MS });
    const finish = (isConnected: boolean) => {
      socket.destroy();
      resolve(isConnected);
    };
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

async function answers(url: string) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    return response.status < SERVER_ERROR_STATUS;
  } catch {
    return false;
  }
}

export async function waitForProcessExit(pid: number, options: iWaitOptions) {
  await waitUntil(`process ${pid} to exit`, options, async () => !isProcessRunning(pid));
}

export async function waitForPort(port: number, options: iWaitOptions) {
  await waitUntil(`port ${port} to accept connections`, options, async () => acceptsConnections(port));
}

export async function waitForUrl(url: string, options: iWaitOptions) {
  await waitUntil(`${url} to answer`, options, async () => answers(url));
}
