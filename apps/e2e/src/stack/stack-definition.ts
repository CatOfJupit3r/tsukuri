import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';

import { generatedComposeServices } from '#~/generated/compose-services';
import { generatedDevTasks } from '#~/generated/dev-tasks';

import { readPortEntries, readPublishedPort } from './published-ports';
import { ENV_EXAMPLE_PATH, ROOT_PACKAGE_JSON_PATH } from './stack-paths';

/** The dev task of the web app, whose port is the stack's base URL and which the stack serves from a build. */
const WEB_DEV_TASK_FILTER = 'web';

export interface iStackService {
  name: string;
  definition: Record<string, unknown>;
}

export interface iStackApp {
  /** pnpm filter of the workspace whose `dev` script starts the app. */
  filter: string;
  devPort: number;
  /**
   * Served from a production build (its `build`, then `serve --port <port>`) instead of its dev server, so pages
   * load like the deployed app instead of compiling modules on their first request.
   */
  isServedFromBuild: boolean;
}

/** What a stack runs, read from the project's dev setup: compose services, dev servers and `.env.example`. */
export interface iStackDefinition {
  projectName: string;
  services: iStackService[];
  apps: iStackApp[];
  exampleEnvironment: Record<string, string>;
  /** Every port of the dev setup; a stack moves each one to its slot's port. */
  devPorts: number[];
  webDevPort: number;
}

interface iStackDefinitionSources {
  projectName: string;
  composeServices: readonly { name: string; service: Record<string, unknown> }[];
  devTasks: readonly { filter: string; portVariable: string | null }[];
  exampleEnvironment: Record<string, string>;
}

function readAppDevPort(task: iStackDefinitionSources['devTasks'][number], environment: Record<string, string>) {
  const devPort = task.portVariable === null ? Number.NaN : Number(environment[task.portVariable]);
  if (!Number.isInteger(devPort) || devPort <= 0) {
    throw new Error(
      `The "${task.filter}" dev task has no port in .env.example (${task.portVariable ?? 'no port variable'}); the E2E stack starts every app on its slot's port.`,
    );
  }
  return devPort;
}

export function createStackDefinition(sources: iStackDefinitionSources): iStackDefinition {
  const apps = sources.devTasks.map((task) => ({
    filter: task.filter,
    devPort: readAppDevPort(task, sources.exampleEnvironment),
    isServedFromBuild: task.filter === WEB_DEV_TASK_FILTER,
  }));
  const webApp = apps.find((app) => app.filter === WEB_DEV_TASK_FILTER);
  if (webApp === undefined) throw new Error('The E2E stack needs the web app, but no dev task starts it.');

  const services = sources.composeServices.map(({ name, service }) => ({ name, definition: service }));
  const servicePorts = services.flatMap((service) =>
    readPortEntries(service.definition).flatMap((entry) => readPublishedPort(entry) ?? []),
  );

  return {
    projectName: sources.projectName,
    services,
    apps,
    exampleEnvironment: sources.exampleEnvironment,
    devPorts: [...new Set([...apps.map((app) => app.devPort), ...servicePorts])],
    webDevPort: webApp.devPort,
  };
}

async function readProjectName() {
  const rootPackage: unknown = JSON.parse(await readFile(ROOT_PACKAGE_JSON_PATH, 'utf8'));
  const name = typeof rootPackage === 'object' && rootPackage !== null ? Reflect.get(rootPackage, 'name') : null;
  return typeof name === 'string' ? name : 'project';
}

async function readExampleEnvironment() {
  const parsed = parseEnv(await readFile(ENV_EXAMPLE_PATH, 'utf8'));
  return Object.fromEntries(
    Object.entries(parsed).flatMap(([key, value]) => (value === undefined ? [] : [[key, value]])),
  );
}

/** This project's stack definition. */
export async function readStackDefinition() {
  return createStackDefinition({
    projectName: await readProjectName(),
    composeServices: generatedComposeServices,
    devTasks: generatedDevTasks,
    exampleEnvironment: await readExampleEnvironment(),
  });
}
