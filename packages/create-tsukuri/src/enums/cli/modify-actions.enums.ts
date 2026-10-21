import { em } from 'enumwaii';

/** Subcommands that change an existing project. Values are the CLI words. */
export const modifyActionsEnumwaii = em({ ADD: 'add', REMOVE: 'remove' });

export const MODIFY_ACTIONS = modifyActionsEnumwaii.enum;
export type ModifyAction = (typeof modifyActionsEnumwaii)['~type'];
