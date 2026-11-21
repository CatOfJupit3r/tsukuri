/**
 * Lint-staged configuration for the shared lint config workspace.
 * This workspace has no oxlint config of its own (its ESLint config is the single rule set) and no type check, so only
 * the shell commands that are not oxlint run.
 */
const sharedConfiguration = require('../../lint-staged.shared.cjs')('@startername/lint-config');

const OXLINT_COMMAND_PREFIX = 'oxlint';

module.exports = Object.fromEntries(
  Object.entries(sharedConfiguration).map(([pattern, commands]) => [
    pattern,
    commands.filter((command) => typeof command === 'string' && !command.startsWith(OXLINT_COMMAND_PREFIX)),
  ]),
);
