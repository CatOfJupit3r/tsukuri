import { hashPassword, verifyPassword } from 'better-auth/crypto';
import { injectable } from 'tsyringe';

export interface iAuthPasswordVerification {
  hash: string;
  password: string;
}

/** Better Auth's scrypt hashing behind a class, so tests can register a faster one. */
@injectable()
export class AuthPasswordHasher {
  public async hash(password: string) {
    return hashPassword(password);
  }

  public async verify(verification: iAuthPasswordVerification) {
    return verifyPassword(verification);
  }
}
