# Workspace Guide

This repository is a pnpm monorepo starter (`startername`). Treat this file as the primary workspace guide for agentic work and the always-on source of project standards.

## Answer and Code Changes Guidelines

### No useless historic user-facing strings

When user asks to create or add new feature in code, do not mention "before and after", "this replaces the previous version", "this is the new code", or any other phrasing that implies a change from a previous state when you are adding new code.

In code, do not explain underlying logic, implementation details, or design decisions. However, if the feature is complex, provide a brief overview of what might happen

Examples:

```html
<!-- BAD -->
<div>
  <h1>New Feature</h1>
  <p>This is the new feature that does X, Y, and Z.</p>
  <p>It replaces the old feature that only did A and B.</p>
  <!-- actually useful things -->
</div>

<!-- GOOD -->
<div>
  <h1>New Feature</h1>
  <!-- actually useful things -->
</div>
```

## What To Read First

- `AGENTS.md` for repo-wide conventions, workflow, and codebase standards
- `.agents/skills/*/SKILL.md` for task-specific implementation guidance

## Repository Layout

- `packages/common` contains shared utilities, types, constants, and helpers.
- `configs` contains the shared ESLint and Prettier configuration packages.
- `scripts` contains workspace scripts such as `verify.ts`.

## Core Conventions

- Work from the repository root. Prefer root-level `pnpm run ...` commands instead of running package scripts in isolation.
- Keep changes aligned with the existing feature-based layout and reuse established patterns before inventing new ones.
- Use shared contracts and generated helpers instead of duplicating types, keys, or API shapes.
- Prefer ASCII in new or edited text unless a file already uses another encoding or character set.
- Avoid generating large summary docs unless the user explicitly asks for them.
- Before starting implementation, load the most relevant skills from `.agents/skills/`.
- Avoid backwards-compatibility debt. Prefer new ways of doing things over supporting old assumptions once a concept evolves.

## Project Standards

- DO NOT create `index.ts` files in ANY folder. Always use explicit file names for exports and imports, even if it means longer import paths. This is to avoid circular dependencies and improve clarity.
- DO NOT use `index.ts` files as barrel re-exports. Importing through an `index.ts` barrel is forbidden — always import directly from the source file.
  ```typescript
  // BAD
  import { someUtil } from './utils'; // resolves to utils/index.ts barrel
  import { SomeClass } from '../features/auth'; // resolves to auth/index.ts barrel

  // GOOD
  import { someUtil } from './utils/some-util';
  import { SomeClass } from '../features/auth/some-class';
  ```
- DO NOT re-export variables, functions, types, or constants from one module through another. If a value is needed in multiple places, import it directly from where it is defined.
  ```typescript
  // BAD — re-exporting from another module
  export { someValue } from './some-other-file';
  export * from './another-module';

  // GOOD — define it here or import it directly at the call site
  export const someValue = ...;
  ```
- Never edit generated connection points: `starter.json`, every `src/generated/` folder, generated `.env.example` files, `docker-compose.dev.yml` and `.github/workflows/ci.yml` are rebuilt from `starter.json` when modules are added. Import from them instead.
- Do not generate a reference guide, comprehensive summary document, or new docs markdown files unless the user explicitly asks for them.
- Follow standard TypeScript conventions with strict typing, `async/await`, and modular design.
- Use the `enumwaii` package (`em([...])`) for every reusable closed set of string values; `eslint-plugin-enumwaii` enforces it. Do not use TypeScript `enum`, `z.enum`, plain `as const` objects, duplicate unions, or raw literals for enum-backed values.
- Always name files with kebab-case, interfaces with `i` prefix.
- Never create a type alias that just re-exports an `i`-prefixed interface/type (e.g. `export type UserResponse = iUserResponse`). Use the `i`-prefixed name directly everywhere. Example:
  ```typescript
  // GOOD
  export interface iUserProfileResponse { ... }
  // consumers import and use `iUserProfileResponse` directly

  // BAD
  export interface iUserProfileResponse { ... }
  export type UserProfileResponse = iUserProfileResponse; // redundant alias, delete it
  ```
- If your variable is reused across server and client, define it in `packages/common/src/constants` and import it from `@startername/common/constants`. Only do this for non-sensitive data.
- When resolving warnings or errors, prefer addressing the root cause instead of using `// @ts-ignore` or `as unknown as <Type>`. Use these only as a last resort with a comment explaining why.
- If you encounter eslint warnings, run `pnpm run lint` to fix them in the file.
- Use `satisfies` clauses to ensure object shapes without losing type inference. Example:
  ```typescript
  const EXAMPLE_MAP = {
    keyOne: { label: 'One', value: 1 },
    keyTwo: { label: 'Two', value: 2 },
  } satisfies Record<string, { label: string; value: number }>;
  ```
- All boolean values have to have `is`, `should`, `will`, `has`, or `does` prefixes. For example, `isActive`, `shouldShow`, `hasPermission`, or `doesSupportStreaming`.
- Use conventional commit messages.

## Environment and Configuration

- Aliases: `@~/` resolves to the `src` folder of the package it is used in; `@startername/common` surfaces shared utilities and types.
- Node.js v26 is required; use nvm or similar to manage Node versions.
- pnpm ≥12.14.0 is the package manager; use `corepack enable` to activate it.

## Environment (Windows)

The default shell is Windows PowerShell 5.1. Assume these rules unless told otherwise:

- No `&&` / `||` chaining — use `;` or `if ($?) { ... }`.
- No Unix coreutils: use `Select-Object -Last N` (not `tail`), `Select-Object -First N` (not `head`), `Select-String` (not `grep`), `New-Item` (not `touch`), `(Get-Command x).Source` (not `which`).
- `rm` is permission-denied by policy — always use `Remove-Item -Recurse -Force` directly.
- pnpm writes progress to stderr, and PS 5.1 wraps native stderr as `NativeCommandError`, so error-looking output does NOT mean failure. Trust exit codes.
- Always use absolute paths rooted at the repository root; never rely on the current working directory, and do not prefix commands with `cd`.
- Canonical command forms: `pnpm run check-types`, `pnpm run lint`, `pnpm --filter=server run <script>`.

## Testing

Tests should validate meaningful behavior and not just implementation details. Use Vitest for unit and integration tests, and Playwright for end-to-end tests if configured. Tests should be organized by feature and mirror the structure of the codebase.

DO NOT EVER TEST:

1. Generated code. These are validated by the generator and the source schema or contract.
2. Components rendering without meaningful behavior. Example: writing a test that inputs some text into a component and validating that the text is rendered is not meaningful behavior. Instead, test that the component behaves correctly when the text is inputted.
3. Third-party libraries. These are validated by the library itself and should not be tested in your codebase.
4. Constants, enums, or types having certain values in them. These are validated by TypeScript and should not be tested in your codebase.

Prefer to use Dependency Injection (DI) for services and repositories to facilitate testing. Use mocks or fakes for external dependencies, and avoid testing implementation details of those dependencies.

Do not duplicate code blocks and prefer to extract shared code into utility functions or shared modules. If you are referencing some type or constant from codebase, THEN IMPORT IT, DO NOT DUPLICATE TYPES OR CONSTANTS. If you are referencing some type or constant from codebase, THEN IMPORT IT, DO NOT DUPLICATE TYPES OR CONSTANTS.

## Architecture And Patterns

Our repository is organized to promote clarity, maintainability, and scalability. We use a feature-based structure, ensuring that related files are grouped together.

- Shared error codes live in `packages/common/src/enums/errors.enums.ts`.
- Tests should mirror the feature structure inside each app or package.

```
<workspace>/test/
  ├── features/<feature>/<feature>.service.test.ts
  ├── integration/
  └── utils/
```

## Commands

- `pnpm run verify` is THE verification command: it runs check-types + lint (add `--tests` to also run the suite, `--filter <pkg>` to scope) and reports honest PASS/FAIL with an exit code you can trust. Use it before handing work off.
- `pnpm run build` builds the monorepo.
- `pnpm run check-types` runs TypeScript checks across the workspace.
- `pnpm run lint` runs ESLint across the workspace.
- `pnpm run prettify` formats the workspace.
- `pnpm run test` runs the test suite across the workspace.
- `pnpm install` installs dependencies across the workspace.

## Workflow

- Keep work small and incremental.
- Prefer existing skills and instruction files before introducing new patterns.
- Run `pnpm run verify` before handing work off. If you are changing code, ALWAYS run it to catch type and lint issues early; trust its exit code over raw pnpm stderr.
- For any task of the form "replace/remove/rename X everywhere": first enumerate ALL matches with grep (including tests, fixtures, docs, and generated-adjacent files) into an explicit checklist; work the checklist down; finish by re-running the same grep and pasting its empty result as proof. Do not report completion without the zero-match re-run.
- If you are implementing a roadmap, then always make sure to mark the relevant roadmap items as "completed".

<!-- intent-skills:start -->

# Skill mappings - when working in these areas, load the linked skill file into context.

skills:

# Local project skills

- task: "Reviewing code changes with a bug-finding mindset before handoff"
  load: ".agents/skills/review-code/SKILL.md"

<!-- intent-skills:end -->
