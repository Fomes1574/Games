import Phaser from 'phaser';

import { SeededRng } from '../../core/rng/SeededRng';
import {
  ENEMIES,
  getUpgrade,
  type EnemyDefinition,
  type UpgradeId,
  type WeaponId,
} from '../../data/content';
import { applyHealing, resolveDamage } from '../../domain/combat/damage';
import {
  applyDamageVulnerability,
  slowMultiplier,
  transferredPoisonDuration,
} from '../../domain/combat/statusEffects';
import {
  ambientSpawnMultiplier,
  encounterWavesBetween,
  type EncounterFormation,
  type EncounterWave,
} from '../../domain/encounters/encounterTimeline';
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
  ASH_LANTERN_LEVELS,
  atLevel,
  AXE_LEVELS,
  BARBARIAN_FURY_LEVELS,
  BLACK_WIDOW_LEVELS,
  CELESTIAL_AURA_LEVELS,
  CROSSBOW_LEVELS,
  DIVINE_AURA_LEVELS,
  HELL_STEPS_LEVELS,
  IMPALER_LEVELS,
  PIERCING_OATH_LEVELS,
  SPEAR_LEVELS,
  WIDOW_VENOM_LEVELS,
  type BlackWidowStats,
  type WidowVenomStats,
} from '../../domain/weapons/weaponBalance';
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
  statusRing: Phaser.GameObjects.Arc;
  health: number;
  maximumHealth: number;
  contactCooldown: number;
  actionCooldown: number;
  poisonStacks: PoisonStack[];
  poisonTickAccumulator: number;
}

interface PoisonStack {
  damagePerSecond: number;
  remaining: number;
  canSpread: boolean;
  blackWidow: boolean;
  vulnerability: number;
}

type ProjectileKind = 'hostile' | 'crossbow' | 'venom';

interface Projectile {
  shape: Phaser.GameObjects.Arc;
  velocityX: number;
  velocityY: number;
  damage: number;
  remainingLife: number;
  remainingHits: number;
  kind: ProjectileKind;
  hitIds: Set<number>;
  poison?: PoisonPayload;
}

interface PoisonPayload {
  damagePerSecond: number;
  duration: number;
  maximumStacks: number;
  blackWidow: boolean;
  vulnerability: number;
}

interface Pickup {
  shape: Phaser.GameObjects.Arc;
  value: number;
  kind: 'experience' | 'healing';
}

interface Hazard {
  shape: Phaser.GameObjects.Arc;
  remaining: number;
  triggerAt: number;
  damage: number;
  triggered: boolean;
}

interface AshTrailSegment {
  shape: Phaser.GameObjects.Arc;
  remaining: number;
  tickAccumulator: number;
  tickDamage: number;
  tickInterval: number;
  explosionDamage: number;
  explosionRadius: number;
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
const PLAYER_HIT_GRACE_SECONDS = 0.25;
const POISON_TICK_SECONDS = 0.5;

export class ExpeditionScene extends Phaser.Scene {
  private rng = new SeededRng(1);
  private seed = 1;
  private forgeLevel = 0;
  private player?: Phaser.GameObjects.Container;
  private playerBody?: Phaser.GameObjects.Arc;
  private enemies: EnemyActor[] = [];
  private projectiles: Projectile[] = [];
  private pickups: Pickup[] = [];
  private hazards: Hazard[] = [];
  private ashTrail: AshTrailSegment[] = [];
  private parallaxLayers: ParallaxLayer[] = [];
  private parallaxElapsed = 0;
  private parallaxOffsetX = 0;
  private parallaxOffsetY = 0;
  private upgradeLevels: UpgradeLevels = { 'executioner-axe': 1 };
  private stats: PlayerStats = {
    health: 80,
    maximumHealth: 80,
    armor: 5,
    speed: 238,
    damageMultiplier: 1,
  };
  private elapsed = 0;
  private accumulator = 0;
  private spawnAccumulator = 0;
  private hudAccumulator = 0;
  private kills = 0;
  private healingDrops = 0;
  private level = 1;
  private experience = 0;
  private experienceForNext = experienceRequired(1);
  private pendingLevels = 0;
  private awaitingUpgrade = false;
  private pausedByUser = false;
  private ended = false;
  private phase: 'active' | 'dying' | 'ended' = 'active';
  private reducedEffects = false;
  private deathTimeout?: number;
  private bossSpawned = false;
  private evolutionsUnlocked = false;
  private nextEnemyId = 1;
  private axeCooldown = 0;
  private crossbowCooldown = 0;
  private auraCooldown = 0;
  private divineAuraTickAccumulator = 0;
  private divineAuraField?: Phaser.GameObjects.Arc;
  private divineAuraCore?: Phaser.GameObjects.Arc;
  private venomCooldown = 0;
  private spearCooldown = 0;
  private lanternPlacementCooldown = 0;
  private playerHitGrace = 0;
  private facingX = 0;
  private facingY = -1;
  private playerMovedThisStep = false;
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

  public debugSetElapsedSeconds(seconds: number): void {
    if (!this.ended && Number.isFinite(seconds)) {
      this.elapsed = Phaser.Math.Clamp(seconds, 0, RUN_DURATION_SECONDS);
      this.spawnAccumulator = 0;
      this.emitHud();
    }
  }

  public debugGrantExperience(amount: number): void {
    if (!this.ended && Number.isFinite(amount)) {
      this.gainExperience(Math.max(0, amount));
    }
  }

  private resetState(data: ExpeditionData): void {
    if (this.deathTimeout !== undefined) {
      window.clearTimeout(this.deathTimeout);
      this.deathTimeout = undefined;
    }
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
    this.ashTrail = [];
    this.parallaxLayers = [];
    this.parallaxElapsed = 0;
    this.parallaxOffsetX = 0;
    this.parallaxOffsetY = 0;
    this.upgradeLevels = { 'executioner-axe': 1 };
    const forgeBonus = this.forgeLevel * 0.04;
    this.stats = {
      health: 80,
      maximumHealth: 80,
      armor: 5,
      speed: 238,
      damageMultiplier: 1 + forgeBonus,
    };
    this.elapsed = 0;
    this.accumulator = 0;
    this.spawnAccumulator = 0;
    this.hudAccumulator = 0;
    this.kills = 0;
    this.healingDrops = 0;
    this.level = 1;
    this.experience = 0;
    this.experienceForNext = experienceRequired(1);
    this.pendingLevels = 0;
    this.awaitingUpgrade = false;
    this.pausedByUser = false;
    this.ended = false;
    this.phase = 'active';
    this.bossSpawned = false;
    this.evolutionsUnlocked = false;
    this.nextEnemyId = 1;
    this.axeCooldown = 0;
    this.crossbowCooldown = 0;
    this.auraCooldown = 0;
    this.divineAuraTickAccumulator = 0;
    this.divineAuraField = undefined;
    this.divineAuraCore = undefined;
    this.venomCooldown = 0;
    this.spearCooldown = 0;
    this.lanternPlacementCooldown = 0;
    this.playerHitGrace = 0;
    this.facingX = 0;
    this.facingY = -1;
    this.playerMovedThisStep = false;
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
    this.playerHitGrace = Math.max(0, this.playerHitGrace - step);
    this.movePlayer(step);
    this.updateSpawning(step);
    this.updateEnemyStatuses(step);
    this.updateEnemies(step);
    this.updateWeapons(step);
    this.updateProjectiles(step);
    this.updateHazards(step);
    this.updateAshTrail(step);
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
    this.playerMovedThisStep = false;

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
      this.playerMovedThisStep = true;
      this.facingX = horizontal / magnitude;
      this.facingY = vertical / magnitude;
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
    for (const wave of encounterWavesBetween(this.elapsed - step, this.elapsed)) {
      this.spawnEncounterWave(wave);
    }

    const perSecond =
      Math.min(5.8, 0.85 + this.elapsed / 75) *
      ambientSpawnMultiplier(this.elapsed);
    this.spawnAccumulator += step * perSecond;

    while (this.spawnAccumulator >= 1 && this.enemies.length < MAX_ENEMIES) {
      this.spawnAccumulator -= 1;
      const roll = this.rng.next();
      if (this.elapsed > 165 && roll < 0.035) {
        this.spawnEnemy(ENEMIES['ruin-herald']);
      } else if (this.elapsed > 125 && roll < 0.13) {
        this.spawnEnemy(ENEMIES['armored-penitent']);
      } else if (this.elapsed > 90 && roll < 0.29) {
        this.spawnEnemy(ENEMIES.cultist);
      } else if (this.elapsed > 35 && roll < 0.52) {
        this.spawnEnemy(ENEMIES.runner);
      } else {
        this.spawnEnemy(ENEMIES.crawler);
      }
    }
  }

  private spawnEncounterWave(wave: EncounterWave): void {
    if (!this.player) {
      return;
    }
    const formationIndex = wave.formationIndex ?? this.rng.integer(0, 3);
    const baseAngle = (Math.PI / 2) * formationIndex;
    for (
      let index = 0;
      index < wave.count && this.enemies.length < MAX_ENEMIES;
      index += 1
    ) {
      const position = this.encounterPosition(
        wave.formation,
        baseAngle,
        index,
        wave.count,
      );
      this.spawnEnemy(ENEMIES[wave.enemy], position);
    }
  }

  private encounterPosition(
    formation: EncounterFormation,
    baseAngle: number,
    index: number,
    count: number,
  ): { x: number; y: number } {
    if (!this.player) {
      return { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 };
    }
    const centered = index - (count - 1) / 2;
    let angle: number;
    let distance: number;
    let tangentOffset = 0;

    if (formation === 'ring') {
      angle = baseAngle + (Math.PI * 2 * index) / Math.max(1, count);
      distance = 650 + (index % 3) * 24;
    } else if (formation === 'arc') {
      angle = baseAngle + centered * (1.15 / Math.max(1, count - 1));
      distance = 625 + (index % 2) * 34;
    } else if (formation === 'line' || formation === 'opposite-line') {
      angle = formation === 'opposite-line' ? baseAngle + Math.PI : baseAngle;
      distance = 650;
      tangentOffset = centered * 58;
    } else if (formation === 'cardinal') {
      angle = baseAngle + centered * 0.035;
      distance = 610 + Math.abs(centered) * 20;
    } else {
      angle = baseAngle;
      distance = 570 + index * 31;
      tangentOffset = centered * 9;
    }

    const tangentAngle = angle + Math.PI / 2;
    return {
      x: Phaser.Math.Clamp(
        this.player.x +
          Math.cos(angle) * distance +
          Math.cos(tangentAngle) * tangentOffset,
        70,
        WORLD_SIZE - 70,
      ),
      y: Phaser.Math.Clamp(
        this.player.y +
          Math.sin(angle) * distance +
          Math.sin(tangentAngle) * tangentOffset,
        70,
        WORLD_SIZE - 70,
      ),
    };
  }

  private spawnEnemy(
    definition: EnemyDefinition,
    position?: { x: number; y: number },
  ): void {
    if (!this.player || this.enemies.length >= MAX_ENEMIES) {
      return;
    }
    const angle = this.rng.next() * Math.PI * 2;
    const distance = this.rng.integer(580, 820);
    const x =
      position?.x ??
      Phaser.Math.Clamp(
        this.player.x + Math.cos(angle) * distance,
        definition.radius,
        WORLD_SIZE - definition.radius,
      );
    const y =
      position?.y ??
      Phaser.Math.Clamp(
        this.player.y + Math.sin(angle) * distance,
        definition.radius,
        WORLD_SIZE - definition.radius,
      );
    const statusRing = this.add.circle(
      x,
      y,
      definition.radius + 6,
      0x32203d,
      0,
    );
    statusRing.setStrokeStyle(3, 0x8d56a7, 0);
    statusRing.setDepth(definition.role === 'boss' ? 44 : 34);
    const shape = this.add.circle(
      x,
      y,
      definition.radius,
      definition.color,
      definition.role === 'boss' ? 1 : 0.92,
    );
    const heavy =
      definition.role === 'boss' ||
      definition.role === 'elite' ||
      definition.role === 'tank';
    shape.setStrokeStyle(
      definition.role === 'boss' ? 6 : heavy ? 4 : 2,
      definition.role === 'boss'
        ? 0xd9d38a
        : definition.role === 'support'
          ? 0xd4ad62
          : 0x160f12,
      0.9,
    );
    shape.setDepth(definition.role === 'boss' ? 45 : 35);
    shape.setData('visual-profile', definition.visual.profileId);
    shape.setScale(0.55 * definition.visual.baseScale);
    shape.setAlpha(0.15);
    this.tweens.add({
      targets: shape,
      scaleX: definition.visual.baseScale,
      scaleY: definition.visual.baseScale,
      alpha: definition.role === 'boss' ? 1 : 0.92,
      duration: this.reducedEffects ? 80 : 220,
      ease: 'Cubic.Out',
    });

    const difficulty = 1 + Math.min(1.2, this.elapsed / 360);
    this.enemies.push({
      id: this.nextEnemyId,
      definition,
      shape,
      statusRing,
      health: definition.health * difficulty,
      maximumHealth: definition.health * difficulty,
      contactCooldown: 0,
      actionCooldown: this.rng.next() * 2,
      poisonStacks: [],
      poisonTickAccumulator: 0,
    });
    this.nextEnemyId += 1;
  }

  private updateEnemies(step: number): void {
    if (!this.player) {
      return;
    }

    for (const enemy of [...this.enemies]) {
      enemy.contactCooldown = Math.max(0, enemy.contactCooldown - step);
      enemy.actionCooldown = Math.max(0, enemy.actionCooldown - step);
      const deltaX = this.player.x - enemy.shape.x;
      const deltaY = this.player.y - enemy.shape.y;
      const distance = Math.max(0.001, Math.hypot(deltaX, deltaY));
      const isRanged =
        enemy.definition.role === 'ranged' || enemy.definition.role === 'support';
      const desiredDistance = enemy.definition.role === 'support' ? 280 : isRanged ? 320 : 0;
      const moveDirection = distance > desiredDistance ? 1 : -0.35;
      const speedScale = this.enemySpeedMultiplier(enemy);

      enemy.shape.x +=
        (deltaX / distance) * enemy.definition.speed * speedScale * moveDirection * step;
      enemy.shape.y +=
        (deltaY / distance) * enemy.definition.speed * speedScale * moveDirection * step;
      enemy.statusRing.setPosition(enemy.shape.x, enemy.shape.y);

      if (distance <= enemy.definition.radius + PLAYER_RADIUS && enemy.contactCooldown <= 0) {
        this.damagePlayer(enemy.definition.damage * this.enemyDamageMultiplier(enemy));
        enemy.contactCooldown = 0.7;
      }

      if (isRanged && distance < 520 && enemy.actionCooldown <= 0) {
        this.createProjectile(
          enemy.shape.x,
          enemy.shape.y,
          deltaX / distance,
          deltaY / distance,
          enemy.definition.damage * this.enemyDamageMultiplier(enemy),
          'hostile',
          260,
          1,
        );
        enemy.actionCooldown = enemy.definition.role === 'support' ? 3.2 : 2.4;
      }

      if (enemy.definition.role === 'boss' && enemy.actionCooldown <= 0) {
        this.createBossHazard();
        enemy.actionCooldown = enemy.health < enemy.maximumHealth * 0.5 ? 2.8 : 4.2;
      }
    }
  }

  private updateEnemyStatuses(step: number): void {
    for (const enemy of [...this.enemies]) {
      enemy.poisonStacks = enemy.poisonStacks
        .map((stack) => ({ ...stack, remaining: stack.remaining - step }))
        .filter((stack) => stack.remaining > 0);
      const poisoned = enemy.poisonStacks.length > 0;
      const blackWidow = enemy.poisonStacks.some((stack) => stack.blackWidow);
      enemy.statusRing.setFillStyle(blackWidow ? 0x22142c : 0x31401f, poisoned ? 0.08 : 0);
      enemy.statusRing.setStrokeStyle(
        blackWidow ? 4 : 3,
        blackWidow ? 0xa968c4 : 0x7da04d,
        poisoned ? 0.72 : 0,
      );
      if (!poisoned) {
        enemy.poisonTickAccumulator = 0;
        continue;
      }
      enemy.poisonTickAccumulator += step;
      while (enemy.poisonTickAccumulator >= POISON_TICK_SECONDS) {
        enemy.poisonTickAccumulator -= POISON_TICK_SECONDS;
        const damage =
          enemy.poisonStacks.reduce((total, stack) => total + stack.damagePerSecond, 0) *
          POISON_TICK_SECONDS;
        this.damageEnemy(enemy, damage, 'poison');
        if (!this.enemies.includes(enemy)) {
          break;
        }
      }
    }
  }

  private enemySpeedMultiplier(enemy: EnemyActor): number {
    const bossPhase =
      enemy.definition.role === 'boss' && enemy.health < enemy.maximumHealth * 0.5
        ? 1.35
        : 1;
    const herald = this.hasNearbyHerald(enemy) ? 1.22 : 1;
    return bossPhase * herald * this.divineAuraSpeedScale(enemy);
  }

  private enemyDamageMultiplier(enemy: EnemyActor): number {
    return this.hasNearbyHerald(enemy) ? 1.18 : 1;
  }

  private hasNearbyHerald(enemy: EnemyActor): boolean {
    if (enemy.definition.role === 'support') {
      return false;
    }
    return this.enemies.some(
      (candidate) =>
        candidate !== enemy &&
        candidate.definition.role === 'support' &&
        Phaser.Math.Distance.Between(
          candidate.shape.x,
          candidate.shape.y,
          enemy.shape.x,
          enemy.shape.y,
        ) <= 230,
    );
  }

  private divineAuraSpeedScale(enemy: EnemyActor): number {
    const evolutionLevel = this.upgradeLevels['divine-aura'] ?? 0;
    if (!this.player || evolutionLevel <= 0) {
      return 1;
    }
    const stats = atLevel(DIVINE_AURA_LEVELS, evolutionLevel);
    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      enemy.shape.x,
      enemy.shape.y,
    );
    if (distance > stats.range + enemy.definition.radius) {
      return 1;
    }
    return slowMultiplier(
      stats.slow,
      stats.bossSlow,
      enemy.definition.role === 'boss',
    );
  }

  private updateWeapons(step: number): void {
    this.axeCooldown -= step;
    this.crossbowCooldown -= step;
    this.auraCooldown -= step;
    this.venomCooldown -= step;
    this.spearCooldown -= step;
    this.lanternPlacementCooldown -= step;

    const axeLevel = this.upgradeLevels['executioner-axe'] ?? 0;
    if (axeLevel > 0 && this.axeCooldown <= 0) {
      this.activateAxe(axeLevel);
      const evolutionLevel = this.upgradeLevels['barbarian-fury'] ?? 0;
      this.axeCooldown =
        evolutionLevel > 0
          ? atLevel(BARBARIAN_FURY_LEVELS, evolutionLevel).cooldown
          : atLevel(AXE_LEVELS, axeLevel).cooldown;
    }

    const crossbowLevel = this.upgradeLevels['watch-crossbow'] ?? 0;
    if (crossbowLevel > 0 && this.crossbowCooldown <= 0) {
      this.activateCrossbow(crossbowLevel);
      const evolutionLevel = this.upgradeLevels['piercing-oath'] ?? 0;
      this.crossbowCooldown =
        evolutionLevel > 0
          ? atLevel(PIERCING_OATH_LEVELS, evolutionLevel).cooldown
          : atLevel(CROSSBOW_LEVELS, crossbowLevel).cooldown;
    }

    const auraLevel = this.upgradeLevels['celestial-aura'] ?? 0;
    const divineAuraLevel = this.upgradeLevels['divine-aura'] ?? 0;
    if (auraLevel > 0 && divineAuraLevel > 0) {
      this.updateDivineAura(step, divineAuraLevel);
    } else {
      this.clearDivineAuraField();
      if (auraLevel > 0 && this.auraCooldown <= 0) {
        const stats = atLevel(CELESTIAL_AURA_LEVELS, auraLevel);
        this.activateCelestialAura(stats.range, stats.damage);
        this.auraCooldown = stats.cooldown;
      }
    }

    const venomLevel = this.upgradeLevels['widow-venom'] ?? 0;
    if (venomLevel > 0 && this.venomCooldown <= 0) {
      this.activateWidowVenom(venomLevel);
      const evolutionLevel = this.upgradeLevels['black-widow'] ?? 0;
      this.venomCooldown =
        evolutionLevel > 0
          ? atLevel(BLACK_WIDOW_LEVELS, evolutionLevel).cooldown
          : atLevel(WIDOW_VENOM_LEVELS, venomLevel).cooldown;
    }

    const spearLevel = this.upgradeLevels.spear ?? 0;
    if (spearLevel > 0 && this.spearCooldown <= 0) {
      this.activateSpear(spearLevel);
      const evolutionLevel = this.upgradeLevels.impaler ?? 0;
      this.spearCooldown =
        evolutionLevel > 0
          ? atLevel(IMPALER_LEVELS, evolutionLevel).cooldown
          : atLevel(SPEAR_LEVELS, spearLevel).cooldown;
    }

    const lanternLevel = this.upgradeLevels['ash-lantern'] ?? 0;
    if (
      lanternLevel > 0 &&
      this.playerMovedThisStep &&
      this.lanternPlacementCooldown <= 0
    ) {
      this.placeAshTrail(lanternLevel);
    }
  }

  private activateAxe(level: number): void {
    if (!this.player) {
      return;
    }
    const evolutionLevel = this.upgradeLevels['barbarian-fury'] ?? 0;
    if (evolutionLevel > 0) {
      const stats = atLevel(BARBARIAN_FURY_LEVELS, evolutionLevel);
      this.showSpin(stats.range, 0xc86a39, 0.62, 1);
      this.damageEnemiesInRadius(
        this.player.x,
        this.player.y,
        stats.range,
        stats.firstDamage * this.stats.damageMultiplier,
      );
      this.time.delayedCall(180, () => {
        if (!this.ended && this.player) {
          this.showSpin(stats.range, 0xf0a251, 0.46, -1);
          this.damageEnemiesInRadius(
            this.player.x,
            this.player.y,
            stats.range,
            stats.secondDamage * this.stats.damageMultiplier,
          );
        }
      });
      return;
    }
    const stats = atLevel(AXE_LEVELS, level);
    const facingAngle = Math.atan2(this.facingY, this.facingX);
    this.showArc(stats.range, facingAngle, stats.arcDegrees, 0xc86a39);
    this.damageEnemiesInArc(
      this.player.x,
      this.player.y,
      this.facingX,
      this.facingY,
      stats.range,
      stats.arcDegrees,
      stats.damage * this.stats.damageMultiplier,
    );
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
    const evolutionLevel = this.upgradeLevels['piercing-oath'] ?? 0;
    const evolved =
      evolutionLevel > 0 ? atLevel(PIERCING_OATH_LEVELS, evolutionLevel) : undefined;
    const base = atLevel(CROSSBOW_LEVELS, level);
    const shots = evolved
      ? [
          { spread: -0.16, damage: evolved.sideDamage },
          { spread: 0, damage: evolved.centerDamage },
          { spread: 0.16, damage: evolved.sideDamage },
        ]
      : [{ spread: 0, damage: base.damage }];
    const baseAngle = Math.atan2(deltaY, deltaX);
    for (const shot of shots) {
      const angle = baseAngle + shot.spread;
      this.createProjectile(
        this.player.x,
        this.player.y,
        Math.cos(angle),
        Math.sin(angle),
        shot.damage * this.stats.damageMultiplier,
        'crossbow',
        evolved ? 720 : 560,
        evolved?.piercing ?? base.piercing,
      );
    }
  }

  private activateCelestialAura(radius: number, damage: number): void {
    if (!this.player) {
      return;
    }
    this.showPulse(radius, 0xc6bd78, 0.42);
    this.damageEnemiesInRadius(
      this.player.x,
      this.player.y,
      radius,
      damage * this.stats.damageMultiplier,
    );
  }

  private updateDivineAura(step: number, evolutionLevel: number): void {
    if (!this.player) {
      return;
    }
    const stats = atLevel(DIVINE_AURA_LEVELS, evolutionLevel);
    if (!this.divineAuraField || !this.divineAuraCore) {
      this.divineAuraField = this.add
        .circle(this.player.x, this.player.y, stats.range, 0xe6dc9b, 0.055)
        .setStrokeStyle(3, 0xe7dc9b, 0.3)
        .setDepth(22)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.divineAuraCore = this.add
        .circle(this.player.x, this.player.y, stats.range * 0.72, 0xffffff, 0)
        .setStrokeStyle(2, 0xf1e9bb, 0.18)
        .setDepth(23);
    }
    this.divineAuraField.setPosition(this.player.x, this.player.y).setRadius(stats.range);
    this.divineAuraCore
      .setPosition(this.player.x, this.player.y)
      .setRadius(stats.range * 0.72);
    this.divineAuraCore.rotation += step * 0.18;
    this.divineAuraTickAccumulator += step;
    while (this.divineAuraTickAccumulator >= stats.tickInterval) {
      this.divineAuraTickAccumulator -= stats.tickInterval;
      this.damageEnemiesInRadius(
        this.player.x,
        this.player.y,
        stats.range,
        stats.damagePerTick * this.stats.damageMultiplier,
      );
    }
  }

  private clearDivineAuraField(): void {
    this.divineAuraField?.destroy();
    this.divineAuraCore?.destroy();
    this.divineAuraField = undefined;
    this.divineAuraCore = undefined;
    this.divineAuraTickAccumulator = 0;
  }

  private activateWidowVenom(level: number): void {
    if (!this.player || this.enemies.length === 0) {
      return;
    }
    const evolutionLevel = this.upgradeLevels['black-widow'] ?? 0;
    const evolved =
      evolutionLevel > 0 ? atLevel(BLACK_WIDOW_LEVELS, evolutionLevel) : undefined;
    const base = atLevel(WIDOW_VENOM_LEVELS, level);
    const stats = evolved ?? this.blackWidowCompatibleStats(base);
    const targets = this.findVenomTargets(stats.projectileCount);
    targets.forEach((target, index) => {
      if (!this.player) {
        return;
      }
      const deltaX = target.shape.x - this.player.x;
      const deltaY = target.shape.y - this.player.y;
      const distance = Math.max(1, Math.hypot(deltaX, deltaY));
      const damageScale = index === 0 ? 1 : stats.secondaryDamageScale;
      this.createProjectile(
        this.player.x,
        this.player.y,
        deltaX / distance,
        deltaY / distance,
        stats.impactDamage * damageScale * this.stats.damageMultiplier,
        'venom',
        520,
        1,
        {
          damagePerSecond: stats.damagePerSecond * Math.max(0.6, damageScale),
          duration: stats.duration,
          maximumStacks: stats.maximumStacks,
          blackWidow: evolutionLevel > 0,
          vulnerability: stats.damageVulnerability,
        },
      );
    });
  }

  private blackWidowCompatibleStats(base: WidowVenomStats): BlackWidowStats {
    return {
      ...base,
      damageVulnerability: 0,
      projectileCount: 1,
      secondaryDamageScale: 0,
    };
  }

  private activateSpear(level: number): void {
    if (!this.player) {
      return;
    }
    const evolutionLevel = this.upgradeLevels.impaler ?? 0;
    if (evolutionLevel > 0) {
      const stats = atLevel(IMPALER_LEVELS, evolutionLevel);
      this.showSpearStrike(stats.range, stats.width, 0xe5c88c);
      this.damageEnemiesInLine(
        stats.range,
        stats.width,
        stats.maximumTargets,
        stats.outwardDamage * this.stats.damageMultiplier,
      );
      this.time.delayedCall(170, () => {
        if (this.ended || !this.player) {
          return;
        }
        this.showSpearStrike(stats.range, stats.width * 0.8, 0xc57c52, true);
        this.damageEnemiesInLine(
          stats.range,
          stats.width,
          stats.maximumTargets,
          stats.returnDamage * this.stats.damageMultiplier,
        );
      });
      return;
    }
    const stats = atLevel(SPEAR_LEVELS, level);
    this.showSpearStrike(stats.range, stats.width, 0xd4b778);
    this.damageEnemiesInLine(
      stats.range,
      stats.width,
      stats.maximumTargets,
      stats.damage * this.stats.damageMultiplier,
    );
  }

  private placeAshTrail(level: number): void {
    if (!this.player) {
      return;
    }
    const evolutionLevel = this.upgradeLevels['hell-steps'] ?? 0;
    const base = atLevel(ASH_LANTERN_LEVELS, level);
    const evolved =
      evolutionLevel > 0 ? atLevel(HELL_STEPS_LEVELS, evolutionLevel) : undefined;
    const stats = evolved ?? {
      ...base,
      explosionDamage: 0,
      explosionRadius: base.radius,
    };
    while (this.ashTrail.length >= stats.maximumSegments) {
      const oldest = this.ashTrail.shift();
      oldest?.shape.destroy();
    }
    const shape = this.add
      .circle(
        this.player.x - this.facingX * 20,
        this.player.y - this.facingY * 20,
        stats.radius,
        evolutionLevel > 0 ? 0xd84b27 : 0xa65c32,
        evolutionLevel > 0 ? 0.13 : 0.09,
      )
      .setStrokeStyle(2, evolutionLevel > 0 ? 0xf08a42 : 0xc77b43, 0.26)
      .setDepth(18)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.ashTrail.push({
      shape,
      remaining: stats.duration,
      tickAccumulator: 0,
      tickDamage: stats.tickDamage * this.stats.damageMultiplier,
      tickInterval: stats.tickInterval,
      explosionDamage: stats.explosionDamage * this.stats.damageMultiplier,
      explosionRadius: stats.explosionRadius,
    });
    this.lanternPlacementCooldown = stats.placementInterval;
  }

  private createProjectile(
    x: number,
    y: number,
    directionX: number,
    directionY: number,
    damage: number,
    kind: ProjectileKind,
    speed: number,
    hits: number,
    poison?: PoisonPayload,
  ): void {
    if (this.projectiles.length >= 180) {
      return;
    }
    const shape = this.add.circle(
      x,
      y,
      kind === 'hostile' ? 6 : kind === 'venom' ? 4 : 5,
      kind === 'hostile' ? 0xa66b67 : kind === 'venom' ? 0x84b85b : 0xe0b86d,
      1,
    );
    shape.setStrokeStyle(
      kind === 'venom' ? 2 : 1,
      kind === 'venom' ? 0xc0df83 : 0xf2d39a,
      0.75,
    );
    shape.setDepth(40);
    this.projectiles.push({
      shape,
      velocityX: directionX * speed,
      velocityY: directionY * speed,
      damage,
      remainingLife: 2.2,
      remainingHits: hits,
      kind,
      hitIds: new Set<number>(),
      poison,
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

      if (projectile.kind === 'hostile') {
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
            this.damageEnemy(enemy, projectile.damage, 'weapon');
            if (
              projectile.kind === 'venom' &&
              projectile.poison &&
              this.enemies.includes(enemy)
            ) {
              this.applyPoison(enemy, projectile.poison);
            }
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

  private updateAshTrail(step: number): void {
    const survivors: AshTrailSegment[] = [];
    const hitThisStep = new Set<number>();
    for (const segment of this.ashTrail) {
      segment.remaining -= step;
      segment.tickAccumulator += step;
      segment.shape.setAlpha(Math.min(0.16, 0.035 + segment.remaining * 0.035));
      while (segment.tickAccumulator >= segment.tickInterval) {
        segment.tickAccumulator -= segment.tickInterval;
        for (const enemy of [...this.enemies]) {
          if (hitThisStep.has(enemy.id)) {
            continue;
          }
          const distance = Phaser.Math.Distance.Between(
            segment.shape.x,
            segment.shape.y,
            enemy.shape.x,
            enemy.shape.y,
          );
          if (distance <= segment.shape.radius + enemy.definition.radius) {
            hitThisStep.add(enemy.id);
            this.damageEnemy(enemy, segment.tickDamage, 'weapon');
          }
        }
      }
      if (segment.remaining > 0) {
        survivors.push(segment);
      } else {
        if (segment.explosionDamage > 0) {
          this.showGroundBurst(
            segment.shape.x,
            segment.shape.y,
            segment.explosionRadius,
          );
          this.damageEnemiesInRadius(
            segment.shape.x,
            segment.shape.y,
            segment.explosionRadius,
            segment.explosionDamage,
          );
        }
        segment.shape.destroy();
      }
    }
    this.ashTrail = survivors;
  }

  private damageEnemiesInRadius(
    x: number,
    y: number,
    radius: number,
    damage: number,
  ): void {
    for (const enemy of [...this.enemies]) {
      const distance = Phaser.Math.Distance.Between(x, y, enemy.shape.x, enemy.shape.y);
      if (distance <= radius + enemy.definition.radius) {
        this.damageEnemy(enemy, damage, 'weapon');
      }
    }
  }

  private damageEnemiesInArc(
    x: number,
    y: number,
    facingX: number,
    facingY: number,
    radius: number,
    arcDegrees: number,
    damage: number,
  ): void {
    const halfArc = Phaser.Math.DegToRad(arcDegrees) / 2;
    for (const enemy of [...this.enemies]) {
      const deltaX = enemy.shape.x - x;
      const deltaY = enemy.shape.y - y;
      const distance = Math.hypot(deltaX, deltaY);
      if (distance > radius + enemy.definition.radius) {
        continue;
      }
      const dot = (deltaX * facingX + deltaY * facingY) / Math.max(1, distance);
      if (Math.acos(Phaser.Math.Clamp(dot, -1, 1)) <= halfArc) {
        this.damageEnemy(enemy, damage, 'weapon');
      }
    }
  }

  private damageEnemiesInLine(
    range: number,
    width: number,
    maximumTargets: number,
    damage: number,
  ): void {
    if (!this.player) {
      return;
    }
    const player = this.player;
    const candidates = this.enemies
      .map((enemy) => {
        const deltaX = enemy.shape.x - player.x;
        const deltaY = enemy.shape.y - player.y;
        const forward = deltaX * this.facingX + deltaY * this.facingY;
        const lateral = Math.abs(deltaX * -this.facingY + deltaY * this.facingX);
        return { enemy, forward, lateral };
      })
      .filter(
        ({ enemy, forward, lateral }) =>
          forward >= -enemy.definition.radius &&
          forward <= range + enemy.definition.radius &&
          lateral <= width / 2 + enemy.definition.radius,
      )
      .sort((left, right) => left.forward - right.forward)
      .slice(0, maximumTargets);
    candidates.forEach(({ enemy }) => this.damageEnemy(enemy, damage, 'weapon'));
  }

  private damageEnemy(
    enemy: EnemyActor,
    amount: number,
    source: 'weapon' | 'poison',
  ): void {
    if (!this.enemies.includes(enemy)) {
      return;
    }
    const vulnerability =
      source === 'poison'
        ? 0
        : enemy.poisonStacks.reduce(
            (maximum, stack) =>
              stack.blackWidow ? Math.max(maximum, stack.vulnerability) : maximum,
            0,
          );
    const armorScale = enemy.definition.role === 'tank' ? 0.72 : 1;
    enemy.health -= applyDamageVulnerability(amount, vulnerability, source) * armorScale;
    enemy.shape.setScale(enemy.definition.visual.baseScale * 1.12);
    this.tweens.add({
      targets: enemy.shape,
      scaleX: enemy.definition.visual.baseScale,
      scaleY: enemy.definition.visual.baseScale,
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
    this.spreadPoison(enemy, defeatedX, defeatedY);
    this.enemies.splice(index, 1);
    enemy.shape.destroy();
    enemy.statusRing.destroy();
    this.kills += 1;
    this.spawnExperience(enemy, defeatedX, defeatedY);
    if (
      this.healingDrops < 4 &&
      (enemy.definition.role === 'elite' || enemy.definition.role === 'support')
    ) {
      this.spawnHealingFragment(defeatedX, defeatedY);
    }
    if (enemy.definition.role === 'elite') {
      this.evolutionsUnlocked = true;
    }

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
      kind: 'experience',
    });
  }

  private spawnHealingFragment(x: number, y: number): void {
    const pickup = this.add.circle(x, y, 11, 0xbb4f4a, 0.96);
    pickup.setStrokeStyle(3, 0xf0b275, 0.85);
    pickup.setDepth(27);
    this.tweens.add({
      targets: pickup,
      scaleX: 1.24,
      scaleY: 1.24,
      duration: 520,
      yoyo: true,
      repeat: -1,
    });
    this.pickups.push({ shape: pickup, value: 0.15, kind: 'healing' });
    this.healingDrops += 1;
  }

  private applyPoison(
    enemy: EnemyActor,
    payload: PoisonPayload,
    canSpread = true,
  ): void {
    const stack: PoisonStack = {
      damagePerSecond: payload.damagePerSecond,
      remaining: payload.duration,
      canSpread,
      blackWidow: payload.blackWidow,
      vulnerability: payload.vulnerability,
    };
    if (enemy.poisonStacks.length < payload.maximumStacks) {
      enemy.poisonStacks.push(stack);
      return;
    }
    let replacementIndex = 0;
    for (let index = 1; index < enemy.poisonStacks.length; index += 1) {
      if (
        (enemy.poisonStacks[index]?.remaining ?? Number.POSITIVE_INFINITY) <
        (enemy.poisonStacks[replacementIndex]?.remaining ?? Number.POSITIVE_INFINITY)
      ) {
        replacementIndex = index;
      }
    }
    enemy.poisonStacks[replacementIndex] = stack;
  }

  private spreadPoison(enemy: EnemyActor, x: number, y: number): void {
    const transferable = enemy.poisonStacks
      .filter((stack) => stack.canSpread)
      .sort((left, right) => right.remaining - left.remaining)[0];
    if (!transferable) {
      return;
    }
    const target = this.enemies
      .filter((candidate) => candidate !== enemy)
      .sort((left, right) => {
        const poisonDifference =
          left.poisonStacks.length - right.poisonStacks.length;
        if (poisonDifference !== 0) {
          return poisonDifference;
        }
        return (
          Phaser.Math.Distance.Squared(x, y, left.shape.x, left.shape.y) -
          Phaser.Math.Distance.Squared(x, y, right.shape.x, right.shape.y)
        );
      })[0];
    if (!target) {
      return;
    }
    const transferredDuration = transferredPoisonDuration(transferable.remaining);
    if (transferredDuration <= 0.2) {
      return;
    }
    this.applyPoison(
      target,
      {
        damagePerSecond: transferable.damagePerSecond,
        duration: transferredDuration,
        maximumStacks: Math.max(1, target.poisonStacks.length + 1),
        blackWidow: transferable.blackWidow,
        vulnerability: transferable.vulnerability,
      },
      false,
    );
    this.showPoisonTransfer(x, y, target.shape.x, target.shape.y);
  }

  private findVenomTargets(count: number): EnemyActor[] {
    if (!this.player) {
      return [];
    }
    const player = this.player;
    return [...this.enemies]
      .sort((left, right) => {
        const stackDifference = left.poisonStacks.length - right.poisonStacks.length;
        if (stackDifference !== 0) {
          return stackDifference;
        }
        return (
          Phaser.Math.Distance.Squared(
            player.x,
            player.y,
            left.shape.x,
            left.shape.y,
          ) -
          Phaser.Math.Distance.Squared(
            player.x,
            player.y,
            right.shape.x,
            right.shape.y,
          )
        );
      })
      .slice(0, Math.max(1, count));
  }

  private collectPickups(step: number): void {
    if (!this.player) {
      return;
    }
    const survivors: Pickup[] = [];
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
        if (pickup.kind === 'experience') {
          gained += pickup.value;
        } else {
          this.stats.health = applyHealing(
            this.stats.health,
            this.stats.maximumHealth,
            this.stats.maximumHealth * pickup.value,
          );
          this.showHealingEffect();
        }
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
    const choices = createUpgradeChoices(this.upgradeLevels, this.rng, 3, {
      evolutionsUnlocked: this.evolutionsUnlocked,
      maximumWeapons: 4,
    });
    if (choices.length === 0) {
      this.awaitingUpgrade = false;
      this.pendingLevels = 0;
      return;
    }
    dispatchGameEvent(GAME_EVENTS.upgrade, {
      choices,
      pendingLevels: this.pendingLevels,
      levels: { ...this.upgradeLevels },
    });
  }

  private applyPassiveEffects(id: UpgradeId): void {
    if (id === 'runic-plate') {
      this.stats.armor += 5;
    }
    if (id === 'fallen-vigor') {
      this.stats.maximumHealth += 12;
      this.stats.health = applyHealing(this.stats.health, this.stats.maximumHealth, 6);
    }
    if (id === 'hunter-steps') {
      this.stats.speed *= 1.08;
    }
  }

  private damagePlayer(amount: number): void {
    if (this.playerHitGrace > 0 || this.ended) {
      return;
    }
    const result = resolveDamage({
      amount,
      armor: this.stats.armor,
      resistance: 0,
      criticalChance: 0,
      criticalMultiplier: 1,
      criticalRoll: 1,
    });
    this.stats.health = Math.max(0, this.stats.health - result.final);
    this.playerHitGrace = PLAYER_HIT_GRACE_SECONDS;
    if (!this.reducedEffects) {
      this.cameras.main.shake(70, 0.0025);
    }
    this.playerBody?.setFillStyle(0xe08a62, 1);
    this.time.delayedCall(80, () => this.playerBody?.setFillStyle(0xb76538, 1));
    if (this.stats.health <= 0) {
      this.startDeathSequence();
    }
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

  private showArc(
    radius: number,
    facingAngle: number,
    arcDegrees: number,
    color: number,
  ): void {
    if (!this.player) {
      return;
    }
    const centerDegrees = Phaser.Math.RadToDeg(facingAngle);
    const arc = this.add
      .arc(
        this.player.x,
        this.player.y,
        radius,
        centerDegrees - arcDegrees / 2,
        centerDegrees + arcDegrees / 2,
        false,
        color,
        0.13,
      )
      .setStrokeStyle(6, color, 0.72)
      .setDepth(42);
    arc.setScale(0.78);
    this.tweens.add({
      targets: arc,
      scaleX: 1,
      scaleY: 1,
      alpha: 0,
      duration: this.reducedEffects ? 80 : 190,
      ease: 'Cubic.Out',
      onComplete: () => arc.destroy(),
    });
  }

  private showSpin(
    radius: number,
    color: number,
    alpha: number,
    direction: 1 | -1,
  ): void {
    if (!this.player) {
      return;
    }
    const spin = this.add
      .arc(
        this.player.x,
        this.player.y,
        radius,
        -32,
        286,
        false,
        color,
        0.07,
      )
      .setStrokeStyle(8, color, alpha)
      .setDepth(43);
    this.tweens.add({
      targets: spin,
      rotation: direction * Math.PI * 1.6,
      scaleX: 1.08,
      scaleY: 1.08,
      alpha: 0,
      duration: this.reducedEffects ? 90 : 230,
      ease: 'Quad.Out',
      onComplete: () => spin.destroy(),
    });
  }

  private showSpearStrike(
    range: number,
    width: number,
    color: number,
    returning = false,
  ): void {
    if (!this.player) {
      return;
    }
    const startX = this.player.x;
    const startY = this.player.y;
    const endX = startX + this.facingX * range;
    const endY = startY + this.facingY * range;
    const strike = this.add.graphics().setDepth(43);
    strike.lineStyle(Math.max(4, width * 0.28), color, 0.18);
    strike.lineBetween(startX, startY, endX, endY);
    strike.lineStyle(3, 0xf4e0b7, 0.85);
    strike.lineBetween(
      returning ? endX : startX,
      returning ? endY : startY,
      returning ? startX : endX,
      returning ? startY : endY,
    );
    this.tweens.add({
      targets: strike,
      alpha: 0,
      duration: this.reducedEffects ? 70 : 170,
      onComplete: () => strike.destroy(),
    });
  }

  private showGroundBurst(x: number, y: number, radius: number): void {
    const burst = this.add
      .circle(x, y, radius, 0xd9582f, 0.14)
      .setStrokeStyle(4, 0xf0a25b, 0.58)
      .setDepth(28)
      .setScale(0.35)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: burst,
      scaleX: 1,
      scaleY: 1,
      alpha: 0,
      duration: this.reducedEffects ? 80 : 260,
      ease: 'Cubic.Out',
      onComplete: () => burst.destroy(),
    });
  }

  private showHealingEffect(): void {
    if (!this.player) {
      return;
    }
    const effect = this.add
      .circle(this.player.x, this.player.y, 34, 0xc85c52, 0.12)
      .setStrokeStyle(4, 0xf0c07b, 0.7)
      .setDepth(52)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: effect,
      scaleX: 2.2,
      scaleY: 2.2,
      alpha: 0,
      duration: this.reducedEffects ? 90 : 380,
      onComplete: () => effect.destroy(),
    });
  }

  private showPoisonTransfer(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ): void {
    const trail = this.add.graphics().setDepth(41);
    trail.lineStyle(4, 0x91be62, 0.7);
    trail.lineBetween(fromX, fromY, toX, toY);
    this.tweens.add({
      targets: trail,
      alpha: 0,
      duration: this.reducedEffects ? 80 : 280,
      onComplete: () => trail.destroy(),
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

    this.deathTimeout = window.setTimeout(() => {
      this.deathTimeout = undefined;
      this.phase = 'ended';
      this.dispatchResult('defeat');
    }, duration);
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
    const evolutionByWeapon = {
      'executioner-axe': 'barbarian-fury',
      'watch-crossbow': 'piercing-oath',
      'celestial-aura': 'divine-aura',
      'widow-venom': 'black-widow',
      spear: 'impaler',
      'ash-lantern': 'hell-steps',
    } as const;
    const weaponIds = [
      'executioner-axe',
      'watch-crossbow',
      'celestial-aura',
      'widow-venom',
      'spear',
      'ash-lantern',
    ] satisfies WeaponId[];
    const weaponNames = weaponIds
      .filter((id) => (this.upgradeLevels[id] ?? 0) > 0)
      .map((id) => {
        const evolutionId = evolutionByWeapon[id];
        const evolutionLevel = this.upgradeLevels[evolutionId] ?? 0;
        return evolutionLevel > 0
          ? `${getUpgrade(evolutionId).name} E${evolutionLevel}`
          : `${getUpgrade(id).name} ${this.upgradeLevels[id] ?? 0}`;
      });

    return {
      health: this.stats.health,
      maximumHealth: this.stats.maximumHealth,
      armor: this.stats.armor,
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
    if (this.deathTimeout !== undefined) {
      window.clearTimeout(this.deathTimeout);
      this.deathTimeout = undefined;
    }
    this.projectiles.forEach((projectile) => projectile.shape.destroy());
    this.pickups.forEach((pickup) => pickup.shape.destroy());
    this.hazards.forEach((hazard) => hazard.shape.destroy());
    this.ashTrail.forEach((segment) => segment.shape.destroy());
    this.enemies.forEach((enemy) => {
      enemy.shape.destroy();
      enemy.statusRing.destroy();
    });
    this.clearDivineAuraField();
    this.parallaxLayers.forEach((layer) => layer.tile.destroy());
    this.parallaxLayers = [];
  };
}
