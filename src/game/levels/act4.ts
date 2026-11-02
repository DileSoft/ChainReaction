import type { LevelDef } from '../data';

/** Акт IV. Ограничения: стены, бюджет, время и пропорции. */
export const ACT4: readonly LevelDef[] = [
  {
    id: 19,
    name: 'Теснота',
    subtitle: 'Стены',
    brief:
      'Часть клеток занята бетоном. Придётся вести цепочку зигзагом — а значит, следить за тем, ' +
      'кто с кем граничит.',
    goal: 800,
    startMoney: 300,
    available: ['mine', 'smelter', 'press', 'warehouse'],
    presets: [],
    blocked: [
      [1, 3],
      [2, 3],
      [3, 3],
      [4, 3],
      [5, 3],
      [3, 6],
      [4, 6],
      [5, 6],
      [6, 6],
    ],
    parTime: 240,
  },
  {
    id: 20,
    name: 'Бюджет',
    subtitle: 'Денег ровно на комплект',
    brief:
      'Денег хватает ровно на одну цепочку: рудник, плавильня, пресс и склад. Ошибка в ' +
      'размещении — и пересобрать будет не на что.',
    goal: 400,
    startMoney: 240,
    available: ['mine', 'smelter', 'press', 'warehouse'],
    presets: [],
    parTime: 240,
  },
  {
    id: 21,
    name: 'Смена',
    subtitle: 'Таймер',
    brief:
      'Конец смены — через девяносто секунд. Успейте не только построить, но и заработать.',
    goal: 500,
    startMoney: 300,
    available: ['mine', 'smelter', 'press', 'warehouse'],
    presets: [],
    timeLimit: 90,
    parTime: 75,
  },
  {
    id: 22,
    name: 'Пропорции',
    subtitle: 'Ровно столько, сколько нужно',
    brief:
      'Цель втрое больше обычной. Стройте комплекты целиком: рудник без плавильни взорвётся, ' +
      'плавильня без пресса — тоже.',
    goal: 1500,
    startMoney: 500,
    available: ['mine', 'smelter', 'press', 'warehouse'],
    presets: [],
    parTime: 300,
  },
  {
    id: 23,
    name: 'Лабиринт',
    subtitle: 'Маршрут',
    brief:
      'Стены разрезают поле на коридоры. Модульная линия должна пройти через весь лабиринт ' +
      'и всё равно сойтись в порту.',
    goal: 1200,
    startMoney: 800,
    available: ['mine', 'smelter', 'press', 'cutter', 'welder', 'assembler', 'warehouse', 'port'],
    presets: [],
    blocked: [
      [2, 1],
      [2, 2],
      [2, 3],
      [2, 4],
      [2, 5],
      [2, 6],
      [6, 3],
      [6, 4],
      [6, 5],
      [6, 6],
      [6, 7],
    ],
    parTime: 360,
  },
  {
    id: 24,
    name: 'Экзамен IV',
    subtitle: 'Стены и срок',
    brief:
      'Стены, ограниченное время и цель в 2000 ₽. Сначала быстрый доход, потом глубина переработки.',
    goal: 2000,
    startMoney: 500,
    available: ['mine', 'smelter', 'press', 'cutter', 'welder', 'assembler', 'warehouse', 'port'],
    presets: [],
    blocked: [
      [4, 3],
      [4, 4],
      [4, 5],
    ],
    timeLimit: 180,
    parTime: 150,
  },
];
