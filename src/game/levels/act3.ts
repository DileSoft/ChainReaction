import type { LevelDef } from '../data';

/** Акт III. Замкнутый цикл: конечные залежи и Рециклер. */
export const ACT3: readonly LevelDef[] = [
  {
    id: 13,
    name: 'Истощение',
    subtitle: 'Конец шахты',
    brief:
      'Этот рудник не бесконечен: в нём 120 единиц руды. Он отдаёт одну за такт. Успейте ' +
      'заработать, пока залежи не кончились.',
    goal: 400,
    startMoney: 400,
    available: ['smelter', 'press', 'warehouse', 'crusher'],
    presets: [{ type: 'mine', r: 4, c: 4, deposit: 120 }],
    parTime: 180,
  },
  {
    id: 14,
    name: 'Рециклер',
    subtitle: 'Возврат в шахту',
    brief:
      'Рециклер забирает слиток и возвращает в шахту две единицы руды. Поставьте его рядом ' +
      'с плавильней — и залежи перестанут таять.',
    goal: 400,
    startMoney: 400,
    available: ['smelter', 'press', 'warehouse', 'crusher'],
    presets: [{ type: 'mine', r: 4, c: 4, deposit: 120, rate: 2 }],
    parTime: 180,
  },
  {
    id: 15,
    name: 'Замкнутый цикл',
    subtitle: 'Кольцо',
    brief:
      'Рудник отдаёт две руды за такт. Одну пускайте на пластины, вторую — через Рециклер обратно ' +
      'в шахту. Так залежи не кончатся никогда.',
    goal: 600,
    startMoney: 260,
    available: [
      'smelter',
      'press',
      'cutter',
      'crusher',
      'welder',
      'assembler',
      'warehouse',
      'port',
    ],
    presets: [{ type: 'mine', r: 4, c: 4, deposit: 200, rate: 2 }],
    parTime: 210,
  },
  {
    id: 16,
    name: 'Двойное кольцо',
    subtitle: 'Два рециклера',
    brief:
      'Одного кольца мало для большой цели. Второй Рециклер заберёт слитки у второй плавильни, ' +
      'и шахта начнёт прирастать.',
    goal: 900,
    startMoney: 400,
    available: ['smelter', 'press', 'warehouse', 'crusher'],
    presets: [{ type: 'mine', r: 4, c: 4, deposit: 80, rate: 2 }],
    parTime: 240,
  },
  {
    id: 17,
    name: 'Сухая шахта',
    subtitle: 'На тонком льду',
    brief:
      'В залежах всего 60 единиц, а рудник торопится — две за такт. Медлить нельзя: сначала кольцо, ' +
      'потом прибыль.',
    goal: 500,
    startMoney: 420,
    available: ['smelter', 'press', 'warehouse', 'crusher'],
    presets: [{ type: 'mine', r: 4, c: 4, deposit: 60, rate: 2 }],
    parTime: 240,
  },
  {
    id: 18,
    name: 'Экзамен III',
    subtitle: 'Кольцо и рост',
    brief:
      'Залежей немного, цель большая. Замкните цикл первым делом, а уже потом стройте прибыль.',
    goal: 1200,
    startMoney: 350,
    available: [
      'smelter',
      'press',
      'cutter',
      'crusher',
      'welder',
      'assembler',
      'warehouse',
      'port',
    ],
    presets: [{ type: 'mine', r: 4, c: 4, deposit: 150, rate: 2 }],
    parTime: 300,
  },
];
