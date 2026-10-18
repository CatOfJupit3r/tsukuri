import { isOnClient } from '#~/utils/is-on-client';

export interface iFormLocalDraftRecord<TValues> {
  savedAt: number;
  values: TValues;
}

const FORM_LOCAL_DRAFT_PREFIX = 'startername:form-draft:';
const FORM_LOCAL_DRAFT_OWNER_KEY = 'startername:form-draft-owner';

function getStorageKey(key: string, ownerId?: string) {
  const owner = ownerId ?? localStorage.getItem(FORM_LOCAL_DRAFT_OWNER_KEY) ?? 'anonymous';
  return `${FORM_LOCAL_DRAFT_PREFIX}${owner}:${key}`;
}

export function synchronizeFormLocalDraftOwner(ownerId: string | null) {
  if (!isOnClient) return;
  const previousOwnerId = localStorage.getItem(FORM_LOCAL_DRAFT_OWNER_KEY);
  if (previousOwnerId === ownerId) return;
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(FORM_LOCAL_DRAFT_PREFIX)) localStorage.removeItem(key);
  }
  if (ownerId) localStorage.setItem(FORM_LOCAL_DRAFT_OWNER_KEY, ownerId);
  else localStorage.removeItem(FORM_LOCAL_DRAFT_OWNER_KEY);
}

export function writeFormLocalDraft<TValues>(key: string, values: TValues, ownerId?: string) {
  if (!isOnClient) return false;
  try {
    const record = { savedAt: Date.now(), values } satisfies iFormLocalDraftRecord<TValues>;
    localStorage.setItem(getStorageKey(key, ownerId), JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function readFormLocalDraft<TValues>(
  key: string,
  maxAgeMs?: number,
  ownerId?: string,
): iFormLocalDraftRecord<TValues> | null {
  if (!isOnClient) return null;
  try {
    const storageKey = getStorageKey(key, ownerId);
    const rawValue = localStorage.getItem(storageKey);
    if (!rawValue) return null;
    const record = JSON.parse(rawValue) as iFormLocalDraftRecord<TValues>;
    if (typeof record.savedAt !== 'number' || record.values === undefined) {
      localStorage.removeItem(storageKey);
      return null;
    }
    if (maxAgeMs !== undefined && Date.now() - record.savedAt > maxAgeMs) {
      localStorage.removeItem(storageKey);
      return null;
    }
    return record;
  } catch {
    localStorage.removeItem(getStorageKey(key, ownerId));
    return null;
  }
}

export function clearFormLocalDraft(key: string, ownerId?: string) {
  if (!isOnClient) return false;
  try {
    localStorage.removeItem(getStorageKey(key, ownerId));
    return true;
  } catch {
    return false;
  }
}
