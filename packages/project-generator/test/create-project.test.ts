import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';
import z from 'zod';

import { createProject } from '../src/create-project';
import { PROJECT_PARTS } from '../src/project-options';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const temporaryDirectories: string[] = [];
const packageJsonSchema = z
  .object({
    name: z.string(),
    scripts: z.record(z.string(), z.string()),
  })
  .loose();

async function createTemporaryTarget(projectName: string): Promise<string> {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'ultimate-starter-generator-'));
  temporaryDirectories.push(temporaryDirectory);
  return path.join(temporaryDirectory, projectName);
}

async function readPackageJson(filePath: string) {
  return packageJsonSchema.parse(JSON.parse(await readFile(filePath, 'utf8')));
}

async function findText(directoryPath: string, searchText: string): Promise<string[]> {
  const matches: string[] = [];
  const entries = await readdir(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      matches.push(...(await findText(entryPath, searchText)));
      continue;
    }
    if (!entry.isFile()) continue;

    const contents = await readFile(entryPath);
    if (contents.includes(0)) continue;
    if (contents.toString('utf8').includes(searchText)) matches.push(entryPath);
  }

  return matches;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directoryPath) => rm(directoryPath, { recursive: true })));
});

describe('createProject', () => {
  it('creates the complete server and web starter with renamed workspaces', async () => {
    const targetRoot = await createTemporaryTarget('full-stack-app');

    await createProject({
      projectName: 'full-stack-app',
      projectParts: [PROJECT_PARTS.SERVER, PROJECT_PARTS.WEB],
      shouldIncludeStarter: true,
      sourceRoot,
      targetRoot,
    });

    const rootPackage = await readPackageJson(path.join(targetRoot, 'package.json'));
    const { scripts } = rootPackage;

    expect(rootPackage.name).toBe('full-stack-app');
    expect(scripts.dev).toContain('--filter=server');
    expect(scripts.dev).toContain('--filter=web');
    expect(scripts.create).toBeUndefined();
    await expect(readFile(path.join(targetRoot, 'apps/server/src/features/auth/auth.service.ts'))).resolves.toBeDefined();
    await expect(readFile(path.join(targetRoot, 'apps/web/src/features/auth/components/sign-in-form.tsx'))).resolves.toBeDefined();
    await expect(readFile(path.join(targetRoot, 'configs/eslint-config/package.json'))).resolves.toBeDefined();
    await expect(readFile(path.join(targetRoot, 'apps/server/.development.env'))).rejects.toThrow();
    await expect(readFile(path.join(targetRoot, 'packages/project-generator/package.json'))).rejects.toThrow();
    await expect(readFile(path.join(targetRoot, 'pnpm-lock.yaml'))).rejects.toThrow();
    expect(await findText(targetRoot, 'startername')).toEqual([]);
  });

  it('creates a server-only starter and removes web-specific commands', async () => {
    const targetRoot = await createTemporaryTarget('server-app');

    await createProject({
      projectName: 'server-app',
      projectParts: [PROJECT_PARTS.SERVER],
      shouldIncludeStarter: true,
      sourceRoot,
      targetRoot,
    });

    const rootPackage = await readPackageJson(path.join(targetRoot, 'package.json'));
    const { scripts } = rootPackage;

    await expect(readFile(path.join(targetRoot, 'apps/server/package.json'))).resolves.toBeDefined();
    await expect(readFile(path.join(targetRoot, 'apps/web/package.json'))).rejects.toThrow();
    await expect(readFile(path.join(targetRoot, 'docker-compose.dev.yml'))).resolves.toBeDefined();
    expect(scripts['dev:web']).toBeUndefined();
    expect(scripts['dev:server']).toBeDefined();
  });

  it('creates a web-only starter without local server infrastructure', async () => {
    const targetRoot = await createTemporaryTarget('web-app');

    await createProject({
      projectName: 'web-app',
      projectParts: [PROJECT_PARTS.WEB],
      shouldIncludeStarter: true,
      sourceRoot,
      targetRoot,
    });

    const rootPackage = await readPackageJson(path.join(targetRoot, 'package.json'));
    const { scripts } = rootPackage;

    await expect(readFile(path.join(targetRoot, 'apps/web/package.json'))).resolves.toBeDefined();
    await expect(readFile(path.join(targetRoot, 'apps/server/package.json'))).rejects.toThrow();
    await expect(readFile(path.join(targetRoot, 'docker-compose.dev.yml'))).rejects.toThrow();
    await expect(readFile(path.join(targetRoot, 'packages/server-contract/package.json'))).resolves.toBeDefined();
    expect(scripts['dev:server']).toBeUndefined();
    expect(scripts['dev:web']).toBeDefined();
  });

  it('creates a minimal foundation without auth or domain packages', async () => {
    const targetRoot = await createTemporaryTarget('minimal-app');

    await createProject({
      projectName: 'minimal-app',
      projectParts: [PROJECT_PARTS.SERVER, PROJECT_PARTS.WEB],
      shouldIncludeStarter: false,
      sourceRoot,
      targetRoot,
    });

    const serverPackageText = await readFile(path.join(targetRoot, 'apps/server/package.json'), 'utf8');
    const webPackageText = await readFile(path.join(targetRoot, 'apps/web/package.json'), 'utf8');
    const workspaceConfigText = await readFile(path.join(targetRoot, 'pnpm-workspace.yaml'), 'utf8');
    const rootPackage = await readPackageJson(path.join(targetRoot, 'package.json'));
    const { scripts } = rootPackage;

    expect(serverPackageText).not.toContain('better-auth');
    expect(webPackageText).not.toContain('better-auth');
    expect(workspaceConfigText).not.toContain('better-auth');
    await expect(readFile(path.join(targetRoot, 'patches/better-auth.patch'))).rejects.toThrow();
    await expect(readFile(path.join(targetRoot, 'packages/common/package.json'))).rejects.toThrow();
    await expect(readFile(path.join(targetRoot, 'packages/server-contract/package.json'))).rejects.toThrow();
    await expect(readFile(path.join(targetRoot, 'packages/enumwaii/package.json'))).resolves.toBeDefined();
    await expect(readFile(path.join(targetRoot, 'configs/prettier-config/package.json'))).resolves.toBeDefined();
    expect(scripts['db:generate']).toBeUndefined();
    expect(scripts.dev).not.toContain('docker compose');
  });
});
