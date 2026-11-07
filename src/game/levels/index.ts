import type { LevelDef } from '../data';
import { readLevel } from './validate';

/**
 * Один JSON — один уровень. Файлы лежат в этой папке и называются по id:
 * 01.json, 02.json, … 30.json. Их можно править и заменять по одному,
 * а index.ts проверяет данные и собирает кампанию в порядке id.
 */

const MODULES = import.meta.glob<unknown>('./*.json', {
  eager: true,
  import: 'default',
});

const CAMPAIGN: LevelDef[] = Object.entries(MODULES)
  .filter(([path]) => /^\.\/\d+\.json$/.test(path))
  .map(([path, source]) => {
    const file = path.replace('./', '');
    const level = readLevel(source, file);

    if (Number.parseInt(file, 10) !== level.id) {
      throw new Error(`${file}: id ${level.id} не совпадает с именем файла — переименуйте файл в ${level.id}.json`);
    }

    return level;
  })
  .sort((a, b) => a.id - b.id);

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
