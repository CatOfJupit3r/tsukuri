/** Handlebars templates (markdown fragments, connection points) live next to the generator. */
export const TEMPLATES_DIR = 'packages/create-tsukuri/templates';

export function templatePath(relativePath: string) {
  return `${TEMPLATES_DIR}/${relativePath}`;
}
