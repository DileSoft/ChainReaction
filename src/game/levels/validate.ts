import {
  BUILDINGS,
  COLS,
  ROWS,
  type BuildingId,
  type LevelDef,
  type LevelPreset,
} from '../data';

/**
 * Проверка и форматирование уровня. Используется и в рантайме (index.ts),
 * и dev-сервером, который сохраняет JSON из редактора прямо в исходники.
 */

const isBuilding = (value: unknown): value is BuildingId =>
  typeof value === 'string' && value in BUILDINGS;

const isCell = (r: unknown, c: unknown): boolean =>
  typeof r === 'number' &&
  typeof c === 'number' &&
  Number.isInteger(r) &&
  Number.isInteger(c) &&
  r >= 0 &&
  r < ROWS &&
  c >= 0 &&
  c < COLS;

/** Имя файла уровня: 01.json, 02.json, … */
export function levelFileName(id: number): string {
  return `${String(id).padStart(2, '0')}.json`;
}

export function readLevel(source: unknown, file: string): LevelDef {
  const level = source as Partial<LevelDef>;
  const where = file;

  if (typeof level.id !== 'number' || !Number.isInteger(level.id) || level.id < 1) {
    throw new Error(`${where}: id должен быть целым положительным числом`);
  }
  if (typeof level.name !== 'string' || !level.name) throw new Error(`${where}: пустое поле name`);
  if (typeof level.subtitle !== 'string' || !level.subtitle) {
    throw new Error(`${where}: пустое поле subtitle`);
  }
  if (typeof level.brief !== 'string' || !level.brief) throw new Error(`${where}: пустое поле brief`);
  if (typeof level.goal !== 'number' || level.goal <= 0) {
    throw new Error(`${where}: goal должен быть больше нуля`);
  }
  if (typeof level.startMoney !== 'number' || level.startMoney < 0) {
    throw new Error(`${where}: startMoney не может быть отрицательным`);
  }

  if (!Array.isArray(level.available) || level.available.length === 0) {
    throw new Error(`${where}: available должен быть непустым массивом построек`);
  }
  for (const id of level.available) {
    if (!isBuilding(id)) throw new Error(`${where}: неизвестная постройка "${String(id)}"`);
  }

  if (!Array.isArray(level.presets)) throw new Error(`${where}: presets должен быть массивом`);
  const presets: LevelPreset[] = level.presets.map((preset, presetIndex) => {
    const at = `${where}, presets[${presetIndex}]`;
    if (!isBuilding(preset.type)) throw new Error(`${at}: неизвестная постройка "${String(preset.type)}"`);
    if (!isCell(preset.r, preset.c)) throw new Error(`${at}: координаты вне поля 9×9`);
    if (preset.deposit !== undefined && (typeof preset.deposit !== 'number' || preset.deposit <= 0)) {
      throw new Error(`${at}: deposit должен быть больше нуля`);
    }
    if (preset.rate !== undefined && (typeof preset.rate !== 'number' || preset.rate <= 0)) {
      throw new Error(`${at}: rate должен быть больше нуля`);
    }
    return { ...preset };
  });

  if (level.blocked !== undefined) {
    if (!Array.isArray(level.blocked)) throw new Error(`${where}: blocked должен быть массивом`);
    for (const cell of level.blocked) {
      if (!isCell(cell[0], cell[1])) throw new Error(`${where}: blocked содержит координаты вне поля 9×9`);
    }
  }

  return { ...level, id: level.id, available: level.available, presets } as LevelDef;
}

/** Единый формат файла: два пробела, координаты стен в одну строку, перевод строки в конце. */
export function formatLevelJson(level: LevelDef): string {
  const json = JSON.stringify(level, null, 2).replace(/\[\s+(-?\d+),\s+(-?\d+)\s+\]/g, '[$1, $2]');
  return `${json}\n`;
}
