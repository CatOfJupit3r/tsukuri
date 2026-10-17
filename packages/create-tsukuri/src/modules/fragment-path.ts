/** Markdown fragments live next to the generator, inside the module sources. */
const FRAGMENTS_DIR = 'packages/create-tsukuri/fragments';

export function fragmentPath(relativePath: string) {
  return `${FRAGMENTS_DIR}/${relativePath}`;
}
