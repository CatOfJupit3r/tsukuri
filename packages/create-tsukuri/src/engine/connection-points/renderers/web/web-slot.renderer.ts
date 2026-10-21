import { injectable } from 'tsyringe';

import { webSlotsEnumwaii } from '#~/enums/web-slots.enums';
import type { iWebComponentContribution } from '#~/manifest/connection-point.schema';

import type { iTemplateContext } from '../../../render/template-renderer';
import { CONNECTION_POINT_TEMPLATES } from '../../connection-point.constants';
import type { iConnectionPointRenderer, iOwnedContribution } from '../../connection-point.types';
import { GeneratedSourceFiles } from '../../generated-source-files';

/** Every slot is listed, empty or not, so the shell reads each one without checks. */
@injectable()
export class WebSlotRenderer implements iConnectionPointRenderer<iWebComponentContribution> {
  public constructor(private readonly sourceFiles: GeneratedSourceFiles) {}

  public async render(
    items: iOwnedContribution<iWebComponentContribution>[],
    context: iTemplateContext,
    hostedWorkspaces: readonly string[],
  ) {
    return this.sourceFiles.renderPerWorkspace(
      items,
      {
        fileName: 'web-slots.ts',
        template: CONNECTION_POINT_TEMPLATES.webSlots,
        imports: (component) => [component.component],
        variables: (components) => ({
          slots: webSlotsEnumwaii.values.map((slot) => ({
            slot,
            componentList: components
              .filter((component) => component.slot === slot)
              .map((component) => component.component.name)
              .join(', '),
          })),
        }),
      },
      context,
      hostedWorkspaces,
    );
  }
}
