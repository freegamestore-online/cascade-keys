/** The part of localStorage the game uses. Tests pass an in-memory fake. */
export type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

/** localStorage when the browser allows it. Some private modes throw on access, which reads as null. */
export function defaultStore(): KeyValueStore | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** Read and parse a JSON value. A missing, unreadable or malformed value reads as null. */
export function readJson<T>(store: KeyValueStore | null, key: string): T | null {
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

/** Write a JSON value. A full or unavailable store drops the write, and the game carries on. */
export function writeJson(store: KeyValueStore | null, key: string, value: unknown): void {
  try {
    store?.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled: the value just isn't kept.
  }
}
