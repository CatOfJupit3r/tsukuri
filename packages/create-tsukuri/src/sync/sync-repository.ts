import path from 'node:path';
import 'reflect-metadata';

import { createGeneratorContainer } from '#~/di/container';

import { RepositoryConnectionPoints } from './repository-connection-points';

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, '../../../..');

const repositoryConnectionPoints = createGeneratorContainer({ sourceRoot: REPOSITORY_ROOT }).resolve(
  RepositoryConnectionPoints,
);
const plan = await repositoryConnectionPoints.plan(REPOSITORY_ROOT);
await repositoryConnectionPoints.apply(REPOSITORY_ROOT, plan);

for (const file of plan.writes) console.log(`wrote   ${file.path}`);
for (const filePath of plan.deletions) console.log(`removed ${filePath}`);
console.log(
  plan.writes.length + plan.deletions.length === 0 ? 'Connection points are up to date.' : 'Connection points synced.',
);
