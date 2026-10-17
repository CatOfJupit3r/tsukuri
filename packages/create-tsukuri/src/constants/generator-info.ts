import packageJson from '../../package.json' with { type: 'json' };

export const GENERATOR_NAME = packageJson.name;
export const GENERATOR_VERSION = packageJson.version;
