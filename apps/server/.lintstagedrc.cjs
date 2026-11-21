/**
 * Lint-staged configuration for this workspace
 * Extends the shared configuration from the root
 */

module.exports = require('../../lint-staged.shared.cjs')(require('./package.json').name);
