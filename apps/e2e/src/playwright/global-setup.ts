import { STACK_SEEDS } from '#~/data/stack-seeds';
import { claimStack } from '#~/stack/claim-stack';

/** Runs once per Playwright run, after the stack answers and before any spec: writes the shared seed data. */
export default async function globalSetup() {
  const stack = await claimStack();
  for (const seed of STACK_SEEDS) {
    console.log(`[e2e] Seeding ${seed.name}`);
    await seed.run(stack);
  }
}
