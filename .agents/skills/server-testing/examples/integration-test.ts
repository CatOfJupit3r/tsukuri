// Example: Complete Integration Test with Fixtures (Fixture-First Approach)
// Location: packages/api/test/integration/user-profile.test.ts
//
// KEY PRINCIPLE: Tests use fixtures, fixtures call endpoints.
// This keeps tests clean and focused on behavior verification.

import { describe, it, expect } from 'vitest';

import { createUser } from '../helpers/auth-users';
import { createUserWithBio, createUserWithMaxBio, createUserWithProfile } from './fixtures/user-profile.fixtures';

describe('User Profile API', () => {
  describe('getUserProfile', () => {
    it('should auto-create user profile on first access', async () => {
      // Fixture handles all setup and profile creation
      const { profile } = await createUserWithProfile();

      // Test just verifies the behavior
      expect(profile).not.toBeNil();
      expect(profile.bio).toBe('');
      expect(profile.userId).toBeDefined();
      expect(profile.id).toBeDefined();
    });

    it('should return a profile per user', async () => {
      const { profile: firstProfile } = await createUserWithProfile();
      const { profile: secondProfile } = await createUserWithProfile();

      expect(secondProfile.id).not.toBe(firstProfile.id);
    });
  });

  describe('updateUserProfile', () => {
    it('should update user bio', async () => {
      // Fixture handles user creation AND bio update
      const { user, profile } = await createUserWithBio('This is my new bio');

      // Test verifies the result
      expect(profile.bio).toBe('This is my new bio');
      expect(profile.userId).toBe(user.id);
    });

    it('should validate bio max length (500 chars)', async () => {
      // The contract rejects the input before the handler runs
      await expect(createUserWithBio('a'.repeat(501))).rejects.toThrow();
    });

    it('should allow bio with exactly 500 chars', async () => {
      // Fixture encapsulates the maximum-length scenario
      const { profile } = await createUserWithMaxBio();

      expect(profile.bio.length).toBe(500);
    });

    it('should preserve user identity across profile updates', async () => {
      const { user: user1 } = await createUserWithBio('First bio');
      const { user: user2 } = await createUserWithBio('Second bio');

      // Test verifies they're independent
      expect(user1.id).not.toBe(user2.id);
    });
  });
});

describe('Multiple User Interactions', () => {
  it('should create users with unique identifiers', async () => {
    const user1 = await createUser();
    const user2 = await createUser();

    expect(user1.user.id).toBeDefined();
    expect(user2.user.id).toBeDefined();
    expect(user1.user.id).not.toBe(user2.user.id);
  });

  it('should prevent duplicate email creation', async () => {
    const user1 = await createUser();

    await expect(
      createUser({
        email: user1.user.email,
        name: 'Different Name',
        password: 'password123',
      }),
    ).rejects.toThrow();
  });
});
