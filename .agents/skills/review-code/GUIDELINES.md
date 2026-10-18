# Code Review Guidelines

This document outlines the mandatory review checklist for all code changes in this repository. These guidelines ensure consistency, maintainability, and adherence to established patterns.

---

## TypeScript & Type Safety

### No Type Assertions

Types must always be either validated or inferred. Never use type assertions (`as`, `as unknown as`, etc.) unless absolutely necessary. If you find yourself needing a type assertion, consider:

- Can I validate this with zod or another schema validator?
- Can I refactor the code to allow TypeScript to infer the type correctly?
- Can I use `satisfies` to ensure the correct type without assertions?

**Bad:**

```typescript
const user = data as User;
const id = req.params.id as string;
```

**Good:**

```typescript
// Validate with zod
const user = userSchema.parse(data);

// Infer from return type
const id = getUserId(); // returns string
```

**Exception:** Type assertions are acceptable only as a last resort with a comment explaining why.

### No Extra Types If They Can Be Inferred

Don't define explicit types when TypeScript can infer them automatically, especially for method return types.

**Bad:**

```typescript
// Service methods
public async getUser(userId: string): Promise<UserResponse> {
  return await UserModel.findById(userId);
}

function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

**Good:**

```typescript
// Return type inferred from implementation
public async getUser(userId: string) {
  return await UserModel.findById(userId);
}

function calculateTotal(items: Item[]) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

**Exception:** Helper/utility functions MAY define explicit return types for clarity.

### No `enum`, No `z.enum`, Prefer `Enumwaii`

Use `em` from `enumwaii` for every reusable closed set. It keeps members as plain strings at runtime while rejecting raw literals and values from unrelated enums at the type level. See the **enumwaii** skill — mandatory reading before touching any enum-like value. Internal values MUST be `CONSTANT_CASE`.

**Bad:**

```typescript
enum UserRole {
    ADMIN = "ADMIN",
    USER = "USER",
}

const USER_ROLES = {
    ADMIN: "ADMIN",
    USER: "USER",
} as const;

export const userRolesSchema = z.enum(['ADMIN', 'USER', 'GUEST']);
```

**Good:**

```typescript
import { em } from 'enumwaii';
import { emToZodSchema } from 'enumwaii/zod';

const userRolesEnumwaii = em(['ADMIN', 'USER', 'GUEST']);
export const USER_ROLES = userRolesEnumwaii.enum;
export type UserRole = (typeof userRolesEnumwaii)['~type'];
export const userRoleSchema = emToZodSchema(userRolesEnumwaii);

// Usage
if (user.role === USER_ROLES.ADMIN) { ... }
```

### Use Enums Instead of String Literals

When values are reused across server and client, always use enums instead of hardcoding strings.

**Bad:**

```typescript
if (user.role === 'ADMIN') { ... }
const statusMap = {
  SUCCESS: 'success',
  ERROR: 'error',
};
```

**Good:**

```typescript
if (user.role === USER_ROLES.ADMIN) { ... }
const statusMap = {
  [STATUS.SUCCESS]: NOTIFICATION_TYPES.SUCCESS,
  [STATUS.ERROR]: NOTIFICATION_TYPES.ERROR,
} satisfies Record<StatusType, NotificationType>;
```

### Use `satisfies` Clauses

Use `satisfies` to ensure object shapes without losing type inference.

**Bad:**

```typescript
const CONFIG: Record<string, Record<string, number>> = {
    api: { timeout: 5000, retries: 3 },
    // cache: { ttl: 3600 },
};
// Type is widened to Record<string, Record<string, number>>, losing literal types
CONFIG.cache; // doesn't exist, but no error because of type widening
```

**Good:**

```typescript
const CONFIG = {
    api: { timeout: 5000, retries: 3 },
    cache: { ttl: 3600 },
} satisfies Record<string, Record<string, number>>;

// Type is preserved, not widened to Record<string, Record<string, number>>
CONFIG.api.timeout; // number (literal 5000)
```

---

## Data Fetching & State Management

### TanStack Query Options Must Be Named in UPPERCASE

All query options, mutation options, and query key functions must follow UPPERCASE_SNAKE_CASE naming.

**Bad:**

```typescript
export const meQueryOptions = queryOptions({ ... });
export const useDeleteCharacter = () => { ... };
```

**Good:**

```typescript
export const ME_QUERY_OPTIONS = queryOptions({ ... });
export const USE_DELETE_CHARACTER_MUTATION = () => { ... };
export const GET_CHARACTER_QUERY_KEY = (input: iGetCharacterInput) => ...;
```

**Pattern:**

- Query options: `{FEATURE}_{ACTION}_QUERY_OPTIONS`
- Mutation options: `{FEATURE}_{ACTION}_MUTATION_OPTIONS`
- Query keys: `{FEATURE}_{ACTION}_QUERY_KEY`

### Use TanStack Query `queryKey`/`queryOptions`/`mutationOptions` Methods from oRPC

Prefer using the built-in `queryKey` method from oRPC contracts for consistency.
Define them OUTSIDE of hooks and components to avoid unnecessary re-renders and ensure stable references.

**Good:**

```typescript
export const listWorldInfoQueryKey = (input?: iListWorldInfoInput) =>
    tanstackRPC.worldinfo.listWorldInfo.queryKey({ input: input ?? {} });
```

---

## Validation & Security

### No Weak Validation

All input fields must have appropriate constraints to prevent unlimited arrays, objects, strings, numbers, etc. This prevents DoS attacks and ensures data integrity.

**Bad:**

```typescript
z.object({
    name: z.string(),
    tags: z.array(z.string()),
    description: z.string(),
    themes: z.array(z.string().max(100)), // Missing array limit!
    characterIds: z.array(z.string()).max(50), // Good array limit, but strings unlimited
    talkativeness: z.number(),
});
```

**Good:**

```typescript
z.object({
    name: z.string().min(1).max(200),
    tags: z.array(z.string().max(50)).max(20),
    description: z.string().max(5000),
    themes: z.array(z.string().max(100)).max(20), // Both array AND string limits
    characterIds: z.array(z.string()).max(50), // IDs don't need string limits
    talkativeness: z.number().min(0).max(1),
});
```

**Required validations:**

- **Strings**: Always set `.min()` and `.max()` unless truly unlimited
  - Use `.min(1)` for required non-empty strings (titles, names)
  - Optional strings should use `.optional()` explicitly, not empty string defaults
- **Arrays**: ALWAYS set `.max()` with reasonable limit
  - Also limit string length INSIDE arrays: `z.array(z.string().max(100)).max(20)`
  - Nested arrays need limits at each level
- **Numbers**: Set `.min()` and`.max()` for bounded values
  - Percentages: `.min(0).max(1)` or `.min(0).max(100)`
  - Counts/IDs: `.min(0)` at minimum
- **Objects**: Limit nesting depth if applicable

**Common Limits:**
- Names/Titles: `.max(200)`
- Short descriptions: `.max(500)`
- Descriptions: `.max(5000)`
- Long content: `.max(10000)`
- Array of IDs: `.max(50)` - `.max(100)`
- Array of objects: `.max(20)` - `.max(50)`
- Tags/keywords: `z.array(z.string().max(50)).max(20)`

**Validation Checklist (Review EVERY schema):**

- ⚠️ All strings have `.max()`
- ⚠️ Required strings have `.min(1)` OR are truly optional with `.optional()`
- ⚠️ All arrays have `.max()` at the array level
- ⚠️ Strings/objects inside arrays also have limits
- ⚠️ Numbers have appropriate `.min()` and `.max()`
- ⚠️ No `z.any()` types - use proper schemas

### Error Codes Must Be Registered

All error codes must be declared by a module as an `ERROR_CODE` contribution in its manifest (`packages/create-tsukuri/src/modules/*.module.ts`) and used with proper error wrappers. They are generated into `packages/common/src/generated/error-codes.ts`, which is never edited by hand.

**Good:**

```typescript
// In the module manifest
{
    kind: CONNECTION_POINT_KINDS.ERROR_CODE,
    workspace: "packages/common",
    code: "CHARACTER_NOT_FOUND",
    message: "Character not found",
},

// In router/service
import { errorCodes } from "@startername/common/generated/error-codes";

import { ORPCNotFoundError } from "#~/lib/orpc-error-wrapper";

if (!character) {
    throw ORPCNotFoundError(errorCodes.CHARACTER_NOT_FOUND);
}
```

---

## Database & Performance

### No N+1 Query Patterns

Always identify and eliminate N+1 query patterns where a query is executed in a loop or for each item in a collection.

**Bad - N+1 Query:**

```typescript
// Fetches stories, then runs 2 queries per story (N+1 problem)
async listStories(userId: string) {
    const stories = await StoryModel.find({ userId });
    
    for (const story of stories) {
        story.chatCount = await ChatModel.countDocuments({ storyId: story._id });
        story.chapterCount = await ChapterModel.countDocuments({ storyId: story._id });
    }
    
    return stories;
}
```

**Good - Use Aggregation Pipeline:**

```typescript
async listStories(userId: string) {
    const pipeline = [
        { $match: { userId } },
        {
            $lookup: {
                from: 'chats',
                let: { storyId: { $toString: '$_id' } },
                pipeline: [
                    { $match: { $expr: { $eq: ['$storyId', '$$storyId'] } } },
                    { $count: 'count' },
                ],
                as: 'chatInfo',
            },
        },
        {
            $lookup: {
                from: 'chapters',
                let: { storyId: { $toString: '$_id' } },
                pipeline: [
                    { $match: { $expr: { $eq: ['$storyId', '$$storyId'] } } },
                    { $count: 'count' },
                ],
                as: 'chapterInfo',
            },
        },
        {
            $addFields: {
                chatCount: { $ifNull: [{ $arrayElemAt: ['$chatInfo.count', 0] }, 0] },
                chapterCount: { $ifNull: [{ $arrayElemAt: ['$chapterInfo.count', 0] }, 0] },
            },
        },
    ];
    
    return await StoryModel.aggregate(pipeline);
}
```

**Alternative - Parallel Queries for Detail Views:**

```typescript
// When fetching a single entity with related data
async getStoryDetail(storyId: string) {
    const story = await StoryModel.findById(storyId);
    
    // Fetch all related data in parallel (not in a loop)
    const [narrative, plotline, chapters, overrides, chatCount] = await Promise.all([
        story.narrativeId ? NarrativeModel.findById(story.narrativeId) : null,
        story.plotlineId ? PlotlineModel.findById(story.plotlineId) : null,
        ChapterModel.find({ storyId: story._id }),
        OverrideModel.find({ storyId: story._id }),
        ChatModel.countDocuments({ storyId: story._id }),
    ]);
    
    return { ...story, narrative, plotline, chapters, overrides, chatCount };
}
```

**Detection Checklist:**

- ⚠️ `await` inside a `for`/`forEach`/`map` loop
- ⚠️ Multiple queries executed sequentially that could be parallel
- ⚠️ Queries based on results from a previous query in a loop
- ✅ Use aggregation pipelines with `$lookup` for lists
- ✅ Use `Promise.all()` for parallel independent queries
- ✅ Consider denormalizing frequently accessed counts

### Contract Schemas Must Match Models

Shared contract schemas must include all fields that exist in database models, especially when those fields are needed by clients.

**Bad:**

```typescript
// Model has these fields
class Chat {
    storyId?: string;
    isStoryChat: boolean;
    originalChatId?: string;
}

// But contract doesn't include them - data will be stripped on output!
const CHAT_SCHEMA = z.object({
    _id: z.string(),
    userId: z.string(),
    name: z.string(),
    // Missing: storyId, isStoryChat, originalChatId
});
```

**Good:**

```typescript
const CHAT_SCHEMA = z.object({
    _id: z.string(),
    userId: z.string(),
    name: z.string(),
    // Include all fields clients need
    storyId: z.string().optional(),
    isStoryChat: z.boolean().default(false),
    originalChatId: z.string().optional(),
});
```

**Review Checklist:**

- ✅ All model fields that clients need are in the contract schema
- ✅ Optional fields use `.optional()` or `.default()`
- ✅ Contract types are imported/reused across related contracts (no `z.any()`)
- ⚠️ New model fields added → Update contract schema
- ⚠️ Field used in frontend → Must be in contract schema

### Type-Safe Data Transformations

When merging or transforming data from multiple sources, ensure type safety without using type assertions.

**Bad:**

```typescript
mergeWithBase(base: CharacterDoc, override: OverrideDoc) {
    const merged = { ...base };
    
    // @ts-expect-error - Type mismatch ignored
    if (override.emotionSprites) merged.emotionSprites = override.emotionSprites;
    
    return merged as MergedCharacter;
}
```

**Good:**

```typescript
mergeWithBase(base: CharacterDoc, override: OverrideDoc): MergedCharacter {
    const merged: MergedCharacter = {
        ...base.toObject(),
        hasOverride: Boolean(override),
    };
    
    // Normalize override sprites to match expected shape
    if (override.emotionSprites) {
        merged.emotionSprites = override.emotionSprites.map((sprite) => ({
            emotion: sprite.emotion,
            imagePath: sprite.imagePath,
            imageUrl: sprite.imageUrl,
            isGenerated: false, // Add missing required fields
            generatedImageId: undefined,
        }));
    }
    
    return merged;
}
```

**Pattern:**
- Define explicit return type
- Build typed object incrementally
- Transform data to match expected shape
- Avoid `@ts-expect-error` and type assertions

---

## Code Organization & Architecture

### No Barrel Imports

Forbidden to use barrel imports (`index.ts`) in favor of importing required code directly.

**Bad:**

```typescript
import { Button, Card, Input } from "./components";
import { useUser, useAuth } from "./hooks";
```

**Good:**

```typescript
import { Button } from "./components/button";
import { Card } from "./components/card";
import { Input } from "./components/input";
import { useUser } from "./hooks/use-user";
import { useAuth } from "./hooks/use-auth";
```

**Rationale:** Explicit imports improve tree-shaking, make dependencies clear, and prevent circular dependency issues.

### No Duplicated Constants/Helpers Between Server and Web

Reusable constants and helpers must be extracted to `packages/common` instead of duplicating across server and web.

**Bad:**

```typescript
// packages/api/src/constants/limits.ts
export const MAX_NAME_LENGTH = 200;

// apps/web/src/constants/limits.ts
export const MAX_NAME_LENGTH = 200;
```

**Good:**

```typescript
// packages/common/src/constants/limits.ts
export const MAX_NAME_LENGTH = 200;

// Usage in both apps
import { MAX_NAME_LENGTH } from "@startername/common/constants/limits";
```

**Note:** Only extract non-sensitive data shared between server and client.

### Use CacheService Instead of Custom Implementation

Never implement custom caching when `CacheService` (`#~/features/cache/cache.service`) is available. It works over the bound key-value store and skips caching when no store is connected.

**Bad:**

```typescript
class MyService {
    private cache = new Map();

    async getData(key: string) {
        if (this.cache.has(key)) return this.cache.get(key);
        // ...
    }
}
```

**Good:**

```typescript
class MyService {
    constructor(private cacheService: CacheService) {}

    async getData(userId: string) {
        return this.cacheService.cached(buildMyFeatureCacheKey.ofUser(userId), CACHE_TTL.USER_DATA, async () => {
            // ...
        });
    }
}
```

### Service Registration: `@singleton` vs `@injectable`

Use `@injectable` by default. Only use `@singleton` when truly needed (database connections, event buses, loggers, global caches).

**@singleton** - Use when:

- Service maintains global state (EventBus, PostgresService, ValkeyService)
- Service is expensive to initialize
- Service manages system resources (LoggerFactory)
- Event listeners need to be registered once (EventServices)

**@injectable** - Use when:

- Service is stateless or request-scoped
- Service performs business logic without global state
- Multiple instances won't cause issues

**Example:**

```typescript
// Singleton - maintains event listeners
@singleton()
export class CharactersEventsService {}

// Injectable - stateless business logic
@injectable()
export class CharactersService {}
```

### Event Services Pattern

Feature event registration must be done in a separate `${Feature}EventsService` and initialized by a startup task (`iStartupTask`, registered through a `STARTUP_TASK` contribution).

**Bad:**

```typescript
// characters.service.ts
@injectable()
export class CharactersService {
  constructor(private eventBus: EventBus) {
    this.eventBus.on(UserCreated, ...); // Event registration in main service
  }
}
```

**Good:**

```typescript
// characters-events.service.ts
@singleton()
export class CharactersEventsService {
    constructor(
        private eventBus: EventBus,
        loggerFactory: LoggerFactory,
    ) {
        this.logger = loggerFactory.create("characters-events-service");
    }

    public initialize() {
        this.eventBus.on(UserAfterRegisteredListener, async ({ userId }) => {
            // Handle event
        });
    }
}

// subscribe-characters-events.task.ts
@injectable()
export class SubscribeCharactersEventsTask implements iStartupTask {
    public readonly name = "Subscribe character event handlers";

    constructor(private readonly charactersEventsService: CharactersEventsService) {}

    public async run() {
        this.charactersEventsService.initialize();
    }
}
```

### DRY - extract duplicated logic into helpers/services when it meets the following criteria:

- Logic is used in 2+ places
- Extracted function has clear, single responsibility
- Abstraction reduces complexity (not increases it)

**Good:**

```typescript
// Reusable logic with clear purpose, used in many places
function calculatePagination(total: number, page: number, limit: number) {
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    return { totalPages, offset, hasMore: page < totalPages };
}
```

### Use `Promise.all` for Parallel Queries

When queries are independent, run them in parallel instead of sequentially.

**Good:**

```typescript
const [chats, total] = await Promise.all([
    ChatModel.find(query).limit(limit).skip(offset).lean(),
    ChatModel.countDocuments(query),
]);
```

**Bad:**

```typescript
const chats = await ChatModel.find(query).limit(limit).skip(offset).lean();
const total = await ChatModel.countDocuments(query);
```

**When to use:**

- Independent database queries
- Multiple API calls
- Parallel validations
- Calls don't depend on each other's results

#### Sequential When Dependencies Exist

Keep operations sequential when they depend on each other.

**Good:**

```typescript
const user = await createUser(userData);
const profile = await createProfile(user.id);
const settings = await initializeSettings(profile.id);
```

### Use Logger Service, Not `console.log`

Always use the injected logger service instead of `console.log/error/warn`.

**Bad:**

```typescript
console.log("User created", userId);
console.error("Failed to save", error);
```

**Good:**

```typescript
// In a service (the logger comes from the injected LoggerFactory)
this.logger = loggerFactory.create("feature-name");
this.logger.info("User created", { userId });
this.logger.error("Failed to save character", { error, characterId, userId });
```

**Benefits:**

- Structured logging with context
- Log levels (info, warn, error, debug)
- Centralized configuration
- Production-ready logging

### Use Typed Environment Variables

Never access `process.env` or `import.meta.env` directly. Use typed constants.

**Bad:**

```typescript
const port = process.env.SERVER_PORT;
const apiUrl = import.meta.env.VITE_API_URL;
```

**Good:**

```typescript
// Server (each server workspace validates its own variables in src/constants/env.ts)
import { env } from "#~/constants/env";
const port = env.SERVER_PORT;

// Web
import { IS_DEVELOPMENT } from "#~/constants";
if (IS_DEVELOPMENT) {
}
```

### Context Pattern

When creating context, provide a typed hook with error handling.

**Good:**

```typescript
// 1. Define context type
interface iChatInputContextValue {
    state: ChatInputState;
    actions: ChatInputActions;
}

// 2. Create context
export const ChatInputContext = createContext<iChatInputContextValue | null>(
    null,
);

// 3. Provide typed hook with error handling
export const useChatInput = () => {
    const context = useContext(ChatInputContext);
    if (!context) {
        throw new Error("useChatInput must be used within ChatInputProvider");
    }
    return context;
};
```

### Validate Ownership in Service Layer

Always verify the user owns the resource they're trying to access.

**Good:**

```typescript
public async getCharacter(userId: string, id: string) {
  const character = await CharacterModel.findOne({
    _id: id,
    userId // Validate ownership
  });

  if (!character) {
    throw ORPCNotFoundError(errorCodes.CHARACTER_NOT_FOUND);
  }

  return character;
}
```

### Use NOT_FOUND for Access Denial

Return NOT_FOUND instead of FORBIDDEN to prevent information leakage.

**Good:**

```typescript
// Don't reveal if resource exists when user has no access
const character = await CharacterModel.findOne({ _id: id, userId });
if (!character) {
    throw ORPCNotFoundError(errorCodes.CHARACTER_NOT_FOUND); // Could be missing or no access
}
```

**Bad:**

```typescript
const character = await CharacterModel.findOne({ _id: id });
if (!character) {
    throw ORPCNotFoundError(errorCodes.CHARACTER_NOT_FOUND);
}
if (character.userId !== userId) {
    throw ORPCForbiddenError(errorCodes.CHARACTER_ACCESS_DENIED); // Reveals resource exists
}
```

---

## Testing

### No Useless Tests

Tests must validate meaningful behavior, not implementation details or trivial logic.

**Bad (useless):**

```typescript
import { someEnum } from "@startername/common/constants/some-enum";

it("should return true when true is passed", () => {
    expect(identity(true)).toBe(true);
});

it("should have a method called getUser", () => {
    expect(typeof service.getUser).toBe("function");
});

it("should have all needed keys in the object", () => {
    expect(someEnum).toEqual({
        KEY1: "KEY1",
        KEY2: "KEY2",
    });
});
```

**Good:**

```typescript
it("should create character with pseudonyms", async () => {
    const character = await createCharacter(ctx, {
        name: "Seraphina",
        pseudonym: ["Sera", "Princess"],
    });

    expect(character.name).toBe("Seraphina");
    expect(character.pseudonym).toEqual(["Sera", "Princess"]);
});
```

### No Direct Repository Calls in Integration Tests

Tests must call server functions, not interact with repositories or tables directly (except when arranging state no endpoint exposes, or when testing specific repository behavior).
Calling services should only be done in unit tests for service logic, never in integration tests which should test the full stack.

**Bad:**

```typescript
it("should create user", async () => {
    const user = await getUserRepository().create({ name: "Test" }); // Direct repository call
    const updatedUser = await container.resolve(UserService).updateUser({
        id: user.id,
        name: "New Name",
    }); // Call service method
    expect(updatedUser.name).toBe("New Name");
});
```

**Good:**

```typescript
it("should create user", async () => {
    const user = await call(
        appRouter.users.createUser,
        { name: "Test" },
        ctx(),
    );
    const updatedUser = await call(
        appRouter.users.updateUser,
        { id: user.id, name: "New Name" },
        ctx(),
    );
    expect(user.name).toBe("Test");
    expect(updatedUser.name).toBe("New Name");
});
```

**Exception:** Direct repository calls are acceptable when testing:

- Repository query behavior
- Database indexes and constraints
- Arranging state that no endpoint exposes (through `test/integration/fixtures/repository.fixtures.ts`)
- Custom query builders

### Test File Organization

Tests must mirror the feature structure:

```
packages/api/test/
  ├── integration/         # Feature integration tests
  │   ├── characters.test.ts
  │   ├── chats.test.ts
  │   ├── worldinfo.test.ts
  │   └── fixtures/        # Domain fixtures
  ├── unit/               # Utility unit tests
  │   ├── template-renderer.test.ts
  │   └── prompt-builder.test.ts
  └── helpers/            # Test utilities
      ├── setup.ts        # Starts the API once
      ├── setup/          # One *.setup.ts per module
      └── auth-users.ts   # createUser()
```

**Prefer integration tests** for features; use unit tests only for utilities and helpers.

---

## Error Handling

### No Useless `toastError`/`toastInfo`/`toastSuccess` in React Components

TanStack Query handles errors automatically. Only use toast for:

- Success confirmations after mutations when user NEEDS feedback
- Non-query related errors (e.g. client-side validation errors, unexpected exceptions)

### Use Error Wrappers with Error Codes

All errors must use custom error wrappers from `packages/api/src/lib/orpc-error-wrapper.ts`.

**Available wrappers:**

- `ORPCUnauthorizedError` - User not authenticated
- `ORPCNotFoundError` - Resource not found OR user has no access
- `ORPCForbiddenError` - User lacks permissions
- `ORPCBadRequestError` - Invalid input format or malformed request
- `ORPCUnprocessableContentError` - Valid input but semantically invalid operation
- `ORPCTooManyRequestsError` - Rate limit exceeded
- `ORPCInternalServerError` - Server error

**Example:**

```typescript
import { errorCodes } from "@startername/common/generated/error-codes";

import { ORPCNotFoundError } from "#~/lib/orpc-error-wrapper";

if (!character || character.userId !== userId) {
    throw ORPCNotFoundError(errorCodes.CHARACTER_NOT_FOUND);
}
```

---

## UI Components & Forms

### Use `#~/components/ui` Generic Components

Never use native HTML elements or write custom generic components when `#~/components/ui` provides them.
If a required component doesn't exist, create it in `#~/components/ui` instead of using native elements or creating feature-specific components.

**Bad:**

```typescript
<button onClick={handleClick}>Submit</button>
<input type="text" value={name} onChange={handleChange} />
<textarea value={description} />
```

**Good:**

```typescript
import { Button } from '#~/components/ui/button';
import { Input } from '#~/components/ui/input';
import { Textarea } from '#~/components/ui/textarea';

<Button onClick={handleClick}>Submit</Button>
<Input value={name} onChange={handleChange} />
<Textarea value={description} />
```

### Forms Must Use `withForm` HOC

Forms should be extracted to `withForm` HOC for reusability and consistency.

**Bad:**

```typescript
function CharacterForm() {
  const form = useAppForm({ ... });
  const [tags, setTags] = useState([]); // State outside form

  return <form>...</form>;
}
```

**Good:**

```typescript
interface iCharacterFormProps {
  // Define any additional props needed for the form
}

export const CharacterForm =  withForm({
  defaultValues: {
    name: '',
    pseudonym: [],
    description: '',
  },
  props: {} as iCharacterFormProps,
  render: function Render({ form, ...props }) { // props depend on `props` field
    return (
      // ... form parts
    );
  },
});
```

### Forms State Must Be Inside `useAppForm`

All form state, including arrays and complex objects, must be managed within `useAppForm`, not declared outside.
Then, use `mode="array"` on `form.Field` to indicate that the field is an array and TanStack Form will handle it properly.

**Bad:**

```typescript
function Form() {
  const [items, setItems] = useState([]); // Outside form
  const form = useAppForm({ ... });
}
```

**Good:**

```typescript
function Form() {
    const form = useAppForm({
        defaultValues: {
            items: [], // Managed by form
        },
    });
    //
}
```

### Complex form components should be extracted to separate components for readability, but still use `useAppForm` for state management.

**Good:**

```tsx
function ComplexFieldWithManyActions() {
    const field = useFieldContext<iComplexFieldType>();
    const [someComplexThing, setSomeComplexThing] = useState("");

    function handleAdd() {
        if (someComplexThing.trim()) {
            field.pushValue(someComplexThing.trim());
            setSomeComplexThing("");
        }
    }

    return (
        <div>
            {/* Complex UI with multiple actions */}
            <Input
                value={someComplexThing}
                onChange={(e) => setSomeComplexThing(e.target.value)}
                placeholder="Enter something complex"
            />
            <Button onClick={handleAdd}>Add</Button>
            {/* Render field values */}
            {field.state.value?.map((item, index) => (
                <div key={index}>{item}</div>
            ))}
        </div>
    );
}
```

---

## Naming Conventions

### File Naming

Always use kebab-case for file names.

**Good:**

```
character-creator-modal.tsx
use-list-worldinfo.ts
characters-events.service.ts
```

### Interface Naming

Always prefix interfaces with lowercase `i`.

**Good:**

```typescript
export interface iUserData {}
export interface iListWorldInfoInput {}
export interface iOnboardingWizardState {}
```

Additionally, for React component props, use `i{ComponentName}Props`. For method parameters, use `i{MethodName}Params`. This provides clear context on what the interface represents.

### Contract File Naming

Contracts must be named `{feature}.contract.ts` in `packages/server-contract/src/contract/`.

**Good:**

```
packages/server-contract/src/contract/
  ├── characters.contract.ts
  ├── chats.contract.ts
  └── worldinfo.contract.ts
```

### Service File Naming

Services must follow the pattern `{feature}.service.ts`.

**Good:**

```
characters.service.ts
characters-events.service.ts
worldinfo-scanner.service.ts
```

### Router File Naming

Routers must be named `{feature}.router.ts` and live in their feature folder.

**Good:**

```
packages/api/src/features/
  ├── characters/characters.router.ts
  ├── chats/chats.router.ts
  └── worldinfo/worldinfo.router.ts
```

---

## Code Quality

### No `// TODO` Comments

TODO comments create technical debt. Instead:

- Complete the task before committing
- Create a GitHub issue if the task is non-trivial
- Document known limitations in a `KNOWN_ISSUES.md` file

### `@ts-expect-error` / `eslint-disable-next-line` Must Have Explanation

Never suppress errors without explaining why OR fixing if easily fixable.

**Bad:**

```typescript
// @ts-expect-error
const value = data.field;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function process(data: any) {}
```

**Good:**

```typescript
// @ts-expect-error - Better Auth plugin types are incomplete, safe to ignore
const session = await auth.api.getSession();

// eslint-disable-next-line @typescript-eslint/no-explicit-any - Generic callback wrapper needs any for flexibility
function withCallback<T extends (...args: any[]) => any>(fn: T) {}
```

**Preferred:** Fix the root cause instead of suppressing.

### Follow Conventional Commits

All commits must follow conventional commit format:

```
feat(characters): add character duplication
fix(worldinfo): correct scanner regex validation
refactor(auth): simplify session handling
docs(readme): update installation instructions
test(chats): add message deletion tests
chore(deps): update dependencies
```

### Extract String Literals to Enums

If you encounter string literals without enums, extract them to shared enums, especially if:

- Value is used in multiple places
- Value has a specific set of valid values
- Value is shared between server and client

**Bad:**

```typescript
if (status === 'pending') { ... }
const type = 'notification';
```

**Good:**

```typescript
const statusEnumwaii = em(['PENDING', 'COMPLETED', 'FAILED']);
export const STATUS = statusEnumwaii.enum;

const typeEnumwaii = em(['NOTIFICATION', 'ALERT', 'MESSAGE']);
export const TYPES = typeEnumwaii.enum;

if (status === STATUS.PENDING) { ... }
const type = TYPES.NOTIFICATION;
```

### Do not define inner types inside of functions, components or classes. Always define types at the top level of the module.

**Bad:**

```typescript
function processUser(someArgs: string, otherArgs: number) {
    // ...
    interface iInnerType {
        field1: string;
        field2: number;
    }

    type tInnerType = {
        field1: string;
        field2: number;
    }
}
```

**Good:**

```typescript
interface iInnerType {
    field1: string;
    field2: number;
}

type tInnerType = {
    field1: string;
    field2: number;
};

function processUser(someArgs: string, otherArgs: number) {
    // ...
}
```