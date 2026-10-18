/** Folder of the published package that holds the module sources, laid out as in the repository. */
export const BUNDLED_SOURCES_DIR = 'sources';

/** npm applies or drops these files when packing, so the bundle stores them as `_gitignore` and so on. */
export const PACK_RESERVED_FILE_NAMES = ['.gitignore', '.npmignore', '.npmrc'];
export const PACK_ESCAPE_PREFIX = '_';
