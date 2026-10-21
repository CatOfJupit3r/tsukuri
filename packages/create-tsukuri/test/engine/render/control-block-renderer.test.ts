import { ControlBlockRenderer } from '#~/engine/render/control-block-renderer';
import type { iControlBlockOptions } from '#~/engine/render/control-block-renderer';
import { GENERATOR_ERROR_CODES } from '#~/enums/generator-error-codes.enums';

const renderer = new ControlBlockRenderer();

function render(template: string, options: Omit<iControlBlockOptions, 'source'>) {
  return renderer.render(template, { ...options, source: 'fixture.md.hbs' });
}

describe('ControlBlockRenderer', () => {
  it('keeps private blocks, nested ones included, only when the record includes them', () => {
    const template = ['shared', '<private>', 'private', '<private>', 'nested', '</private>', '</private>', 'end'].join(
      '\n',
    );

    expect(render(template, { includePrivate: true })).toBe('shared\nprivate\nnested\nend');
    expect(render(template, { includePrivate: false })).toBe('shared\nend');
  });

  it('drops excluded private content without leaving control tags behind', () => {
    const rendered = render('before\n  <private>\nsensitive\n</private>\nafter', { includePrivate: false });

    expect(rendered).toBe('before\nafter');
  });

  it('fails closed on malformed, unexpected and unclosed blocks, naming the template line', () => {
    const options = { includePrivate: false };

    expect(() => render('<private id="notes">\nsecret\n</private>', options)).toThrow(
      expect.objectContaining({
        code: GENERATOR_ERROR_CODES.TEMPLATE_ERROR,
        message: expect.stringContaining('fixture.md.hbs:1: malformed control tag'),
      }),
    );
    expect(() => render('text\n</private>', options)).toThrow('fixture.md.hbs:2: unexpected </private>');
    expect(() => render('<private>\nsecret', options)).toThrow('fixture.md.hbs:1: unclosed <private> block');
  });
});
