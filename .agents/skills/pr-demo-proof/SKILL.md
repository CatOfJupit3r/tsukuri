---
name: pr-demo-proof
description: >
  Capture, host and embed demos in pull requests: required recordings for UI interactions, screenshots when they
  help, all captured against this checkout's E2E stack with local data only. Use when opening or updating a PR that
  changes what users see or do, or when an issue asks for a prototype or demo.
---

# PR Demo Proof

Every PR shows what changed, not only what was typed. A reviewer should understand the change from the Demo section without running the branch.

## What to capture

| Change | Demo |
|---|---|
| New or changed screen | Screenshot when it helps the reviewer (layout, theming, a state a recording would not show): desktop 1440x900 and phone 390x844, light and dark when theming matters |
| Interaction (forms, menus, drag, live updates) | **Required.** Recording under ~20 s as an MP4, embedded with a `<video>` tag; no poster image |
| Headless code (API, services, persistence) | Rendered output or test output that shows the behavior |
| Pure refactor or cleanup | Before/after file or grep counts; no screenshots |

Every UI interaction a PR adds or changes gets a recording; a UI PR without one is not ready for review. Add screenshots only when they show something the recording does not.

Pair each result with the issue's prototype when one exists: **Prototype**, then **Result**.

## Local data only

Demos run against this checkout's E2E stack (`pnpm run e2e:stack`): its own database, cache and ports, started from empty services. Create the data a demo needs inside the flow (sign up a fresh account, fill a form) or with a stack seed (`apps/e2e/src/data/stack-seeds.ts`). Never use real accounts, personal data, production services or paid APIs.

## Capturing

- Start the stack and keep it running: `pnpm run e2e:stack`. It prints the slot and the web URL it serves; a second checkout gets its own slot and ports.
- Write a flow module in a scratch folder (not in the repository):

  ```ts
  import type { Page } from '@playwright/test';

  export async function runFlow(page: Page, { pause, screenshot }) {
    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await pause(800);
    await screenshot('42-home-desktop-dark');
  }
  ```

- Record it: `pnpm run e2e:record --flow <flow.ts> --out <dir>/<issue>-<surface>-<theme> --app /`. The recorder opens `--app` on the stack, overlays the URL, the keys pressed and the cursor, runs the flow at readable speed and writes `<out>.mp4` with ffmpeg; screenshots land next to it.
- Options: `--viewport 390x844` for phone, `--theme dark|light` for the browser color scheme, `--theme-cookie <name>=<value>` for an app that reads its theme from a cookie (for this app: `--theme-cookie startername.theme=DARK` or `=LIGHT`), `--wait-for "<selector>"` before the flow starts, `--storage-state <file>` to start signed in, `--base-url` for a server other than the stack.
- Use the mouse API (locator actions, `page.mouse`) so the cursor shows, and stop after the outcome is visible.
- For recordings of whole specs, run `pnpm --filter=e2e exec playwright test -c playwright.video.config.ts <spec>` and take the videos from `apps/e2e/test-results/`. With the stack already running, add `E2E_REUSE_STACK=true` so the run skips the stack boot.
- Stop what you started (`pnpm run e2e:cleanup`) and say so in Validation.

## Hosting

Files live on an orphan branch `pr-assets` under a folder named for the issue: `<issue>/<issue>-<surface>-<theme>.png` and `.mp4`. Keep that branch in a worktree next to the repository, so demo files never touch the working branch:

```bash
git fetch origin pr-assets
git worktree add ../<repo>-pr-assets pr-assets
# copy files into ../<repo>-pr-assets/<issue>/
git -C ../<repo>-pr-assets add <issue>
git -C ../<repo>-pr-assets commit -m "assets: <issue>"
git -C ../<repo>-pr-assets push origin pr-assets
```

If the branch does not exist yet, create it once: `git switch --orphan pr-assets`, commit a README, push, and switch back.

Reference files by commit SHA so later pushes cannot change an old PR:

```md
![Home, desktop dark (1440x900)](https://github.com/<owner>/<repo>/blob/<sha>/<issue>/<file>.png?raw=true)
```

Embed recordings with a plain `<video>` tag, without a poster image:

```html
<video src="https://github.com/<owner>/<repo>/raw/<sha>/<issue>/<file>.mp4" controls></video>
```

## PR body

Put the demos in a Demo section after the summary. Each demo heading names the flow, surface, theme and viewport, for example `Sign up, desktop dark (1440x900)`.
