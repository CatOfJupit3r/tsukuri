import Handlebars from 'handlebars';
import type { HelperOptions } from 'handlebars';
import { injectable } from 'tsyringe';

import { GENERATOR_ERROR_CODES } from '#~/enums/generator-error-codes.enums';
import type { ModuleId } from '#~/enums/module-ids.enums';
import { moduleIdSchema } from '#~/enums/module-ids.enums';

import { GeneratorError } from '../generator-error';
import { ModuleSourceReader } from '../modules/module-source-reader';

export interface iTemplateContext {
  /** Installed module ids, read by the `module` helper. */
  installedModules: readonly ModuleId[];
  [key: string]: unknown;
}

function parseModuleIds(value: unknown) {
  return String(value)
    .split(',')
    .map((raw) => {
      const parsed = moduleIdSchema.safeParse(raw.trim());
      if (!parsed.success) throw new Error(`"${raw.trim()}" in {{#module}} is not a module id`);
      return parsed.data;
    });
}

/**
 * Handlebars without HTML escaping and with strict variable lookup, so a misspelled variable is
 * an error instead of an empty string. `{{#module "a,b"}}...{{else}}...{{/module}}` renders its
 * body when any listed module is installed. A literal `{{` must be written as `\{{`.
 */
@injectable()
export class TemplateRenderer {
  private readonly handlebars = Handlebars.create();

  public constructor(private readonly reader: ModuleSourceReader) {
    this.handlebars.registerHelper(
      'module',
      function moduleHelper(this: unknown, ids: unknown, options: HelperOptions) {
        const root = options.data?.root as iTemplateContext;
        const isAnyInstalled = parseModuleIds(ids).some((id) => root.installedModules.includes(id));
        return isAnyInstalled ? options.fn(this) : options.inverse(this);
      },
    );
  }

  public renderText(template: string, context: iTemplateContext, source: string) {
    try {
      return this.handlebars.compile(template, { noEscape: true, strict: true })(context);
    } catch (error) {
      throw new GeneratorError(
        GENERATOR_ERROR_CODES.TEMPLATE_ERROR,
        `${source}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Renders a template file from the module sources. */
  public async render(source: string, context: iTemplateContext) {
    return this.renderText(await this.reader.readText(source), context, source);
  }
}
