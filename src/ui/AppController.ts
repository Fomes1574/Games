import type Phaser from 'phaser';

import type { UpgradeId } from '../data/content';
import {
  GAME_EVENTS,
  type HudDetail,
  type ResultDetail,
  type UpgradeDetail,
} from '../game/events';
import type { ExpeditionScene } from '../game/scenes/ExpeditionScene';
import { withChecksum, type GameSave } from '../domain/saving/saveModel';
import { SaveService } from '../services/storage/SaveService';

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
  private lastErrorReport = '';
  private readonly service = new SaveService();
  private readonly landing = element<HTMLElement>('landing');
  private readonly statusCard = element<HTMLElement>('status-card');
  private readonly selection = element<HTMLElement>('selection-panel');
  private readonly hud = element<HTMLElement>('hud');
  private readonly upgradePanel = element<HTMLElement>('upgrade-panel');
  private readonly pausePanel = element<HTMLElement>('pause-panel');
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
    document.body.classList.add('is-expedition');
    this.game.scene.stop('boot');
    this.game.scene.start('expedition', {
      seed: selectedSeed,
      forgeLevel: this.save.guild.forgeLevel,
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
      const button = document.createElement('button');
      button.className = `upgrade-card upgrade-${upgrade.kind}`;
      button.type = 'button';
      button.dataset.upgradeId = upgrade.id;

      const number = document.createElement('span');
      number.className = 'choice-number';
      number.textContent = String(index + 1);
      const kind = document.createElement('small');
      kind.textContent =
        upgrade.kind === 'weapon'
          ? 'Arma'
          : upgrade.kind === 'passive'
            ? 'Passiva'
            : 'Evolução';
      const title = document.createElement('strong');
      title.textContent = upgrade.name;
      const description = document.createElement('span');
      description.textContent = upgrade.description;
      const detailText = document.createElement('em');
      detailText.textContent = upgrade.detail;
      button.append(number, kind, title, description, detailText);
      button.addEventListener('click', () => this.selectUpgrade(upgrade.id));
      choices.append(button);
    });
    element<HTMLElement>('pending-levels').textContent =
      detail.pendingLevels > 1
        ? `${detail.pendingLevels} escolhas aguardam sua decisão.`
        : 'A simulação está pausada enquanto você decide.';
    this.upgradePanel.hidden = false;
    choices.querySelector<HTMLButtonElement>('button')?.focus();
  }

  private selectUpgrade(id: UpgradeId): void {
    this.upgradePanel.hidden = true;
    this.getExpeditionScene()?.chooseUpgrade(id);
  }

  private async handleResult(detail: ResultDetail): Promise<void> {
    this.hud.hidden = true;
    this.upgradePanel.hidden = true;
    this.pausePanel.hidden = true;
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
    this.hideAllPanels();
    document.body.classList.remove('is-expedition');
    this.landing.hidden = false;
    this.statusCard.hidden = false;
  }

  private showSelection(): void {
    this.hideAllPanels();
    document.body.classList.remove('is-expedition');
    this.landing.hidden = true;
    this.statusCard.hidden = true;
    this.selection.hidden = false;
  }

  private openGuild(): void {
    this.hideAllPanels();
    document.body.classList.remove('is-expedition');
    this.landing.hidden = true;
    this.statusCard.hidden = true;
    this.guildPanel.hidden = false;
    this.renderGuild();
  }

  private openSettings(): void {
    this.hideAllPanels();
    document.body.classList.remove('is-expedition');
    this.landing.hidden = true;
    this.statusCard.hidden = true;
    this.settingsPanel.hidden = false;
  }

  private hideAllPanels(): void {
    this.selection.hidden = true;
    this.hud.hidden = true;
    this.upgradePanel.hidden = true;
    this.pausePanel.hidden = true;
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
    element<HTMLInputElement>('ui-scale').value = scale;
    element<HTMLInputElement>('reduced-effects').checked = reduced;
    element<HTMLInputElement>('pause-on-blur').checked = pause;
    document.documentElement.style.setProperty('--ui-scale', `${Number(scale) / 100}`);
    document.body.classList.toggle('reduced-effects', reduced);
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
