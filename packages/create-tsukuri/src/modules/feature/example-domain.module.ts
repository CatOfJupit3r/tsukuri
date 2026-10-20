import { CAPABILITIES } from '#~/enums/capabilities.enums';
import { CONNECTION_POINT_KINDS } from '#~/enums/connection-point-kinds.enums';
import { MODULE_CATEGORIES } from '#~/enums/module-categories.enums';
import { MODULE_IDS } from '#~/enums/module-ids.enums';
import { defineModule } from '#~/manifest/define-module';

const API_WORKSPACE = 'packages/api';
const CONTRACT_WORKSPACE = 'packages/server-contract';
const FEATURES = '#~/features';

/** Each feature contributes a contract, its router, and the error codes its services throw. */
const FEATURE_APIS = [
  { key: 'user', contract: 'userContract', router: 'userRouter', feature: 'user' },
  { key: 'achievements', contract: 'achievementsContract', router: 'achievementsRouter', feature: 'achievements' },
  { key: 'badges', contract: 'badgesContract', router: 'badgesRouter', feature: 'badges' },
] as const;

const ERROR_CODES = [
  ['USER_PROFILE_NOT_FOUND', 'User profile not found'],
  ['USER_BADGE_NOT_ALLOWED', 'You do not have the required achievement to use this badge'],
  ['USER_PUBLIC_CODE_GENERATION_FAILED', 'Failed to generate unique public code'],
  ['USER_PROFILE_UPSERT_FAILED', 'User profile upsert returned no document'],
  ['USER_BADGE_UPDATE_FAILED', 'User badge update returned no document'],
  ['USER_ACHIEVEMENT_UPSERT_FAILED', 'User achievement upsert returned no row'],
  ['BADGE_NOT_FOUND', 'Badge not found'],
] as const;

export const exampleDomainModule = defineModule({
  id: MODULE_IDS.EXAMPLE_DOMAIN,
  version: '1.0.0',
  name: 'Example domain',
  description: 'User profiles, achievements and badges: a worked example of features on the shared API',
  category: MODULE_CATEGORIES.FEATURE,
  requires: [MODULE_IDS.BETTER_AUTH],
  requiresCapabilities: [CAPABILITIES.DATABASE],
  files: [
    { source: 'packages/common/src/constants/achievements.ts' },
    { source: 'packages/common/src/constants/badges.ts' },
    // The tables come from the glue module of the installed database.
    { source: `${API_WORKSPACE}/src/features/user`, exclude: ['user-profile.schema.ts'] },
    { source: `${API_WORKSPACE}/src/features/achievements`, exclude: ['user-achievement.schema.ts'] },
    { source: `${API_WORKSPACE}/src/features/badges` },
    { source: `${API_WORKSPACE}/test/integration/achievements.test.ts` },
    { source: `${API_WORKSPACE}/test/integration/badges.test.ts` },
    { source: `${API_WORKSPACE}/test/integration/user-profile.test.ts` },
    { source: `${API_WORKSPACE}/test/integration/fixtures/repository.fixtures.ts` },
    { source: `${CONTRACT_WORKSPACE}/src/contract/user.contract.ts` },
    { source: `${CONTRACT_WORKSPACE}/src/contract/achievements.contract.ts` },
    { source: `${CONTRACT_WORKSPACE}/src/contract/badges.contract.ts` },
  ],
  contributions: [
    ...FEATURE_APIS.flatMap(({ key, contract, router, feature }) => [
      {
        kind: CONNECTION_POINT_KINDS.CONTRACT,
        workspace: CONTRACT_WORKSPACE,
        key,
        contract: { name: contract, from: `../contract/${feature}.contract` },
      },
      {
        kind: CONNECTION_POINT_KINDS.ROUTER,
        workspace: API_WORKSPACE,
        key,
        router: { name: router, from: `${FEATURES}/${feature}/${feature}.router` },
      },
    ]),
    {
      kind: CONNECTION_POINT_KINDS.DATABASE_SCHEMA,
      workspace: API_WORKSPACE,
      key: 'userProfile',
      from: `${FEATURES}/user/user-profile.schema`,
    },
    {
      kind: CONNECTION_POINT_KINDS.DATABASE_SCHEMA,
      workspace: API_WORKSPACE,
      key: 'userAchievement',
      from: `${FEATURES}/achievements/user-achievement.schema`,
    },
    {
      kind: CONNECTION_POINT_KINDS.DI_REGISTRATION,
      workspace: API_WORKSPACE,
      bindings: [
        {
          token: { name: 'USER_PROFILE_REPOSITORY_TOKEN', from: `${FEATURES}/user/user.tokens` },
          implementation: {
            name: 'DrizzleUserProfileRepository',
            from: `${FEATURES}/user/profile/drizzle-user-profile.repository`,
          },
        },
        {
          token: { name: 'USER_ACHIEVEMENT_REPOSITORY_TOKEN', from: `${FEATURES}/achievements/achievements.tokens` },
          implementation: {
            name: 'DrizzleUserAchievementRepository',
            from: `${FEATURES}/achievements/user-achievements/drizzle-user-achievement.repository`,
          },
        },
      ],
    },
    {
      kind: CONNECTION_POINT_KINDS.STARTUP_TASK,
      workspace: API_WORKSPACE,
      task: { name: 'SubscribeUserEventsTask', from: `${FEATURES}/user/subscribe-user-events.task` },
    },
    {
      kind: CONNECTION_POINT_KINDS.STARTUP_TASK,
      workspace: API_WORKSPACE,
      task: { name: 'InitializeAchievementsTask', from: `${FEATURES}/achievements/initialize-achievements.task` },
    },
    ...ERROR_CODES.map(([code, message]) => ({
      kind: CONNECTION_POINT_KINDS.ERROR_CODE,
      workspace: 'packages/common',
      code,
      message,
    })),
  ],
});
