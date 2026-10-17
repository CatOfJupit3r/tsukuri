import { createGeneratorContainer } from '@~/di/container';
import { TemplateRenderer } from '@~/engine/template-renderer';
import { GENERATOR_ERROR_CODES } from '@~/enums/generator-error-codes.enums';

import { testModuleId } from '../helpers/manifests';

vi.mock('@~/enums/module-ids.enums', () => import('../helpers/test-module-ids'));

const renderer = createGeneratorContainer({ sourceRoot: '/unused', manifests: [] }).resolve(TemplateRenderer);
const context = { installedModules: [testModuleId('base'), testModuleId('alpha')], projectName: 'acme' };

function render(template: string) {
  return renderer.renderText(template, context, 'doc.md.hbs');
}

describe('TemplateRenderer', () => {
  it('keeps module blocks for installed modules and removes standalone tag lines', () => {
    const template = [
      'intro',
      '{{#module "alpha"}}',
      'alpha only',
      '{{/module}}',
      '{{#module "beta"}}',
      'beta only',
      '{{else}}',
      'no beta',
      '{{/module}}',
      'outro',
    ].join('\n');

    expect(render(template)).toBe('intro\nalpha only\nno beta\noutro');
  });

  it('renders a block when any module of a comma list is installed, and supports nesting', () => {
    const template = [
      '{{#module "beta, alpha"}}',
      'either',
      '{{#module "gamma"}}',
      'never',
      '{{/module}}',
      '{{/module}}',
    ].join('\n');

    expect(render(template)).toBe('either\n');
  });

  it('interpolates without HTML escaping and keeps escaped braces literal', () => {
    expect(render('# {{projectName}} <b>&</b> \\{{ literal }}')).toBe('# acme <b>&</b> {{ literal }}');
  });

  it('fails on unknown variables, unknown module ids and unbalanced blocks, naming the template', () => {
    expect(() => render('{{projectNmae}}')).toThrow(
      expect.objectContaining({
        code: GENERATOR_ERROR_CODES.TEMPLATE_ERROR,
        message: expect.stringContaining('doc.md.hbs'),
      }),
    );
    expect(() => render('{{#module "nope"}}x{{/module}}')).toThrow(
      expect.objectContaining({ message: expect.stringContaining('"nope" in {{#module}} is not a module id') }),
    );
    expect(() => render('{{#module "alpha"}}\nx')).toThrow(
      expect.objectContaining({ code: GENERATOR_ERROR_CODES.TEMPLATE_ERROR }),
    );
  });
});
