---
name: dependency-injection-setup
description: Set up and use dependency injection with tsyringe for server-side services. Use when creating services, implementing service-to-service dependencies, binding interface tokens, writing startup tasks, or using the logger factory pattern.
---

# Dependency Injection Setup

The server code in `packages/api` (`@startername/api`) uses tsyringe with decorator-based auto-registration. Concrete classes are injected by class type using `@singleton()` or `@injectable()` decorators. Interfaces are injected through per-feature tokens.

## Creating a Service

Create your service in `packages/api/src/features/<feature>/<feature>.service.ts`:

```typescript
import { singleton } from 'tsyringe';

import { LoggerFactory } from '#~/features/logger/logger.factory';
import type { iWithLogger, LoggerType } from '#~/features/logger/logger.types';

@singleton()
export class MyFeatureService implements iWithLogger {
  public readonly logger: LoggerType;

  public constructor(loggerFactory: LoggerFactory) {
    this.logger = loggerFactory.create('my-feature-service');
  }

  public async doSomething(input: string) {
    this.logger.info('Processing input', { input });
    return `Processed: ${input}`;
  }
}
```

## No Manual Registration for Classes

A decorated class needs no registration step: tsyringe resolves it by class once its module is loaded. Do not add imports to a container file; there is no `di/container.ts` or central `di/tokens.ts`. Only interface bindings (tokens, below) and startup tasks are registered, and both go through generated connection points.

`#~/di/register-services.ts` runs once at startup (from `startApi()`). It binds the core defaults first (`KEY_VALUE_STORE_TOKEN` to `NoopKeyValueStore`) and then the generated bindings, so a module's binding replaces a core default.

## Using Services

### In Handlers

Resolve services from the request context. `context.resolve` uses a container created for the request:

```typescript
import { publicProcedure } from '#~/lib/orpc';

import { MyFeatureService } from './my-feature.service';

publicProcedure.myFeature.doSomething.handler(async ({ input, context }) =>
  context.resolve(MyFeatureService).doSomething(input.value),
);
```

### Outside Handlers

Startup tasks, HTTP handlers, and context providers have no request context. Inject dependencies through the constructor where the code is a class; plain functions such as an HTTP handler resolve from the global container:

```typescript
import { container } from 'tsyringe';

import { AuthService } from './auth.service';

export async function handleAuthRequest(request: Request) {
  return container.resolve(AuthService).getInstance().handler(request);
}
```

### Constructor Injection

For service-to-service dependencies, inject via constructor:

```typescript
import { singleton } from 'tsyringe';

import { LoggerFactory } from '#~/features/logger/logger.factory';
import type { iWithLogger, LoggerType } from '#~/features/logger/logger.types';
import { UserService } from '#~/features/user/user.service';

@singleton()
export class NotificationService implements iWithLogger {
  public readonly logger: LoggerType;

  public constructor(
    loggerFactory: LoggerFactory,
    private readonly userService: UserService,
  ) {
    this.logger = loggerFactory.create('notification-service');
  }

  public async notifyUser(userId: string, message: string) {
    const profile = await this.userService.getUserProfile(userId);
    this.logger.info('Notifying user', { userId, profileId: profile.id });
    // Send notification
  }
}
```

## Logger Pattern

Always inject `LoggerFactory` and create a contextual logger:

```typescript
public constructor(loggerFactory: LoggerFactory) {
  this.logger = loggerFactory.create('service-name');
}
```

## Startup Tasks

Work that must happen once before the API serves requests (connecting to a database, subscribing event handlers) is a startup task: an injectable class implementing `iStartupTask`. Keep the work in a service and let the task call it:

```typescript
import { injectable } from 'tsyringe';

import type { iStartupTask } from '#~/features/startup/startup-task.types';

import { AchievementsService } from './achievements.service';

@injectable()
export class InitializeAchievementsTask implements iStartupTask {
  public readonly name = 'Subscribe achievements to their events';

  public constructor(private readonly achievementsService: AchievementsService) {}

  public async run() {
    this.achievementsService.initialize();
  }
}
```

Name the file `<name>.task.ts`. `StartupTaskRunner` resolves and runs the installed modules' tasks one after another inside `startApi()`. A task reaches it through the `STARTUP_TASK` connection point of a module manifest (see the `server-module` skill); `src/generated/startup-tasks.ts` is rebuilt and never edited by hand.

## Token-Based Injection (For Interfaces)

When injecting **interfaces** instead of concrete classes, use tokens. A feature keeps its tokens in `<feature>.tokens.ts`:

### 1. Define the interface and token

```typescript
// packages/api/src/features/user/profile/user-profile.repository.ts
import type { iUserProfileResponse } from '../user.types';

export interface iUserProfileRepository {
  findByUserId: (userId: string) => Promise<iUserProfileResponse | null>;
}

// packages/api/src/features/user/user.tokens.ts
export const USER_PROFILE_REPOSITORY_TOKEN = Symbol.for('UserProfileRepository');
```

### 2. Bind the implementation

Bindings are not written in a container file. A module declares a `DI_REGISTRATION` contribution (token plus implementation) in its manifest; `pnpm run sync` (or `create-tsukuri add` in a generated project) writes it to `src/generated/di-registrations.ts`, which `registerServices()` applies with `container.registerSingleton(token, implementation)`. The binding for the example above comes from `packages/create-tsukuri/src/modules/feature/example-domain.module.ts`:

```typescript
{
  kind: CONNECTION_POINT_KINDS.DI_REGISTRATION,
  workspace: 'packages/api',
  bindings: [
    {
      token: { name: 'USER_PROFILE_REPOSITORY_TOKEN', from: '#~/features/user/user.tokens' },
      implementation: {
        name: 'DrizzleUserProfileRepository',
        from: '#~/features/user/profile/drizzle-user-profile.repository',
      },
    },
  ],
}
```

Never edit `src/generated/`. In a generated project the file is rebuilt from `starter.json` and the module manifests, so follow its header and the project's `AGENTS.md` when adding a binding for the project's own feature.

### 3. Inject with @inject() decorator

```typescript
import { inject, injectable } from 'tsyringe';

import type { iUserProfileRepository } from './profile/user-profile.repository';
import { USER_PROFILE_REPOSITORY_TOKEN } from './user.tokens';

@injectable()
export class UserService {
  public constructor(
    @inject(USER_PROFILE_REPOSITORY_TOKEN)
    private readonly userProfileRepository: iUserProfileRepository,
  ) {}
}
```

**When to use tokens:**
- Injecting interfaces with multiple implementations (repositories, key-value stores)
- Swapping implementations for testing
- Plugin/strategy patterns

**When NOT to use tokens:**
- Injecting concrete classes (use direct injection instead)

Tests swap a class implementation by registering a replacement before `startApi()`, in a `test/helpers/setup/*.setup.ts` file (see the `server-testing` skill).

## Service Lifecycle

- Use `@singleton()` for stateless services (default, recommended)
- Use `@injectable()` with transient lifecycle for stateful services (rare)
