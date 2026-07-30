import Phaser from 'phaser';

interface Ember {
  glow: Phaser.GameObjects.Arc;
  speed: number;
  drift: number;
}

export class BootScene extends Phaser.Scene {
  private embers: Ember[] = [];
  private sky?: Phaser.GameObjects.Graphics;
  private farMountains?: Phaser.GameObjects.Graphics;
  private citadel?: Phaser.GameObjects.Graphics;
  private foreground?: Phaser.GameObjects.Graphics;
  private pointerTargetX = 0;
  private pointerTargetY = 0;
  private parallaxX = 0;
  private parallaxY = 0;

  public constructor() {
    super('boot');
  }

  public create(): void {
    this.cameras.main.setBackgroundColor('#07090d');
    this.sky = this.add.graphics().setDepth(-100).setScrollFactor(0);
    this.farMountains = this.add.graphics().setDepth(-80).setScrollFactor(0);
    this.citadel = this.add.graphics().setDepth(-60).setScrollFactor(0);
    this.foreground = this.add.graphics().setDepth(-20).setScrollFactor(0);
    this.drawBackdrop();
    this.createEmbers();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize);
    this.input.on('pointermove', this.handlePointerMove);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown);
  }

  public override update(time: number, delta: number): void {
    const height = this.scale.height;
    const width = this.scale.width;
    const seconds = Math.min(delta, 50) / 1_000;
    const idleDrift = Math.sin(time * 0.00018) * 7;
    const targetX = this.pointerTargetX + idleDrift;
    const targetY = this.pointerTargetY + Math.cos(time * 0.00014) * 3;

    this.parallaxX = Phaser.Math.Linear(this.parallaxX, targetX, 0.035);
    this.parallaxY = Phaser.Math.Linear(this.parallaxY, targetY, 0.035);
    this.positionLayers();

    for (const ember of this.embers) {
      ember.glow.y -= ember.speed * seconds;
      ember.glow.x += Math.sin(ember.glow.y * 0.013) * ember.drift * seconds;

      if (ember.glow.y < -20) {
        ember.glow.setPosition(
          Phaser.Math.Between(Math.floor(width * 0.23), Math.ceil(width * 0.96)),
          height + Phaser.Math.Between(10, 160),
        );
      }
    }
  }

  private drawBackdrop(): void {
    if (!this.sky || !this.farMountains || !this.citadel || !this.foreground) {
      return;
    }

    const width = this.scale.width;
    const height = this.scale.height;
    const horizon = height * 0.64;
    const scale = Math.max(width, height);

    this.sky.clear();
    this.sky.fillGradientStyle(0x07090d, 0x0a0b12, 0x24151b, 0x121119, 1);
    this.sky.fillRect(-80, -60, width + 160, height + 120);
    this.sky.fillStyle(0x5d2225, 0.2);
    this.sky.fillCircle(width * 0.79, height * 0.28, scale * 0.21);
    this.sky.fillStyle(0xd17645, 0.11);
    this.sky.fillCircle(width * 0.79, height * 0.28, scale * 0.125);
    this.sky.fillStyle(0x100c12, 1);
    this.sky.fillCircle(width * 0.79 - scale * 0.018, height * 0.28, scale * 0.095);
    this.sky.lineStyle(2, 0xe28a52, 0.22);
    this.sky.strokeCircle(width * 0.79, height * 0.28, scale * 0.126);

    for (let index = 0; index < 48; index += 1) {
      const x = (index * 137 + 41) % Math.max(1, width);
      const y = (index * 83 + 19) % Math.max(1, Math.floor(height * 0.57));
      const alpha = 0.08 + (index % 5) * 0.035;
      this.sky.fillStyle(index % 9 === 0 ? 0xb65f45 : 0xb8b0a7, alpha);
      this.sky.fillCircle(x, y, index % 7 === 0 ? 1.4 : 0.8);
    }

    this.farMountains.clear();
    this.farMountains.fillStyle(0x17141b, 0.92);
    this.farMountains.beginPath();
    this.farMountains.moveTo(-120, height);
    this.farMountains.lineTo(-120, horizon + height * 0.08);
    this.farMountains.lineTo(width * 0.08, horizon - height * 0.12);
    this.farMountains.lineTo(width * 0.2, horizon + height * 0.01);
    this.farMountains.lineTo(width * 0.36, horizon - height * 0.19);
    this.farMountains.lineTo(width * 0.5, horizon + height * 0.02);
    this.farMountains.lineTo(width * 0.67, horizon - height * 0.1);
    this.farMountains.lineTo(width * 0.82, horizon + height * 0.04);
    this.farMountains.lineTo(width + 120, horizon - height * 0.08);
    this.farMountains.lineTo(width + 120, height);
    this.farMountains.closePath();
    this.farMountains.fillPath();
    this.farMountains.lineStyle(3, 0x6d3b35, 0.12);
    this.farMountains.lineBetween(0, horizon + 14, width, horizon - 20);

    this.citadel.clear();
    const fortressX = width * 0.74;
    const fortressBase = horizon + height * 0.15;
    const keepWidth = Math.max(58, width * 0.052);
    this.citadel.fillStyle(0x090a0f, 0.98);
    this.citadel.fillRect(
      fortressX - keepWidth * 1.8,
      fortressBase - height * 0.09,
      keepWidth * 4.2,
      height * 0.12,
    );
    this.drawTower(
      this.citadel,
      fortressX - keepWidth * 1.4,
      fortressBase,
      keepWidth * 0.78,
      height * 0.22,
    );
    this.drawTower(
      this.citadel,
      fortressX,
      fortressBase,
      keepWidth,
      height * 0.34,
    );
    this.drawTower(
      this.citadel,
      fortressX + keepWidth * 1.35,
      fortressBase,
      keepWidth * 0.72,
      height * 0.18,
    );
    this.citadel.fillStyle(0xdc8147, 0.75);
    for (const [xOffset, yOffset] of [
      [-1.15, -0.12],
      [0.42, -0.22],
      [0.42, -0.15],
      [1.63, -0.1],
    ] as const) {
      this.citadel.fillRect(
        fortressX + keepWidth * xOffset,
        fortressBase + height * yOffset,
        Math.max(4, keepWidth * 0.1),
        Math.max(10, height * 0.022),
      );
    }

    this.foreground.clear();
    this.foreground.fillStyle(0x05070a, 0.98);
    this.foreground.beginPath();
    this.foreground.moveTo(-160, height);
    this.foreground.lineTo(-160, horizon + height * 0.17);
    this.foreground.lineTo(width * 0.12, horizon + height * 0.04);
    this.foreground.lineTo(width * 0.27, horizon + height * 0.19);
    this.foreground.lineTo(width * 0.45, horizon + height * 0.08);
    this.foreground.lineTo(width * 0.62, horizon + height * 0.2);
    this.foreground.lineTo(width * 0.78, horizon + height * 0.1);
    this.foreground.lineTo(width + 160, horizon + height * 0.17);
    this.foreground.lineTo(width + 160, height);
    this.foreground.closePath();
    this.foreground.fillPath();
    this.foreground.fillStyle(0xb65d35, 0.13);
    this.foreground.fillEllipse(width * 0.76, height * 0.86, width * 0.36, height * 0.11);
  }

  private drawTower(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    baseY: number,
    width: number,
    height: number,
  ): void {
    graphics.fillRect(x, baseY - height, width, height);
    graphics.fillTriangle(
      x - width * 0.28,
      baseY - height,
      x + width * 0.5,
      baseY - height - width * 1.15,
      x + width * 1.28,
      baseY - height,
    );
  }

  private createEmbers(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    this.embers = [];

    for (let index = 0; index < 54; index += 1) {
      const radius = Phaser.Math.FloatBetween(0.7, 2.5);
      const glow = this.add
        .circle(
          Phaser.Math.Between(Math.floor(width * 0.22), Math.ceil(width * 0.97)),
          Phaser.Math.Between(Math.floor(height * 0.2), Math.ceil(height)),
          radius,
          index % 7 === 0 ? 0xffc27a : 0xe77a40,
          Phaser.Math.FloatBetween(0.13, 0.68),
        )
        .setDepth(-10)
        .setScrollFactor(0);

      this.embers.push({
        glow,
        speed: Phaser.Math.Between(8, 34),
        drift: Phaser.Math.FloatBetween(2, 10),
      });
    }
  }

  private positionLayers(): void {
    if (this.sky) {
      this.sky.setPosition(-this.parallaxX * 0.04, -this.parallaxY * 0.03);
    }
    if (this.farMountains) {
      this.farMountains.setPosition(-this.parallaxX * 0.16, -this.parallaxY * 0.1);
    }
    if (this.citadel) {
      this.citadel.setPosition(-this.parallaxX * 0.33, -this.parallaxY * 0.2);
    }
    if (this.foreground) {
      this.foreground.setPosition(-this.parallaxX * 0.62, -this.parallaxY * 0.34);
    }
  }

  private readonly handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    const width = Math.max(1, this.scale.width);
    const height = Math.max(1, this.scale.height);
    this.pointerTargetX = (pointer.x / width - 0.5) * 42;
    this.pointerTargetY = (pointer.y / height - 0.5) * 24;
  };

  private readonly handleResize = (): void => {
    this.drawBackdrop();
    this.positionLayers();
  };

  private readonly handleShutdown = (): void => {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize);
    this.input.off('pointermove', this.handlePointerMove);
    this.embers = [];
  };
}
