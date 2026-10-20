---
name: payload-tokens
description: Declare typed payload tokens (`PayloadToken`, `definePayloadTokens`) from `@startername/common` for anything that passes a named payload around - event bus events, realtime or worker messages, cross-tab messages, drag-and-drop kinds, stored preferences - and validate those payloads where they cross a runtime boundary. Use when adding an event, a message kind or any other name-plus-payload pair, or when deciding between a token and an oRPC procedure.
---

# Payload tokens

A payload token is a name plus a compile-time payload type. Code that sends or receives through a
token is checked against that type, so a name can never travel with the wrong payload. Tokens work on the
server and the client alike:

- `@startername/common/helpers/payload-token.helper`: `PayloadToken` and the `TokenPayload`,
  `TokenName` and `TokenMessage` types.
- `@startername/common/helpers/validated-payload-token.helper`: `ValidatedPayloadToken`, a token with a
  zod schema for its payload.
- `@startername/common/helpers/payload-token-set.helper`: `definePayloadTokens`, `payloadOf` and
  `payloadMessageSchema`.

## Token or oRPC procedure

| Use an oRPC procedure when                                | Use a payload token when                                                                                                                                                |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A client asks the API to do something or to return data   | Code announces that something happened, without expecting an answer                                                                                                     |
| There is one handler and the caller waits for its result  | Any number of handlers, or none, may react                                                                                                                              |
| The call crosses the client/server HTTP boundary          | The payload moves inside a process (event bus) or over a channel that is not a request: WebSocket push, BroadcastChannel, worker `postMessage`, storage, `DataTransfer` |
| Input and output need OpenAPI, errors and auth middleware | Only the payload shape matters                                                                                                                                          |

When a procedure streams a set of messages (an oRPC event iterator), declare those messages as tokens and
use `payloadMessageSchema(TOKENS)` as the output schema, so the stream and its consumers share one
declaration. Never send tokens over HTTP instead of writing a procedure.

## Declaring tokens

Token names are members of an enumwaii declaration, never raw strings. Declare one set per feature with
`definePayloadTokens`; it requires a payload for every member and rejects keys the enum does not declare.
Put doc comments on the `em({...})` keys: the token set keeps them, so they show on hover. Prefix the values with the feature so names
from different features cannot collide on a shared channel.

```typescript
import { em } from "enumwaii";
import z from "zod";

import {
  definePayloadTokens,
  payloadOf,
} from "@startername/common/helpers/payload-token-set.helper";

const authEventNamesEnumwaii = em({
  /** A new user completed registration. */
  USER_AFTER_REGISTERED: "auth.user-after-registered",
});

/** Events the auth feature emits on the event bus. */
export const AUTH_EVENTS = definePayloadTokens(authEventNamesEnumwaii, {
  USER_AFTER_REGISTERED: payloadOf<{ userId: string }>(),
});
```

- `payloadOf<T>()` declares a payload that stays in the process, such as an event bus event. It costs
  nothing at runtime and has no validation.
- A zod schema declares a payload that crosses a runtime boundary. The token becomes a
  `ValidatedPayloadToken` with `parse` and `safeParse`; its payload type is the schema's output. The
  sender serializes that output, so the schema must accept its own output again (no one-way transforms).

```typescript
const presenceMessageNamesEnumwaii = em({
  JOINED: "presence.joined",
  LEFT: "presence.left",
});

export const PRESENCE_MESSAGES = definePayloadTokens(
  presenceMessageNamesEnumwaii,
  {
    JOINED: z.object({ userId: z.string(), joinedAt: z.iso.datetime() }),
    LEFT: z.object({ userId: z.string() }),
  },
);
```

A single token outside a set takes an enum member: `new PayloadToken<iPayload>(NAMES.MEMBER)` or
`new ValidatedPayloadToken(NAMES.MEMBER, schema)`.

Keep the token set with the feature that produces the payload (`<feature>.events.ts` for event bus events,
`<feature>.messages.ts` for channel messages). Sets that both the server and the client use belong in
`packages/common/src/constants`.

## Sending and receiving

APIs that take tokens type their payload from the token. Mark the payload `NoInfer` so it is checked
against the token instead of widening the inferred type:

```typescript
public emit<T>(token: PayloadToken<T>, payload: NoInfer<T>) { ... }

eventBus.emit(AUTH_EVENTS.USER_AFTER_REGISTERED, { userId }); // checked against the token
eventBus.on(AUTH_EVENTS.USER_AFTER_REGISTERED, ({ userId }) => ...); // payload inferred
```

Over a channel, send `token.message(payload)` (`{ name, payload }`) and parse what arrives with the set's
message schema. The name picks the token and its schema validates the payload; anything else is rejected.

```typescript
const presenceMessageSchema = payloadMessageSchema(PRESENCE_MESSAGES);

channel.postMessage(PRESENCE_MESSAGES.JOINED.message({ userId, joinedAt }));

channel.onmessage = (event) => {
  const result = presenceMessageSchema.safeParse(event.data);
  if (!result.success) return; // another version or a foreign sender
  if (PRESENCE_MESSAGES.JOINED.matches(result.data))
    showJoined(result.data.payload);
};
```

Everything that arrives from outside the process is untrusted: WebSocket frames, `BroadcastChannel` and
worker messages, `localStorage`, `DataTransfer` data, URL state. Parse it with the token (`token.parse`)
or the set's message schema before using it. In-process emits are trusted and need no schema.

## Types

- `TokenPayload<typeof TOKEN>` is the payload of a token, `TokenName<typeof TOKEN>` its branded name.
- `TokenMessage<typeof TOKEN_A | typeof TOKEN_B>` is the union of their messages. Narrow it with
  `TOKEN.matches(message)`: branded names do not narrow a union through `===`. `matches` only narrows a
  union that is already typed; raw input goes through `payloadMessageSchema(...).parse` or `token.parse`
  first, and an unparsed message narrows to `never`.
- Generic code takes `PayloadToken<T>` (any token) or `ValidatedPayloadToken<T>` (needs runtime
  validation), never the name string.

## Translations

User-facing text produced away from the UI (errors, notifications, emails) is returned as a translatable
`{ key, args }` object instead of a rendered string, and the UI renders it in the viewer's locale. This is
the same pattern: the key names the message and `args` is its payload, typed per key. The i18n module
implements it. Its keys come from the locale file, not from an enumwaii declaration, so it types
`key` and `args` from that file (keys as the file's message ids, args inferred from each message's
placeholders) rather than declaring a `PayloadToken` per message. Keep the shape and the rule: return
`{ key, args }`, never a rendered string, and validate it with a schema derived from the locale file when
it crosses a boundary.

## Testing

Test what a feature does when a token's payload arrives (the handler's effect) and that invalid input is
rejected at its boundary. Type-level guarantees belong in `expectTypeOf` and `@ts-expect-error` checks next
to the code that relies on them. Do not test that a token has a name.
