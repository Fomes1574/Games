import Phaser from 'phaser';

import { SeededRng } from '../../core/rng/SeededRng';
import {
  ENEMIES,
  getUpgrade,
  type EnemyDefinition,
  type UpgradeId,
  type WeaponId,
} from '../../data/content';
import { resolveDamage } from '../../domain/combat/damage';
import {
  ARROW_MOVEMENT_BINDINGS,
  DEFAULT_MOVEMENT_BINDINGS,
  MOVEMENT_DIRECTIONS,
  usesArrowBindings,
  type MovementBindings,
  type MovementDirection,
} from '../../domain/input/movementBindings';
import {
  addExperience,
  experienceRequired,
} from '../../domain/progression/experience';
import {
  applyUpgrade,
  createUpgradeChoices,
  type UpgradeLevels,
} from '../../domain/upgrades/upgradePool';
import {
  dispatchGameEvent,
  GAME_EVENTS,
  type GameSnapshot,
  type HudDetail,
  type ResultDetail,
} from '../events';

interface ExpeditionData {
  seed?: number;
  forgeLevel?: number;
  movementBindings?: MovementBindings;
  reducedEffects?: boolean;
}

interface EnemyActor {
  id: number;
  definition: EnemyDefinition;
  shape: Phaser.GameObjects.Arc;
  health: number;
  maximumHealth: number;
  contactCooldown: number;
  actionCooldown: number;
}

interface Projectile {
  shape: Phaser.GameObjects.Arc;
  velocityX: number;
  velocityY: number;
  damage: number;
  remainingLife: number;
  remainingHits: number;
  hostile: boolean;
  hitIds: Set<number>;
}

interface ExperiencePickup {
  shape: Phaser.GameObjects.Arc;
  value: number;
}

interface Hazard {
  shape: Phaser.GameObjects.Arc;
  remaining: number;
  triggerAt: number;
  damage: number;
  triggered: boolean;
}

interface ParallaxLayer {
  tile: Phaser.GameObjects.TileSprite;
  factor: number;
  driftX: number;
  driftY: number;
}

interface PlayerStats {
  health: number;
  maximumHealth: number;
  armor: number;
  speed: number;
  damageMultiplier: number;
}

const WORLD_SIZE = 4_800;
const FIXED_STEP_SECONDS = 1 / 60;
const RUN_DURATION_SECONDS = 300;
const BOSS_SPAWN_SECONDS = 255;
const MAX_ENEMIES = 360;
const PLAYER_RADIUS = 22;

export class ExpeditionScene extends Phaser.Scene {
  private rng = new SeededRng(1);
  private seed = 1;
  private forgeLevel = 0;
  private player?: Phaser.GameObjects.Container;
  private playerBody?: Phaser.GameObjects.Arc;
  private enemies: EnemyActor[] = [];
  private projectiles: Projectile[] = [];
  private pickups: ExperiencePickup[] = [];
  private hazards: Hazard[] = [];
  private parallaxLayers: ParallaxLayer[] = [];
  private parallaxElapsed = 0;
  private parallaxOffsetX = 0;
  private parallaxOffsetY = 0;
  private upgradeLevels: UpgradeLevels = { 'executioner-axe': 1 };
  private stats: PlayerStats = {
    health: 160,
    maximumHealth: 160,
    armor: 8,
    speed: 238,
    damageMultiplier: 1,
  };
  private elapsed = 0;
  private accumulator = 0;
  private spawnAccumulator = 0;
  private hudAccumulator = 0;
  private kills = 0;
  private level = 1;
  private experience = 0;
  private experienceForNext = experienceRequired(1);
  private pendingLevels = 0;
  private awaitingUpgrade = false;
  private pausedByUser = false;
  private ended = false;
  private phase: 'active' | 'dying' | 'ended' = 'active';
  private reducedEffects = false;
  private bossSpawned = false;
  private nextEnemyId = 1;
  private axeCooldown = 0;
  private crossbowCooldown = 0;
  private bellCooldown = 0;
  private inputMode: 'keyboard' | 'gamepad' = 'keyboard';
  private movementBindings: MovementBindings = { ...DEFAULT_MOVEMENT_BINDINGS };
  private readonly pressedKeyboardCodes = new Set<string>();

  public constructor() {
    super('expedition');
  }

  public create(data: ExpeditionData): void {
    this.resetState(data);
    this.cameras.main.setBackgroundColor('#090b10');
    this.physics.world.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
    this.createParallaxBackground();
    this.drawArena();
    this.createPlayer();
    this.configureInput();
    if (!this.player) {
      throw new Error('O aventureiro não pôde ser criado.');
    }
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.emitHud();
  }

  public override update(_time: number, delta: number): void {
    this.updateParallax(Math.min(delta, 50) / 1_000);
    if (this.ended || this.pausedByUser || this.awaitingUpgrade) {
      return;
    }

    this.accumulator += Math.min(delta, 100) / 1_000;
    let steps = 0;
    while (this.accumulator >= FIXED_STEP_SECONDS && steps < 6) {
      this.fixedUpdate(FIXED_STEP_SECONDS);
      this.accumulator -= FIXED_STEP_SECONDS;
      steps += 1;
    }
  }

  public chooseUpgrade(id: UpgradeId): void {
    if (!this.awaitingUpgrade || this.ended) {
      return;
    }

    this.upgradeLevels = applyUpgrade(this.upgradeLevels, id);
    this.applyPassiveEffects(id);
    this.pendingLevels = Math.max(0, this.pendingLevels - 1);
    this.awaitingUpgrade = false;

    if (this.pendingLevels > 0) {
      this.openUpgradeSelection();
    }
    this.emitHud();
  }

  public togglePause(force?: boolean): void {
    if (this.ended || this.awaitingUpgrade) {
      return;
    }
    this.pausedByUser = force ?? !this.pausedByUser;
    dispatchGameEvent(GAME_EVENTS.pause, { paused: this.pausedByUser });
  }

  public getSnapshot(): GameSnapshot {
    return {
      ...this.createHudDetail(),
      scene: 'expedition',
      seed: this.seed,
      playerPosition: {
        x: this.player?.x ?? 0,
        y: this.player?.y ?? 0,
      },
      parallaxOffset: {
        x: this.parallaxOffsetX,
        y: this.parallaxOffsetY,
      },
      playerVisual: {
        rotation: this.player?.rotation ?? 0,
        scaleX: this.player?.scaleX ?? 1,
        scaleY: this.player?.scaleY ?? 1,
        alpha: this.player?.alpha ?? 1,
      },
      phase: this.phase,
      awaitingUpgrade: this.awaitingUpgrade,
      paused: this.pausedByUser,
      ended: this.ended,
      upgrades: { ...this.upgradeLevels },
    };
  }

  public debugSpawnBoss(): void {
    if (!this.bossSpawned) {
      this.elapsed = Math.max(this.elapsed, BOSS_SPAWN_SECONDS);
      this.spawnBoss();
    }
  }

  public debugDefeat(): void {
    this.stats.health = 0;
    this.startDeathSequence();
  }

  public debugVictory(): void {
    this.finish('victory');
  }

  private resetState(data: ExpeditionData): void {
    this.seed =
      typeof data.seed === 'number' && Number.isFinite(data.seed)
        ? Math.max(1, Math.floor(data.seed))
        : Date.now() & 0x7fff_ffff;
    this.forgeLevel = Math.max(0, Math.floor(data.forgeLevel ?? 0));
    this.movementBindings = {
      ...DEFAULT_MOVEMENT_BINDINGS,
      ...data.movementBindings,
    };
    this.reducedEffects = data.reducedEffects === true;
    this.rng = new SeededRng(this.seed);
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.hazards = [];
    this.parallaxLayers = [];
    this.parallaxElapsed = 0;
    this.parallaxOffsetX = 0;
    this.parallaxOffsetY = 0;
    this.upgradeLevels = { 'executioner-axe': 1 };
    const forgeBonus = this.forgeLevel * 0.04;
    this.stats = {
      health: 160,
      maximumHealth: 160,
      armor: 8,
      speed: 238,
      damageMultiplier: 1 + forgeBonus,
    };
    this.elapsed = 0;
    this.accumulator = 0;
    this.spawnAccumulator = 0;
    this.hudAccumulator = 0;
    this.kills = 0;
    this.level = 1;
    this.experience = 0;
    this.experienceForNext = experienceRequired(1);
    this.pendingLevels = 0;
    this.awaitingUpgrade = false;
    this.pausedByUser = false;
    this.ended = false;
    this.phase = 'active';
    this.bossSpawned = false;
    this.nextEnemyId = 1;
    this.axeCooldown = 0;
    this.crossbowCooldown = 0;
    this.bellCooldown = 0;
    this.pressedKeyboardCodes.clear();
  }

  private drawArena(): void {
    const floor = this.add.graphics();
    floor.setDepth(-70);
    floor.fillStyle(0x0c1115, 0.78);
    floor.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);
    floor.lineStyle(1, 0x283039, 0.18);
    for (let coordinate = 0; coordinate <= WORLD_SIZE; coordinate += 160) {
      floor.lineBetween(coordinate, 0, coordinate, WORLD_SIZE);
      floor.lineBetween(0, coordinate, WORLD_SIZE, coordinate);
    }

    const ruins = this.add.graphics();
    ruins.setDepth(-18);
    for (let index = 0; index < 120; index += 1) {
      const x = this.rng.integer(80, WORLD_SIZE - 80);
      const y = this.rng.integer(80, WORLD_SIZE - 80);
      const width = this.rng.integer(22, 90);
      const height = this.rng.integer(12, 42);
      ruins.fillStyle(index % 3 === 0 ? 0x2d2628 : 0x20272b, 0.55);
      ruins.fillRect(x, y, width, height);
    }
  }

  private createParallaxBackground(): void {
    this.ensureParallaxTextures();
    const width = Math.max(1, this.scale.width);
    const height = Math.max(1, this.scale.height);

    const fog = this.add
      .tileSprite(0, 0, width, height, 'ultima-companhia-fog')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-100)
      .setAlpha(0.6);
    const ash = this.add
      .tileSprite(0, 0, width, height, 'ultima-companhia-ash')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-90)
      .setAlpha(0.72)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.parallaxLayers = [
      { tile: fog, factor: 0.075, driftX: 4.5, driftY: 1.2 },
      { tile: ash, factor: 0.19, driftX: -9, driftY: 4.2 },
    ];
  }

  private ensureParallaxTextures(): void {
    if (!this.textures.exists('ultima-companhia-fog')) {
      const fog = this.add.graphics().setVisible(false);
      const textureRng = new SeededRng(0x1a57_4f09);
      fog.fillStyle(0x161d24, 0.1);
      fog.fillRect(0, 0, 512, 512);
      for (let index = 0; index < 26; index += 1) {
        fog.fillStyle(index % 4 === 0 ? 0x7a3940 : 0x56626c, 0.035 + (index % 3) * 0.012);
        fog.fillEllipse(
          textureRng.integer(-80, 560),
          textureRng.integer(-40, 540),
          textureRng.integer(120, 330),
          textureRng.integer(28, 90),
        );
      }
      fog.generateTexture('ultima-companhia-fog', 512, 512);
      fog.destroy();
    }

    if (!this.textures.exists('ultima-companhia-ash')) {
      const ash = this.add.graphics().setVisible(false);
      const textureRng = new SeededRng(0x0a51_77e1);
      for (let index = 0; index < 92; index += 1) {
        const warm = index % 11 === 0;
        ash.fillStyle(warm ? 0xca6a3d : 0xb6b0a6, warm ? 0.25 : 0.12);
        ash.fillCircle(
          textureRng.integer(0, 255),
          textureRng.integer(0, 255),
          warm ? textureRng.integer(1, 2) : 1,
        );
      }
      ash.generateTexture('ultima-companhia-ash', 256, 256);
      ash.destroy();
    }
  }

  private updateParallax(step: number): void {
    if (this.parallaxLayers.length === 0) {
      return;
    }
    this.parallaxElapsed += step;
    const camera = this.cameras.main;
    for (const layer of this.parallaxLayers) {
      layer.tile.tilePositionX =
        camera.scrollX * layer.factor + this.parallaxElapsed * layer.driftX;
      layer.tile.tilePositionY =
        camera.scrollY * layer.factor + this.parallaxElapsed * layer.driftY;
    }
    const nearest = this.parallaxLayers.at(-1);
    this.parallaxOffsetX = nearest?.tile.tilePositionX ?? 0;
    this.parallaxOffsetY = nearest?.tile.tilePositionY ?? 0;
  }

  private createPlayer(): void {
    const container = this.add.container(WORLD_SIZE / 2, WORLD_SIZE / 2);
    const shadow = this.add.ellipse(0, 18, 52, 22, 0x000000, 0.45);
    const body = this.add.circle(0, 0, PLAYER_RADIUS, 0xb76538, 1);
    body.setStrokeStyle(4, 0xf0c17c, 0.9);
    const facing = this.add.triangle(0, -15, -7, 8, 7, 8, 0, -10, 0xf5e9d0);
    container.add([shadow, body, facing]);
    container.setDepth(50);
    this.player = container;
    this.playerBody = body;
  }

  private configureInput(): void {
    const keyboard = this.input.keyboard;
    if (keyboard) {
      keyboard.on('keydown', this.handleKeyboardDown);
      keyboard.on('keyup', this.handleKeyboardUp);
    }
  }

  private fixedUpdate(step: number): void {
    this.elapsed += step;
    this.hudAccumulator += step;
    this.movePlayer(step);
    this.updateSpawning(step);
    this.updateEnemies(step);
    this.updateWeapons(step);
    this.updateProjectiles(step);
    this.updateHazards(step);
    this.collectPickups(step);

    if (this.elapsed >= BOSS_SPAWN_SECONDS && !this.bossSpawned) {
      this.spawnBoss();
    }
    if (this.elapsed >= RUN_DURATION_SECONDS && !this.bossSpawned) {
      this.spawnBoss();
    }
    if (this.hudAccumulator >= 0.2) {
      this.hudAccumulator = 0;
      this.emitHud();
    }
  }

  private movePlayer(step: number): void {
    if (!this.player) {
      return;
    }

    let horizontal =
      Number(this.isDirectionPressed('right')) -
      Number(this.isDirectionPressed('left'));
    let vertical =
      Number(this.isDirectionPressed('down')) -
      Number(this.isDirectionPressed('up'));

    const pad = this.input.gamepad?.getPad(0);
    if (pad && (Math.abs(pad.leftStick.x) > 0.18 || Math.abs(pad.leftStick.y) > 0.18)) {
      horizontal = pad.leftStick.x;
      vertical = pad.leftStick.y;
      if (this.inputMode !== 'gamepad') {
        this.inputMode = 'gamepad';
        dispatchGameEvent(GAME_EVENTS.input, { mode: 'gamepad' });
      }
    } else if ((horizontal !== 0 || vertical !== 0) && this.inputMode !== 'keyboard') {
      this.inputMode = 'keyboard';
      dispatchGameEvent(GAME_EVENTS.input, { mode: 'keyboard' });
    }

    const magnitude = Math.hypot(horizontal, vertical);
    if (magnitude > 0) {
      const scale = this.stats.speed * step / Math.max(1, magnitude);
      this.player.x = Phaser.Math.Clamp(
        this.player.x + horizontal * scale,
        PLAYER_RADIUS,
        WORLD_SIZE - PLAYER_RADIUS,
      );
      this.player.y = Phaser.Math.Clamp(
        this.player.y + vertical * scale,
        PLAYER_RADIUS,
        WORLD_SIZE - PLAYER_RADIUS,
      );
      this.player.rotation = Math.atan2(vertical, horizontal) + Math.PI / 2;
    }
  }

  private updateSpawning(step: number): void {
    if (this.enemies.length >= MAX_ENEMIES || this.bossSpawned) {
      return;
    }
    const perSecond = Math.min(5.8, 0.85 + this.elapsed / 75);
    this.spawnAccumulator += step * perSecond;

    while (this.spawnAccumulator >= 1 && this.enemies.length < MAX_ENEMIES) {
      this.spawnAccumulator -= 1;
      const roll = this.rng.next();
      if (this.elapsed > 90 && roll < 0.16) {
        this.spawnEnemy(ENEMIES.cultist);
      } else if (this.elapsed > 35 && roll < 0.43) {
        this.spawnEnemy(ENEMIES.runner);
      } else {
        this.spawnEnemy(ENEMIES.crawler);
      }
    }

    if (
      (this.elapsed >= 105 && this.elapsed - step < 105) ||
      (this.elapsed >= 205 && this.elapsed - step < 205)
    ) {
      this.spawnEnemy(ENEMIES['corrupted-executioner']);
    }
  }

  private spawnEnemy(definition: EnemyDefinition): void {
    if (!this.player) {
      return;
    }
    const angle = this.rng.next() * Math.PI * 2;
    const distance = this.rng.integer(580, 820);
    const x = Phaser.Math.Clamp(
      this.player.x + Math.cos(angle) * distance,
      definition.radius,
      WORLD_SIZE - definition.radius,
    );
    const y = Phaser.Math.Clamp(
      this.player.y + Math.sin(angle) * distance,
      definition.radius,
      WORLD_SIZE - definition.radius,
    );
    const shape = this.add.circle(
      x,
      y,
      definition.radius,
      definition.color,
      definition.role === 'boss' ? 1 : 0.92,
    );
    shape.setStrokeStyle(
      definition.role === 'boss' ? 6 : definition.role === 'elite' ? 4 : 2,
      definition.role === 'boss' ? 0xd9d38a : 0x160f12,
      0.9,
    );
    shape.setDepth(definition.role === 'boss' ? 45 : 35);

    const difficulty = 1 + Math.min(1.2, this.elapsed / 360);
    this.enemies.push({
      id: this.nextEnemyId,
      definition,
      shape,
      health: definition.health * difficulty,
      maximumHealth: definition.health * difficulty,
      contactCooldown: 0,
      actionCooldown: this.rng.next() * 2,
    });
    this.nextEnemyId += 1;
  }

  private updateEnemies(step: number): void {
    if (!this.player) {
      return;
    }

    for (const enemy of this.enemies) {
      enemy.contactCooldown = Math.max(0, enemy.contactCooldown - step);
      enemy.actionCooldown = Math.max(0, enemy.actionCooldown - step);
      const deltaX = this.player.x - enemy.shape.x;
      const deltaY = this.player.y - enemy.shape.y;
      const distance = Math.max(0.001, Math.hypot(deltaX, deltaY));
      const isRanged = enemy.definition.role === 'ranged';
      const desiredDistance = isRanged ? 320 : 0;
      const moveDirection = distance > desiredDistance ? 1 : -0.35;
      const speedScale =
        enemy.definition.role === 'boss' && enemy.health < enemy.maximumHealth * 0.5
          ? 1.35
          : 1;

      enemy.shape.x +=
        (deltaX / distance) * enemy.definition.speed * speedScale * moveDirection * step;
      enemy.shape.y +=
        (deltaY / distance) * enemy.definition.speed * speedScale * moveDirection * step;

      if (distance <= enemy.definition.radius + PLAYER_RADIUS && enemy.contactCooldown <= 0) {
        this.damagePlayer(enemy.definition.damage);
        enemy.contactCooldown = 0.7;
      }

      if (isRanged && distance < 520 && enemy.actionCooldown <= 0) {
        this.createProjectile(
          enemy.shape.x,
          enemy.shape.y,
          deltaX / distance,
          deltaY / distance,
          enemy.definition.damage,
          true,
          260,
          1,
        );
        enemy.actionCooldown = 2.4;
      }

      if (enemy.definition.role === 'boss' && enemy.actionCooldown <= 0) {
        this.createBossHazard();
        enemy.actionCooldown = enemy.health < enemy.maximumHealth * 0.5 ? 2.8 : 4.2;
      }
    }
  }

  private updateWeapons(step: number): void {
    this.axeCooldown -= step;
    this.crossbowCooldown -= step;
    this.bellCooldown -= step;

    const axeLevel = this.upgradeLevels['executioner-axe'] ?? 0;
    if (axeLevel > 0 && this.axeCooldown <= 0) {
      this.activateAxe(axeLevel);
      this.axeCooldown = Math.max(0.28, 0.92 * 0.92 ** (axeLevel - 1));
    }

    const crossbowLevel = this.upgradeLevels['watch-crossbow'] ?? 0;
    if (crossbowLevel > 0 && this.crossbowCooldown <= 0) {
      this.activateCrossbow(crossbowLevel);
      this.crossbowCooldown = Math.max(0.32, 1.18 * 0.9 ** (crossbowLevel - 1));
    }

    const bellLevel = this.upgradeLevels['funeral-bell'] ?? 0;
    if (bellLevel > 0 && this.bellCooldown <= 0) {
      this.activateBell(bellLevel);
      this.bellCooldown = Math.max(0.85, 2.65 * 0.9 ** (bellLevel - 1));
    }
  }

  private activateAxe(level: number): void {
    if (!this.player) {
      return;
    }
    const evolved = (this.upgradeLevels['carnage-wheel'] ?? 0) > 0;
    const radius = 112 + level * 9 + (evolved ? 35 : 0);
    const damage = (28 + level * 15) * this.stats.damageMultiplier;
    this.showPulse(radius, 0xc66b38, evolved ? 0.65 : 0.42);
    this.damageEnemiesInRadius(this.player.x, this.player.y, radius, damage, evolved);
    if (evolved) {
      this.time.delayedCall(130, () => {
        if (!this.ended && this.player) {
          this.showPulse(radius * 0.9, 0xe1a15d, 0.42);
          this.damageEnemiesInRadius(
            this.player.x,
            this.player.y,
            radius * 0.9,
            damage * 0.65,
            true,
          );
        }
      });
    }
  }

  private activateCrossbow(level: number): void {
    if (!this.player || this.enemies.length === 0) {
      return;
    }
    const target = this.findNearestEnemy(this.player.x, this.player.y);
    if (!target) {
      return;
    }
    const deltaX = target.shape.x - this.player.x;
    const deltaY = target.shape.y - this.player.y;
    const evolved = (this.upgradeLevels['piercing-oath'] ?? 0) > 0;
    const shots = evolved ? [-0.16, 0, 0.16] : [0];
    const baseAngle = Math.atan2(deltaY, deltaX);
    for (const spread of shots) {
      const angle = baseAngle + spread;
      this.createProjectile(
        this.player.x,
        this.player.y,
        Math.cos(angle),
        Math.sin(angle),
        (22 + level * 13) * this.stats.damageMultiplier,
        false,
        evolved ? 720 : 560,
        1 + Math.floor(level / 2) + (evolved ? 3 : 0),
      );
    }
  }

  private activateBell(level: number): void {
    if (!this.player) {
      return;
    }
    const evolved = (this.upgradeLevels['iron-requiem'] ?? 0) > 0;
    const radius = 155 + level * 22 + (evolved ? 55 : 0);
    const beforeKills = this.kills;
    this.showPulse(radius, 0x81629e, evolved ? 0.55 : 0.35);
    this.damageEnemiesInRadius(
      this.player.x,
      this.player.y,
      radius,
      (18 + level * 11) * this.stats.damageMultiplier,
      false,
    );
    if (evolved && this.kills > beforeKills) {
      this.stats.health = Math.min(
        this.stats.maximumHealth,
        this.stats.health + (this.kills - beforeKills) * 1.5,
      );
    }
  }

  private createProjectile(
    x: number,
    y: number,
    directionX: number,
    directionY: number,
    damage: number,
    hostile: boolean,
    speed: number,
    hits: number,
  ): void {
    if (this.projectiles.length >= 180) {
      return;
    }
    const shape = this.add.circle(
      x,
      y,
      hostile ? 6 : 5,
      hostile ? 0xa66b67 : 0xe0b86d,
      1,
    );
    shape.setDepth(40);
    this.projectiles.push({
      shape,
      velocityX: directionX * speed,
      velocityY: directionY * speed,
      damage,
      remainingLife: 2.2,
      remainingHits: hits,
      hostile,
      hitIds: new Set<number>(),
    });
  }

  private updateProjectiles(step: number): void {
    if (!this.player) {
      return;
    }
    const survivors: Projectile[] = [];
    for (const projectile of this.projectiles) {
      projectile.remainingLife -= step;
      projectile.shape.x += projectile.velocityX * step;
      projectile.shape.y += projectile.velocityY * step;

      if (projectile.hostile) {
        const distance = Phaser.Math.Distance.Between(
          projectile.shape.x,
          projectile.shape.y,
          this.player.x,
          this.player.y,
        );
        if (distance < PLAYER_RADIUS + 6) {
          this.damagePlayer(projectile.damage);
          projectile.remainingHits = 0;
        }
      } else {
        for (const enemy of this.enemies) {
          if (projectile.hitIds.has(enemy.id)) {
            continue;
          }
          const distance = Phaser.Math.Distance.Between(
            projectile.shape.x,
            projectile.shape.y,
            enemy.shape.x,
            enemy.shape.y,
          );
          if (distance <= enemy.definition.radius + 7) {
            projectile.hitIds.add(enemy.id);
            this.damageEnemy(enemy, projectile.damage);
            projectile.remainingHits -= 1;
            if (projectile.remainingHits <= 0) {
              break;
            }
          }
        }
      }

      if (projectile.remainingLife > 0 && projectile.remainingHits > 0) {
        survivors.push(projectile);
      } else {
        projectile.shape.destroy();
      }
    }
    this.projectiles = survivors;
  }

  private createBossHazard(): void {
    if (!this.player) {
      return;
    }
    const offsetX = this.rng.integer(-140, 140);
    const offsetY = this.rng.integer(-140, 140);
    const shape = this.add.circle(
      this.player.x + offsetX,
      this.player.y + offsetY,
      86,
      0x7a9a42,
      0.12,
    );
    shape.setStrokeStyle(4, 0xb7c968, 0.8);
    shape.setDepth(20);
    this.hazards.push({
      shape,
      remaining: 2.1,
      triggerAt: 0.7,
      damage: 28,
      triggered: false,
    });
  }

  private updateHazards(step: number): void {
    if (!this.player) {
      return;
    }
    const survivors: Hazard[] = [];
    for (const hazard of this.hazards) {
      hazard.remaining -= step;
      if (!hazard.triggered && hazard.remaining <= hazard.triggerAt) {
        hazard.triggered = true;
        hazard.shape.setFillStyle(0x8fac4f, 0.34);
        const distance = Phaser.Math.Distance.Between(
          hazard.shape.x,
          hazard.shape.y,
          this.player.x,
          this.player.y,
        );
        if (distance <= hazard.shape.radius + PLAYER_RADIUS) {
          this.damagePlayer(hazard.damage);
        }
      }
      if (hazard.remaining > 0) {
        survivors.push(hazard);
      } else {
        hazard.shape.destroy();
      }
    }
    this.hazards = survivors;
  }

  private damageEnemiesInRadius(
    x: number,
    y: number,
    radius: number,
    damage: number,
    execute: boolean,
  ): void {
    for (const enemy of [...this.enemies]) {
      const distance = Phaser.Math.Distance.Between(x, y, enemy.shape.x, enemy.shape.y);
      if (distance <= radius + enemy.definition.radius) {
        const shouldExecute =
          execute &&
          enemy.definition.role !== 'boss' &&
          enemy.health / enemy.maximumHealth < 0.18;
        this.damageEnemy(enemy, shouldExecute ? enemy.health : damage);
      }
    }
  }

  private damageEnemy(enemy: EnemyActor, amount: number): void {
    enemy.health -= amount;
    enemy.shape.setScale(1.14);
    this.tweens.add({
      targets: enemy.shape,
      scaleX: 1,
      scaleY: 1,
      duration: 90,
    });
    if (enemy.health <= 0) {
      this.killEnemy(enemy);
    }
  }

  private killEnemy(enemy: EnemyActor): void {
    const index = this.enemies.indexOf(enemy);
    if (index < 0) {
      return;
    }
    const defeatedX = enemy.shape.x;
    const defeatedY = enemy.shape.y;
    this.enemies.splice(index, 1);
    enemy.shape.destroy();
    this.kills += 1;
    this.spawnExperience(enemy, defeatedX, defeatedY);

    if (enemy.definition.role === 'boss') {
      this.finish('victory');
    }
  }

  private spawnExperience(enemy: EnemyActor, x: number, y: number): void {
    const pickup = this.add.circle(
      x,
      y,
      enemy.definition.role === 'elite' || enemy.definition.role === 'boss' ? 9 : 5,
      0x62c9b3,
      0.95,
    );
    pickup.setStrokeStyle(2, 0xb8f3d8, 0.7);
    pickup.setDepth(25);
    this.pickups.push({
      shape: pickup,
      value: enemy.definition.experience,
    });
  }

  private collectPickups(step: number): void {
    if (!this.player) {
      return;
    }
    const survivors: ExperiencePickup[] = [];
    let gained = 0;
    for (const pickup of this.pickups) {
      const deltaX = this.player.x - pickup.shape.x;
      const deltaY = this.player.y - pickup.shape.y;
      const distance = Math.max(1, Math.hypot(deltaX, deltaY));
      if (distance < 180) {
        const speed = distance < 70 ? 600 : 280;
        pickup.shape.x += (deltaX / distance) * speed * step;
        pickup.shape.y += (deltaY / distance) * speed * step;
      }
      if (distance <= PLAYER_RADIUS + 10) {
        gained += pickup.value;
        pickup.shape.destroy();
      } else {
        survivors.push(pickup);
      }
    }
    this.pickups = survivors;
    if (gained > 0) {
      this.gainExperience(gained);
    }
  }

  private gainExperience(amount: number): void {
    const progress = addExperience(this.level, this.experience, amount);
    this.level = progress.level;
    this.experience = progress.experience;
    this.experienceForNext = progress.experienceForNext;
    this.pendingLevels += progress.levelsGained;
    if (this.pendingLevels > 0 && !this.awaitingUpgrade) {
      this.openUpgradeSelection();
    }
  }

  private openUpgradeSelection(): void {
    this.awaitingUpgrade = true;
    const choices = createUpgradeChoices(this.upgradeLevels, this.rng, 3);
    if (choices.length === 0) {
      this.awaitingUpgrade = false;
      this.pendingLevels = 0;
      return;
    }
    dispatchGameEvent(GAME_EVENTS.upgrade, {
      choices,
      pendingLevels: this.pendingLevels,
    });
  }

  private applyPassiveEffects(id: UpgradeId): void {
    if (id === 'runic-plate') {
      this.stats.armor += 12;
    }
    if (id === 'fallen-vigor') {
      const oldMaximum = this.stats.maximumHealth;
      this.stats.maximumHealth = Math.round(this.stats.maximumHealth * 1.18);
      this.stats.health = Math.min(
        this.stats.maximumHealth,
        this.stats.health + this.stats.maximumHealth - oldMaximum,
      );
    }
    if (id === 'hunter-steps') {
      this.stats.speed *= 1.08;
    }
  }

  private damagePlayer(amount: number): void {
    const result = resolveDamage({
      amount,
      armor: this.stats.armor,
      resistance: this.nearbyResistance(),
      criticalChance: 0,
      criticalMultiplier: 1,
      criticalRoll: 1,
    });
    this.stats.health = Math.max(0, this.stats.health - result.final);
    this.cameras.main.shake(70, 0.0025);
    this.playerBody?.setFillStyle(0xe08a62, 1);
    this.time.delayedCall(80, () => this.playerBody?.setFillStyle(0xb76538, 1));
    if (this.stats.health <= 0) {
      this.startDeathSequence();
    }
  }

  private nearbyResistance(): number {
    if (!this.player) {
      return 0;
    }
    let nearby = 0;
    for (const enemy of this.enemies) {
      if (
        Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          enemy.shape.x,
          enemy.shape.y,
        ) < 150
      ) {
        nearby += 1;
      }
    }
    return Math.min(0.35, nearby * 0.018);
  }

  private findNearestEnemy(x: number, y: number): EnemyActor | undefined {
    let nearest: EnemyActor | undefined;
    let nearestSquared = Number.POSITIVE_INFINITY;
    for (const enemy of this.enemies) {
      const deltaX = enemy.shape.x - x;
      const deltaY = enemy.shape.y - y;
      const squared = deltaX * deltaX + deltaY * deltaY;
      if (squared < nearestSquared) {
        nearestSquared = squared;
        nearest = enemy;
      }
    }
    return nearest;
  }

  private spawnBoss(): void {
    this.bossSpawned = true;
    this.spawnEnemy(ENEMIES['plague-bishop']);
    this.cameras.main.flash(420, 115, 145, 62);
  }

  private showPulse(radius: number, color: number, alpha: number): void {
    if (!this.player) {
      return;
    }
    const pulse = this.add.circle(this.player.x, this.player.y, radius, color, 0.04);
    pulse.setStrokeStyle(5, color, alpha);
    pulse.setDepth(30);
    pulse.setScale(0.25);
    this.tweens.add({
      targets: pulse,
      scaleX: 1,
      scaleY: 1,
      alpha: 0,
      duration: 230,
      onComplete: () => pulse.destroy(),
    });
  }

  private finish(outcome: ResultDetail['outcome']): void {
    if (outcome === 'defeat') {
      this.startDeathSequence();
      return;
    }
    if (this.ended) {
      return;
    }
    this.ended = true;
    this.phase = 'ended';
    this.dispatchResult(outcome);
  }

  private startDeathSequence(): void {
    if (this.ended) {
      return;
    }
    this.ended = true;
    this.phase = 'dying';
    this.awaitingUpgrade = false;
    this.pausedByUser = false;
    this.pressedKeyboardCodes.clear();
    dispatchGameEvent(GAME_EVENTS.pause, { paused: false });
    dispatchGameEvent(GAME_EVENTS.death, { phase: 'dying' });
    this.emitHud();

    const duration = this.reducedEffects ? 320 : 1_450;
    const player = this.player;
    if (player) {
      const pulse = this.add
        .circle(player.x, player.y, 46, 0x6e1f25, 0.2)
        .setStrokeStyle(5, 0xb84c42, 0.75)
        .setDepth(45);
      const soul = this.add
        .circle(player.x, player.y - 12, 11, 0xd6c4ae, 0.85)
        .setDepth(55)
        .setBlendMode(Phaser.BlendModes.ADD);

      this.playerBody?.setFillStyle(0x2a2024, 1);
      if (!this.reducedEffects) {
        this.cameras.main.shake(240, 0.006);
        this.cameras.main.flash(180, 105, 21, 26);
      }
      this.tweens.add({
        targets: pulse,
        scaleX: this.reducedEffects ? 1.25 : 3.4,
        scaleY: this.reducedEffects ? 1.25 : 3.4,
        alpha: 0,
        duration: Math.round(duration * 0.72),
        ease: 'Cubic.Out',
        onComplete: () => pulse.destroy(),
      });
      this.tweens.add({
        targets: soul,
        y: soul.y - (this.reducedEffects ? 20 : 110),
        alpha: 0,
        scaleX: 0.45,
        scaleY: 1.7,
        duration,
        ease: 'Sine.In',
        onComplete: () => soul.destroy(),
      });
      this.tweens.add({
        targets: player,
        rotation: player.rotation + Math.PI * 0.56,
        scaleX: 1.22,
        scaleY: 0.24,
        alpha: 0.24,
        duration,
        ease: 'Cubic.In',
      });
      this.spawnDeathShards(player.x, player.y, duration);
    }

    this.time.delayedCall(duration, () => {
      this.phase = 'ended';
      this.dispatchResult('defeat');
    });
  }

  private spawnDeathShards(x: number, y: number, duration: number): void {
    const count = this.reducedEffects ? 3 : 12;
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + this.rng.next() * 0.25;
      const distance = this.reducedEffects
        ? this.rng.integer(20, 42)
        : this.rng.integer(65, 150);
      const shard = this.add
        .rectangle(x, y, this.rng.integer(3, 7), this.rng.integer(8, 17), 0xb85f46, 0.9)
        .setDepth(54)
        .setRotation(angle);
      this.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        rotation: angle + Math.PI,
        alpha: 0,
        duration: Math.round(duration * (0.55 + this.rng.next() * 0.35)),
        ease: 'Quad.Out',
        onComplete: () => shard.destroy(),
      });
    }
  }

  private dispatchResult(outcome: ResultDetail['outcome']): void {
    const result: ResultDetail = {
      outcome,
      elapsedSeconds: Math.min(this.elapsed, RUN_DURATION_SECONDS),
      kills: this.kills,
      level: this.level,
      embers: Math.max(1, Math.floor(this.kills / 4) + (outcome === 'victory' ? 80 : 0)),
      seed: this.seed,
      upgrades: { ...this.upgradeLevels },
    };
    dispatchGameEvent(GAME_EVENTS.result, result);
  }

  private isDirectionPressed(direction: MovementDirection): boolean {
    if (this.pressedKeyboardCodes.has(this.movementBindings[direction])) {
      return true;
    }
    return (
      !usesArrowBindings(this.movementBindings) &&
      this.pressedKeyboardCodes.has(ARROW_MOVEMENT_BINDINGS[direction])
    );
  }

  private isMovementCode(code: string): boolean {
    if (Object.values(this.movementBindings).includes(code)) {
      return true;
    }
    return (
      !usesArrowBindings(this.movementBindings) &&
      Object.values(ARROW_MOVEMENT_BINDINGS).includes(code)
    );
  }

  private readonly handleKeyboardDown = (event: KeyboardEvent): void => {
    if (this.isMovementCode(event.code)) {
      event.preventDefault();
      this.pressedKeyboardCodes.add(event.code);
    }
    if (
      event.code === 'Escape' &&
      !event.repeat &&
      !MOVEMENT_DIRECTIONS.some(
        (direction) => this.movementBindings[direction] === 'Escape',
      )
    ) {
      this.togglePause();
    }
  };

  private readonly handleKeyboardUp = (event: KeyboardEvent): void => {
    this.pressedKeyboardCodes.delete(event.code);
  };

  private emitHud(): void {
    dispatchGameEvent(GAME_EVENTS.hud, this.createHudDetail());
  }

  private createHudDetail(): HudDetail {
    const boss = this.enemies.find((enemy) => enemy.definition.role === 'boss');
    const weaponNames = (
      ['executioner-axe', 'watch-crossbow', 'funeral-bell'] satisfies WeaponId[]
    )
      .filter((id) => (this.upgradeLevels[id] ?? 0) > 0)
      .map((id) => `${getUpgrade(id).name} ${this.upgradeLevels[id] ?? 0}`);

    return {
      health: this.stats.health,
      maximumHealth: this.stats.maximumHealth,
      experience: this.experience,
      experienceForNext: this.experienceForNext,
      level: this.level,
      elapsedSeconds: this.elapsed,
      durationSeconds: RUN_DURATION_SECONDS,
      enemies: this.enemies.length,
      kills: this.kills,
      bossHealth: boss?.health ?? null,
      bossMaximumHealth: boss?.maximumHealth ?? null,
      weapons: weaponNames,
    };
  }

  private readonly handleResize = (): void => {
    this.cameras.main.setSize(this.scale.width, this.scale.height);
    for (const layer of this.parallaxLayers) {
      layer.tile.setSize(Math.max(1, this.scale.width), Math.max(1, this.scale.height));
    }
  };

  private readonly handleShutdown = (): void => {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.input.keyboard?.off('keydown', this.handleKeyboardDown);
    this.input.keyboard?.off('keyup', this.handleKeyboardUp);
    this.pressedKeyboardCodes.clear();
    this.projectiles.forEach((projectile) => projectile.shape.destroy());
    this.pickups.forEach((pickup) => pickup.shape.destroy());
    this.hazards.forEach((hazard) => hazard.shape.destroy());
    this.parallaxLayers.forEach((layer) => layer.tile.destroy());
    this.parallaxLayers = [];
  };
}
