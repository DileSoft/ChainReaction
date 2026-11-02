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
  | 'crusher'
  | 'orebuyer'
  | 'scrapbuyer'
  | 'gearbuyer'
  | 'framebuyer'
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
  /** Вместо выхода пополняет залежи рудника на карте. */
  readonly restores?: { readonly amount: number };
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
  /** Замыкает цикл: слитки возвращаются в шахту и снова становятся рудой. */
  crusher: {
    id: 'crusher',
    name: 'Рециклер',
    icon: '♻️',
    accent: '#48c9b0',
    cost: 90,
    input: { ingot: 1 },
    output: {},
    outCap: 0,
    income: 0,
    restores: { amount: 2 },
  },
  /** Сбыт сырья. */
  orebuyer: {
    id: 'orebuyer',
    name: 'Скупщик руды',
    icon: '🏷️',
    accent: '#e0b34a',
    cost: 80,
    input: { ore: 1 },
    output: {},
    outCap: 0,
    income: 2,
  },
  scrapbuyer: {
    id: 'scrapbuyer',
    name: 'Скупщик слитков',
    icon: '⚖️',
    accent: '#a9b7c6',
    cost: 90,
    input: { ingot: 1 },
    output: {},
    outCap: 0,
    income: 3,
  },
  gearbuyer: {
    id: 'gearbuyer',
    name: 'Скупщик шестерён',
    icon: '🔩',
    accent: '#f0b429',
    cost: 90,
    input: { gear: 1 },
    output: {},
    outCap: 0,
    income: 5,
  },
  framebuyer: {
    id: 'framebuyer',
    name: 'Скупщик каркасов',
    icon: '🧱',
    accent: '#8b7dff',
    cost: 120,
    input: { frame: 1 },
    output: {},
    outCap: 0,
    income: 12,
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

/* ---------- константы мира ---------- */

export const COLS = 9;
export const ROWS = 9;
export const CELL = 72;
export const BOARD_W = COLS * CELL;
export const BOARD_H = ROWS * CELL;

/** Длительность одного такта симуляции, мс. */
export const TICK_MS = 500;
/** Доля стоимости, возвращаемая при сносе. */
export const REFUND_RATE = 0.5;

/* ---------- уровни ---------- */

export interface LevelPreset {
  readonly type: BuildingId;
  readonly r: number;
  readonly c: number;
  /** Конечные залежи: сколько единиц ресурса завод отдаст за всю игру. */
  readonly deposit?: number;
  /** Множитель выпуска — предустановленный рудник качает быстрее обычного. */
  readonly rate?: number;
}

export interface LevelDef {
  readonly id: number;
  readonly name: string;
  readonly subtitle: string;
  readonly brief: string;
  /** Цель в рублях. */
  readonly goal: number;
  readonly startMoney: number;
  /** Что доступно в палитре — в этом же порядке идут горячие клавиши 1–9. */
  readonly available: readonly BuildingId[];
  readonly presets: readonly LevelPreset[];
  /** Клетки, на которые нельзя строить. */
  readonly blocked?: ReadonlyArray<readonly [number, number]>;
  /** Жёсткий лимит времени в секундах: не успел — проиграл. */
  readonly timeLimit?: number;
  /** Мягкий норматив в секундах: уложился — третья звезда. */
  readonly parTime?: number;
  /** Запрет сноса: что построил, то и работает. */
  readonly noDemolish?: boolean;
}
