import {
  BUILDINGS,
  COLS,
  ROWS,
  type BuildingId,
  type LevelDef,
  type LevelPreset,
} from '../data';
import act1 from './act1.json';
import act2 from './act2.json';
import act3 from './act3.json';
import act4 from './act4.json';
import act5 from './act5.json';

/**
 * Кампания живёт в JSON-файлах act1…act5.json: их можно править и заменять
 * целиком, не трогая код. Здесь данные проверяются и собираются в один список.
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

function readLevels(source: unknown, file: string): LevelDef[] {
  if (!Array.isArray(source)) throw new Error(`${file}: ожидается массив уровней`);

  return source.map((item: unknown, index: number) => {
    const level = item as Partial<LevelDef>;
    const where = `${file}, уровень #${index + 1}`;

    if (typeof level.id !== 'number') throw new Error(`${where}: id должен быть числом`);
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
  });
}

const ACT_FILES: ReadonlyArray<readonly [unknown, string]> = [
  [act1, 'act1.json'],
  [act2, 'act2.json'],
  [act3, 'act3.json'],
  [act4, 'act4.json'],
  [act5, 'act5.json'],
];

const CAMPAIGN: LevelDef[] = ACT_FILES.flatMap(([source, file]) => readLevels(source, file));

const seen = new Set<number>();
for (const level of CAMPAIGN) {
  if (seen.has(level.id)) throw new Error(`levels: id ${level.id} встречается дважды`);
  seen.add(level.id);
}

export const LEVELS: readonly LevelDef[] = CAMPAIGN;

/** Названия актов для карты уровней. */
export const ACTS: readonly { title: string; from: number; to: number }[] = [
  { title: 'Основы', from: 0, to: 5 },
  { title: 'Ветвление', from: 6, to: 11 },
  { title: 'Замкнутый цикл', from: 12, to: 17 },
  { title: 'Ограничения', from: 18, to: 23 },
  { title: 'Мастерство', from: 24, to: 29 },
];
