import { ControlBlockRenderer } from '@~/engine/control-block-renderer';
import type { iControlBlockOptions } from '@~/engine/control-block-renderer';
import { GENERATOR_ERROR_CODES } from '@~/enums/generator-error-codes.enums';
import { HARNESSES } from '@~/enums/harnesses.enums';

const renderer = new ControlBlockRenderer();

function render(template: string, options: Omit<iControlBlockOptions, 'source'>) {
  return renderer.render(template, { ...options, source: 'fixture.md.hbs' });
}

describe('ControlBlockRenderer', () => {
  it('keeps the blocks of the output harness and private blocks only when they are included', () => {
    const template = [
      'shared',
      '<harness-specific id="codex">',
      'codex public',
      '<private>',
      'codex private',
      '</private>',
      '</harness-specific>',
      '<harness-specific id="claude">',
      'claude public',
      '<private>',
      'claude private',
      '</private>',
      '</harness-specific>',
      'shared end',
    ].join('\n');

    expect(render(template, { harness: HARNESSES.CODEX, includePrivate: true })).toBe(
      'shared\ncodex public\ncodex private\nshared end',
    );
    expect(render(template, { harness: HARNESSES.CLAUDE, includePrivate: false })).toBe(
      'shared\nclaude public\nshared end',
    );
    expect(render(template, { harness: null, includePrivate: true })).toBe('shared\nshared end');
  });

  it('drops excluded private content without leaving control tags behind', () => {
    const rendered = render('before\n  <private>\nsensitive\n</private>\nafter', {
      harness: HARNESSES.CODEX,
      includePrivate: false,
    });

    expect(rendered).toBe('before\nafter');
  });

  it('fails closed on malformed, mismatched and unclosed blocks, naming the template line', () => {
    const options = { harness: HARNESSES.CLAUDE, includePrivate: false };

    expect(() => render('<harness-specific id="other">\nsecret\n</harness-specific>', options)).toThrow(
      expect.objectContaining({
        code: GENERATOR_ERROR_CODES.TEMPLATE_ERROR,
        message: expect.stringContaining('fixture.md.hbs:1: malformed control tag'),
      }),
    );
    expect(() => render('<private>\n</harness-specific>\n</private>', options)).toThrow(
      'fixture.md.hbs:2: expected </private> before </harness-specific>',
    );
    expect(() => render('text\n</private>', options)).toThrow('fixture.md.hbs:2: unexpected </private>');
    expect(() => render('<private>\nsecret', options)).toThrow('fixture.md.hbs:1: unclosed <private> block');
  });
});
