import { container } from 'tsyringe';

import { AuthPasswordHasher } from '#~/features/auth/auth-password-hasher';

import { PlaintextAuthPasswordHasher } from '../plaintext-auth-password-hasher';

container.register(AuthPasswordHasher, { useClass: PlaintextAuthPasswordHasher });
