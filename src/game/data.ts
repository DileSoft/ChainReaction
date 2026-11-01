/** Все идентификаторы ресурсов, которые циркулируют по цепочке. */
export type ResourceId = 'ore' | 'ingot' | 'plate' | 'gear' | 'frame' | 'module';

export interface ResourceDef {
  readonly name: string;
  readonly color: string;
}

export const RESOURCES: Readonly<Record<ResourceId, ResourceDef>> = {
  ore: { name: 'Руда', color: '#c07a3a' },
  ingot: { name: 'Слиток', color: '#a9b7c6' },
  plate: { name: 'Пластина', color: '#4fd1c5' },
  gear: { name: 'Шестерня', color: '#f0b429' },
  frame: { name: 'Каркас', color: '#8b7dff' },
  module: { name: 'Модуль', color: '#ff5d8f' },
};

/** Рецепт: сколько единиц каждого ресурса. */
export type Recipe = Partial<Record<ResourceId, number>>;

export type BuildingId =
  | 'mine'
  | 'smelter'
  | 'press'
  | 'cutter'
  | 'welder'
  | 'assembler'
  | 'warehouse'
  | 'port';

export interface BuildingDef {
  readonly id: BuildingId;
  readonly name: string;
  readonly icon: string;
  readonly accent: string;
  readonly cost: number;
  /** Что забирает за такт. */
  readonly input: Recipe;
  /** Что производит за такт. */
  readonly output: Recipe;
  /** Вместимость склада готовой продукции. */
  readonly outCap: number;
  /** Сколько денег приносит за такт (для складов и порта). */
  readonly income: number;
}

export const BUILDINGS: Readonly<Record<BuildingId, BuildingDef>> = {
  mine: {
    id: 'mine',
    name: 'Рудник',
    icon: '⛏️',
    accent: '#c07a3a',
    cost: 40,
    input: {},
    output: { ore: 1 },
    outCap: 6,
    income: 0,
  },
  smelter: {
    id: 'smelter',
    name: 'Плавильня',
    icon: '🔥',
    accent: '#e2603a',
    cost: 60,
    input: { ore: 1 },
    output: { ingot: 1 },
    outCap: 6,
    income: 0,
  },
  press: {
    id: 'press',
    name: 'Пресс',
    icon: '🔨',
    accent: '#4fd1c5',
    cost: 70,
    input: { ingot: 1 },
    output: { plate: 1 },
    outCap: 6,
    income: 0,
  },
  cutter: {
    id: 'cutter',
    name: 'Резак',
    icon: '⚙️',
    accent: '#f0b429',
    cost: 70,
    input: { ingot: 1 },
    output: { gear: 1 },
    outCap: 6,
    income: 0,
  },
  welder: {
    id: 'welder',
    name: 'Сварка',
    icon: '🔧',
    accent: '#8b7dff',
    cost: 110,
    input: { plate: 2 },
    output: { frame: 1 },
    outCap: 6,
    income: 0,
  },
  assembler: {
    id: 'assembler',
    name: 'Сборка',
    icon: '🧩',
    accent: '#ff5d8f',
    cost: 180,
    input: { frame: 1, gear: 2 },
    output: { module: 1 },
    outCap: 6,
    income: 0,
  },
  warehouse: {
    id: 'warehouse',
    name: 'Склад',
    icon: '📦',
    accent: '#5aa9e6',
    cost: 70,
    input: { plate: 1 },
    output: {},
    outCap: 0,
    income: 4,
  },
  port: {
    id: 'port',
    name: 'Порт',
    icon: '🚢',
    accent: '#2ecc71',
    cost: 150,
    input: { module: 1 },
    output: {},
    outCap: 0,
    income: 22,
  },
};

/** Порядок карточек в палитре (он же порядок горячих клавиш 1–8). */
export const BUILD_ORDER: readonly BuildingId[] = [
  'mine',
  'smelter',
  'press',
  'cutter',
  'welder',
  'assembler',
  'warehouse',
  'port',
];

/* ---------- константы мира ---------- */

export const COLS = 9;
export const ROWS = 9;
export const CELL = 72;
export const BOARD_W = COLS * CELL;
export const BOARD_H = ROWS * CELL;

/** Длительность одного такта симуляции, мс. */
export const TICK_MS = 500;
export const START_MONEY = 300;
export const GOAL = 2000;
/** Доля стоимости, возвращаемая при сносе. */
export const REFUND_RATE = 0.5;

/** Самая дешёвая постройка — порог банкротства. */
export const MIN_COST = Math.min(...Object.values(BUILDINGS).map((b) => b.cost));
