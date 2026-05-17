export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function readJsonFromStorage(storage: KeyValueStorage, key: string): unknown {
  const rawValue = storage.getItem(key)

  if (!rawValue) {
    return undefined
  }

  try {
    return JSON.parse(rawValue) as unknown
  } catch {
    return undefined
  }
}

export function writeJsonToStorage(storage: KeyValueStorage, key: string, value: unknown) {
  storage.setItem(key, JSON.stringify(value))
}
