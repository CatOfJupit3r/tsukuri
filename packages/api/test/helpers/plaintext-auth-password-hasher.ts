import type { AuthPasswordHasher, iAuthPasswordVerification } from '#~/features/auth/auth-password-hasher';

const PLAINTEXT_PASSWORD_PREFIX = 'plaintext:';

/** Skips scrypt so each test sign-up costs a few milliseconds instead of ~80ms. */
export class PlaintextAuthPasswordHasher implements Pick<AuthPasswordHasher, 'hash' | 'verify'> {
  public async hash(password: string) {
    return `${PLAINTEXT_PASSWORD_PREFIX}${password}`;
  }

  public async verify(verification: iAuthPasswordVerification) {
    return verification.hash === `${PLAINTEXT_PASSWORD_PREFIX}${verification.password}`;
  }
}
