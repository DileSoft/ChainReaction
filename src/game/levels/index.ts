import type { LevelDef } from '../data';
import { ACT1 } from './act1';
import { ACT2 } from './act2';
import { ACT3 } from './act3';
import { ACT4 } from './act4';
import { ACT5 } from './act5';

export const LEVELS: readonly LevelDef[] = [...ACT1, ...ACT2, ...ACT3, ...ACT4, ...ACT5];

/** Названия актов для карты уровней. */
export const ACTS: readonly { title: string; from: number; to: number }[] = [
  { title: 'Основы', from: 0, to: 5 },
  { title: 'Ветвление', from: 6, to: 11 },
  { title: 'Замкнутый цикл', from: 12, to: 17 },
  { title: 'Ограничения', from: 18, to: 23 },
  { title: 'Мастерство', from: 24, to: 29 },
];
