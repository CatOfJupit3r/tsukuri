---
name: tanstack-query-integration
description: Integrate TanStack Query with oRPC for data fetching, mutations, and optimistic updates. Use when creating query hooks, managing mutations, optimistic updates, cache invalidation, or integrating with route loaders. STRICT patterns required - always use tankstackRPC.procedure.{query|mutation}Options(), export options as constants, use ctx.client (never import queryClient).
---

# TanStack Query Integration

Type-safe data fetching with TanStack Query + oRPC integration.

# TanStack Query Integration

Type-safe data fetching with TanStack Query + oRPC integration.

## Critical Rules (NON-NEGOTIABLE)

1. **ALWAYS use `ctx.client`** - NEVER import `queryClient` directly in mutation callbacks
2. **ALWAYS export query/mutation options** as named constants for reuse in loaders/tests/other mutations
3. **ALWAYS use `tanstackRPC.procedure.queryKey()`** - NEVER create manual query keys like `['user', id]`
4. **ALWAYS export return types** from query hooks for type-safe cache updates
5. **ALWAYS define options as top-level constants** - never inline `mutationOptions()` in `useMutation()` call

## oRPC Integration

The project uses `tanstackRPC` from `#~/utils/tanstack-orpc.ts`, applying `createTanstackQuery Utils` to the client.

Every contract procedure provides:
- `.queryOptions()` - For `useQuery()`, generates key + fetcher
- `.mutationOptions()` - For `useMutation()`, with cache integration
- `.queryKey()` - Type-safe key generation
- `.call()` - Direct procedure invocation

## Query Hooks Pattern

```typescript
// features/characters/hooks/use-character.ts
import { useQuery } from '@tanstack/react-query';
import type { ORPCOutputs } from '#~/utils/orpc';
import { tanstackRPC } from '#~/utils/tanstack-orpc';

// 1. Export query options as constant (for loaders, mutations, tests)
export const CHARACTER_QUERY_OPTIONS = (characterId: string) =>
  tanstackRPC.characters.getCharacter.queryOptions({
    input: { characterId },
  });

// 2. Export query key (for invalidation)
export const CHARACTER_QUERY_KEY = (characterId: string) =>
  tanstackRPC.characters.getCharacter.queryKey({ input: { characterId } });

// 3. Export return type (for type-safe cache updates)
export type CharacterQuery = ORPCOutputs['characters']['getCharacter'];

// 4. Export hook
export function useCharacter(characterId: string) {
  return useQuery(CHARACTER_QUERY_OPTIONS(characterId));
}
```

### Conditional Queries

Use `enabled` to prevent queries until dependencies are ready:

```typescript
export function useCharacter(characterId: string | undefined) {
  return useQuery({
    ...CHARACTER_QUERY_OPTIONS(characterId!),
    enabled: !!characterId, // Only query when ID exists
  });
}
```

## Mutation Hooks Pattern

```typescript
// features/characters/hooks/use-update-character.ts
import { useMutation } from '@tanstack/react-query';
import { tanstackRPC } from '#~/utils/tanstack-orpc';
import { CHARACTER_QUERY_KEY, type CharacterQuery } from './use-character';

// 1. Define mutation options as top-level constant
const UPDATE_CHARACTER_MUTATION_OPTIONS = tanstackRPC.characters.updateCharacter.mutationOptions({
  onSuccess: (data, { params: { characterId } }, _context, ctx) => {
    // Update cache with server response
    const key = CHARACTER_QUERY_KEY(characterId);
    ctx.client.setQueryData<CharacterQuery>(key, data);
    
    // Invalidate related queries
    void ctx.client.invalidateQueries({
      queryKey: tanstackRPC.characters.listCharacters.queryKey(),
    });
  },
  onError: (error) => {
    console.error('Failed to update character:', error);
  },
});

// 2. Export hook with clean API
export function useUpdateCharacter() {
  const { mutate, isPending, error } = useMutation(UPDATE_CHARACTER_MUTATION_OPTIONS);
  
  return {
    updateCharacter: mutate,
    isPending,
    error,
  };
}
```

### Mutation with Callback Options

Support dynamic callbacks for navigation/UI updates:

```typescript
interface iUpdateCharacterOptions {
  onSuccess?: () => void;
}

const UPDATE_CHARACTER_MUTATION_OPTIONS = (options?: iUpdateCharacterOptions) =>
  tanstackRPC.characters.updateCharacter.mutationOptions({
    onSuccess: (data, { params: { characterId } }, _context, ctx) => {
      const key = CHARACTER_QUERY_KEY(characterId);
      ctx.client.setQueryData<CharacterQuery>(key, data);
      
      // Call user's callback
      options?.onSuccess?.();
    },
  });

export function useUpdateCharacter(options?: iUpdateCharacterOptions) {
  const { mutate, isPending } = useMutation(UPDATE_CHARACTER_MUTATION_OPTIONS(options));
  return { updateCharacter: mutate, isPending };
}
```

## Optimistic Updates

Update UI instantly while mutation is in-flight:

```typescript
const UPDATE_CHARACTER_MUTATION_OPTIONS = tanstackRPC.characters.updateCharacter.mutationOptions({
  async onMutate({ params: { characterId, name, description } }, ctx) {
    const key = CHARACTER_QUERY_KEY(characterId);
    
    // 1. Cancel in-flight queries
    await ctx.client.cancelQueries({ queryKey: key });
    
    // 2. Snapshot previous data for rollback
    const previous = ctx.client.getQueryData<CharacterQuery>(key);
    
    // 3. Apply optimistic update
    ctx.client.setQueryData<CharacterQuery>(key, (current) => {
      if (!current) return current;
      return {
        ...current,
        ...(name && { name }),
        ...(description !== undefined && { description }),
      };
    });
    
    // 4. Return for rollback
    return { previous };
  },
  
  onError: (_error, { params: { characterId } }, context, ctx) => {
    const key = CHARACTER_QUERY_KEY(characterId);
    // Rollback on error
    if (context?.previous) {
      ctx.client.setQueryData<CharacterQuery>(key, context.previous);
    } else {
      void ctx.client.invalidateQueries({ queryKey: key });
    }
  },
  
  onSuccess: (data, { params: { characterId } }, _context, ctx) => {
    const key = CHARACTER_QUERY_KEY(characterId);
    // Use server response (most accurate)
    ctx.client.setQueryData<CharacterQuery>(key, data);
  },
});
```

### Common Optimistic Update Patterns

**Remove item from list:**
```typescript
ctx.client.setQueryData<ListQuery>(key, (current) => {
  if (!current) return current;
  return {
    ...current,
    items: current.items.filter((item) => item.id !== deletedId),
  };
});
```

**Add item to list:**
```typescript
ctx.client.setQueryData<ListQuery>(key, (current) => {
  if (!current) return current;
  return {
    ...current,
    items: [...current.items, newItem],
  };
});
```

**Update nested item:**
```typescript
ctx.client.setQueryData<ParentQuery>(key, (current) => {
  if (!current) return current;
  return {
    ...current,
    children: current.children.map((child) =>
      child.id === childId ? { ...child, ...updates } : child
    ),
  };
});
```

## Cache Invalidation

### Specific Key
Invalidate query with exact parameters:

```typescript
void ctx.client.invalidateQueries({
  queryKey: CHARACTER_QUERY_KEY(characterId),
});
```

### All in Namespace
Invalidate all queries for a procedure (any parameters):

```typescript
void ctx.client.invalidateQueries({
  queryKey: tanstackRPC.characters.getCharacter.queryKey(),
});
```

### Multiple Related Queries
```typescript
void ctx.client.invalidateQueries({
  queryKey: CHARACTER_QUERY_KEY(characterId),
});
void ctx.client.invalidateQueries({
  queryKey: tanstackRPC.characters.listCharacters.queryKey(),
});
void ctx.client.invalidateQueries({
  queryKey: tanstackRPC.chats.listChats.queryKey(),
});
```

### When to Use Each Strategy

| Strategy | Use When | Speed |
|----------|----------|-------|
| `setQueryData(data)` | Have server response, want instant UI | Fastest |
| `setQueryData(updater)` | Optimistic update, transform existing data | Fast |
| `invalidateQueries()` | Complex mutation, want server truth | Slower |
| `removeQueries()` | Deleting resource | Fast |

## Route Integration

Prefetch data in route loaders for SSR-like experience:

```typescript
// routes/__root.tsx or specific route
import { CHARACTER_QUERY_OPTIONS } from '#~/features/characters/hooks/use-character';

export const Route = createFileRoute('/characters/$characterId')({
  async loader({ context, params }) {
    await context.queryClient.ensureQueryData(
      CHARACTER_QUERY_OPTIONS(params.characterId)
    );
  },
});
```

## Loading States

### Basic Pattern
```typescript
const { data, isPending, isError, error } = useCharacter(characterId);

if (isPending) return <Skeleton />;
if (isError) return <ErrorMessage error={error} />;
if (!data) return <NotFound />;

return <CharacterCard character={data} />;
```

### With Mutation
```typescript
const { character, isPending } = useCharacter(characterId);
const { updateCharacter, isPending: isUpdating } = useUpdateCharacter();

const isDisabled = isPending || isUpdating;
```

## Common Mistakes

❌ **Don't import queryClient:**
```typescript
import { queryClient } from '#~/utils/query-client';
mutationOptions({
  onSuccess: () => queryClient.invalidateQueries({ ... }), // WRONG
});
```

✅ **Do use ctx.client:**
```typescript
mutationOptions({
  onSuccess: (_data, _vars, _ctx, ctx) => {
    ctx.client.invalidateQueries({ ... }); // CORRECT
  },
});
```

❌ **Don't create manual keys:**
```typescript
const key = ['user', 'profile', userId]; // WRONG
```

✅ **Do use generated keys:**
```typescript
const key = tanstackRPC.user.getUserProfile.queryKey({ input: { userId } }); // CORRECT
```

❌ **Don't inline options:**
```typescript
useMutation(tanstackRPC.user.update.mutationOptions({ ... })); // WRONG
```

✅ **Do export as constant:**
```typescript
const UPDATE_USER_MUTATION_OPTIONS = tanstackRPC.user.update.mutationOptions({ ... });
useMutation(UPDATE_USER_MUTATION_OPTIONS); // CORRECT
```

## Advanced: Best Practices

See [references/best-practices.md](references/best-practices.md) for comprehensive guidelines on:
- Type exports for cache safety
- Query key patterns
- Stale time configuration
- Request deduplication
- Error handling strategies
See [references/route-integration.md](references/route-integration.md) for route loader integration examples.
