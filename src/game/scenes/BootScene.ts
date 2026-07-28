import Phaser from 'phaser';

interface Ember {
  glow: Phaser.GameObjects.Arc;
  speed: number;
  drift: number;
}

export class BootScene extends Phaser.Scene {
  private embers: Ember[] = [];
  private horizon?: Phaser.GameObjects.Graphics;

  public constructor() {
    super('boot');
  }

  public create(): void {
    this.cameras.main.setBackgroundColor('#090b10');
    this.horizon = this.add.graphics();
    this.drawBackdrop();
    this.createEmbers();

    this.scale.on(Phaser.Scale.Events.RESIZE, () => {
      this.drawBackdrop();
    });
  }

  public override update(_time: number, delta: number): void {
    const height = this.scale.height;
    const width = this.scale.width;
    const seconds = Math.min(delta, 50) / 1_000;

    for (const ember of this.embers) {
      ember.glow.y -= ember.speed * seconds;
      ember.glow.x += Math.sin(ember.glow.y * 0.013) * ember.drift * seconds;

      if (ember.glow.y < -20) {
        ember.glow.setPosition(
          Phaser.Math.Between(Math.floor(width * 0.25), Math.ceil(width * 0.92)),
          height + Phaser.Math.Between(10, 160),
        );
      }
    }
  }

  private drawBackdrop(): void {
    if (!this.horizon) {
      return;
    }

    const width = this.scale.width;
    const height = this.scale.height;
    const centerY = height * 0.66;

    this.horizon.clear();
    this.horizon.fillGradientStyle(0x090b10, 0x090b10, 0x18131a, 0x18131a, 1);
    this.horizon.fillRect(0, 0, width, height);

    this.horizon.fillStyle(0x501c1d, 0.14);
    this.horizon.fillCircle(width * 0.78, centerY, Math.max(width, height) * 0.32);
    this.horizon.fillStyle(0xc56a35, 0.08);
    this.horizon.fillCircle(width * 0.78, centerY, Math.max(width, height) * 0.18);

    this.horizon.fillStyle(0x05070b, 0.95);
    this.horizon.beginPath();
    this.horizon.moveTo(0, height);
    this.horizon.lineTo(0, centerY + height * 0.09);
    this.horizon.lineTo(width * 0.13, centerY - height * 0.05);
    this.horizon.lineTo(width * 0.22, centerY + height * 0.04);
    this.horizon.lineTo(width * 0.34, centerY - height * 0.12);
    this.horizon.lineTo(width * 0.47, centerY + height * 0.05);
    this.horizon.lineTo(width * 0.61, centerY - height * 0.03);
    this.horizon.lineTo(width * 0.72, centerY + height * 0.08);
    this.horizon.lineTo(width, centerY - height * 0.02);
    this.horizon.lineTo(width, height);
    this.horizon.closePath();
    this.horizon.fillPath();

    const towerX = width * 0.78;
    const towerBase = centerY + height * 0.11;
    const towerWidth = Math.max(46, width * 0.045);
    this.horizon.fillRect(towerX, towerBase - height * 0.22, towerWidth, height * 0.24);
    this.horizon.fillTriangle(
      towerX - towerWidth * 0.3,
      towerBase - height * 0.22,
      towerX + towerWidth * 0.5,
      towerBase - height * 0.34,
      towerX + towerWidth * 1.3,
      towerBase - height * 0.22,
    );
    this.horizon.fillStyle(0xd17a3f, 0.7);
    this.horizon.fillRect(
      towerX + towerWidth * 0.38,
      towerBase - height * 0.16,
      Math.max(5, towerWidth * 0.16),
      Math.max(12, height * 0.025),
    );
  }

  private createEmbers(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    for (let index = 0; index < 42; index += 1) {
      const radius = Phaser.Math.FloatBetween(0.8, 2.4);
      const glow = this.add.circle(
        Phaser.Math.Between(Math.floor(width * 0.24), Math.ceil(width * 0.94)),
        Phaser.Math.Between(Math.floor(height * 0.25), Math.ceil(height)),
        radius,
        0xf29b4b,
        Phaser.Math.FloatBetween(0.16, 0.7),
      );

      this.embers.push({
        glow,
        speed: Phaser.Math.Between(8, 30),
        drift: Phaser.Math.FloatBetween(2, 9),
      });
    }
  }
}
