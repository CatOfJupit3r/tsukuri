/**
 * Size limits of the convention rules, shared by every workspace.
 */

/** Source files one folder may hold before they are grouped into subfolders. */
export const MAX_FILES_PER_FOLDER = 10;

/** `sonarjs/cognitive-complexity` threshold of one function. */
export const MAX_COGNITIVE_COMPLEXITY = 15;

/** Lines of one function, blank lines and comments excluded. */
export const MAX_LINES_PER_FUNCTION = 80;

/** Nesting depth of blocks inside one function. */
export const MAX_DEPTH = 3;

/** Nesting depth of one JSX tree. */
export const MAX_JSX_DEPTH = 5;
