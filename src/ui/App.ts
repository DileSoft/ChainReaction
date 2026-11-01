import {
  BUILDINGS,
  BUILD_ORDER,
  GOAL,
  RESOURCES,
  START_MONEY,
  type BuildingId,
  type ResourceId,
} from '../game/data';
import type { Game } from '../game/Game';
import type { Renderer } from '../game/Renderer';
import type { Sound } from '../game/Sound';
import type { Building, Tool } from '../game/types';

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
  private readonly demolishBtn = must<HTMLButtonElement>('demolish-btn');
  private readonly tooltip = must<HTMLElement>('tooltip');
  private readonly boardWrap = must<HTMLElement>('board-wrap');
  private readonly toasts = must<HTMLElement>('toasts');
  private readonly modal = must<HTMLElement>('modal');
  private readonly sheet = must<HTMLElement>('sheet');

  private readonly pauseBtn = must<HTMLButtonElement>('btn-pause');
  private readonly speedBtn = must<HTMLButtonElement>('btn-speed');
  private readonly soundBtn = must<HTMLButtonElement>('btn-sound');
  private readonly helpBtn = must<HTMLButtonElement>('btn-help');
  private readonly restartBtn = must<HTMLButtonElement>('btn-restart');

  private tool: Tool | null = null;

  constructor(
    private readonly game: Game,
    private readonly renderer: Renderer,
    private readonly sound: Sound,
  ) {
    this.buildPalette();
    this.bindEvents();
    this.showIntro();
  }

  /* ---------------------------------------------------------------- */
  /* палитра                                                           */
  /* ---------------------------------------------------------------- */

  private buildPalette(): void {
    BUILD_ORDER.forEach((id, index) => {
      const def = BUILDINGS[id];
      const card = document.createElement('button');
      card.className = 'card';
      card.dataset.type = id;
      card.innerHTML = `
        <span class="ico" style="--c: ${def.accent}">${def.icon}</span>
        <span class="info">
          <span class="top"><b>${def.name}</b><em class="cost">${def.cost} ₽</em></span>
          <span class="rec">${this.recipeHtml(def.input, def.output, def.income)}</span>
        </span>
        <span class="kbd">${index + 1}</span>`;
      card.addEventListener('click', () => this.selectTool(id));
      this.palette.appendChild(card);
    });
  }

  private chip(resource: ResourceId, amount: number): string {
    return `<span class="chip" style="--c: ${RESOURCES[resource].color}">${amount} ${RESOURCES[resource].name}</span>`;
  }

  private recipeHtml(
    input: Partial<Record<ResourceId, number>>,
    output: Partial<Record<ResourceId, number>>,
    income: number,
  ): string {
    const inputs = Object.keys(input).map((key) => {
      const resource = key as ResourceId;
      return this.chip(resource, input[resource]!);
    });
    const outputs = Object.keys(output).map((key) => {
      const resource = key as ResourceId;
      return this.chip(resource, output[resource]!);
    });

    const left = inputs.length > 0 ? inputs.join('') : '<span style="opacity:.45">из воздуха</span>';
    const right = outputs.length > 0 ? outputs.join('') : `<span class="money-out">${income} ₽</span>`;
    return `${left}<span class="arrow">→</span>${right}`;
  }

  /* ---------------------------------------------------------------- */
  /* инструменты                                                       */
  /* ---------------------------------------------------------------- */

  private selectTool(tool: Tool): void {
    this.tool = this.tool === tool ? null : tool;
    this.renderer.tool = this.tool;
    this.sound.unlock();
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
        this.tooltip.classList.remove('show');
        return;
      }

      const building = this.game.at(cell.r, cell.c);
      if (!building) {
        this.tooltip.classList.remove('show');
        return;
      }

      this.renderTooltip(building);
      this.positionTooltip(cell.r, cell.c);
    });

    canvas.addEventListener('pointerleave', () => {
      this.renderer.hover = null;
      this.tooltip.classList.remove('show');
    });

    canvas.addEventListener('pointerdown', (event) => {
      const cell = this.renderer.cellFromPoint(event.clientX, event.clientY);
      if (!cell) return;
      this.sound.unlock();

      if (event.button === 2 || this.tool === 'demolish') {
        if (this.game.demolish(cell.r, cell.c)) this.renderer.clearEffects();
        return;
      }

      if (!this.tool) return;
      const result = this.game.place(this.tool, cell.r, cell.c);
      if (result === 'ok') this.sound.build();
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
      if (confirm('Начать заново? Текущий завод будет уничтожен.')) this.restart();
    });

    window.addEventListener('keydown', (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
        this.togglePause();
        return;
      }
      if (event.key === 'Escape') {
        this.tool = null;
        this.renderer.tool = null;
        return;
      }
      if (event.key.toLowerCase() === 'x') {
        this.selectTool('demolish');
        return;
      }
      const index = Number.parseInt(event.key, 10);
      if (index >= 1 && index <= BUILD_ORDER.length) {
        this.selectTool(BUILD_ORDER[index - 1]!);
      }
    });

    this.game.on((event) => {
      switch (event.kind) {
        case 'toast':
          this.toast(event.text, event.tone);
          break;
        case 'win':
          this.toast('🏆 Цель достигнута! Производство работает как часы.', 'good');
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
        `<div class="line"><span>${RESOURCES[resource].name}</span><b>${building.out[resource] ?? 0} / ${def.outCap}</b></div>`,
      );
    }
    if (def.income > 0) {
      rows.push(`<div class="line"><span>Доход</span><b style="color:#6ee787">+${def.income} ₽</b></div>`);
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
    const left = cell.left - wrap.left + cell.size + 12;
    const top = cell.top - wrap.top + cell.size + 12;

    this.tooltip.style.left = `${Math.min(wrap.width - 190, Math.max(4, left))}px`;
    this.tooltip.style.top = `${Math.min(wrap.height - 130, Math.max(4, top))}px`;
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

  private openSheet(html: string, onClose?: () => void): void {
    this.sheet.innerHTML = html;
    this.modal.classList.remove('hidden');
    const button = this.sheet.querySelector<HTMLButtonElement>('.go');
    button?.addEventListener('click', () => {
      this.modal.classList.add('hidden');
      onClose?.();
    });
  }

  showIntro(): void {
    this.openSheet(
      `<div class="sub">Симулятор производственных цепочек</div>
       <h1>Цепная реакция</h1>
       <p>Стройте заводы, которые производят ресурсы друг для друга. Завод живёт только тогда, когда сырьё приходит ровно в нужном количестве.</p>
       <div class="rules">
         <div class="rule"><i>🔥</i><span>Не хватает сырья — завод <b>перегревается</b>.</span></div>
         <div class="rule"><i>📦</i><span>Продукцию не забирают, склад переполнен — завод <b>взрывается от давления</b>.</span></div>
         <div class="rule good"><i>🎯</i><span>Цель: заработать <b>${GOAL.toLocaleString('ru-RU')} ₽</b> на складах и в порту.</span></div>
       </div>
       <p style="font-size:12.5px">Стартовый капитал: <b>${rubles(START_MONEY)}</b>. Пробел — пауза, пока можно спокойно строить.</p>
       <button class="go">Начать стройку</button>`,
      () => {
        this.game.started = true;
        this.sound.unlock();
      },
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
       <p style="font-size:12.5px;opacity:.8">Совет: пропорции важны. Сборке нужно 1 Каркас + 2 Шестерни за такт, а Сварке — 2 Пластины.</p>
       <button class="go">Понятно</button>`,
    );
  }

  private showGameOver(): void {
    this.openSheet(
      `<div class="sub bad">Производство остановлено</div>
       <h1>Завод обанкротился</h1>
       <p>Денег не хватает даже на самый дешёвый завод, а доходов нет. Цепочка разорвана.</p>
       <div class="stats-final">
         <div><span>Заработано</span><b>${rubles(this.game.earned)}</b></div>
         <div><span>Заводов</span><b>${this.game.buildings().length}</b></div>
       </div>
       <button class="go">Начать заново</button>`,
      () => this.restart(),
    );
  }

  private restart(): void {
    this.game.reset();
    this.renderer.clearEffects();
    this.renderer.tool = null;
    this.tool = null;
    this.pauseBtn.textContent = '⏸';
    this.pauseBtn.classList.remove('on');
    this.speedBtn.textContent = '1×';
    this.toast('Новая стройка начата', 'good');
  }

  /* ---------------------------------------------------------------- */
  /* шапка                                                             */
  /* ---------------------------------------------------------------- */

  private togglePause(): void {
    this.game.togglePause();
    this.pauseBtn.textContent = this.game.paused ? '▶' : '⏸';
    this.pauseBtn.classList.toggle('on', this.game.paused);
  }

  private updateHud(): void {
    this.money.textContent = rubles(this.game.money);
    this.income.textContent = `${Math.round(this.game.incomePerSecond)} ₽/с`;

    const hasBuildings = this.game.buildings().length > 0;
    const stability = this.game.averageStability;
    this.stability.textContent = hasBuildings ? `${Math.round(stability)}%` : '—';
    this.stability.style.color =
      stability > 60 ? 'var(--good)' : stability > 30 ? 'var(--warn)' : 'var(--bad)';

    const earned = Math.min(this.game.earned, GOAL);
    this.goalText.textContent = `${earned.toLocaleString('ru-RU')} / ${GOAL.toLocaleString('ru-RU')} ₽`;
    this.goalBar.style.width = `${Math.min(100, (this.game.earned / GOAL) * 100)}%`;

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
