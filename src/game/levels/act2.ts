import type { LevelDef } from '../data';

/** Акт II. Ветвление: шестерни, каркасы, сборка и пропорции. */
export const ACT2: readonly LevelDef[] = [
  {
    id: 7,
    name: 'Шестерня',
    subtitle: 'Новая ветка',
    brief:
      'Слиток можно не только расплющить в пластину. Резак делает шестерню, а скупщик шестерён ' +
      'её покупает. Денег хватит ровно на четыре завода.',
    goal: 400,
    startMoney: 260,
    available: ['mine', 'smelter', 'cutter', 'gearbuyer'],
    presets: [],
    parTime: 150,
  },
  {
    id: 8,
    name: 'Каркас',
    subtitle: 'Два входа',
    brief:
      'Сварка съедает две пластины за такт — значит, прессов нужно два. Один пресс просто ' +
      'не успеет, и сварка начнёт голодать.',
    goal: 700,
    startMoney: 480,
    available: ['mine', 'smelter', 'press', 'welder', 'framebuyer'],
    presets: [],
    parTime: 180,
  },
  {
    id: 9,
    name: 'Сборка',
    subtitle: 'Модуль',
    brief:
      'Модуль — это один каркас и две шестерни. Считайте звенья: четыре рудника, четыре плавильни, ' +
      'два пресса, два резака. Порт покупает модули дорого.',
    goal: 1200,
    startMoney: 1200,
    available: ['mine', 'smelter', 'press', 'cutter', 'welder', 'assembler', 'port'],
    presets: [],
    parTime: 240,
  },
  {
    id: 10,
    name: 'Конвейер',
    subtitle: 'Разгон',
    brief:
      'Начинайте с пластин на склад, а прибыль вкладывайте в сборку. Главное — не оставлять ' +
      'производителей без потребителей.',
    goal: 1800,
    startMoney: 900,
    available: ['mine', 'smelter', 'press', 'cutter', 'welder', 'assembler', 'warehouse', 'port'],
    presets: [],
    parTime: 300,
  },
  {
    id: 11,
    name: 'Узкое место',
    subtitle: 'Дефицит сырья',
    brief:
      'Рудник на поле один, и поставить второй нельзя. Одной руды в такт хватит только на одну ' +
      'ветку: либо пластины, либо модули.',
    goal: 600,
    startMoney: 700,
    available: ['smelter', 'press', 'cutter', 'welder', 'assembler', 'warehouse', 'scrapbuyer', 'port'],
    presets: [{ type: 'mine', r: 4, c: 4 }],
    parTime: 240,
  },
  {
    id: 12,
    name: 'Экзамен II',
    subtitle: 'Всё вместе',
    brief:
      'Полный набор зданий и цель в 2500 ₽. Помните: каждый лишний производитель должен кому-то ' +
      'отдавать продукцию.',
    goal: 2500,
    startMoney: 500,
    available: ['mine', 'smelter', 'press', 'cutter', 'welder', 'assembler', 'warehouse', 'port'],
    presets: [],
    parTime: 420,
  },
];
