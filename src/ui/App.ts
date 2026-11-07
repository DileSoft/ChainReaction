import {
  BUILDINGS,
  RESOURCES,
  type BuildingDef,
  type BuildingId,
  type LevelDef,
  type ResourceId,
} from '../game/data';
import { LEVELS } from '../game/levels';
import { buildingIcon, resourceIcon } from '../game/icons';
import type { Game } from '../game/Game';
import type { Renderer } from '../game/Renderer';
import type { Sound } from '../game/Sound';
import type { Building, Tool } from '../game/types';
import { LevelMap } from './LevelMap';
import { loadProgress, recordResult, unlockAll, type Progress } from './progress';
import type { LevelEditor } from '../dev/levelEditor';

interface SheetButton {
  label: string;
  secondary?: boolean;
  action: () => void;
}

function must<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Элемент #${id} не найден`);
  return node as T;
}

const rubles = (value: number): string => `${Math.round(value).toLocaleString('ru-RU')} ₽`;

const clock = (ms: number): string => {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export class App {
  private readonly money = must<HTMLElement>('money');
  private readonly income = must<HTMLElement>('income');
  private readonly stability = must<HTMLElement>('stability');
  private readonly goalText = must<HTMLElement>('goal-text');
  private readonly goalBar = must<HTMLElement>('goal-bar');
  private readonly palette = must<HTMLElement>('palette');
  private readonly paletteHint = must<HTMLElement>('palette-hint');
  private readonly demolishBtn = must<HTMLButtonElement>('demolish-btn');
  private readonly tooltip = must<HTMLElement>('tooltip');
  private readonly buildInfo = must<HTMLElement>('build-info');
  private readonly boardWrap = must<HTMLElement>('board-wrap');
  private readonly toasts = must<HTMLElement>('toasts');
  private readonly modal = must<HTMLElement>('modal');
  private readonly sheet = must<HTMLElement>('sheet');
  private readonly mapBtn = must<HTMLButtonElement>('btn-map');

  private readonly pauseBtn = must<HTMLButtonElement>('btn-pause');
  private readonly speedBtn = must<HTMLButtonElement>('btn-speed');
  private readonly soundBtn = must<HTMLButtonElement>('btn-sound');
  private readonly missionBtn = must<HTMLButtonElement>('btn-mission');
  private readonly helpBtn = must<HTMLButtonElement>('btn-help');
  private readonly restartBtn = must<HTMLButtonElement>('btn-restart');

  private readonly progress: Progress = loadProgress();
  private readonly levelMap: LevelMap;

  private tool: Tool | null = null;
  private paletteTypes: BuildingId[] = [];
  /** Пауза, с которой игра ушла на просмотр миссии; null — миссия не открыта. */
  private missionResume: boolean | null = null;
  /** Dev-редактор уровней: грузится динамически и только в dev-сборке. */
  private editor: LevelEditor | null = null;
  /** Пауза, с которой игра ушла в редактор; null — редактор не открыт. */
  private editorResume: boolean | null = null;
  /** Играем черновик из редактора — результат не пишется в прогресс. */
  private testingLevel = false;

  constructor(
    private readonly game: Game,
    private readonly renderer: Renderer,
    private readonly sound: Sound,
  ) {
    this.levelMap = new LevelMap(
      must<HTMLElement>('levelmap'),
      must<HTMLElement>('map-body'),
      (index) => this.changeLevel(index),
    );

    this.initMapButton();
    this.initDevTools();
    this.rebuildPalette();
    this.bindEvents();
    this.showIntro();

    if (import.meta.env.DEV) {
      const reopen = sessionStorage.getItem('chain-reaction.editor.reopen') === '1';
      const requested = new URLSearchParams(window.location.search).has('editor');
      if (reopen) sessionStorage.removeItem('chain-reaction.editor.reopen');
      if (requested || reopen) void this.openEditor();
    }
  }

  /* ---------------------------------------------------------------- */
  /* уровни                                                            */
  /* ---------------------------------------------------------------- */

  private initMapButton(): void {
    this.updateLevelLabel();
    this.mapBtn.addEventListener('click', () => {
      this.levelMap.toggle(this.progress, this.game.levelIndex);
    });
  }

  private updateLevelLabel(): void {
    const level = this.game.level;
    this.mapBtn.textContent = `Ур. ${level.id} · ${level.name}`;
  }

  /** Кнопка «открыть всё» — только в dev-сборке. */
  private initDevTools(): void {
    if (!import.meta.env.DEV) return;

    const actions = document.querySelector('.map-actions');
    if (!actions) return;

    const editorButton = document.createElement('button');
    editorButton.className = 'map-unlock';
    editorButton.textContent = 'Редактор';
    editorButton.title = 'Dev: редактор уровней';
    editorButton.addEventListener('click', () => {
      this.levelMap.close();
      void this.openEditor();
    });
    actions.insertBefore(editorButton, actions.firstChild);

    const button = document.createElement('button');
    button.className = 'map-unlock';
    button.textContent = 'Открыть всё';
    button.title = 'Dev: открыть все уровни без звёзд';
    button.addEventListener('click', () => {
      unlockAll(this.progress, LEVELS.length);
      this.levelMap.open(this.progress, this.game.levelIndex);
      this.toast('Все уровни открыты', 'good');
    });

    actions.insertBefore(button, actions.firstChild);
  }

  private changeLevel(index: number): void {
    this.testingLevel = false;
    this.game.startLevel(index);

    this.renderer.clearEffects();
    this.clearTool();
    this.rebuildPalette();
    this.speedBtn.textContent = `${this.game.speed}×`;
    this.modal.classList.add('hidden');
    this.missionResume = null;
    this.levelMap.close();
    this.updateLevelLabel();
    this.updateHud();

    this.toast(`Уровень ${this.game.level.id}: ${this.game.level.name}`, 'good');
    this.showIntro();
  }

  /* ---------------------------------------------------------------- */
  /* dev: редактор уровней                                             */
  /* ---------------------------------------------------------------- */

  private async openEditor(): Promise<void> {
    if (!import.meta.env.DEV) return;

    if (this.editorResume === null) {
      this.editorResume = this.game.paused || !this.game.started;
      this.setPaused(true);
    }

    if (!this.editor) {
      const { LevelEditor } = await import('../dev/levelEditor');
      if (!this.editor) {
        this.editor = new LevelEditor(
          (level) => this.startTestLevel(level),
          () => this.closeEditor(),
        );
      }
    }

    this.levelMap.close();
    this.editor.open();
  }

  private closeEditor(): void {
    if (this.editorResume === null) return;
    const resume = this.editorResume;
    this.editorResume = null;
    this.setPaused(resume);
  }

  /** Запустить черновик из редактора: прогресс не пишется, «следующего» уровня нет. */
  private startTestLevel(level: LevelDef): void {
    this.editorResume = null;
    this.testingLevel = true;
    this.editor?.close();

    this.game.startLevelDef(level);
    this.renderer.clearEffects();
    this.clearTool();
    this.rebuildPalette();
    this.speedBtn.textContent = `${this.game.speed}×`;
    this.modal.classList.add('hidden');
    this.levelMap.close();
    this.missionResume = null;
    this.updateLevelLabel();
    this.updateHud();
    this.setPaused(false);

    this.toast('Тестовый уровень: прогресс не сохраняется', 'good');
  }

  /* ---------------------------------------------------------------- */
  /* палитра                                                           */
  /* ---------------------------------------------------------------- */

  private rebuildPalette(): void {
    this.paletteTypes = [...this.game.level.available];
    this.palette.innerHTML = '';
    this.paletteHint.textContent = `1 – ${this.paletteTypes.length}`;
    this.buildPalette();
  }

  private buildPalette(): void {
    this.paletteTypes.forEach((id, index) => {
      const def = BUILDINGS[id];
      const card = document.createElement('button');
      card.className = 'card';
      card.dataset.type = id;
      card.innerHTML = `
        <span class="ico" style="--c: ${def.accent}">${buildingIcon(id, 22)}</span>
        <span class="info">
          <span class="top"><b>${def.name}</b><em class="cost">${def.cost} ₽</em></span>
          <span class="rec">${this.recipeHtml(def)}</span>
        </span>
        <span class="kbd">${index + 1}</span>`;
      card.addEventListener('click', () => this.selectTool(id));
      this.bindHeldInfo(card, id);
      this.palette.appendChild(card);
    });
  }

  /** На тач-устройствах: пока палец держит карточку — показываем её паспорт. */
  private bindHeldInfo(card: HTMLButtonElement, id: BuildingId): void {
    const hide = (): void => this.buildInfo.classList.remove('show');

    card.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse') return;
      this.showBuildInfo(card, id);
    });
    card.addEventListener('pointerup', hide);
    card.addEventListener('pointercancel', hide);
    card.addEventListener('pointerleave', hide);
    card.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  private showBuildInfo(card: HTMLElement, id: BuildingId): void {
    const def = BUILDINGS[id];
    const rows: string[] = [];

    if (def.outCap > 0) {
      rows.push(`<div class="line"><span>Склад выхода</span><b>${def.outCap}</b></div>`);
    }
    if (def.restores) {
      rows.push(
        `<div class="line"><span>Возврат в шахту</span><b style="color:#6ee787">+${def.restores.amount} руды</b></div>`,
      );
    } else if (def.income > 0) {
      rows.push(`<div class="line"><span>Доход</span><b style="color:#6ee787">+${def.income} ₽/такт</b></div>`);
    } else {
      rows.push('<div class="line"><span>Темп</span><b>1 партия / такт</b></div>');
    }

    this.buildInfo.innerHTML =
      `<h4 style="color:${def.accent}"><span class="h-ico">${buildingIcon(id, 18)}</span>${def.name}</h4>` +
      `<div class="info-recipe">${this.recipeHtml(def)}</div>` +
      `<div class="line"><span>Цена</span><b>${def.cost} ₽</b></div>` +
      rows.join('');
    this.buildInfo.classList.add('show');

    // ставим над карточкой, но не выпускаем за экран
    const anchor = card.getBoundingClientRect();
    const width = this.buildInfo.offsetWidth;
    const height = this.buildInfo.offsetHeight;
    const left = Math.max(
      8,
      Math.min(window.innerWidth - width - 8, anchor.left + anchor.width / 2 - width / 2),
    );
    let top = anchor.top - height - 10;
    if (top < 8) top = anchor.bottom + 10;

    this.buildInfo.style.left = `${left}px`;
    this.buildInfo.style.top = `${top}px`;
  }

  private chip(resource: ResourceId, amount: number): string {
    return `<span class="chip" style="--c: ${RESOURCES[resource].color}">${resourceIcon(resource, 12)}${amount} ${RESOURCES[resource].name}</span>`;
  }

  private recipeHtml(def: BuildingDef): string {
    const inputs = Object.keys(def.input).map((key) => {
      const resource = key as ResourceId;
      return this.chip(resource, def.input[resource]!);
    });
    const outputs = Object.keys(def.output).map((key) => {
      const resource = key as ResourceId;
      return this.chip(resource, def.output[resource]!);
    });

    const left = inputs.length > 0 ? inputs.join('') : '<span style="opacity:.45">из воздуха</span>';

    let right: string;
    if (outputs.length > 0) {
      right = outputs.join('');
    } else if (def.restores) {
      right = `<span class="money-out">+${def.restores.amount} к залежам</span>`;
    } else {
      right = `<span class="money-out">${def.income} ₽</span>`;
    }

    return `${left}<span class="arrow">→</span>${right}`;
  }

  /* ---------------------------------------------------------------- */
  /* инструменты                                                       */
  /* ---------------------------------------------------------------- */

  private selectTool(tool: Tool): void {
    this.tool = this.tool === tool ? null : tool;
    this.renderer.tool = this.tool;
    this.hideTooltip();
    this.sound.unlock();
  }

  private clearTool(): void {
    this.tool = null;
    this.renderer.tool = null;
    this.hideTooltip();
  }

  private hideTooltip(): void {
    this.tooltip.classList.remove('show');
  }

  /* ---------------------------------------------------------------- */
  /* события                                                           */
  /* ---------------------------------------------------------------- */

  private bindEvents(): void {
    const canvas = must<HTMLCanvasElement>('board');

    canvas.addEventListener('pointermove', (event) => {
      const cell = this.renderer.cellFromPoint(event.clientX, event.clientY);
      this.renderer.hover = cell;

      if (!cell) {
        this.hideTooltip();
        return;
      }

      const building = this.game.at(cell.r, cell.c);
      if (!building) {
        this.hideTooltip();
        return;
      }

      this.renderTooltip(building);
      this.positionTooltip(cell.r, cell.c);
    });

    canvas.addEventListener('pointerleave', () => {
      this.renderer.hover = null;
      this.hideTooltip();
    });

    canvas.addEventListener('pointerdown', (event) => {
      const cell = this.renderer.cellFromPoint(event.clientX, event.clientY);
      if (!cell) return;

      this.sound.unlock();
      this.renderer.hover = cell;

      const existing = this.game.at(cell.r, cell.c);

      // демонтаж — единственный сценарий, который сносит здание
      if (event.button === 2 || this.tool === 'demolish') {
        this.hideTooltip();
        if (this.game.demolish(cell.r, cell.c)) this.renderer.clearEffects();
        return;
      }

      // по занятой клетке всегда показываем подсказку, даже в режиме строительства:
      // на тач-устройствах это единственный способ её увидеть
      if (existing) {
        this.renderTooltip(existing);
        this.positionTooltip(cell.r, cell.c);
        return;
      }

      this.hideTooltip();
      if (!this.tool) return;

      const result = this.game.place(this.tool, cell.r, cell.c);
      if (result !== 'ok') return;

      this.sound.build();
      // один инструмент — одна постройка: после установки режим снимается
      this.clearTool();
    });

    canvas.addEventListener('contextmenu', (event) => event.preventDefault());

    this.demolishBtn.addEventListener('click', () => this.selectTool('demolish'));
    this.pauseBtn.addEventListener('click', () => this.togglePause());
    this.speedBtn.addEventListener('click', () => {
      this.game.nextSpeed();
      this.speedBtn.textContent = `${this.game.speed}×`;
    });
    this.soundBtn.addEventListener('click', () => {
      this.sound.enabled = !this.sound.enabled;
      this.soundBtn.textContent = this.sound.enabled ? '🔊' : '🔇';
    });
    this.helpBtn.addEventListener('click', () => this.showHelp());
    this.missionBtn.addEventListener('click', () => this.showMission());
    this.restartBtn.addEventListener('click', () => {
      if (confirm('Начать уровень заново? Текущий завод будет уничтожен.')) this.restart();
    });

    window.addEventListener('keydown', (event) => {
      if (this.editor?.isOpen) return;
      if (event.code === 'Space') {
        event.preventDefault();
        this.togglePause();
        return;
      }
      if (event.key === 'Escape') {
        if (this.missionResume !== null) {
          this.closeMission();
          return;
        }
        this.clearTool();
        return;
      }
      if (event.key.toLowerCase() === 'x') {
        this.selectTool('demolish');
        return;
      }
      if (event.key.toLowerCase() === 'm') {
        if (this.missionResume !== null) return;
        this.levelMap.toggle(this.progress, this.game.levelIndex);
        return;
      }
      if (event.code === 'KeyI') {
        this.showMission();
        return;
      }
      const index = Number.parseInt(event.key, 10);
      if (index >= 1 && index <= this.paletteTypes.length) {
        this.selectTool(this.paletteTypes[index - 1]!);
      }
    });

    this.game.on((event) => {
      switch (event.kind) {
        case 'toast':
          this.toast(event.text, event.tone);
          break;
        case 'win':
          this.showWin();
          break;
        case 'gameover':
          this.showGameOver();
          break;
        default:
          break;
      }
    });
  }

  /* ---------------------------------------------------------------- */
  /* подсказка над клеткой                                             */
  /* ---------------------------------------------------------------- */

  private renderTooltip(building: Building): void {
    const def = BUILDINGS[building.type];
    const stabilityColor =
      building.stability > 60 ? '#3fb950' : building.stability > 30 ? '#d29922' : '#f85149';
    const outCap = building.outCap ?? def.outCap;

    const rows: string[] = [
      `<div class="line"><span>Стабильность</span><b style="color:${stabilityColor}">${Math.round(building.stability)}%</b></div>`,
    ];

    for (const key in def.input) {
      const resource = key as ResourceId;
      rows.push(
        `<div class="line"><span>${RESOURCES[resource].name}</span><b>${building.stock[resource] ?? 0} / ${def.input[resource]}</b></div>`,
      );
    }
    for (const key in def.output) {
      const resource = key as ResourceId;
      rows.push(
        `<div class="line"><span>${RESOURCES[resource].name}</span><b>${building.out[resource] ?? 0} / ${outCap}</b></div>`,
      );
    }
    if (def.income > 0) {
      rows.push(`<div class="line"><span>Доход</span><b style="color:#6ee787">+${def.income} ₽</b></div>`);
    }
    if (def.restores) {
      rows.push(
        `<div class="line"><span>Возврат в шахту</span><b style="color:#6ee787">+${def.restores.amount} руды</b></div>`,
      );
    }
    if (building.deposit !== undefined) {
      rows.push(
        `<div class="line"><span>Залежи</span><b>${Math.max(0, building.deposit)} / ${building.depositMax ?? 0}</b></div>`,
      );
      if (building.deposit <= 0) {
        rows.push('<div class="warn-line">⛔ Залежи истощены — нужен Рециклер</div>');
      }
    }
    if (building.warn === 'over') {
      rows.push('<div class="warn-line">⚠ Переизбыток — склад переполнен</div>');
    }
    if (building.warn === 'starve') {
      rows.push('<div class="warn-line">⚠ Нехватка сырья</div>');
    }

    this.tooltip.innerHTML = `<h4 style="color:${def.accent}"><span class="h-ico">${buildingIcon(building.type, 16)}</span>${def.name}</h4>${rows.join('')}`;
    this.tooltip.classList.add('show');
  }

  private positionTooltip(r: number, c: number): void {
    const cell = this.renderer.cellRect(r, c);
    const wrap = this.boardWrap.getBoundingClientRect();
    const tipW = this.tooltip.offsetWidth || 180;
    const tipH = this.tooltip.offsetHeight || 130;

    let left = cell.left - wrap.left + cell.size + 12;
    let top = cell.top - wrap.top + cell.size + 12;

    // не вылезаем за поле: при нехватке места переворачиваем подсказку
    if (left + tipW > wrap.width - 4) left = cell.left - wrap.left - tipW - 12;
    if (top + tipH > wrap.height - 4) top = cell.top - wrap.top - tipH - 12;

    this.tooltip.style.left = `${Math.max(4, Math.min(wrap.width - tipW - 4, left))}px`;
    this.tooltip.style.top = `${Math.max(4, Math.min(wrap.height - tipH - 4, top))}px`;
  }

  /* ---------------------------------------------------------------- */
  /* всплывающие сообщения                                             */
  /* ---------------------------------------------------------------- */

  toast(text: string, tone: 'info' | 'good' | 'bad' = 'info'): void {
    const el = document.createElement('div');
    el.className = `toast ${tone}`;
    el.textContent = text;
    this.toasts.appendChild(el);

    window.setTimeout(() => {
      el.classList.add('out');
      window.setTimeout(() => el.remove(), 400);
    }, 2600);

    while (this.toasts.children.length > 5) this.toasts.firstElementChild?.remove();
  }

  /* ---------------------------------------------------------------- */
  /* модальные окна                                                    */
  /* ---------------------------------------------------------------- */

  private openSheet(html: string, buttons: SheetButton[]): void {
    this.sheet.innerHTML = html;

    const row = document.createElement('div');
    row.className = 'sheet-actions';
    for (const spec of buttons) {
      const button = document.createElement('button');
      button.className = spec.secondary ? 'go secondary' : 'go';
      button.textContent = spec.label;
      button.addEventListener('click', () => {
        this.modal.classList.add('hidden');
        spec.action();
      });
      row.appendChild(button);
    }
    this.sheet.appendChild(row);

    this.modal.classList.remove('hidden');
  }

  showIntro(): void {
    const level = this.game.level;

    this.setPaused(this.game.started || this.game.paused);
    this.missionResume = null;

    this.openSheet(
      `${this.briefMarkup(level)}
       <p style="font-size:12.5px">Соседние клетки соединяются сами. Пробел — пауза, пока можно спокойно строить.</p>`,
      [
        {
          label: 'Начать стройку',
          action: () => {
            this.game.started = true;
            this.setPaused(false);
            this.sound.unlock();
          },
        },
      ],
    );
  }

  /** Текст брифа — общий для старта уровня и для просмотра миссии по ходу игры. */
  private briefMarkup(level: LevelDef): string {
    return `<div class="sub">Уровень ${level.id} · ${level.subtitle}</div>
       <h1>${level.name}</h1>
       <p>${level.brief}</p>
       <div class="rules">
         <div class="rule"><i>🔥</i><span>Не хватает сырья — завод <b>перегревается</b>.</span></div>
         <div class="rule"><i>📦</i><span>Продукцию не забирают, склад переполнен — завод <b>взрывается от давления</b>.</span></div>
         <div class="rule good"><i>🎯</i><span>Цель: заработать <b>${level.goal.toLocaleString('ru-RU')} ₽</b>. Стартовый капитал: <b>${rubles(level.startMoney)}</b>.</span></div>
       </div>`;
  }

  /** Перечитать описание миссии: игра встаёт на паузу и возвращается в прежнее состояние. */
  showMission(): void {
    if (!this.game.started) {
      this.showIntro();
      return;
    }
    if (this.game.over) return;

    const level = this.game.level;

    if (this.levelMap.isOpen) this.levelMap.close();

    // повторное открытие не должно «запоминать» собственную паузу
    if (this.missionResume === null) {
      this.missionResume = this.game.paused;
      this.setPaused(true);
    }

    const stats: string[] = [
      `<div><span>Заработано</span><b style="font-size:15px">${rubles(this.game.earned)} / ${rubles(level.goal)}</b></div>`,
      `<div><span>В игре</span><b style="font-size:15px">${clock(this.game.elapsedMs)}</b></div>`,
    ];

    if (level.timeLimit !== undefined) {
      const left = Math.max(0, level.timeLimit * 1000 - this.game.elapsedMs);
      stats.push(`<div><span>Осталось</span><b style="font-size:15px">${clock(left)}</b></div>`);
    }

    this.openSheet(
      `${this.briefMarkup(level)}
       <div class="stats-final">${stats.join('')}</div>
       ${level.parTime !== undefined ? `<p style="font-size:12px">Норматив на третью звезду — ${clock(level.parTime * 1000)}.</p>` : ''}
       ${level.noDemolish ? '<p style="font-size:12px">Снос на этом уровне запрещён: что построено — то и работает.</p>' : ''}`,
      [{ label: 'Продолжить', action: () => this.closeMission() }],
    );
  }

  private closeMission(): void {
    if (this.missionResume === null) return;
    const resume = this.missionResume;
    this.missionResume = null;
    this.modal.classList.add('hidden');
    this.setPaused(resume);
  }

  private showHelp(): void {
    this.openSheet(
      `<div class="sub">Правила</div>
       <h1>Держите баланс</h1>
       <div class="rules">
         <div class="rule"><i>🔗</i><span><b>Заводы соединяются автоматически</b> с соседними клетками (сверху, снизу, слева, справа). Ничего прокладывать не нужно.</span></div>
         <div class="rule"><i>⬇️</i><span>Завод <b>сам тянет</b> нужное сырьё у соседей и складывает продукцию на выход.</span></div>
         <div class="rule bad"><i>❄️</i><span><b>Нехватка:</b> сырья нет — шкала стабильности падает.</span></div>
         <div class="rule bad"><i>📈</i><span><b>Переизбыток:</b> выход забит, продукцию никто не забирает — стабильность падает ещё быстрее.</span></div>
         <div class="rule"><i>💥</i><span>На нуле стабильности завод <b>взрывается</b> и исчезает. Деньги за него не возвращаются.</span></div>
         <div class="rule good"><i>💰</i><span><b>Склад</b> и <b>Порт</b> покупают продукцию — это ваш доход и цель.</span></div>
       </div>
       <p style="font-size:12.5px;opacity:.8">Совет: пропорции важны. Сборке нужно 1 Каркас + 2 Шестерни за такт, а Сварке — 2 Пластины.</p>`,
      [{ label: 'Понятно', action: () => undefined }],
    );
  }

  /** Звёзды: 1 — пройдено, 2 — без взрывов, 3 — ещё и в норматив. */
  private starsFor(): number {
    if (this.game.explosions > 0) return 1;
    const par = this.game.level.parTime;
    if (par !== undefined && this.game.elapsedMs > par * 1000) return 2;
    return 3;
  }

  private showWin(): void {
    const level = this.game.level;
    const stars = this.starsFor();
    const testing = this.testingLevel;
    if (!testing) recordResult(this.progress, level.id, stars, this.game.elapsedMs);

    this.setPaused(true);

    const hasNext = !testing && this.game.levelIndex + 1 < LEVELS.length;
    const buttons: SheetButton[] = [];

    if (testing) {
      buttons.push({
        label: 'Вернуться в редактор',
        action: () => void this.openEditor(),
      });
      buttons.push({
        label: 'Заново',
        secondary: true,
        action: () => this.restart(),
      });
    } else {
      if (hasNext) {
        buttons.push({
          label: 'Следующий уровень',
          action: () => this.changeLevel(this.game.levelIndex + 1),
        });
      }
      buttons.push({
        label: 'Карта',
        secondary: true,
        action: () => this.levelMap.open(this.progress, this.game.levelIndex),
      });
      buttons.push({
        label: 'Остаться',
        secondary: true,
        action: () => this.setPaused(false),
      });
    }

    const starMarkup =
      '★'.repeat(stars) + '☆'.repeat(3 - stars);

    this.openSheet(
      `<div class="sub">${testing ? 'Тестовый уровень · цель выполнена' : `Уровень ${level.id} пройден`}</div>
       <h1>${level.name} — готово!</h1>
       <div class="win-stars">${starMarkup}</div>
       <p>Цель выполнена. <span class="dim">${this.starHint(stars)}</span></p>
       <div class="stats-final">
         <div><span>Заработано</span><b>${rubles(this.game.earned)}</b></div>
         <div><span>Время</span><b>${clock(this.game.elapsedMs)}</b></div>
       </div>`,
      buttons,
    );
  }

  private starHint(stars: number): string {
    if (stars === 3) return 'Идеально: ни одного взрыва и в норматив.';
    if (stars === 2) return 'Без взрывов. Уложитесь в норматив — будет третья звезда.';
    return 'Без взрывов — вторая звезда, в норматив — третья.';
  }

  private showGameOver(): void {
    const reason = this.game.overReason;
    const depleted = reason === 'depleted';
    const timeout = reason === 'timeout';

    const title = timeout ? 'Смена окончена' : depleted ? 'Шахта иссякла' : 'Завод обанкротился';
    const text = timeout
      ? 'Время вышло, а цель ещё не набрана. Попробуйте короче: быстрый доход, потом глубина.'
      : depleted
        ? 'Залежи рудника закончились, а замкнуть цикл не успели. Рециклер вернул бы слитки в шахту — но строить его нужно было раньше.'
        : 'Денег не хватает даже на самый дешёвый завод, а доходов нет. Цепочка разорвана.';

    this.openSheet(
      `<div class="sub bad">Производство остановлено</div>
       <h1>${title}</h1>
       <p>${text}</p>
       <div class="stats-final">
         <div><span>Заработано</span><b>${rubles(this.game.earned)}</b></div>
         <div><span>Заводов</span><b>${this.game.buildings().length}</b></div>
       </div>`,
      [
        { label: 'Ещё раз', action: () => this.restart() },
        this.testingLevel
          ? { label: 'Вернуться в редактор', secondary: true, action: () => void this.openEditor() }
          : {
              label: 'Карта',
              secondary: true,
              action: () => this.levelMap.open(this.progress, this.game.levelIndex),
            },
      ],
    );
  }

  private restart(): void {
    this.game.restart();
    this.renderer.clearEffects();
    this.clearTool();
    this.missionResume = null;
    this.setPaused(false);
    this.speedBtn.textContent = '1×';
    this.updateHud();
    this.toast('Уровень начат заново', 'good');
  }

  /* ---------------------------------------------------------------- */
  /* шапка                                                             */
  /* ---------------------------------------------------------------- */

  private setPaused(value: boolean): void {
    this.game.paused = value;
    this.pauseBtn.textContent = value ? '▶' : '⏸';
    this.pauseBtn.classList.toggle('on', value);
  }

  private togglePause(): void {
    if (!this.game.started || this.game.over) return;
    if (this.missionResume !== null) return;
    this.setPaused(!this.game.paused);
  }

  private updateHud(): void {
    const level = this.game.level;

    this.money.textContent = rubles(this.game.money);
    this.income.textContent = `${Math.round(this.game.incomePerSecond)} ₽/с`;

    const hasBuildings = this.game.buildings().length > 0;
    const stability = this.game.averageStability;
    this.stability.textContent = hasBuildings ? `${Math.round(stability)}%` : '—';
    this.stability.style.color =
      stability > 60 ? 'var(--good)' : stability > 30 ? 'var(--warn)' : 'var(--bad)';

    const earned = Math.min(this.game.earned, level.goal);
    let goalLine = `${earned.toLocaleString('ru-RU')} / ${level.goal.toLocaleString('ru-RU')} ₽`;

    if (level.timeLimit !== undefined) {
      const left = level.timeLimit * 1000 - this.game.elapsedMs;
      goalLine += ` · ⏱ ${clock(Math.max(0, left))}`;
      this.goalText.classList.toggle('urgent', left < 20000);
    } else {
      this.goalText.classList.remove('urgent');
    }

    this.goalText.textContent = goalLine;
    this.goalBar.style.width = `${Math.min(100, (this.game.earned / level.goal) * 100)}%`;

    for (const card of this.palette.children) {
      const element = card as HTMLElement;
      const def = BUILDINGS[element.dataset.type as BuildingId];
      element.classList.toggle('poor', this.game.money < def.cost);
      element.classList.toggle('sel', this.tool === element.dataset.type);
    }
    this.demolishBtn.classList.toggle('sel', this.tool === 'demolish');
  }

  /* ---------------------------------------------------------------- */
  /* цикл                                                              */
  /* ---------------------------------------------------------------- */

  start(): void {
    let last = performance.now();
    let hudAcc = 0;

    const frame = (now: number): void => {
      const dt = Math.min(120, now - last);
      last = now;

      this.game.advance(dt);
      this.renderer.update(dt);
      this.renderer.draw(now);

      hudAcc += dt;
      if (hudAcc >= 120) {
        hudAcc = 0;
        this.updateHud();
      }

      requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  }
}
