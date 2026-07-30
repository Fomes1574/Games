import type Phaser from 'phaser';

import type { UpgradeId } from '../data/content';
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
import {
  GAME_EVENTS,
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
  private lastErrorReport = '';
  private readonly service = new SaveService();
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
    this.loadSettings();
    this.save = await this.service.load();
    this.renderGuild();
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
      forgeLevel: this.save.guild.forgeLevel,
      movementBindings: { ...this.movementBindings },
      reducedEffects: element<HTMLInputElement>('reduced-effects').checked,
    });
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
    element<HTMLButtonElement>('guild-close').addEventListener('click', () =>
      this.showHome(),
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
    element<HTMLButtonElement>('forge-upgrade').addEventListener('click', () => {
      void this.upgradeForge();
    });
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
      this.renderUpgrade((event as CustomEvent<UpgradeDetail>).detail);
    });
    window.addEventListener(GAME_EVENTS.pause, (event) => {
      const detail = (event as CustomEvent<{ paused: boolean }>).detail;
      this.pausePanel.hidden = !detail.paused;
    });
    window.addEventListener(GAME_EVENTS.death, () => {
      this.hud.hidden = true;
      this.upgradePanel.hidden = true;
      this.pausePanel.hidden = true;
      document.body.classList.add('is-dying');
    });
    window.addEventListener(GAME_EVENTS.result, (event) => {
      void this.handleResult((event as CustomEvent<ResultDetail>).detail);
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
      choices.append(button);
    });
    element<HTMLElement>('pending-levels').textContent =
      detail.pendingLevels > 1
        ? `${detail.pendingLevels} escolhas restantes`
        : '';
    this.upgradePanel.hidden = false;
    choices.querySelector<HTMLButtonElement>('button')?.focus();
  }

  private selectUpgrade(id: UpgradeId): void {
    this.upgradePanel.hidden = true;
    this.getExpeditionScene()?.chooseUpgrade(id);
  }

  private async handleResult(
    detail: ResultDetail,
    showDefeatIntro = true,
  ): Promise<void> {
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
        ? 'O aventureiro retornou com o contrato cumprido e brasas para a forja.'
        : 'Nem tudo foi perdido: as brasas recuperadas chegaram à companhia.';
    element<HTMLElement>('result-time').textContent = this.formatTime(
      detail.elapsedSeconds,
    );
    element<HTMLElement>('result-kills').textContent = String(detail.kills);
    element<HTMLElement>('result-level').textContent = String(detail.level);
    element<HTMLElement>('result-embers').textContent = `+${detail.embers}`;
    this.resultPanel.hidden = false;

    if (this.save) {
      const current = this.save;
      this.save = withChecksum({
        ...current,
        updatedAt: new Date().toISOString(),
        guild: {
          ...current.guild,
          embers: current.guild.embers + detail.embers,
          expeditions: current.guild.expeditions + 1,
          victories: current.guild.victories + Number(detail.outcome === 'victory'),
        },
        statistics: {
          enemiesDefeated: current.statistics.enemiesDefeated + detail.kills,
          longestSurvivalSeconds: Math.max(
            current.statistics.longestSurvivalSeconds,
            Math.floor(detail.elapsedSeconds),
          ),
        },
      });
      await this.service.save(this.save);
      this.renderGuild();
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
    this.selection.hidden = true;
    this.hud.hidden = true;
    this.upgradePanel.hidden = true;
    this.pausePanel.hidden = true;
    this.gameOverPanel.hidden = true;
    this.resultPanel.hidden = true;
    this.guildPanel.hidden = true;
    this.settingsPanel.hidden = true;
  }

  private restartBootScene(): void {
    this.game.scene.stop('expedition');
    this.game.scene.stop('boot');
    this.game.scene.start('boot');
  }

  private renderGuild(): void {
    if (!this.save) {
      return;
    }
    const level = this.save.guild.forgeLevel;
    const cost = 60 * (level + 1);
    element<HTMLElement>('guild-embers').textContent = String(this.save.guild.embers);
    element<HTMLElement>('forge-level').textContent = `Nível ${level} / 5`;
    const upgrade = element<HTMLButtonElement>('forge-upgrade');
    upgrade.textContent = level >= 5 ? 'Nível máximo' : `Melhorar · ${cost} brasas`;
    upgrade.disabled = level >= 5 || this.save.guild.embers < cost;
  }

  private async upgradeForge(): Promise<void> {
    if (!this.save) {
      return;
    }
    const level = this.save.guild.forgeLevel;
    const cost = 60 * (level + 1);
    if (level >= 5 || this.save.guild.embers < cost) {
      this.showToast('Brasas insuficientes ou nível máximo alcançado.');
      return;
    }
    const current = this.save;
    this.save = withChecksum({
      ...current,
      updatedAt: new Date().toISOString(),
      guild: {
        ...current.guild,
        embers: current.guild.embers - cost,
        forgeLevel: current.guild.forgeLevel + 1,
      },
    });
    await this.service.save(this.save);
    this.renderGuild();
    this.showToast('A forja foi fortalecida para futuras expedições.');
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

    if (!this.upgradePanel.hidden && ['1', '2', '3'].includes(event.key)) {
      const buttons = [
        ...element<HTMLElement>('upgrade-choices').querySelectorAll<HTMLButtonElement>(
          'button',
        ),
      ];
      buttons[Number(event.key) - 1]?.click();
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
