import crypto from 'node:crypto';

export function generatePublicCode(): string {
  return crypto.randomBytes(9).toString('base64url').slice(0, 12);
}
