import type { CardInstance } from '../../types'

export function shuffleCardInstances(
  cards: readonly CardInstance[],
  seed?: string,
): readonly CardInstance[] {
  if (!seed) {
    return [...cards].reverse()
  }

  const shuffled = [...cards]
  const random = createSeededRandom(seed)

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = shuffled[index]
    const swap = shuffled[swapIndex]

    if (!current || !swap) {
      continue
    }

    shuffled[index] = swap
    shuffled[swapIndex] = current
  }

  return shuffled
}

function createSeededRandom(seed: string) {
  let state = hashString(seed)

  return () => {
    state = (state + 0x6d2b79f5) >>> 0

    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}
