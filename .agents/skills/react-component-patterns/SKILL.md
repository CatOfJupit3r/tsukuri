---
name: react-component-patterns
description: Create React components following project conventions for UI composition, accessibility, and styling. Use when building new UI components, forms with validation, accessible interactive elements, avoiding giant prop drilling, using slot-based composition, deriving child prop types from hooks with ReturnType or Pick, composing from existing UI primitives, managing URL state with nuqs, or handling loading and error states.
---

# React Component Patterns

## Core Principles

- **Compose from UI primitives** - Use `#~/components/ui/*` instead of building from scratch
- **Type safety** - Interface props with `i` prefix convention
- **Design tokens** - Use Tailwind tokens (`bg-background`, `text-muted-foreground`) never hardcoded colors
- **Accessibility first** - Semantic HTML, ARIA labels, keyboard navigation
- **Handle all states** - Loading (skeletons), error (alerts/boundaries), empty, success
- **URL state sync** - Use nuqs for filters, pagination, sorting
- **Mobile-first** - Responsive variants with `isMobile` prop pattern

## Enumwaii requirement

Use `Enumwaii` for every closed set used by a component, hook, URL state, select, default, or test fixture. Import the owning accessor and use members such as `SETTINGS_TABS.ACCOUNT`; do not introduce `z.enum`, raw string unions, duplicated literals, or `Record<string, ...>` maps for enum-backed values. Use `emToZodSchema(enumeration)` in form validation and computed keys in metadata maps (`{ [SETTINGS_TABS.ACCOUNT]: ... }`).

## Size And Composition Limits

These are hard limits for `apps/web` components. Treat them as refactor triggers, not suggestions.

- **Max 200 lines per `.tsx` file** - Target 120-160 lines. Split any file that grows past 200 lines. Exception: if the only way to get under the limit is a pass-through wrapper or a giant drilled prop interface, keep the better composition and tolerate a modest overage. Files past 250 lines should still be treated as architecture debt and broken apart before adding new behavior.
- **Max 2 React component declarations per file** - Default to one exported component plus at most one tiny private helper. If you need more, move them into sibling files.
- **No component declarations inside component bodies** - Never define `function`, `const Component = () =>`, or memoized JSX components inside another component. Extract them to sibling files.
- **State view files belong in dedicated shared files** - Empty, error, skeleton, loading, and not-found states go in files like `empty-components.tsx`, `error-components.tsx`, `skeleton-components.tsx`, or a slice-specific equivalent such as `story-detail-skeleton-components.tsx`.
- **Max 5 hooks per component** - Count `useState`, `useReducer`, `useEffect`, `useMemo`, `useCallback`, `useRef`, and custom hooks. If you need more, extract a feature hook or split the component.
- **Max 2 stateful hooks per parent container** - More than two pieces of local state usually means orchestration belongs in a hook.
- **Max 2 memoization hooks total** - If you reach more than one `useMemo` and one `useCallback` in the same file, stop and extract logic instead of stacking memoization.
- **Max 3 top-level conditional UI branches** - If render logic contains more than loading/error/empty plus success, move state branches into dedicated components.
- **Max 4 visually distinct sections in one render tree** - Headers, sidebars, forms, lists, dialogs, inspectors, and footers should be composed from child components rather than built inline in one parent.

### Refactor Triggers

Refactor immediately when any of these show up:

- More than one inline helper component in a parent file
- Repeated JSX blocks with only minor prop differences
- More than 25 lines of JSX in a single return branch
- More than one dialog, card, or panel implementation in the same file
- Utility formatting helpers mixed into a component file instead of a `.utils.ts` file
- More than one effect coordinating the same piece of state
- A component mostly forwards a large data-and-callback bundle to one child instead of owning the layout directly
- A props interface becomes a transport object for one parent-child relationship rather than a real component contract

### How To Stay Under The Limits

- Extract orchestration into `hooks/use-<feature>-state.ts` or `hooks/use-<feature>-controller.ts`
- Keep route/container components focused on query selection, permission checks, and wiring callbacks
- Move presentational sections into `components/<slice>/<slice>-section.tsx`, `*-card.tsx`, `*-dialog.tsx`, or `*-panel.tsx`
- Move derived labels, formatting, and option mapping into `*.utils.ts`
- Group shared state views under dedicated files instead of declaring them beside the main feature component
- Prefer composition over prop transport. If a child only exists to receive a wide prop surface from one parent, reconsider the boundary.
- Use slot-based composition when a shared layout shell is still useful, but merge thin shells back into the owner when they only forward sections without adding real behavior.
- Prefer a small line-limit overage to introducing giant prop drilling, fake abstractions, or layout wrappers whose only job is forwarding props.

### Prop Drilling And Ownership

- Do not create intermediary components whose main job is forwarding 8-10+ props, callbacks, and loading flags into one child tree.
- If the parent owns the route state, mutation wiring, and page layout, it should usually render the major sections directly.
- If the layout shell is genuinely reusable, use slot-based composition instead of one giant interface for hero, actions, dialogs, and side sections.
- If the shell stops adding value and only re-exports slots, merge it back into the owner and keep the orchestration extracted in a feature hook.
- Passing a small, coherent prop set through one level is fine. Passing a whole page contract through multiple levels is not.

### State Component File Pattern

```text
apps/web/src/features/stories/components/
  ├── story-detail-page.tsx
  ├── skeleton-components.tsx
  ├── error-components.tsx
  ├── empty-components.tsx
  └── story-detail/
      ├── editable-story-header.tsx
      ├── story-meta-badges.tsx
      └── story-workspace-shortcuts.tsx
```

Rules for shared state files:

- Keep them focused on one feature or one slice of a feature
- Keep each state component small and presentation-only
- Do not place fetch logic, mutation logic, or feature orchestration in these files
- If a shared state file grows beyond 120 lines or needs unrelated variants, split it again

## Component Structure

### Prop And Callback Typing

- Treat feature hooks and local controller hooks as the source of truth for child callback and state prop types.
- Export `type FeatureController = ReturnType<typeof useFeatureController>` when a slice has multiple child components consuming the same local behavior.
- If a child consumes a named subset of that controller, prefer `interface iChildProps extends Pick<FeatureController, 'handleSave' | 'isSaving'>` over rewriting callback signatures by hand.
- Keep the picked property names when the child is a direct controller-backed consumer. This preserves traceability from the hook return shape to the child API.
- Use indexed access like `FeatureController['handleSave']` when only one prop needs to reference the controller type.
- Use `Parameters<>` and `ReturnType<>` when the parent intentionally adapts a controller method instead of forwarding it directly.
- Do not overfit generic shared components to one specific hook/controller. If the component is reused for multiple variants, keep the prop types generic enough for all of them.
- If a child prop name differs from the controller method, that difference should reflect a real behavioral adaptation, not just a local naming preference.

### Interface Naming Convention

**ALWAYS** prefix component props interfaces with `i`:

```typescript
interface iUserCardProps {
  userId: string;
  onEdit?: () => void;
}

export function UserCard({ userId, onEdit }: iUserCardProps) {
  // Component implementation
}
```

### Feature Organization

```
apps/web/src/features/characters/
  ├── components/
  │   ├── character-card.tsx
  │   ├── character-list.tsx
  │   └── index.ts               # Export public API
  ├── hooks/
  │   ├── use-character.ts
  │   └── use-create-character.ts
  ├── schemas/
  │   └── character.schema.ts    # Zod schemas
  └── index.ts                   # Feature public API
```

Export only what other features need:

```typescript
// features/characters/index.ts
export { CharacterCard, CharacterList } from './components';
export { useCharacter, useCreateCharacter } from './hooks';
```

### Container vs Presentational Split

Use this split by default for non-trivial feature UI:

- **Container components** own data loading, URL state, permissions, and mutation wiring
- **Presentational components** receive data and callbacks, render markup, and stay mostly stateless
- **Feature hooks** own multi-step local state, effects, derived values, keyboard handlers, and action orchestration
- **State components** render empty, error, skeleton, and not-found views from dedicated shared files

If a component needs both heavy orchestration and a large render tree, that is two responsibilities. Split it.

## UI Composition

### Available Primitives

Common primitives from `#~/components/ui`:

- **Layout**: `Card`, `CardHeader`, `CardTitle`, `CardContent`, `Separator`, `ScrollArea`
- **Forms**: `Button`, `Input`, `Textarea`, `Label`, `Checkbox`, `Switch`, `Select`
- **Feedback**: `Alert`, `Skeleton`, `Empty`, `Loader`, `Progress`
- **Overlay**: `Dialog`, `Sheet`, `Drawer`, `Popover`, `Tooltip`, `DropdownMenu`
- **Navigation**: `Tabs`, `Breadcrumb`, `NavigationMenu`
- **Data**: `Avatar`, `Badge`, `Item` (list items)

### Composition Pattern

```typescript
import { Card, CardHeader, CardTitle, CardContent } from '#~/components/ui/card';
import { Button } from '#~/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '#~/components/ui/avatar';

interface iCharacterCardProps {
  character: {
    id: string;
    name: string;
    avatarUrl?: string;
    description?: string;
  };
  onSelect?: () => void;
}

export function CharacterCard({ character, onSelect }: iCharacterCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <Avatar>
          <AvatarImage src={character.avatarUrl} alt={character.name} />
          <AvatarFallback>{character.name[0]}</AvatarFallback>
        </Avatar>
        <CardTitle>{character.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{character.description}</p>
        <Button className="mt-4" onClick={onSelect}>
          Select Character
        </Button>
      </CardContent>
    </Card>
  );
}
```

## Forms

**→ See `.agents/skills/tanstack-forms/SKILL.md` for comprehensive form patterns.**

Quick reference - use `useAppForm` with Zod validation:

```typescript
import z from 'zod';
import { useAppForm } from '#~/components/ui/field';
import { useCreateCharacter } from '../hooks/use-create-character';

const characterSchema = z.object({
  name: z.string().min(1, 'Name required').max(100),
});

export function CreateCharacterForm() {
  const { mutate: createCharacter } = useCreateCharacter();

  const form = useAppForm({
    defaultValues: { name: '' },
    validators: { onSubmit: characterSchema },
    onSubmit: ({ value }) => createCharacter(value),
  });

  return (
    <form.AppForm>
      <form.Form className="space-y-4">
        <form.AppField name="name">
          {(field) => <field.TextField label="Character Name" />}
        </form.AppField>
        <form.SubmitButton>Create</form.SubmitButton>
      </form.Form>
    </form.AppForm>
  );
}
```

## Data Fetching & State Management

**→ See `.agents/skills/tanstack-query-integration/SKILL.md` for query/mutation patterns.**

### Loading States

**Always import skeletons from dedicated shared files** - never declare them inline in the main component file:

```typescript
import { Alert } from '#~/components/ui/alert';
import { useCharacter } from '../hooks/use-character';
import { CharacterDetailNotFound, CharacterDetailQueryError } from './error-components';
import { CharacterDetailSkeleton } from './skeleton-components';

export function CharacterDetail({ characterId }: { characterId: string }) {
  const { data: character, isPending, error } = useCharacter(characterId);

  if (isPending) return <CharacterDetailSkeleton />;
  if (error) return <CharacterDetailQueryError />;
  if (!character) return <CharacterDetailNotFound />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{character.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{character.description}</p>
      </CardContent>
    </Card>
  );
}
```

Example dedicated state file:

```typescript
// skeleton-components.tsx
import { Card, CardContent, CardHeader } from '#~/components/ui/card';
import { Skeleton } from '#~/components/ui/skeleton';

export function CharacterDetailSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}
```

```typescript
// error-components.tsx
import { Alert, AlertDescription, AlertTitle } from '#~/components/ui/alert';
import { Empty } from '#~/components/ui/empty';

export function CharacterDetailQueryError() {
  return (
    <Alert variant="destructive">
      <AlertTitle>Could not load character</AlertTitle>
      <AlertDescription>Try refreshing or reopen the character from the list.</AlertDescription>
    </Alert>
  );
}

export function CharacterDetailNotFound() {
  return <Empty>Character not found</Empty>;
}
```

### Error Handling

**Route-level errors** - Handled by `ErrorBoundary` component:

```typescript
// In router configuration
import { ErrorBoundary } from '#~/components/error-boundary';

export const router = createRouter({
  defaultErrorComponent: ErrorBoundary,
});
```

**Operation feedback** - UI changes should be the primary feedback:

```typescript
// ✅ GOOD - Optimistic update, item disappears from list
function CharacterList({ characters }) {
  const queryClient = useQueryClient();
  const { mutate: deleteCharacter } = useDeleteCharacter();

  const handleDelete = (id: string) => {
    deleteCharacter(
      { id },
      {
        onMutate: async () => {
          // Optimistically remove from UI
          await queryClient.cancelQueries({ queryKey: ['characters'] });
          const previous = queryClient.getQueryData(['characters']);
          queryClient.setQueryData(['characters'], (old: Character[]) =>
            old.filter((c) => c.id !== id)
          );
          return { previous };
        },
        onError: (err, variables, context) => {
          // Rollback on error + show alert
          queryClient.setQueryData(['characters'], context?.previous);
        },
      }
    );
  };

  return characters.map((char) => (
    <CharacterCard key={char.id} character={char} onDelete={() => handleDelete(char.id)} />
  ));
}

// ❌ BAD - Toast spam, no visual feedback of change
function handleDelete() {
  deleteCharacter(
    { id: characterId },
    {
      onSuccess: () => toastSuccess('Character deleted'), // User can't see what changed!
      onError: (error) => toastError(error.message),
    }
  );
}
```

**Toast notifications** - **Only use when UI cannot show the change:**

```typescript
// ✅ Appropriate: File upload (can't show inline easily)
import { toastError, toastSuccess } from '#~/components/toastifications';

function handleUpload(file: File) {
  uploadFile(
    { file },
    {
      onSuccess: () => toastSuccess('File uploaded'),
      onError: (error) => toastError(error.message || 'Upload failed'),
    }
  );
}

// ✅ Appropriate: Copy to clipboard confirmation
const handleCopy = async () => {
  await navigator.clipboard.writeText(text);
  toastSuccess('Copied to clipboard');
};
```

**→ See `.agents/skills/tanstack-query-integration/SKILL.md` for optimistic update patterns.**
**→ See `.agents/skills/server-error-handling/SKILL.md` for error codes and handling patterns.**

## URL State Management

Declare workflow steps and other closed UI state with `Enumwaii`; compare against accessor members rather than raw step strings. Use the enumwaii schema for validation and `.rawValues` only when a URL library requires plain strings.

Use nuqs for shareable, bookmarkable UI state (filters, tabs, modals):

```typescript
import { useQueryState } from 'nuqs';
import { em } from 'enumwaii';
import { createEnumwaiiQueryParser } from 'enumwaii/nuqs';

// These values are intentionally lowercase because they are URL-facing.
const settingsTabsEnumwaii = em(['profile', 'settings', 'billing']);
const SETTINGS_TABS = settingsTabsEnumwaii.enum;

export function SettingsTabs() {
  const [tab, setTab] = useQueryState(
    'tab',
    createEnumwaiiQueryParser(settingsTabsEnumwaii).withDefault(SETTINGS_TABS.profile)
  );

  return (
    <Tabs value={tab} onValueChange={(v) => void setTab(v)}>
      <TabsList>
        <TabsTrigger value={SETTINGS_TABS.profile}>Profile</TabsTrigger>
        <TabsTrigger value={SETTINGS_TABS.settings}>Settings</TabsTrigger>
        <TabsTrigger value={SETTINGS_TABS.billing}>Billing</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
```

### Multiple Query States

```typescript
import { useQueryStates, parseAsString, parseAsInteger } from 'nuqs';

export function ResourceList() {
  const [{ search, page }, setParams] = useQueryStates({
    search: parseAsString.withDefault(''),
    page: parseAsInteger.withDefault(1),
  });

  return (
    <div>
      <input
        value={search}
        onChange={(e) => void setParams({ search: e.target.value || null, page: 1 })}
      />
      <Pagination
        page={page}
        onPageChange={(p) => void setParams({ page: p })}
      />
    </div>
  );
}
```

**Setup** - Wrap router with `NuqsAdapter` in `__root.tsx`:

```typescript
import { NuqsAdapter } from 'nuqs/adapters/react';

<NuqsAdapter>
  <Outlet />
</NuqsAdapter>
```

## Dialog State Management

Dialogs should reset state when closing:

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '#~/components/ui/dialog';
import { useState } from 'react';

interface iCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateDialog({ open, onOpenChange }: iCreateDialogProps) {
  const [formData, setFormData] = useState({ name: '' });
  const { mutate: create, reset: resetMutation } = useCreate();

  const handleClose = () => {
    setFormData({ name: '' }); // Reset local state
    resetMutation();            // Reset mutation state
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Resource</DialogTitle>
        </DialogHeader>
        {/* Form implementation */}
      </DialogContent>
    </Dialog>
  );
}
```

## Multi-Step Wizards

Use state machine pattern for wizard flows:

```typescript
type WizardStep = 'select-type' | 'configure' | 'confirm';

export function SetupWizard() {
  const [step, setStep] = useState<WizardStep>('select-type');
  const [config, setConfig] = useState<Config | null>(null);

  const handleBack = () => {
    if (step === 'confirm') setStep('configure');
    if (step === 'configure') setStep('select-type');
  };

  const handleNext = () => {
    if (step === 'select-type') setStep('configure');
    if (step === 'configure') setStep('confirm');
  };

  return (
    <Card>
      <CardContent>
        {step === 'select-type' && <SelectTypeStep onNext={handleNext} />}
        {step === 'configure' && <ConfigureStep onBack={handleBack} onNext={handleNext} />}
        {step === 'confirm' && <ConfirmStep onBack={handleBack} onComplete={handleComplete} />}
      </CardContent>
    </Card>
  );
}
```

## Responsive Patterns

Use `isMobile` prop for variant implementations:

```typescript
interface iNavigationProps {
  items: NavItem[];
  isMobile?: boolean;
}

export function Navigation({ items, isMobile = false }: iNavigationProps) {
  if (isMobile) {
    return (
      <nav className="flex flex-col gap-2">
        {items.map((item) => (
          <Button key={item.id} variant="ghost" className="w-full justify-start">
            <item.icon className="mr-2 size-5" />
            {item.label}
          </Button>
        ))}
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-2">
      {items.map((item) => (
        <Button key={item.id} variant="ghost" size="icon" tooltip={item.label}>
          <item.icon className="size-5" />
        </Button>
      ))}
    </nav>
  );
}
```

## Performance Optimizations

### Memoization Rules

- Do not add `useMemo` or `useCallback` by default just to satisfy linting or to pre-empt performance issues
- If a component needs repeated memoization to stay readable, move the logic into a hook or extract a child component
- Prefer stable child boundaries over wrapping half the parent in callbacks
- When a callback exists only to serve a single child section, move the callback and the state it touches into that child or a feature hook

### Prefetch on Hover

Prefetch data before user clicks:

```typescript
import { usePrefetchOnHover } from '#~/hooks/use-prefetch-query';
import { getCharacterQueryOptions } from '../hooks/use-character';

export function CharacterLink({ characterId }: { characterId: string }) {
  const prefetch = usePrefetchOnHover({
    queryOptions: () => getCharacterQueryOptions(characterId),
  });

  return (
    <Link
      to="/characters/$characterId"
      params={{ characterId }}
      onMouseEnter={prefetch}
    >
      View Character
    </Link>
  );
}
```

## Accessibility

### Semantic HTML

Use proper HTML5 elements:

```typescript
// Good
<main>
  <h1>Page Title</h1>
  <section>
    <h2>Section Title</h2>
    <article>Content</article>
  </section>
</main>

// Bad - divs everywhere
<div>
  <div>Page Title</div>
  <div><div>Content</div></div>
</div>
```

### ARIA Labels

Icon-only buttons **must** have labels:

```typescript
// Good
<Button aria-label="Delete character" size="icon">
  <LuTrash className="size-4" />
</Button>

// Bad - no label
<Button size="icon">
  <LuTrash className="size-4" />
</Button>
```

### Focus Management

Dialog/modal components handle focus automatically via Radix primitives. For custom focus:

```typescript
import { useEffect, useRef } from 'react';

export function SearchDialog({ open }: { open: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return <input ref={inputRef} />;
}
```

## Styling Conventions

### Design Tokens

**REQUIRED** - Use design tokens, never hardcoded colors:

```typescript
// ✅ CORRECT - Design tokens
<div className="bg-background text-foreground border-border">
  <h2 className="text-2xl font-semibold">Title</h2>
  <p className="text-muted-foreground">Description</p>
  <Button className="mt-4">Action</Button>
</div>

// ❌ WRONG - Hardcoded colors
<div className="bg-white text-black border-gray-200">
  <h2 className="text-2xl font-semibold">Title</h2>
  <p className="text-gray-500">Description</p>
</div>
```

Common tokens:
- **Background**: `bg-background`, `bg-muted`, `bg-card`
- **Text**: `text-foreground`, `text-muted-foreground`
- **Borders**: `border-border`, `border-input`
- **Semantic**: `bg-primary`, `bg-destructive`, `bg-success`, `text-primary`, `text-destructive`

### Conditional Classes

Use `cn()` utility for conditional styling:

```typescript
import { cn } from '#~/lib/utils';

<Button
  className={cn(
    'size-12 transition-colors',
    isActive && 'bg-primary/10 text-primary',
    isPending && 'opacity-50 cursor-not-allowed'
  )}
>
  Click
</Button>
```

### Spacing Conventions

- **Component spacing**: `space-y-4` or `gap-4` for consistent vertical/grid spacing
- **Section padding**: `p-6` for card content, `p-4` for smaller containers
- **Margins**: Prefer gap/space utilities over margin when possible

## Anti-Patterns

Avoid these patterns in `apps/web`:

- Declaring `EmptyState`, `ErrorState`, `SkeletonState`, dialogs, cards, or section components inside the parent component body
- Large parent components that own fetching, mutation handling, keyboard shortcuts, dialog state, derived labels, and the full render tree at once
- Files that mix container logic, utility functions, and multiple presentational sections together
- Creating more callbacks and memos to manage complexity instead of extracting hooks or child components
- Returning deeply nested JSX with repeated wrappers instead of introducing a named child component
- Adding another state branch to an already crowded file instead of moving state views into shared state files
