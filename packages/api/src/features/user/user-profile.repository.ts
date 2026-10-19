import type { iUserProfileResponse, iUpsertUserProfileInput } from './user.types';

export interface iUserProfileRepository {
  findByUserId: (userId: string) => Promise<iUserProfileResponse | null>;
  ensureExists: (userId: string) => Promise<iUserProfileResponse>;
  upsert: (userId: string, input: iUpsertUserProfileInput) => Promise<iUserProfileResponse>;
  deleteByUserId: (userId: string) => Promise<boolean>;
}
