# @startername/vitest-config

Keeps Vitest's transformed modules on disk between runs (`test.experimental.fsModuleCache`):

- `MODULE_CACHE_TEST_OPTIONS` goes in `test.experimental`; the cache lives in the workspace's `node_modules/.vitest-module-cache`.
- `moduleCacheKeyPlugin()` adds what the transform plugins read besides the source file (for example the tsconfig SWC compiles with, and the installed versions of the transformer packages) to the cache key, so cached output is dropped when they change.
