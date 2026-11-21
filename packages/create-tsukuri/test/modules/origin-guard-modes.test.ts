import { readFileSync } from 'node:fs';
import path from 'node:path';

import { ORIGIN_GUARD_MODES } from '#~/enums/origin-guard-modes.enums';

import { REPOSITORY_ROOT } from '../helpers/temp-dir';

const API_MODES_FILE = path.join(REPOSITORY_ROOT, 'packages/api/src/features/http/request-origin-modes.enums.ts');

describe('origin guard modes', () => {
  it('offers exactly the modes the API guard understands, so a rename on either side breaks the build', () => {
    const apiSource = readFileSync(API_MODES_FILE, 'utf8');
    const apiModes = [...apiSource.matchAll(/^\s+[A-Z_]+: '([a-z-]+)',?$/gm)].map(([, mode]) => mode);

    expect(apiModes.sort()).toEqual(Object.values(ORIGIN_GUARD_MODES).sort());
  });
});
