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

    this.add.circle(width / 2, height / 2 + 44, 58, 0x6d211f, 0.42).setStrokeStyle(2, 0xc94f3d, 0.64)

    this.add.rectangle(width / 2, height / 2 + 44, 156, 18, 0xb28b52, 0.32)

    this.add.rectangle(width / 2 - 118, height / 2 - 94, 86, 124, 0xeadfca, 0.09).setAngle(-8)
    this.add.rectangle(width / 2 + 122, height / 2 - 90, 86, 124, 0xeadfca, 0.08).setAngle(7)

    this.add
      .text(width / 2, height / 2 - 56, '残榜案面', {
        color: '#eadfca',
        fontFamily: 'serif',
        fontSize: '34px',
      })
      .setOrigin(0.5)

    this.add
      .text(width / 2, height / 2 - 6, '朱砂未干，名册待归', {
        color: '#caa76a',
        fontFamily: 'sans-serif',
        fontSize: '18px',
      })
      .setOrigin(0.5)
  }
}
