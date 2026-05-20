import { useEffect, useRef } from 'react'
import { createGame } from './createGame'

export function PhaserGame() {
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!hostRef.current) {
      return undefined
    }

    const game = createGame(hostRef.current)

    return () => {
      game.destroy(true)
    }
  }, [])

  return <div ref={hostRef} className="phaser-shell" aria-label="战斗演出台：残榜案面" />
}
