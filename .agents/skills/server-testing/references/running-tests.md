# Running Tests

Commands and options for running tests locally and in different modes. The server tests live in `packages/api` (`@startername/api`).

## Basic Commands

Run commands from the repository root.

### Verify (the handoff gate)

```bash
pnpm run verify --tests
```

Runs check-types, oxlint, ESLint and the test suite with honest exit codes. Scope it with `--filter @startername/api` (repeatable) or `--changed-since <ref>`. The full output of the last run is in `node_modules/.cache/verify/last-run.log`.

### Run All Tests Once

```bash
pnpm --filter=@startername/api run test
```

Runs the unit and integration projects once and exits.

### Watch Mode

```bash
pnpm --filter=@startername/api run test:watch
```

Watches for file changes and re-runs affected tests automatically. This is ideal for development.

**Features**:
- Re-runs tests when source files change
- Interactive mode with keyboard shortcuts
- Faster feedback loop

**Keyboard shortcuts** in watch mode:
- `a` - Run all tests
- `f` - Run only failed tests
- `t` - Filter by test name pattern
- `p` - Filter by file name pattern
- `q` - Quit watch mode

## Running Specific Tests

Arguments after the script name go to Vitest.

### Run Tests in a Specific File

```bash
pnpm --filter=@startername/api run test user-profile.test.ts
```

### Run Tests Matching a Name

```bash
pnpm --filter=@startername/api run test -t "should update user profile"
```

### Run Only Integration Tests

```bash
pnpm --filter=@startername/api run test test/integration/
```

### Run Only Unit Tests

```bash
pnpm --filter=@startername/api run test test/unit/
```

## Vitest CLI Options

### Run Tests with Coverage

```bash
pnpm --filter=@startername/api run test --coverage
```

Generates a coverage report showing which lines are tested (needs a Vitest coverage provider installed).

### Run a Single Test

Use `.only` in the test file:

```typescript
it.only('should run only this test', async () => {
  // test code
});
```

**Warning**: Don't commit `.only`—it will skip other tests in CI.

### Skip a Test

Use `.skip` to temporarily disable a test:

```typescript
it.skip('should skip this test', async () => {
  // test code
});
```

## Test Configuration

The test configuration is defined in `packages/api/vitest.config.ts`.

### Two Test Projects

The config defines two separate projects:

1. **Unit Tests** (`unit`):
   - Runs tests in `test/unit/**/*.test.ts`
   - Loads only `reflect-metadata` and `test/helpers/matchers.ts`
   - No API startup, no database
   - Faster execution

2. **Integration Tests** (`integration`):
   - Runs tests in `test/integration/**/*.test.ts`
   - Loads every `test/helpers/setup/*.setup.ts` (one per installed module), then `test/helpers/setup.ts`, which calls `startApi()`
   - Shared in-memory PGlite database built from the generated schema
   - One shared container and sequential files (`isolate: false`, `fileParallelism: false`)
   - Longer timeout (10 seconds)

### Environment Variables

Tests run with the variables of the root `.env.example` (loaded by `loadExampleEnv` from `@startername/vitest-config/example-env`) plus:

```typescript
NODE_ENV=test
LOG_LEVEL=error
```

Add a variable to the module's `<module>.env.ts` shape and declare it in an `ENV_VARIABLE` contribution with its example value; `pnpm run sync` updates `.env.example`, and tests pick it up from there.

## Debugging Tests

### Using Console Logs

```typescript
it('should debug this test', async () => {
  console.log('Debug value:', someValue);
  expect(someValue).toBe('expected');
});
```

Logs will appear in the terminal output.

### Using VS Code Debugger

1. Add a breakpoint in your test file
2. Open the test file
3. Press `F5` or use Debug panel
4. Select "Vitest" configuration

### Inspect Test Database

During test development, you can inspect the PGlite database through the repositories:

```typescript
it('should check database state', async () => {
  const { ctx, user } = await createUser();

  // Add breakpoint here and inspect database
  const profile = await getUserProfileRepository().findByUserId(user.id);
  console.log('Profile:', profile);
});
```

## Performance Tips

### Integration Tests Run Sequentially

Integration tests share one container and one database, so they run in a single process one file at a time. This is configured in `vitest.config.ts`:

```typescript
isolate: false,
fileParallelism: false,
```

### Fast Database Cleanup

The test setup truncates every table after each test instead of recreating the database:

```typescript
// test/helpers/setup/database.setup.ts
afterEach(async () => {
  await container
    .resolve(DatabaseService)
    .getDb()
    .execute(sql.raw(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`));
});
```

### Fast Password Hashing

`test/helpers/setup/auth.setup.ts` replaces the password hasher with a plaintext one, so signing up a user costs a few milliseconds.

## Continuous Integration

Tests run automatically in CI/CD pipelines. Run the same gate locally before pushing:

```bash
pnpm run verify --tests
```

## Common Test Commands Summary

| Command | Description |
|---------|-------------|
| `pnpm run verify --tests` | Check types, lint and run all tests |
| `pnpm run verify --tests --filter @startername/api` | The same, scoped to the API package |
| `pnpm --filter=@startername/api run test` | Run the API tests once |
| `pnpm --filter=@startername/api run test:watch` | Watch mode (re-run on changes) |
| `pnpm --filter=@startername/api run test <file>` | Run specific test file |
| `pnpm --filter=@startername/api run test -t <pattern>` | Run tests matching a name |

## Troubleshooting Test Runs

### Tests Hang or Timeout

**Symptoms**: Tests don't complete, timeout errors

**Common causes**:
1. Unclosed database connections
2. Background processes not stopping
3. Infinite loops in code

**Solution**:
- Check for open connections
- Ensure proper cleanup in `afterEach`
- Add `testTimeout: 10000` in config (already set)

### Database Connection Issues

**Symptoms**: PGlite initialization or schema push errors

**Common causes**:
1. A schema file is not registered with a `DATABASE_SCHEMA` contribution, or `src/generated/database-schema.ts` is out of date (`pnpm run sync`)
2. The test setup did not initialize PGlite

**Solution**:
- Check `test/helpers/setup/database.setup.ts` is picked up (it must match `test/helpers/setup/*.setup.ts`)
- Verify `test/helpers/postgres-memory.ts` can push the generated schema
- Restart test runner

### Import Errors

**Symptoms**: `Cannot find module`, import errors

**Common causes**:
1. Incorrect `#~/` import (it resolves against `packages/api/package.json` `imports`, not a tsconfig `paths` alias)
2. Missing dependency
3. Circular dependency

**Solution**:
- Verify `#~/` paths point at files under `packages/api/src`
- Check imports match exports
- See [common-issues.md](common-issues.md) for "accessed before declaration"

### Flaky Tests

**Symptoms**: Tests pass/fail randomly

**Common causes**:
1. Race conditions
2. Shared state between tests
3. Timing dependencies

**Solution**:
- Use proper async/await
- Ensure test isolation
- Avoid `setTimeout` in tests
- Check database cleanup is working

## Best Practices

1. **Run tests before committing** - Catch issues early
2. **Use watch mode during development** - Fast feedback
3. **Run `pnpm run verify --tests` before pushing** - Ensure nothing broke
4. **Check coverage occasionally** - Identify untested code
5. **Keep tests fast** - Slow tests discourage running them
6. **Fix flaky tests immediately** - They erode confidence
