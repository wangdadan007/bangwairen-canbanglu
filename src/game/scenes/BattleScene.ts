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
    const boardWidth = Math.min(width * 0.94, 1320)
    const boardHeight = Math.min(height * 0.84, 760)
    const top = centerY - boardHeight / 2
    const bottom = centerY + boardHeight / 2

    addObject(
      this.add
        .rectangle(centerX, centerY, boardWidth, boardHeight, 0x231815)
        .setStrokeStyle(2, 0xb28b52, 0.72),
    )
    addObject(
      this.add
        .rectangle(centerX, top + boardHeight * 0.48, boardWidth * 0.76, boardHeight * 0.4, 0xeadfca, 0.07)
        .setStrokeStyle(1, 0xb28b52, 0.3),
    )

    for (const offset of [-0.42, 0.42]) {
      addObject(
        this.add
          .rectangle(centerX + boardWidth * offset, centerY, 10, boardHeight * 0.72, 0xb28b52, 0.18)
          .setStrokeStyle(1, 0xe0b45d, 0.14),
      )
    }

    addObject(this.add.rectangle(centerX, bottom - boardHeight * 0.23, boardWidth * 0.82, 6, 0x6b4c2d, 0.5))

    for (const offset of [-0.24, 0, 0.24]) {
      addObject(
        this.add
          .circle(centerX + boardWidth * offset, bottom - boardHeight * 0.19, 34, 0x6d211f, 0.42)
          .setStrokeStyle(2, 0xc94f3d, 0.56),
      )
      addObject(
        this.add.rectangle(
          centerX + boardWidth * offset,
          bottom - boardHeight * 0.19,
          Math.max(68, boardWidth * 0.08),
          8,
          0xb28b52,
          0.3,
        ),
      )
    }

    for (const offset of [-0.28, -0.14, 0.14, 0.28]) {
      addObject(
        this.add
          .rectangle(centerX + boardWidth * offset, centerY + boardHeight * 0.08, 86, 132, 0xeadfca, 0.075)
          .setAngle(offset > 0 ? 6 : -7)
          .setStrokeStyle(1, 0xb28b52, 0.2),
      )
    }

    for (const offset of [-0.18, 0, 0.18]) {
      addObject(
        this.add
          .ellipse(centerX + boardWidth * offset, top + boardHeight * 0.27, 120, 34, 0x0f2523, 0.42)
          .setStrokeStyle(1, 0x5ca18a, 0.32),
      )
      addObject(
        this.add
          .rectangle(centerX + boardWidth * offset, top + boardHeight * 0.22, 76, 64, 0x2b2520, 0.72)
          .setStrokeStyle(1, offset === 0 ? 0xc94f3d : 0xb28b52, offset === 0 ? 0.5 : 0.28),
      )
    }

    addObject(
      this.add
        .circle(centerX, top + boardHeight * 0.22, 68, 0x0f2523, 0.54)
        .setStrokeStyle(2, 0x5ca18a, 0.42),
    )
    addObject(
      this.add
        .rectangle(centerX, top + boardHeight * 0.21, 118, 82, 0x2b2520, 0.86)
        .setStrokeStyle(2, 0xc94f3d, 0.5),
    )
    addObject(this.add.rectangle(centerX, top + boardHeight * 0.21, 138, 10, 0xc94f3d, 0.42).setAngle(-9))

    for (const offset of [-0.43, 0.43]) {
      addObject(
        this.add
          .circle(centerX + boardWidth * offset, top + boardHeight * 0.22, 20, 0xb28b52, 0.16)
          .setStrokeStyle(1, 0xe0b45d, 0.24),
      )
      addObject(
        this.add
          .rectangle(centerX + boardWidth * offset, top + boardHeight * 0.32, 54, 92, 0x0f2523, 0.36)
          .setStrokeStyle(1, 0x5ca18a, 0.22),
      )
    }

    addObject(
      this.add
        .text(centerX, centerY - boardHeight * 0.05, '残榜案面', {
          color: '#eadfca',
          fontFamily: 'serif',
          fontSize: `${Math.max(28, Math.min(42, width / 18))}px`,
        })
        .setOrigin(0.5),
    )
    addObject(
      this.add
        .text(centerX, centerY + boardHeight * 0.06, '破形 · 问名 · 正名', {
          color: '#caa76a',
          fontFamily: 'sans-serif',
          fontSize: `${Math.max(15, Math.min(21, width / 36))}px`,
        })
        .setOrigin(0.5),
    )
    addObject(
      this.add
        .text(centerX, bottom - boardHeight * 0.12, '手牌落案，三坛候令', {
          color: '#8ea36d',
          fontFamily: 'sans-serif',
          fontSize: `${Math.max(13, Math.min(18, width / 48))}px`,
        })
        .setOrigin(0.5),
    )
  }
}
