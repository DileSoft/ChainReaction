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
  | { kind: 'gameover' };

export type PlaceResult = 'ok' | 'occupied' | 'poor' | 'out';

export type Tool = BuildingId | 'demolish';
