# @startername/workspace-source

Workspace packages export a `workspace-source` condition that points at their TypeScript source:

```json
"exports": {
  "./helpers/*": {
    "workspace-source": "./src/helpers/*.ts",
    "types": "./dist/helpers/*.d.mts",
    "default": "./dist/helpers/*.mjs"
  }
}
```

The condition is enabled in TypeScript (`customConditions` in `tsconfig.base.json`), in Node dev servers (`node --conditions=workspace-source`), and in Vite/Vitest through `withWorkspaceSourceResolve()` from `@startername/workspace-source/vite`. Nothing needs to be built before `dev`, `test` or `check-types`.
