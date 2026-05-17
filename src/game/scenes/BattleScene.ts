import Phaser from 'phaser'

export class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene')
  }

  create() {
    const { width, height } = this.scale

    this.add
      .rectangle(width / 2, height / 2, width * 0.86, height * 0.72, 0x231815)
      .setStrokeStyle(2, 0xb28b52, 0.72)

    this.add
      .text(width / 2, height / 2 - 34, '残榜初开', {
        color: '#eadfca',
        fontFamily: 'serif',
        fontSize: '34px',
      })
      .setOrigin(0.5)

    this.add
      .text(width / 2, height / 2 + 18, 'Phaser 空战斗场景已挂载', {
        color: '#caa76a',
        fontFamily: 'sans-serif',
        fontSize: '18px',
      })
      .setOrigin(0.5)
  }
}
