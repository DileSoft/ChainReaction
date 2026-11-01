import {
  BUILDINGS,
  COLS,
  GOAL,
  MIN_COST,
  REFUND_RATE,
  ROWS,
  START_MONEY,
  TICK_MS,
  type BuildingId,
  type ResourceId,
} from './data';
import type { Building, GameEvent, PlaceResult } from './types';

/** Правила, по которым живёт завод. */
const PRODUCE_HEAL = 12;
const STARVE_DAMAGE = 4;
const OVERFLOW_DAMAGE = 5;
const BANKRUPT_AFTER_MS = 10_000;

const idx = (r: number, c: number): number => r * COLS + c;

function shuffle<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
}

/**
 * Чистая модель игры: сетка, деньги, такты.
 * Ничего не знает про DOM и canvas — только шлёт события наружу.
 */
export class Game {
  readonly grid: Array<Building | null> = new Array(COLS * ROWS).fill(null);

  money = START_MONEY;
  earned = 0;
  started = false;
  paused = false;
  speed: 1 | 2 | 3 = 1;
  over = false;
  won = false;

  private acc = 0;
  private brokeFor = 0;
  private incomeBucket = 0;
  private incomeWindow = 0;
  private incomeRate = 0;
  private readonly listeners = new Set<(event: GameEvent) => void>();

  /* ---------------------------------------------------------------- */
  /* подписка на события                                               */
  /* ---------------------------------------------------------------- */

  on(listener: (event: GameEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: GameEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  /* ---------------------------------------------------------------- */
  /* доступ к сетке                                                    */
  /* ---------------------------------------------------------------- */

  at(r: number, c: number): Building | null {
    return this.grid[idx(r, c)] ?? null;
  }

  buildings(): Building[] {
    return this.grid.filter((b): b is Building => b !== null);
  }

  inBounds(r: number, c: number): boolean {
    return r >= 0 && r < ROWS && c >= 0 && c < COLS;
  }

  private neighbors(r: number, c: number): Building[] {
    const result: Building[] = [];
    const candidates: ReadonlyArray<readonly [number, number]> = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ];
    for (const [nr, nc] of candidates) {
      if (!this.inBounds(nr, nc)) continue;
      const b = this.grid[idx(nr, nc)];
      if (b) result.push(b);
    }
    return result;
  }

  /* ---------------------------------------------------------------- */
  /* действия игрока                                                   */
  /* ---------------------------------------------------------------- */

  place(type: BuildingId, r: number, c: number): PlaceResult {
    if (this.over) return 'out';
    if (!this.inBounds(r, c)) return 'out';
    if (this.grid[idx(r, c)]) {
      this.emit({ kind: 'toast', text: 'Клетка занята', tone: 'bad' });
      return 'occupied';
    }

    const def = BUILDINGS[type];
    if (this.money < def.cost) {
      this.emit({
        kind: 'toast',
        text: `Не хватает денег: нужно ${def.cost} ₽`,
        tone: 'bad',
      });
      return 'poor';
    }

    this.money -= def.cost;
    this.grid[idx(r, c)] = {
      type,
      r,
      c,
      stock: {},
      out: {},
      stability: 100,
      warn: null,
    };
    return 'ok';
  }

  demolish(r: number, c: number): boolean {
    const building = this.at(r, c);
    if (!building) return false;

    const def = BUILDINGS[building.type];
    this.money += Math.round(def.cost * REFUND_RATE);
    this.grid[idx(r, c)] = null;
    this.emit({ kind: 'toast', text: `Снесено: ${def.name}`, tone: 'good' });
    return true;
  }

  /* ---------------------------------------------------------------- */
  /* главный цикл                                                      */
  /* ---------------------------------------------------------------- */

  togglePause(): void {
    if (!this.started || this.over) return;
    this.paused = !this.paused;
  }

  nextSpeed(): void {
    this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1;
  }

  /** Продвинуть симуляцию на dt миллисекунд. */
  advance(dtMs: number): void {
    if (!this.started || this.paused || this.over) return;

    this.acc += dtMs * this.speed;
    let guard = 0;
    while (this.acc >= TICK_MS && guard++ < 10) {
      this.acc -= TICK_MS;
      this.tick();
    }

    this.incomeWindow += dtMs;
    if (this.incomeWindow >= 1000) {
      const perSecond = (this.incomeBucket * 1000) / this.incomeWindow;
      this.incomeRate = this.incomeRate * 0.6 + perSecond * 0.4;
      this.incomeBucket = 0;
      this.incomeWindow = 0;
    }
  }

  get incomePerSecond(): number {
    return this.incomeRate;
  }

  get averageStability(): number {
    const list = this.buildings();
    if (list.length === 0) return 100;
    return list.reduce((sum, b) => sum + b.stability, 0) / list.length;
  }

  private tick(): void {
    // порядок обхода случайный, иначе первые клетки всегда объедают последние
    const list = this.buildings();
    shuffle(list);

    for (const building of list) this.pull(building);
    for (const building of list) {
      if (this.at(building.r, building.c) === building) this.produce(building);
    }

    this.checkBankruptcy();
  }

  /** Завод сам забирает сырьё у соседей — ровно столько, сколько нужно на такт. */
  private pull(building: Building): void {
    const def = BUILDINGS[building.type];

    for (const key in def.input) {
      const resource = key as ResourceId;
      const need = def.input[resource]!;
      let want = need - (building.stock[resource] ?? 0);
      if (want <= 0) continue;

      for (const neighbor of this.neighbors(building.r, building.c)) {
        if (want <= 0) break;
        const available = neighbor.out[resource] ?? 0;
        if (available <= 0) continue;

        const taken = Math.min(available, want);
        neighbor.out[resource] = available - taken;
        building.stock[resource] = (building.stock[resource] ?? 0) + taken;
        want -= taken;

        this.emit({
          kind: 'transfer',
          from: { r: neighbor.r, c: neighbor.c },
          to: { r: building.r, c: building.c },
          resource,
          amount: taken,
        });
      }
    }
  }

  private produce(building: Building): void {
    const def = BUILDINGS[building.type];

    let hasInputs = true;
    for (const key in def.input) {
      const resource = key as ResourceId;
      if ((building.stock[resource] ?? 0) < def.input[resource]!) hasInputs = false;
    }

    let hasSpace = true;
    for (const key in def.output) {
      const resource = key as ResourceId;
      if ((building.out[resource] ?? 0) + def.output[resource]! > def.outCap) {
        hasSpace = false;
      }
    }

    if (hasInputs && hasSpace) {
      for (const key in def.input) {
        const resource = key as ResourceId;
        building.stock[resource] = (building.stock[resource] ?? 0) - def.input[resource]!;
      }
      for (const key in def.output) {
        const resource = key as ResourceId;
        building.out[resource] = (building.out[resource] ?? 0) + def.output[resource]!;
      }

      if (def.income > 0) {
        this.money += def.income;
        this.earned += def.income;
        this.incomeBucket += def.income;
        this.emit({ kind: 'income', at: { r: building.r, c: building.c }, amount: def.income });

        if (!this.won && this.earned >= GOAL) {
          this.won = true;
          this.emit({ kind: 'win' });
        }
      }

      building.stability = Math.min(100, building.stability + PRODUCE_HEAL);
      building.warn = null;
      return;
    }

    if (!hasSpace) {
      building.warn = 'over';
      building.stability -= OVERFLOW_DAMAGE;
    }
    if (!hasInputs) {
      building.warn = building.warn ?? 'starve';
      building.stability -= STARVE_DAMAGE;
    }

    if (building.stability <= 0) this.destroy(building);
  }

  private destroy(building: Building): void {
    this.grid[idx(building.r, building.c)] = null;

    const reason =
      building.warn === 'over'
        ? 'переизбыток продукции'
        : building.warn === 'starve'
          ? 'нехватка сырья'
          : 'перегрузка';

    this.emit({
      kind: 'explode',
      at: { r: building.r, c: building.c },
      type: building.type,
      reason,
    });
    this.emit({
      kind: 'toast',
      text: `💥 ${BUILDINGS[building.type].name} взорвался — ${reason}`,
      tone: 'bad',
    });
  }

  private checkBankruptcy(): void {
    if (this.money >= MIN_COST) {
      this.brokeFor = 0;
      return;
    }

    this.brokeFor += TICK_MS;
    if (this.brokeFor > BANKRUPT_AFTER_MS) {
      this.over = true;
      this.emit({ kind: 'gameover' });
    }
  }

  /* ---------------------------------------------------------------- */
  /* новая игра                                                        */
  /* ---------------------------------------------------------------- */

  reset(): void {
    this.grid.fill(null);
    this.money = START_MONEY;
    this.earned = 0;
    this.started = true;
    this.paused = false;
    this.speed = 1;
    this.over = false;
    this.won = false;
    this.acc = 0;
    this.brokeFor = 0;
    this.incomeBucket = 0;
    this.incomeWindow = 0;
    this.incomeRate = 0;
  }
}
