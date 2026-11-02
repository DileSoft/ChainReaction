import type { Game } from '../game/Game';
import { LEVELS } from '../game/levels';
import { REFS } from '../game/levels/refs';

export interface VerifyRow {
  id: number;
  name: string;
  ok: boolean;
  ticks: number;
  earned: number;
  goal: number;
  explosions: number;
  reason: string;
}

const TICK_MS = 500;
const MAX_TICKS = 2400;

/**
 * Прогоняет каждый уровень по эталонной застройке.
 * Строит то, на что хватает денег, и ждёт победы или поражения.
 */
export function verifyLevels(game: Game): VerifyRow[] {
  const rows: VerifyRow[] = [];

  for (let index = 0; index < LEVELS.length; index++) {
    const level = LEVELS[index]!;
    game.startLevel(index);
    game.started = true;
    game.paused = false;

    const pending = [...(REFS[level.id] ?? [])];

    const tryPlace = (): void => {
      for (let i = pending.length - 1; i >= 0; i--) {
        const [type, r, c] = pending[i]!;
        if (game.place(type, r, c) === 'ok') pending.splice(i, 1);
      }
    };

    tryPlace();

    let ticks = 0;
    while (!game.won && !game.over && ticks < MAX_TICKS) {
      game.advance(TICK_MS);
      ticks++;
      if (pending.length > 0) tryPlace();
    }

    rows.push({
      id: level.id,
      name: level.name,
      ok: game.won,
      ticks,
      earned: game.earned,
      goal: level.goal,
      explosions: game.explosions,
      reason: game.over ? game.overReason : game.won ? 'win' : 'timeout-of-harness',
    });

    if (pending.length > 0) {
      rows[rows.length - 1]!.reason += ` (не построено: ${pending.length})`;
    }
  }

  return rows;
}
