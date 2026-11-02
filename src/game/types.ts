import type { BuildingId, ResourceId } from './data';

export interface Cell {
  readonly r: number;
  readonly c: number;
}

export type Warning = 'starve' | 'over';

export interface Building {
  readonly type: BuildingId;
  readonly r: number;
  readonly c: number;
  /** Запас сырья, уже принятого внутрь. */
  stock: Partial<Record<ResourceId, number>>;
  /** Готовая продукция на выходе. */
  out: Partial<Record<ResourceId, number>>;
  /** 0 — взрыв, 100 — всё хорошо. */
  stability: number;
  /** Причина последнего «плохого» такта. */
  warn: Warning | null;
  /** Остаток залежей. Есть только у рудников с ограниченным ресурсом. */
  deposit?: number;
  /** Переопределение вместимости склада (у предустановленных рудников огромный отвал). */
  outCap?: number;
  /** Начальный размер залежей — чтобы нарисовать, сколько осталось. */
  depositMax?: number;
  /** Множитель выпуска (у предустановленного рудника 2 руды за такт). */
  rate?: number;
  /** Предустановленное здание: снос не возвращает денег. */
  free?: boolean;
}

/** События, которые симуляция отдаёт наружу — на них реагируют рендер и UI. */
export type GameEvent =
  | {
      kind: 'transfer';
      from: Cell;
      to: Cell;
      resource: ResourceId;
      amount: number;
    }
  | { kind: 'explode'; at: Cell; type: BuildingId; reason: string }
  | { kind: 'income'; at: Cell; amount: number }
  | { kind: 'toast'; text: string; tone: 'info' | 'good' | 'bad' }
  | { kind: 'win' }
  | { kind: 'gameover'; reason: GameOverReason };

export type GameOverReason = 'bankrupt' | 'depleted' | 'timeout';

export type PlaceResult = 'ok' | 'occupied' | 'poor' | 'out';

export type Tool = BuildingId | 'demolish';
