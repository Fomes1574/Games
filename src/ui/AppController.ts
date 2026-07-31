import type Phaser from 'phaser';

import type { UpgradeId } from '../data/content';
import {
  codexEntriesFor,
  type CodexCategory,
  type CodexEntry,
  type CodexEntryId,
} from '../domain/codex/codex';
import {
  clampThreatLevel,
  romanThreat,
  threatModifiers,
} from '../domain/encounters/threat';
import {
  DEFAULT_MOVEMENT_BINDINGS,
  formatKeyboardCode,
  isBindableMovementCode,
  MOVEMENT_DIRECTIONS,
  parseMovementBindings,
  rebindMovement,
  type MovementBindings,
  type MovementDirection,
} from '../domain/input/movementBindings';
import { joystickVectorFromPoint } from '../domain/input/touchMovement';
import {
  getPermanentUpgrade,
  nextPermanentUpgradeCost,
  PERMANENT_UPGRADES,
  purchasePermanentUpgrade,
  type PermanentUpgradeId,
} from '../domain/progression/permanentUpgrades';
import {
  GAME_EVENTS,
  type DiscoveryDetail,
  type HudDetail,
  type ResultDetail,
  type UpgradeDetail,
} from '../game/events';
import { createUpgradePreview } from '../domain/upgrades/upgradePresentation';
import type { ExpeditionScene } from '../game/scenes/ExpeditionScene';
import { withChecksum, type GameSave } from '../domain/saving/saveModel';
import { SaveService } from '../services/storage/SaveService';

const MOVEMENT_BINDINGS_STORAGE_KEY = 'ultima-companhia-movement-bindings';

const element = <T extends HTMLElement>(id: string): T => {
  const value = document.querySelector<T>(`#${id}`);
  if (!value) {
    throw new Error(`Elemento obrigatório ausente: #${id}`);
  }
  return value;
};

export class AppController {
  private save?: GameSave;
  private lastSeed?: number;
  private movementBindings: MovementBindings = { ...DEFAULT_MOVEMENT_BINDINGS };
  private rebindingDirection?: MovementDirection;
  private pendingDefeatResult?: ResultDetail;
  private touchPointerId?: number;
  private lastErrorReport = '';
  private readonly service = new SaveService();
  private saveQueue: Promise<void> = Promise.resolve();
  private codexCategory: CodexCategory = 'weapons';
  private codexEntryIndex = 0;
  private codexReturn: 'home' | 'guild' = 'home';
  private readonly landing = element<HTMLElement>('landing');
  private readonly statusCard = element<HTMLElement>('status-card');
  private readonly selection = element<HTMLElement>('selection-panel');
  private readonly hud = element<HTMLElement>('hud');
  private readonly upgradePanel = element<HTMLElement>('upgrade-panel');
  private readonly pausePanel = element<HTMLElement>('pause-panel');
  private readonly gameOverPanel = element<HTMLElement>('game-over-panel');
  private readonly resultPanel = element<HTMLElement>('result-panel');
  private readonly guildPanel = element<HTMLElement>('guild-panel');
  private readonly settingsPanel = element<HTMLElement>('settings-panel');
  private readonly codexPanel = element<HTMLElement>('codex-panel');
  private readonly touchControls = element<HTMLElement>('touch-controls');
  private readonly touchJoystick = element<HTMLButtonElement>('touch-joystick');
  private readonly touchStickThumb = element<HTMLElement>('touch-stick-thumb');
  private readonly toast = element<HTMLElement>('toast');

  public constructor(
    private readonly game: Phaser.Game,
    private readonly version: string,
  ) {}

  public async initialize(): Promise<void> {
    const startButton = element<HTMLButtonElement>('start-expedition');
    startButton.disabled = true;
    startButton.textContent = 'Preparando a companhia…';
    this.selection.setAttribute('aria-busy', 'true');
    this.bindActions();
    this.bindGameEvents();
    this.configureTouchControls();
    this.loadSettings();
    this.save = await this.service.load();
    this.renderGuild();
    this.renderThreat();
    this.renderCodex();
    startButton.disabled = false;
    startButton.textContent = 'Assinar contrato e partir';
    this.selection.removeAttribute('aria-busy');
    element<HTMLElement>('build-label').textContent =
      `Versão ${this.version} · Phaser 4 · save local ativo`;
  }

  public startRun(seed?: number): void {
    if (!this.save) {
      this.showToast('A companhia ainda está carregando o save local.');
      return;
    }
    const selectedSeed =
      seed ??
      this.parseSeed(element<HTMLInputElement>('seed-input').value) ??
      (Date.now() & 0x7fff_ffff);
    this.lastSeed = selectedSeed;
    this.hideAllPanels();
    this.landing.hidden = true;
    this.statusCard.hidden = true;
    this.hud.hidden = false;
    this.pendingDefeatResult = undefined;
    document.body.classList.add('is-expedition');
    document.body.classList.remove('is-dying', 'is-game-over');
    this.game.scene.stop('boot');
    this.game.scene.start('expedition', {
      seed: selectedSeed,
      permanentUpgrades: { ...this.save.guild.permanentUpgrades },
      threatLevel: this.save.guild.selectedThreat,
      movementBindings: { ...this.movementBindings },
      reducedEffects: element<HTMLInputElement>('reduced-effects').checked,
    });
    this.setTouchControlsSuspended(false);
  }

  public getExpeditionScene(): ExpeditionScene | undefined {
    const scene = this.game.scene.getScene('expedition') as ExpeditionScene | undefined;
    return scene?.scene.isActive() ? scene : undefined;
  }

  public showError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.lastErrorReport = JSON.stringify(
      {
        version: this.version,
        userAgent: navigator.userAgent,
        scene: this.getExpeditionScene() ? 'expedition' : 'menu',
        seed: this.lastSeed ?? null,
        message,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    );
    element<HTMLElement>('error-message').textContent = message;
    element<HTMLElement>('error-panel').hidden = false;
  }

  private bindActions(): void {
    element<HTMLButtonElement>('primary-action').addEventListener('click', (event) => {
      const button = event.currentTarget as HTMLButtonElement;
      button.dataset.acknowledged = 'true';
      this.selection.hidden = false;
      this.landing.hidden = true;
      this.statusCard.hidden = true;
    });
    element<HTMLButtonElement>('selection-back').addEventListener('click', () =>
      this.showHome(),
    );
    element<HTMLButtonElement>('start-expedition').addEventListener('click', () =>
      this.startRun(),
    );
    element<HTMLButtonElement>('guild-action').addEventListener('click', () =>
      this.openGuild(),
    );
    element<HTMLButtonElement>('codex-action').addEventListener('click', () =>
      this.openCodex('home'),
    );
    element<HTMLButtonElement>('guild-close').addEventListener('click', () =>
      this.showHome(),
    );
    element<HTMLButtonElement>('guild-codex').addEventListener('click', () =>
      this.openCodex('guild'),
    );
    element<HTMLButtonElement>('codex-close').addEventListener('click', () =>
      this.closeCodex(),
    );
    element<HTMLButtonElement>('codex-mobile-back').addEventListener('click', () => {
      element<HTMLElement>('codex-book').dataset.detailOpen = 'false';
    });
    element<HTMLButtonElement>('codex-previous').addEventListener('click', () =>
      this.turnCodexPage(-1),
    );
    element<HTMLButtonElement>('codex-next').addEventListener('click', () =>
      this.turnCodexPage(1),
    );
    document.querySelectorAll<HTMLButtonElement>('[data-codex-category]').forEach(
      (button) => {
        button.addEventListener('click', () => {
          this.codexCategory = button.dataset.codexCategory as CodexCategory;
          this.codexEntryIndex = 0;
          this.renderCodex(true);
        });
      },
    );
    element<HTMLButtonElement>('settings-action').addEventListener('click', () =>
      this.openSettings(),
    );
    element<HTMLButtonElement>('settings-close').addEventListener('click', () =>
      this.showHome(),
    );
    element<HTMLButtonElement>('pause-action').addEventListener('click', () =>
      this.getExpeditionScene()?.togglePause(),
    );
    element<HTMLButtonElement>('resume-action').addEventListener('click', () =>
      this.getExpeditionScene()?.togglePause(false),
    );
    element<HTMLButtonElement>('abandon-action').addEventListener('click', () =>
      this.getExpeditionScene()?.debugDefeat(),
    );
    element<HTMLButtonElement>('game-over-continue').addEventListener('click', () =>
      this.continueFromGameOver(),
    );
    element<HTMLButtonElement>('return-guild').addEventListener('click', () => {
      this.restartBootScene();
      this.openGuild();
    });
    element<HTMLButtonElement>('replay-action').addEventListener('click', () => {
      this.restartBootScene();
      this.showSelection();
    });
    element<HTMLElement>('permanent-upgrades').addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
        '[data-permanent-upgrade]',
      );
      if (button?.dataset.permanentUpgrade) {
        void this.upgradePermanent(button.dataset.permanentUpgrade as PermanentUpgradeId);
      }
    });
    element<HTMLSelectElement>('threat-select').addEventListener('change', () =>
      this.updateSelectedThreat(),
    );
    element<HTMLButtonElement>('reroll-upgrades').addEventListener('click', () =>
      this.getExpeditionScene()?.rerollUpgrades(),
    );
    element<HTMLButtonElement>('export-save').addEventListener('click', () =>
      this.exportSave(),
    );
    element<HTMLInputElement>('import-save').addEventListener('change', (event) => {
      void this.importSave(event);
    });
    element<HTMLInputElement>('ui-scale').addEventListener('input', () =>
      this.saveSettings(),
    );
    element<HTMLInputElement>('reduced-effects').addEventListener('change', () =>
      this.saveSettings(),
    );
    element<HTMLInputElement>('pause-on-blur').addEventListener('change', () =>
      this.saveSettings(),
    );
    document.querySelectorAll<HTMLButtonElement>('[data-bind-direction]').forEach(
      (button) => {
        button.addEventListener('click', () => this.beginKeyCapture(button));
      },
    );
    element<HTMLButtonElement>('reset-keybindings').addEventListener('click', () =>
      this.resetKeybindings(),
    );
    element<HTMLButtonElement>('copy-error').addEventListener('click', () => {
      void navigator.clipboard.writeText(this.lastErrorReport);
    });
    window.addEventListener('keydown', (event) => this.handleGlobalKeydown(event));
    window.addEventListener('blur', () => {
      this.releaseTouchMovement();
      if (element<HTMLInputElement>('pause-on-blur').checked) {
        this.getExpeditionScene()?.togglePause(true);
      }
    });
  }

  private bindGameEvents(): void {
    window.addEventListener(GAME_EVENTS.hud, (event) => {
      this.renderHud((event as CustomEvent<HudDetail>).detail);
    });
    window.addEventListener(GAME_EVENTS.upgrade, (event) => {
      this.setTouchControlsSuspended(true);
      this.renderUpgrade((event as CustomEvent<UpgradeDetail>).detail);
    });
    window.addEventListener(GAME_EVENTS.pause, (event) => {
      const detail = (event as CustomEvent<{ paused: boolean }>).detail;
      this.pausePanel.hidden = !detail.paused;
      this.setTouchControlsSuspended(detail.paused);
    });
    window.addEventListener(GAME_EVENTS.death, () => {
      this.setTouchControlsSuspended(true);
      this.hud.hidden = true;
      this.upgradePanel.hidden = true;
      this.pausePanel.hidden = true;
      document.body.classList.add('is-dying');
    });
    window.addEventListener(GAME_EVENTS.result, (event) => {
      void this.handleResult((event as CustomEvent<ResultDetail>).detail);
    });
    window.addEventListener(GAME_EVENTS.discovery, (event) => {
      this.persistDiscovery((event as CustomEvent<DiscoveryDetail>).detail);
    });
  }

  private renderHud(detail: HudDetail): void {
    const healthPercent = Math.max(0, detail.health / detail.maximumHealth) * 100;
    const experiencePercent =
      Math.max(0, detail.experience / detail.experienceForNext) * 100;
    element<HTMLElement>('health-fill').style.width = `${healthPercent}%`;
    element<HTMLElement>('health-text').textContent =
      `${Math.ceil(detail.health)} / ${detail.maximumHealth}`;
    element<HTMLElement>('experience-fill').style.width = `${experiencePercent}%`;
    element<HTMLElement>('level-text').textContent = String(detail.level);
    element<HTMLElement>('kill-count').textContent = String(detail.kills);
    element<HTMLElement>('enemy-count').textContent = String(detail.enemies);
    element<HTMLElement>('armor-text').textContent = String(detail.armor);
    element<HTMLElement>('weapon-list').textContent = detail.weapons.join(' · ');
    element<HTMLElement>('timer-text').textContent = this.formatTime(
      Math.max(0, detail.durationSeconds - detail.elapsedSeconds),
    );

    const bossBlock = element<HTMLElement>('boss-block');
    bossBlock.hidden = detail.bossHealth === null || detail.bossMaximumHealth === null;
    if (!bossBlock.hidden && detail.bossHealth !== null && detail.bossMaximumHealth) {
      element<HTMLElement>('boss-fill').style.width =
        `${Math.max(0, detail.bossHealth / detail.bossMaximumHealth) * 100}%`;
    }
  }

  private renderUpgrade(detail: UpgradeDetail): void {
    const choices = element<HTMLElement>('upgrade-choices');
    choices.replaceChildren();
    detail.choices.forEach((upgrade, index) => {
      const preview = createUpgradePreview(upgrade.id, detail.levels);
      const wrapper = document.createElement('div');
      wrapper.className = 'upgrade-choice';
      const button = document.createElement('button');
      button.className = `upgrade-card upgrade-${upgrade.kind}`;
      button.type = 'button';
      button.dataset.upgradeId = upgrade.id;

      const number = document.createElement('span');
      number.className = 'choice-number';
      number.textContent = String(index + 1);
      const kind = document.createElement('small');
      kind.className = 'upgrade-kind';
      kind.textContent =
        upgrade.kind === 'weapon'
          ? 'Arma'
          : upgrade.kind === 'passive'
            ? 'Passiva'
            : 'Evolução';
      const tier = document.createElement('span');
      tier.className = 'upgrade-tier';
      tier.textContent = preview.tier;
      const title = document.createElement('strong');
      title.textContent = preview.name;
      const description = document.createElement('span');
      description.className = 'upgrade-effect';
      description.textContent = preview.effect;
      const stats = document.createElement('span');
      stats.className = 'upgrade-stats';
      preview.stats.forEach((stat) => {
        const item = document.createElement('span');
        const label = document.createElement('small');
        const value = document.createElement('b');
        label.textContent = stat.label;
        value.textContent = stat.value;
        item.append(label, value);
        stats.append(item);
      });
      button.append(number, kind, tier, title, description, stats);
      button.addEventListener('click', () => this.selectUpgrade(upgrade.id));
      wrapper.append(button);
      if (detail.banishes > 0) {
        const banish = document.createElement('button');
        banish.type = 'button';
        banish.className = 'banish-upgrade';
        banish.textContent = 'Excluir';
        banish.setAttribute('aria-label', `Excluir ${preview.name} desta expedição`);
        banish.addEventListener('click', () =>
          this.getExpeditionScene()?.banishUpgrade(upgrade.id),
        );
        wrapper.append(banish);
      }
      choices.append(wrapper);
    });
    element<HTMLElement>('pending-levels').textContent =
      detail.pendingLevels > 1
        ? `${detail.pendingLevels} escolhas restantes`
        : '';
    const tools = element<HTMLElement>('upgrade-tools');
    tools.hidden = detail.rerolls <= 0 && detail.banishes <= 0;
    const reroll = element<HTMLButtonElement>('reroll-upgrades');
    reroll.textContent = `Jackpot · ${detail.rerolls}`;
    reroll.disabled = detail.rerolls <= 0;
    element<HTMLElement>('banish-count').textContent = `Veto · ${detail.banishes}`;
    this.upgradePanel.hidden = false;
    choices.querySelector<HTMLButtonElement>('button')?.focus();
  }

  private selectUpgrade(id: UpgradeId): void {
    this.upgradePanel.hidden = true;
    this.setTouchControlsSuspended(false);
    this.getExpeditionScene()?.chooseUpgrade(id);
  }

  private async handleResult(
    detail: ResultDetail,
    showDefeatIntro = true,
  ): Promise<void> {
    this.setTouchControlsSuspended(true);
    this.hud.hidden = true;
    this.upgradePanel.hidden = true;
    this.pausePanel.hidden = true;
    if (detail.outcome === 'defeat' && showDefeatIntro) {
      this.showGameOver(detail);
      return;
    }

    document.body.classList.remove('is-dying', 'is-game-over');
    this.gameOverPanel.hidden = true;
    element<HTMLElement>('result-eyebrow').textContent =
      detail.outcome === 'victory' ? 'O Bispo tombou' : 'A noite cobrou seu preço';
    element<HTMLElement>('result-title').textContent =
      detail.outcome === 'victory' ? 'Vitória na Charneca' : 'Expedição perdida';
    element<HTMLElement>('result-summary').textContent =
      detail.outcome === 'victory'
        ? 'O aventureiro retornou com o contrato cumprido e novas brasas.'
        : 'Nem tudo foi perdido: as brasas recuperadas chegaram à companhia.';
    element<HTMLElement>('result-time').textContent = this.formatTime(
      detail.elapsedSeconds,
    );
    element<HTMLElement>('result-kills').textContent = String(detail.kills);
    element<HTMLElement>('result-level').textContent = String(detail.level);
    element<HTMLElement>('result-embers').textContent = `+${detail.embers}`;
    element<HTMLElement>('result-threat').textContent = romanThreat(detail.threatLevel);
    this.resultPanel.hidden = false;

    if (this.save) {
      const current = this.save;
      const victory = detail.outcome === 'victory';
      const killsByEnemy = { ...current.statistics.killsByEnemy };
      for (const [enemyId, count] of Object.entries(detail.killsByEnemy)) {
        killsByEnemy[enemyId] = (killsByEnemy[enemyId] ?? 0) + count;
      }
      this.save = withChecksum({
        ...current,
        updatedAt: new Date().toISOString(),
        guild: {
          ...current.guild,
          embers: current.guild.embers + detail.embers,
          expeditions: current.guild.expeditions + 1,
          victories: current.guild.victories + Number(victory),
          maximumThreatUnlocked: victory
            ? Math.max(
                current.guild.maximumThreatUnlocked,
                Math.min(10, detail.threatLevel + 1),
              )
            : current.guild.maximumThreatUnlocked,
        },
        statistics: {
          ...current.statistics,
          enemiesDefeated: current.statistics.enemiesDefeated + detail.kills,
          longestSurvivalSeconds: Math.max(
            current.statistics.longestSurvivalSeconds,
            Math.floor(detail.elapsedSeconds),
          ),
          killsByEnemy,
          runsByMap: {
            ...current.statistics.runsByMap,
            [detail.mapId]: (current.statistics.runsByMap[detail.mapId] ?? 0) + 1,
          },
          victoriesByMap: {
            ...current.statistics.victoriesByMap,
            [detail.mapId]:
              (current.statistics.victoriesByMap[detail.mapId] ?? 0) +
              Number(victory),
          },
        },
      });
      await this.enqueueSave(this.save);
      this.renderGuild();
      this.renderThreat();
    }
  }

  private showHome(): void {
    this.rebindingDirection = undefined;
    this.hideAllPanels();
    document.body.classList.remove('is-expedition', 'is-dying', 'is-game-over');
    this.landing.hidden = false;
    this.statusCard.hidden = false;
  }

  private showSelection(): void {
    this.hideAllPanels();
    document.body.classList.remove('is-expedition', 'is-dying', 'is-game-over');
    this.landing.hidden = true;
    this.statusCard.hidden = true;
    this.selection.hidden = false;
    this.renderThreat();
  }

  private openGuild(): void {
    this.hideAllPanels();
    document.body.classList.remove('is-expedition', 'is-dying', 'is-game-over');
    this.landing.hidden = true;
    this.statusCard.hidden = true;
    this.guildPanel.hidden = false;
    this.renderGuild();
  }

  private openSettings(): void {
    this.rebindingDirection = undefined;
    this.renderKeybindings();
    this.hideAllPanels();
    document.body.classList.remove('is-expedition', 'is-dying', 'is-game-over');
    this.landing.hidden = true;
    this.statusCard.hidden = true;
    this.settingsPanel.hidden = false;
  }

  private hideAllPanels(): void {
    this.setTouchControlsSuspended(true);
    this.selection.hidden = true;
    this.hud.hidden = true;
    this.upgradePanel.hidden = true;
    this.pausePanel.hidden = true;
    this.gameOverPanel.hidden = true;
    this.resultPanel.hidden = true;
    this.guildPanel.hidden = true;
    this.settingsPanel.hidden = true;
    this.codexPanel.hidden = true;
  }

  private restartBootScene(): void {
    this.releaseTouchMovement();
    this.game.scene.stop('expedition');
    this.game.scene.stop('boot');
    this.game.scene.start('boot');
  }

  private renderGuild(): void {
    if (!this.save) {
      return;
    }
    element<HTMLElement>('guild-embers').textContent =
      this.save.guild.embers.toLocaleString('pt-BR');
    element<HTMLElement>('threat-unlocked').textContent =
      `Ameaça ${romanThreat(this.save.guild.maximumThreatUnlocked)}`;
    const grid = element<HTMLElement>('permanent-upgrades');
    grid.replaceChildren();
    for (const definition of PERMANENT_UPGRADES) {
      const level = this.save.guild.permanentUpgrades[definition.id];
      const cost = nextPermanentUpgradeCost(
        definition.id,
        this.save.guild.permanentUpgrades,
      );
      const card = document.createElement('article');
      card.className = `permanent-upgrade-card permanent-${definition.group}`;
      card.dataset.available = String(definition.available);
      const heading = document.createElement('div');
      const title = document.createElement('strong');
      const levelLabel = document.createElement('small');
      title.textContent = definition.name;
      levelLabel.textContent = `${level}/${definition.costs.length}`;
      heading.append(title, levelLabel);
      const effect = document.createElement('span');
      effect.textContent = definition.effect;
      card.append(heading, effect);
      if (definition.note) {
        const note = document.createElement('small');
        note.textContent = definition.note;
        card.append(note);
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'secondary-action';
      button.dataset.permanentUpgrade = definition.id;
      button.disabled =
        !definition.available || cost === null || this.save.guild.embers < cost;
      button.textContent = !definition.available
        ? 'Bloqueado'
        : cost === null
          ? 'Máximo'
          : `${cost.toLocaleString('pt-BR')} brasas`;
      card.append(button);
      grid.append(card);
    }
  }

  private async upgradePermanent(id: PermanentUpgradeId): Promise<void> {
    if (!this.save) {
      return;
    }
    try {
      const current = this.save;
      const purchase = purchasePermanentUpgrade(
        id,
        current.guild.permanentUpgrades,
        current.guild.embers,
      );
      this.save = withChecksum({
        ...current,
        updatedAt: new Date().toISOString(),
        guild: {
          ...current.guild,
          embers: purchase.embers,
          permanentUpgrades: purchase.levels,
        },
      });
      await this.enqueueSave(this.save);
      this.renderGuild();
      this.showToast(`${getPermanentUpgrade(id).name} melhorado.`);
    } catch {
      this.showToast('Melhoria indisponível ou brasas insuficientes.');
    }
  }

  private renderThreat(): void {
    if (!this.save) {
      return;
    }
    const select = element<HTMLSelectElement>('threat-select');
    for (const option of select.options) {
      option.disabled = Number(option.value) > this.save.guild.maximumThreatUnlocked;
    }
    const selected = Math.min(
      this.save.guild.selectedThreat,
      this.save.guild.maximumThreatUnlocked,
    );
    select.value = String(selected);
    const modifiers = threatModifiers(selected);
    element<HTMLElement>('threat-health').textContent =
      `${modifiers.healthMultiplier.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}×`;
    element<HTMLElement>('threat-damage').textContent =
      `${modifiers.damageMultiplier.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}×`;
    element<HTMLElement>('threat-embers').textContent =
      `${modifiers.emberMultiplier.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}×`;
    const seal = document.querySelector<HTMLElement>('.danger-seal');
    if (seal) {
      seal.textContent = `Ameaça ${romanThreat(selected)}`;
    }
  }

  private updateSelectedThreat(): void {
    if (!this.save) {
      return;
    }
    const value = clampThreatLevel(
      Number(element<HTMLSelectElement>('threat-select').value),
    );
    const selectedThreat = Math.min(value, this.save.guild.maximumThreatUnlocked);
    this.save = withChecksum({
      ...this.save,
      updatedAt: new Date().toISOString(),
      guild: { ...this.save.guild, selectedThreat },
    });
    void this.enqueueSave(this.save);
    this.renderThreat();
  }

  private openCodex(returnTo: 'home' | 'guild'): void {
    this.codexReturn = returnTo;
    this.hideAllPanels();
    document.body.classList.remove('is-expedition', 'is-dying', 'is-game-over');
    this.landing.hidden = true;
    this.statusCard.hidden = true;
    this.codexPanel.hidden = false;
    this.renderCodex();
    element<HTMLButtonElement>('codex-close').focus();
  }

  private closeCodex(): void {
    if (this.codexReturn === 'guild') {
      this.openGuild();
    } else {
      this.showHome();
    }
  }

  private renderCodex(animate = false): void {
    const entries = codexEntriesFor(this.codexCategory);
    const discovered = new Set<CodexEntryId>(this.save?.codex.discovered ?? []);
    const mastered = new Set<CodexEntryId>(this.save?.codex.mastered ?? []);
    this.codexEntryIndex = Math.min(
      Math.max(0, this.codexEntryIndex),
      Math.max(0, entries.length - 1),
    );
    const labels: Record<CodexCategory, string> = {
      weapons: 'Armas',
      passives: 'Passivas',
      enemies: 'Inimigos',
      bosses: 'Chefes',
      maps: 'Mapas',
    };
    document.querySelectorAll<HTMLButtonElement>('[data-codex-category]').forEach(
      (button) => {
        const active = button.dataset.codexCategory === this.codexCategory;
        button.setAttribute('aria-current', active ? 'page' : 'false');
      },
    );
    element<HTMLElement>('codex-category-title').textContent = labels[this.codexCategory];
    element<HTMLElement>('codex-counter').textContent =
      `${entries.filter((entry) => discovered.has(entry.id)).length} / ${entries.length}`;

    const list = element<HTMLElement>('codex-entry-list');
    list.replaceChildren();
    entries.forEach((entry, index) => {
      const known = discovered.has(entry.id);
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.selected = String(index === this.codexEntryIndex);
      button.dataset.discovered = String(known);
      const name = document.createElement('strong');
      name.textContent = known ? entry.name : '???';
      const state = document.createElement('small');
      state.textContent = mastered.has(entry.id)
        ? 'Completo'
        : known
          ? 'Encontrado'
          : 'Desconhecido';
      button.append(name, state);
      button.addEventListener('click', () => {
        this.codexEntryIndex = index;
        element<HTMLElement>('codex-book').dataset.detailOpen = 'true';
        this.renderCodex(true);
      });
      list.append(button);
    });

    const entry = entries[this.codexEntryIndex];
    if (entry) {
      this.renderCodexEntry(entry, discovered.has(entry.id), mastered.has(entry.id));
    }
    element<HTMLButtonElement>('codex-previous').disabled = this.codexEntryIndex <= 0;
    element<HTMLButtonElement>('codex-next').disabled =
      this.codexEntryIndex >= entries.length - 1;
    element<HTMLElement>('codex-page-number').textContent =
      entries.length > 0 ? `${this.codexEntryIndex + 1} / ${entries.length}` : '—';
    if (animate) {
      const book = element<HTMLElement>('codex-book');
      book.classList.remove('is-turning');
      requestAnimationFrame(() => book.classList.add('is-turning'));
      window.setTimeout(() => book.classList.remove('is-turning'), 320);
    }
  }

  private renderCodexEntry(
    entry: CodexEntry,
    discovered: boolean,
    mastered: boolean,
  ): void {
    const art = element<HTMLElement>('codex-art');
    art.style.setProperty('--codex-accent', entry.accent);
    art.dataset.discovered = String(discovered);
    art.dataset.visualProfile = entry.visualProfile;
    element<HTMLElement>('codex-sigil').textContent = discovered ? entry.sigil : '?';
    element<HTMLElement>('codex-discovery-state').textContent = mastered
      ? 'Registro completo'
      : discovered
        ? 'Encontrado'
        : 'Não descoberto';
    element<HTMLElement>('codex-entry-name').textContent = discovered ? entry.name : '???';
    element<HTMLElement>('codex-entry-description').textContent = discovered
      ? entry.description
      : 'Continue explorando.';
    const stats = element<HTMLElement>('codex-entry-stats');
    stats.replaceChildren();
    if (mastered) {
      for (const stat of entry.stats) {
        const group = document.createElement('div');
        const term = document.createElement('dt');
        const value = document.createElement('dd');
        term.textContent = stat.label;
        value.textContent = stat.value;
        group.append(term, value);
        stats.append(group);
      }
    } else if (discovered) {
      const hint = document.createElement('div');
      const term = document.createElement('dt');
      const value = document.createElement('dd');
      term.textContent = 'Status';
      value.textContent = 'Derrote ou conclua para revelar';
      hint.append(term, value);
      stats.append(hint);
    }
  }

  private turnCodexPage(direction: -1 | 1): void {
    const entries = codexEntriesFor(this.codexCategory);
    this.codexEntryIndex = Math.min(
      entries.length - 1,
      Math.max(0, this.codexEntryIndex + direction),
    );
    element<HTMLElement>('codex-book').dataset.detailOpen = 'true';
    this.renderCodex(true);
  }

  private persistDiscovery(detail: DiscoveryDetail): void {
    if (!this.save) {
      return;
    }
    const discovered = new Set(this.save.codex.discovered);
    const mastered = new Set(this.save.codex.mastered);
    const before = discovered.size + mastered.size;
    for (const id of detail.discovered) {
      discovered.add(id);
    }
    for (const id of detail.mastered) {
      discovered.add(id);
      mastered.add(id);
    }
    if (before === discovered.size + mastered.size) {
      return;
    }
    this.save = withChecksum({
      ...this.save,
      updatedAt: new Date().toISOString(),
      codex: { discovered: [...discovered], mastered: [...mastered] },
    });
    void this.enqueueSave(this.save);
    if (!this.codexPanel.hidden) {
      this.renderCodex();
    }
  }

  private enqueueSave(save: GameSave): Promise<void> {
    this.saveQueue = this.saveQueue
      .catch(() => undefined)
      .then(() => this.service.save(save))
      .catch((error: unknown) => this.showError(error));
    return this.saveQueue;
  }

  private exportSave(): void {
    if (!this.save) {
      return;
    }
    const url = URL.createObjectURL(this.service.export(this.save));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ultima-companhia-save-${this.save.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    this.showToast('Save exportado.');
  }

  private async importSave(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    try {
      this.save = await this.service.import(file);
      this.renderGuild();
      this.renderThreat();
      this.renderCodex();
      this.showToast('Save validado e importado.');
    } catch (error) {
      this.showError(error);
    } finally {
      input.value = '';
    }
  }

  private handleGlobalKeydown(event: KeyboardEvent): void {
    if (this.rebindingDirection) {
      event.preventDefault();
      const direction = this.rebindingDirection;
      if (!isBindableMovementCode(event.code)) {
        element<HTMLElement>('keybinding-status').textContent =
          event.code === 'Escape'
            ? 'Esc continua reservado para pausar. Pressione outra tecla.'
            : 'Essa tecla não pôde ser identificada. Tente outra.';
        return;
      }
      this.movementBindings = rebindMovement(
        this.movementBindings,
        direction,
        event.code,
      );
      localStorage.setItem(
        MOVEMENT_BINDINGS_STORAGE_KEY,
        JSON.stringify(this.movementBindings),
      );
      this.rebindingDirection = undefined;
      this.renderKeybindings(
        `${this.directionLabel(direction)} agora usa ${formatKeyboardCode(event.code)}.`,
      );
      return;
    }

    if (
      !this.gameOverPanel.hidden &&
      (event.code === 'Enter' || event.code === 'Space')
    ) {
      event.preventDefault();
      this.continueFromGameOver();
      return;
    }

    if (!this.upgradePanel.hidden && ['1', '2', '3', '4'].includes(event.key)) {
      const buttons = [
        ...element<HTMLElement>('upgrade-choices').querySelectorAll<HTMLButtonElement>(
          '.upgrade-card',
        ),
      ];
      buttons[Number(event.key) - 1]?.click();
    }
  }

  private configureTouchControls(): void {
    const touchCapable =
      navigator.maxTouchPoints > 0 &&
      (window.matchMedia('(pointer: coarse)').matches ||
        window.matchMedia('(max-width: 900px)').matches);
    this.touchControls.hidden = !touchCapable;
    document.body.classList.toggle('touch-capable', touchCapable);
    this.setTouchControlsSuspended(true);
    if (!touchCapable) {
      return;
    }

    this.touchJoystick.addEventListener('pointerdown', (event) => {
      if (
        this.touchControls.dataset.suspended === 'true' ||
        this.touchPointerId !== undefined
      ) {
        return;
      }
      event.preventDefault();
      this.touchPointerId = event.pointerId;
      try {
        this.touchJoystick.setPointerCapture(event.pointerId);
      } catch {
        // Eventos sintéticos de teste não possuem um ponteiro capturável.
      }
      this.updateTouchMovement(event);
    });
    this.touchJoystick.addEventListener('pointermove', (event) => {
      if (event.pointerId === this.touchPointerId) {
        event.preventDefault();
        this.updateTouchMovement(event);
      }
    });
    this.touchJoystick.addEventListener('lostpointercapture', () =>
      this.releaseTouchMovement(),
    );
    this.touchJoystick.addEventListener('contextmenu', (event) =>
      event.preventDefault(),
    );
    window.addEventListener('pointerup', (event) =>
      this.releaseTouchMovement(event.pointerId),
    );
    window.addEventListener('pointercancel', (event) =>
      this.releaseTouchMovement(event.pointerId),
    );
  }

  private updateTouchMovement(event: PointerEvent): void {
    const bounds = this.touchJoystick.getBoundingClientRect();
    const radius = Math.max(1, Math.min(bounds.width, bounds.height) / 2);
    const vector = joystickVectorFromPoint(
      {
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
      },
      { x: event.clientX, y: event.clientY },
      radius,
    );
    const thumbBounds = this.touchStickThumb.getBoundingClientRect();
    const travel = Math.max(0, (Math.min(bounds.width, bounds.height) - thumbBounds.width) / 2);
    this.touchStickThumb.style.setProperty('--stick-x', `${vector.x * travel}px`);
    this.touchStickThumb.style.setProperty('--stick-y', `${vector.y * travel}px`);
    this.getExpeditionScene()?.setTouchMovement(vector.x, vector.y);
  }

  private releaseTouchMovement(pointerId?: number): void {
    if (
      pointerId !== undefined &&
      this.touchPointerId !== undefined &&
      pointerId !== this.touchPointerId
    ) {
      return;
    }
    this.touchPointerId = undefined;
    this.touchStickThumb.style.setProperty('--stick-x', '0px');
    this.touchStickThumb.style.setProperty('--stick-y', '0px');
    this.getExpeditionScene()?.setTouchMovement(0, 0);
  }

  private setTouchControlsSuspended(suspended: boolean): void {
    this.touchControls.dataset.suspended = String(suspended);
    this.touchControls.setAttribute(
      'aria-hidden',
      String(suspended || this.touchControls.hidden),
    );
    if (suspended) {
      this.releaseTouchMovement();
    }
  }

  private loadSettings(): void {
    const scale = localStorage.getItem('ultima-companhia-ui-scale') ?? '100';
    const reduced = localStorage.getItem('ultima-companhia-reduced-effects') === 'true';
    const pause = localStorage.getItem('ultima-companhia-pause-blur') !== 'false';
    this.movementBindings = parseMovementBindings(
      localStorage.getItem(MOVEMENT_BINDINGS_STORAGE_KEY),
    );
    element<HTMLInputElement>('ui-scale').value = scale;
    element<HTMLInputElement>('reduced-effects').checked = reduced;
    element<HTMLInputElement>('pause-on-blur').checked = pause;
    document.documentElement.style.setProperty('--ui-scale', `${Number(scale) / 100}`);
    document.body.classList.toggle('reduced-effects', reduced);
    this.renderKeybindings();
  }

  private saveSettings(): void {
    const scale = element<HTMLInputElement>('ui-scale').value;
    const reduced = element<HTMLInputElement>('reduced-effects').checked;
    const pause = element<HTMLInputElement>('pause-on-blur').checked;
    localStorage.setItem('ultima-companhia-ui-scale', scale);
    localStorage.setItem('ultima-companhia-reduced-effects', String(reduced));
    localStorage.setItem('ultima-companhia-pause-blur', String(pause));
    document.documentElement.style.setProperty('--ui-scale', `${Number(scale) / 100}`);
    document.body.classList.toggle('reduced-effects', reduced);
  }

  private beginKeyCapture(button: HTMLButtonElement): void {
    const direction = button.dataset.bindDirection;
    if (!MOVEMENT_DIRECTIONS.includes(direction as MovementDirection)) {
      return;
    }
    this.rebindingDirection = direction as MovementDirection;
    this.renderKeybindings(
      `Pressione a nova tecla para ${this.directionLabel(this.rebindingDirection)}.`,
    );
  }

  private resetKeybindings(): void {
    this.rebindingDirection = undefined;
    this.movementBindings = { ...DEFAULT_MOVEMENT_BINDINGS };
    localStorage.setItem(
      MOVEMENT_BINDINGS_STORAGE_KEY,
      JSON.stringify(this.movementBindings),
    );
    this.renderKeybindings('Controles restaurados para WASD.');
  }

  private renderKeybindings(status = 'Setas e analógico continuam disponíveis.'): void {
    for (const direction of MOVEMENT_DIRECTIONS) {
      element<HTMLElement>(`keybinding-${direction}`).textContent =
        formatKeyboardCode(this.movementBindings[direction]);
    }
    document.querySelectorAll<HTMLButtonElement>('[data-bind-direction]').forEach(
      (button) => {
        button.dataset.capturing = String(
          button.dataset.bindDirection === this.rebindingDirection,
        );
      },
    );
    element<HTMLElement>('keybinding-status').textContent = status;
  }

  private directionLabel(direction: MovementDirection): string {
    return {
      up: 'cima',
      down: 'baixo',
      left: 'esquerda',
      right: 'direita',
    }[direction];
  }

  private showGameOver(detail: ResultDetail): void {
    this.setTouchControlsSuspended(true);
    this.pendingDefeatResult = detail;
    this.hud.hidden = true;
    this.upgradePanel.hidden = true;
    this.pausePanel.hidden = true;
    this.resultPanel.hidden = true;
    document.body.classList.remove('is-dying');
    document.body.classList.add('is-game-over');
    element<HTMLElement>('game-over-summary').textContent =
      `Você resistiu por ${this.formatTime(detail.elapsedSeconds)} e derrubou ` +
      `${detail.kills} inimigos antes de cair.`;
    this.gameOverPanel.hidden = false;
    element<HTMLButtonElement>('game-over-continue').focus();
  }

  private continueFromGameOver(): void {
    const detail = this.pendingDefeatResult;
    if (!detail) {
      return;
    }
    this.pendingDefeatResult = undefined;
    this.gameOverPanel.hidden = true;
    document.body.classList.remove('is-game-over');
    void this.handleResult(detail, false);
  }

  private showToast(message: string): void {
    this.toast.textContent = message;
    this.toast.hidden = false;
    window.setTimeout(() => {
      this.toast.hidden = true;
    }, 2_600);
  }

  private parseSeed(value: string): number | undefined {
    if (value.trim() === '') {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 && parsed <= 0x7fff_ffff
      ? parsed
      : undefined;
  }

  private formatTime(seconds: number): string {
    const rounded = Math.max(0, Math.ceil(seconds));
    return `${String(Math.floor(rounded / 60)).padStart(2, '0')}:${String(
      rounded % 60,
    ).padStart(2, '0')}`;
  }
}
