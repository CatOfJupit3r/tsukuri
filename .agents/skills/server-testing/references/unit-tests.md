# Unit Tests

Unit tests verify individual functions, utilities, and helpers in isolation. Use unit tests **only** for pure functions, utilities, and thin adapters whose container lookups can be faked, not for services or routers. They live in `packages/api/test/unit/`.

## When to Write Unit Tests

Write unit tests for:
- ✅ Pure utility functions (data transformers, formatters, validators)
- ✅ Custom matchers and test helpers
- ✅ Mathematical calculations
- ✅ String manipulation helpers
- ✅ Type guards and predicates

**Do NOT write unit tests for:**
- ❌ Services (use integration tests)
- ❌ Routers (use integration tests)
- ❌ Database operations (use integration tests)
- ❌ Features that interact with external systems (use integration tests)

## Basic Structure

```typescript
import { describe, it, expect } from 'vitest';

import { myUtilityFunction } from '#~/lib/my-utility';

describe('myUtilityFunction', () => {
  it('should transform input correctly', () => {
    const result = myUtilityFunction('input');
    expect(result).toBe('expected output');
  });

  it('should handle edge cases', () => {
    expect(myUtilityFunction('')).toBe('');
    expect(myUtilityFunction(null)).toBe(null);
  });
});
```

## Example: Testing Custom Matchers

The project includes custom matchers that are themselves tested with unit tests:

```typescript
import { describe, it, expect } from 'vitest';

describe('Custom Matchers', () => {
  describe('toBeNil', () => {
    it('should pass when value is null', () => {
      expect(null).toBeNil();
    });

    it('should pass when value is undefined', () => {
      expect(undefined).toBeNil();
    });

    it('should fail when value is defined', () => {
      expect(() => expect('hello').toBeNil()).toThrow();
      expect(() => expect(0).toBeNil()).toThrow();
      expect(() => expect(false).toBeNil()).toThrow();
    });

    it('should work with .not modifier', () => {
      expect('hello').not.toBeNil();
      expect(0).not.toBeNil();
      expect(false).not.toBeNil();
    });
  });
});
```

## Faking Container Lookups

Code that resolves from the global container (for example `provideAuthSession`, which resolves `AuthService` and `RequestContextStorage`) can be tested without starting the API. `mockContainerResolve` (`test/helpers/unit-mocks.ts`) maps each token or class to a fake; resolving anything unmapped fails the test instead of building a real service:

```typescript
import { provideAuthSession } from '#~/features/auth/auth.context';
import { AuthService } from '#~/features/auth/auth.service';
import { RequestContextStorage } from '#~/features/request-context/request-context.storage';

import { mockContainerResolve } from '../helpers/unit-mocks';

it('tags the request with the signed-in user', async () => {
  const requestContext = { assignUserId: vi.fn() };
  const authService = { getInstance: () => ({ api: { getSession: vi.fn(async () => ({ user: { id: 'user-1' } })) } }) };
  mockContainerResolve([
    [AuthService, authService],
    [RequestContextStorage, requestContext],
  ]);

  await provideAuthSession(new Request('http://localhost/rpc'));

  expect(requestContext.assignUserId).toHaveBeenCalledWith('user-1');
});
```

Classes with constructor-injected dependencies (such as `EventBus`, which has none) can also be built directly with `new` and fakes. See `test/unit/auth-context.test.ts` and `test/unit/event-bus.test.ts`.

## File Naming and Location

```
test/unit/<utility-name>.test.ts
```

Examples:
- `test/unit/matchers.test.ts`
- `test/unit/validators.test.ts`
- `test/unit/formatters.test.ts`

## Test Organization

### Group Related Tests

```typescript
describe('String Utilities', () => {
  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });
  });

  describe('slugify', () => {
    it('should convert to lowercase and replace spaces', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });
  });
});
```

## Testing Pure Functions

Pure functions are ideal for unit tests because they:
- Have no side effects
- Return the same output for the same input
- Don't depend on external state

```typescript
// Pure function example
export function calculateDiscount(price: number, percentage: number): number {
  return price - (price * percentage) / 100;
}

// Unit test
describe('calculateDiscount', () => {
  it('should calculate 10% discount correctly', () => {
    expect(calculateDiscount(100, 10)).toBe(90);
  });

  it('should handle 0% discount', () => {
    expect(calculateDiscount(100, 0)).toBe(100);
  });

  it('should handle 100% discount', () => {
    expect(calculateDiscount(100, 100)).toBe(0);
  });
});
```

## Test Coverage

Unit tests should cover:
1. **Happy path** - Normal, expected inputs
2. **Edge cases** - Boundary values (0, empty, null, undefined)
3. **Error cases** - Invalid inputs
4. **Type variations** - Different valid input types

```typescript
describe('parseDate', () => {
  it('should parse ISO string', () => {
    const result = parseDate('2024-01-01');
    expect(result).toBeInstanceOf(Date);
  });

  it('should handle Date objects', () => {
    const date = new Date();
    expect(parseDate(date)).toBe(date);
  });

  it('should return null for invalid input', () => {
    expect(parseDate('invalid')).toBeNil();
    expect(parseDate(null)).toBeNil();
    expect(parseDate(undefined)).toBeNil();
  });
});
```

## Mocking in Unit Tests

Use mocking sparingly and only when necessary:

```typescript
import { vi } from 'vitest';

describe('dateFormatter', () => {
  it('should format current date', () => {
    // Mock Date.now() for consistent results
    vi.setSystemTime(new Date('2024-01-01'));

    const result = formatCurrentDate();
    expect(result).toBe('2024-01-01');

    vi.useRealTimers();
  });
});
```

## Best Practices

1. **Test behavior, not implementation** - Don't test internal details
2. **One assertion per test** (when practical) - Makes failures clear
3. **Use descriptive test names** - Describe the expected behavior
4. **Keep tests simple** - Unit tests should be easy to understand
5. **Avoid test interdependence** - Each test should run independently

## Common Patterns

### Testing Type Guards

```typescript
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

describe('isString', () => {
  it('should return true for strings', () => {
    expect(isString('hello')).toBe(true);
    expect(isString('')).toBe(true);
  });

  it('should return false for non-strings', () => {
    expect(isString(123)).toBe(false);
    expect(isString(null)).toBe(false);
    expect(isString(undefined)).toBe(false);
    expect(isString({})).toBe(false);
  });
});
```

### Testing Array/Object Utilities

```typescript
describe('groupBy', () => {
  it('should group array by key', () => {
    const items = [
      { type: 'A', value: 1 },
      { type: 'B', value: 2 },
      { type: 'A', value: 3 },
    ];

    const result = groupBy(items, 'type');

    expect(result.A).toHaveLength(2);
    expect(result.B).toHaveLength(1);
  });

  it('should handle empty array', () => {
    expect(groupBy([], 'key')).toEqual({});
  });
});
```

### Testing Error Throwing

```typescript
describe('assertNonNull', () => {
  it('should not throw for valid values', () => {
    expect(() => assertNonNull('value')).not.toThrow();
    expect(() => assertNonNull(0)).not.toThrow();
  });

  it('should throw for null or undefined', () => {
    expect(() => assertNonNull(null)).toThrow('Value cannot be null');
    expect(() => assertNonNull(undefined)).toThrow('Value cannot be null');
  });
});
```

## Vitest Configuration

Unit tests use a separate Vitest project (`packages/api/vitest.config.ts`):

```typescript
{
  name: 'unit',
  include: ['test/unit/**/*.test.ts'],
  setupFiles: ['reflect-metadata', './test/helpers/matchers.ts'],
}
```

This ensures unit tests:
- Don't start the API, the module setup files, or the database
- Run faster
- Don't share the integration project's long-lived container and database
- Get `describe`, `it`, `expect` and `vi` as globals, like every test in the package
