import Phaser from 'phaser'

export class BattleScene extends Phaser.Scene {
  private readonly stageObjects: Phaser.GameObjects.GameObject[] = []

  constructor() {
    super('BattleScene')
  }

  create() {
    this.renderStage()
    this.scale.on('resize', this.renderStage, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.renderStage, this)
    })
  }

  private renderStage(gameSize?: { readonly width: number; readonly height: number }) {
    this.stageObjects.forEach((object) => object.destroy())
    this.stageObjects.length = 0

    const width = gameSize?.width ?? this.scale.width
    const height = gameSize?.height ?? this.scale.height
    const centerX = width / 2
    const centerY = height / 2
    const addObject = <T extends Phaser.GameObjects.GameObject>(object: T) => {
      this.stageObjects.push(object)
      return object
    }

    addObject(
      this.add
        .rectangle(centerX, centerY, width * 0.9, height * 0.78, 0x231815)
        .setStrokeStyle(2, 0xb28b52, 0.72),
    )
    addObject(this.add.rectangle(centerX, centerY + height * 0.23, width * 0.76, 6, 0x6b4c2d, 0.48))
    addObject(
      this.add
        .rectangle(centerX, centerY + height * 0.06, width * 0.68, height * 0.3, 0xeadfca, 0.07)
        .setStrokeStyle(1, 0xb28b52, 0.26),
    )

    for (const offset of [-0.28, -0.14, 0.14, 0.28]) {
      addObject(
        this.add
          .rectangle(centerX + width * offset, centerY + height * 0.05, 86, 132, 0xeadfca, 0.075)
          .setAngle(offset > 0 ? 6 : -7)
          .setStrokeStyle(1, 0xb28b52, 0.18),
      )
    }

    for (const offset of [-0.2, 0, 0.2]) {
      addObject(
        this.add
          .circle(centerX + width * offset, centerY + height * 0.24, 30, 0x6d211f, 0.42)
          .setStrokeStyle(2, 0xc94f3d, 0.58),
      )
      addObject(this.add.rectangle(centerX + width * offset, centerY + height * 0.24, 78, 8, 0xb28b52, 0.3))
    }

    addObject(
      this.add
        .circle(centerX, centerY - height * 0.18, 58, 0x0f2523, 0.54)
        .setStrokeStyle(2, 0x5ca18a, 0.42),
    )
    addObject(
      this.add
        .rectangle(centerX, centerY - height * 0.18, 108, 76, 0x2b2520, 0.84)
        .setStrokeStyle(2, 0xc94f3d, 0.5),
    )
    addObject(this.add.rectangle(centerX, centerY - height * 0.18, 128, 10, 0xc94f3d, 0.38).setAngle(-9))

    addObject(
      this.add
        .text(centerX, centerY - height * 0.03, '残榜案面', {
          color: '#eadfca',
          fontFamily: 'serif',
          fontSize: `${Math.max(28, Math.min(42, width / 18))}px`,
        })
        .setOrigin(0.5),
    )
    addObject(
      this.add
        .text(centerX, centerY + height * 0.06, '朱砂未干，名册待归', {
          color: '#caa76a',
          fontFamily: 'sans-serif',
          fontSize: `${Math.max(15, Math.min(21, width / 34))}px`,
        })
        .setOrigin(0.5),
    )
  }
}
