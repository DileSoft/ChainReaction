export interface LevelResult {
  stars: number;
  bestMs: number;
}

export type Progress = Record<string, LevelResult>;

const KEY = 'chain-reaction.progress.v1';

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Progress;
  } catch {
    return {};
  }
}

function persist(progress: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    /* приватный режим или запрет хранилища — не критично */
  }
}

/** Записать результат уровня, сохранив лучший результат. */
export function recordResult(
  progress: Progress,
  levelId: number,
  stars: number,
  elapsedMs: number,
): Progress {
  const prev = progress[String(levelId)];
  progress[String(levelId)] = {
    stars: Math.max(prev?.stars ?? 0, stars),
    bestMs: prev ? Math.min(prev.bestMs, elapsedMs) : elapsedMs,
  };
  persist(progress);
  return progress;
}

/** Уровень открыт, если пройден предыдущий (первый открыт всегда). */
export function isUnlocked(progress: Progress, index: number): boolean {
  if (index === 0) return true;
  // id уровня = index + 1, значит предыдущий уровень имеет id === index
  return Boolean(progress[String(index)]);
}

export function starsOf(progress: Progress, levelId: number): number {
  return progress[String(levelId)]?.stars ?? 0;
}

/** Dev-хелпер: считать все уровни открытыми, не выдавая звёзд. */
export function unlockAll(progress: Progress, total: number): Progress {
  for (let id = 1; id <= total; id++) {
    if (!progress[String(id)]) progress[String(id)] = { stars: 0, bestMs: 0 };
  }
  persist(progress);
  return progress;
}
