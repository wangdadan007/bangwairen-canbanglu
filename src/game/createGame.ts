import Phaser from 'phaser'
import { BattleScene } from './scenes/BattleScene'
import { BootScene } from './scenes/BootScene'

export function createGame(parent: HTMLElement) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#17120f',
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: parent.clientWidth,
      height: parent.clientHeight,
    },
    scene: [BootScene, BattleScene],
  })
}
