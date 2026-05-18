export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function readJsonFromStorage(storage: KeyValueStorage, key: string): unknown {
  let rawValue: string | null

  try {
    rawValue = storage.getItem(key)
  } catch {
    return undefined
  }

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
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    return false
  }

  return true
}

export function removeStorageItem(storage: KeyValueStorage, key: string) {
  try {
    storage.removeItem(key)
  } catch {
    return false
  }

  return true
}
