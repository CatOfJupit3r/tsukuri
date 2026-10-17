import { renderModuleBlocks } from '@~/engine/module-blocks';
import { GENERATOR_ERROR_CODES } from '@~/enums/generator-error-codes.enums';

import { testModuleId } from '../helpers/manifests';

vi.mock('@~/enums/module-ids.enums', () => import('../helpers/test-module-ids'));

const installed = new Set([testModuleId('base'), testModuleId('alpha')]);

describe('renderModuleBlocks', () => {
  it('keeps blocks for installed modules and drops the rest, including the tag lines', () => {
    const text = [
      'intro',
      '<module id="alpha">',
      'alpha only',
      '</module>',
      '<module id="beta">',
      'beta only',
      '</module>',
      'outro',
    ].join('\n');

    expect(renderModuleBlocks(text, installed, 'doc.md')).toBe('intro\nalpha only\noutro');
  });

  it('treats a comma list as "any installed" and `not` as "none installed"', () => {
    const text = [
      '<module id="beta, alpha">',
      'either',
      '</module>',
      '<module not="beta">',
      'without beta',
      '</module>',
      '<module not="alpha,gamma">',
      'without alpha or gamma',
      '</module>',
    ].join('\n');

    expect(renderModuleBlocks(text, installed, 'doc.md')).toBe('either\nwithout beta');
  });

  it('drops a nested block when any enclosing block is dropped', () => {
    const text = [
      '<module id="beta">',
      'outer',
      '<module id="alpha">',
      'inner',
      '</module>',
      '</module>',
      '<module id="alpha">',
      '<module not="beta">',
      'kept',
      '</module>',
      '</module>',
    ].join('\n');

    expect(renderModuleBlocks(text, installed, 'doc.md')).toBe('kept');
  });

  it('collapses the blank lines a dropped block leaves behind', () => {
    const text = ['a', '', '<module id="beta">', 'b', '</module>', '', 'c'].join('\n');

    expect(renderModuleBlocks(text, installed, 'doc.md')).toBe('a\n\nc');
  });

  it('reports unbalanced tags and unknown module ids with their location', () => {
    expect(() => renderModuleBlocks('<module id="alpha">\ntext', installed, 'doc.md')).toThrow(
      expect.objectContaining({
        code: GENERATOR_ERROR_CODES.INVALID_MANIFEST,
        message: expect.stringContaining('doc.md:1'),
      }),
    );
    expect(() => renderModuleBlocks('text\n</module>', installed, 'doc.md')).toThrow(
      expect.objectContaining({ message: expect.stringContaining('doc.md:2: unmatched') }),
    );
    expect(() => renderModuleBlocks('<module id="nope">\n</module>', installed, 'doc.md')).toThrow(
      expect.objectContaining({ message: expect.stringContaining('"nope"') }),
    );
  });
});
