/**
 * Lint-staged configuration for the shared lint config workspace.
 * This workspace has no oxlint config of its own (its ESLint config is the single rule set) and no type check, so only
 * the shell commands that are not oxlint run. Its package.json cannot reference the shared prettier config (the
 * lint and format toolchain pins allow only exact versions there), so prettier gets that config explicitly.
 */
const path = require('node:path');

const sharedConfiguration = require('../../lint-staged.shared.cjs')('@startername/lint-config');

const OXLINT_COMMAND_PREFIX = 'oxlint';
const PRETTIER_COMMAND_PREFIX = 'prettier';
const PRETTIER_CONFIG_PATH = path.join(__dirname, '..', 'prettier-config', 'prettier.config.mjs');

function withSharedPrettierConfig(command) {
  return command.startsWith(PRETTIER_COMMAND_PREFIX)
    ? `${command} --config ${JSON.stringify(PRETTIER_CONFIG_PATH)}`
    : command;
}

module.exports = Object.fromEntries(
  Object.entries(sharedConfiguration).map(([pattern, commands]) => [
    pattern,
    commands
      .filter((command) => typeof command === 'string' && !command.startsWith(OXLINT_COMMAND_PREFIX))
      .map(withSharedPrettierConfig),
  ]),
);
