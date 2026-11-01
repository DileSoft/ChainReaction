import {
  BUILDINGS,
  LEVELS,
  RESOURCES,
  type BuildingDef,
  type BuildingId,
  type ResourceId,
} from '../game/data';
import type { Game } from '../game/Game';
import type { Renderer } from '../game/Renderer';
import type { Sound } from '../game/Sound';
import type { Building, Tool } from '../game/types';

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
  private readonly levelSelect = must<HTMLSelectElement>('level-select');

  private readonly pauseBtn = must<HTMLButtonElement>('btn-pause');
  private readonly speedBtn = must<HTMLButtonElement>('btn-speed');
  private readonly soundBtn = must<HTMLButtonElement>('btn-sound');
  private readonly helpBtn = must<HTMLButtonElement>('btn-help');
  private readonly restartBtn = must<HTMLButtonElement>('btn-restart');

  private tool: Tool | null = null;
  private paletteTypes: BuildingId[] = [];

  constructor(
    private readonly game: Game,
    private readonly renderer: Renderer,
    private readonly sound: Sound,
  ) {
    this.initLevelSelect();
    this.rebuildPalette();
    this.bindEvents();
    this.showIntro();
  }

  /* ---------------------------------------------------------------- */
  /* уровни                                                            */
  /* ---------------------------------------------------------------- */

  private initLevelSelect(): void {
    this.levelSelect.innerHTML = LEVELS.map(
      (level, index) =>
        `<option value="${index}">Ур. ${index + 1} · ${level.name}</option>`,
    ).join('');
    this.levelSelect.value = String(this.game.levelIndex);
    this.levelSelect.addEventListener('change', () => {
      this.changeLevel(Number(this.levelSelect.value));
    });
  }

  private changeLevel(index: number): void {
    this.game.startLevel(index);
    this.levelSelect.value = String(this.game.levelIndex);

    this.renderer.clearEffects();
    this.clearTool();
    this.rebuildPalette();
    this.speedBtn.textContent = `${this.game.speed}×`;
    this.modal.classList.add('hidden');
    this.updateHud();

    this.toast(`Уровень ${index + 1}: ${this.game.level.name}`, 'good');
    this.showIntro();
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
        <span class="ico" style="--c: ${def.accent}">${def.icon}</span>
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
      `<h4 style="color:${def.accent}">${def.icon} ${def.name}</h4>` +
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
    return `<span class="chip" style="--c: ${RESOURCES[resource].color}">${amount} ${RESOURCES[resource].name}</span>`;
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
    this.restartBtn.addEventListener('click', () => {
      if (confirm('Начать уровень заново? Текущий завод будет уничтожен.')) this.restart();
    });

    window.addEventListener('keydown', (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
        this.togglePause();
        return;
      }
      if (event.key === 'Escape') {
        this.clearTool();
        return;
      }
      if (event.key.toLowerCase() === 'x') {
        this.selectTool('demolish');
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

    this.tooltip.innerHTML = `<h4 style="color:${def.accent}">${def.icon} ${def.name}</h4>${rows.join('')}`;
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
    const index = this.game.levelIndex;

    this.setPaused(this.game.started || this.game.paused);

    this.openSheet(
      `<div class="sub">Уровень ${index + 1} · ${level.subtitle}</div>
       <h1>${level.name}</h1>
       <p>${level.brief}</p>
       <div class="rules">
         <div class="rule"><i>🔥</i><span>Не хватает сырья — завод <b>перегревается</b>.</span></div>
         <div class="rule"><i>📦</i><span>Продукцию не забирают, склад переполнен — завод <b>взрывается от давления</b>.</span></div>
         <div class="rule good"><i>🎯</i><span>Цель: заработать <b>${level.goal.toLocaleString('ru-RU')} ₽</b>. Стартовый капитал: <b>${rubles(level.startMoney)}</b>.</span></div>
       </div>
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

  private showWin(): void {
    const level = this.game.level;
    const hasNext = this.game.levelIndex + 1 < LEVELS.length;

    this.setPaused(true);

    const buttons: SheetButton[] = [];
    if (hasNext) {
      buttons.push({
        label: 'Следующий уровень',
        action: () => this.changeLevel(this.game.levelIndex + 1),
      });
    } else {
      buttons.push({ label: 'Начать заново', action: () => this.restart() });
    }
    buttons.push({
      label: 'Остаться',
      secondary: true,
      action: () => this.setPaused(false),
    });

    this.openSheet(
      `<div class="sub">Уровень ${this.game.levelIndex + 1} пройден</div>
       <h1>${level.name} — готово!</h1>
       <p>Цель выполнена: производство держится, стабильность под контролем.</p>
       <div class="stats-final">
         <div><span>Заработано</span><b>${rubles(this.game.earned)}</b></div>
         <div><span>Заводов</span><b>${this.game.buildings().length}</b></div>
       </div>`,
      buttons,
    );
  }

  private showGameOver(): void {
    const depleted = this.game.overReason === 'depleted';

    this.openSheet(
      `<div class="sub bad">Производство остановлено</div>
       <h1>${depleted ? 'Шахта иссякла' : 'Завод обанкротился'}</h1>
       <p>${
         depleted
           ? 'Залежи рудника закончились, а замкнуть цикл не успели. Рециклер вернул бы слитки в шахту — но строить его нужно было раньше.'
           : 'Денег не хватает даже на самый дешёвый завод, а доходов нет. Цепочка разорвана.'
       }</p>
       <div class="stats-final">
         <div><span>Заработано</span><b>${rubles(this.game.earned)}</b></div>
         <div><span>Заводов</span><b>${this.game.buildings().length}</b></div>
       </div>`,
      [{ label: 'Начать заново', action: () => this.restart() }],
    );
  }

  private restart(): void {
    this.game.restart();
    this.renderer.clearEffects();
    this.clearTool();
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
    this.goalText.textContent = `${earned.toLocaleString('ru-RU')} / ${level.goal.toLocaleString('ru-RU')} ₽`;
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
