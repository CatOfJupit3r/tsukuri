import { Listener } from '#~/features/events/listener.class';

/** Emitted after a new user completes registration */
export const UserAfterRegisteredListener = new Listener<{ userId: string }>('USER_AFTER_REGISTERED');
