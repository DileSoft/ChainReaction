import { ACTS, LEVELS } from '../game/levels';
import { isUnlocked, starsOf, type Progress } from './progress';

function starsMarkup(stars: number): string {
  const filled = '★'.repeat(Math.max(0, Math.min(3, stars)));
  const empty = '☆'.repeat(Math.max(0, 3 - stars));
  return `<span class="on">${filled}</span><span class="off">${empty}</span>`;
}

export class LevelMap {
  constructor(
    private readonly root: HTMLElement,
    private readonly body: HTMLElement,
    private readonly onSelect: (index: number) => void,
  ) {
    root.querySelector<HTMLButtonElement>('#map-close')?.addEventListener('click', () => this.close());
    root.addEventListener('click', (event) => {
      if (event.target === root) this.close();
    });
  }

  get isOpen(): boolean {
    return !this.root.classList.contains('hidden');
  }

  open(progress: Progress, currentIndex: number): void {
    this.render(progress, currentIndex);
    this.root.classList.remove('hidden');
  }

  close(): void {
    this.root.classList.add('hidden');
  }

  toggle(progress: Progress, currentIndex: number): void {
    if (this.isOpen) this.close();
    else this.open(progress, currentIndex);
  }

  private render(progress: Progress, currentIndex: number): void {
    const parts: string[] = [];

    for (const act of ACTS) {
      parts.push(
        `<div class="map-act"><div class="map-act-title">${act.title}</div><div class="map-grid">`,
      );

      for (let index = act.from; index <= act.to; index++) {
        const level = LEVELS[index];
        if (!level) continue;

        const unlocked = isUnlocked(progress, index);
        const stars = starsOf(progress, level.id);
        const classes = [
          'map-node',
          stars > 0 ? 'done' : '',
          unlocked ? '' : 'locked',
          index === currentIndex ? 'current' : '',
          level.timeLimit !== undefined ? 'timed' : '',
        ]
          .filter(Boolean)
          .join(' ');

        parts.push(
          `<button class="${classes}" data-index="${index}" ${unlocked ? '' : 'disabled'} title="${level.name}">` +
            `<span class="map-num">${level.id}</span>` +
            `<span class="map-name">${level.name}</span>` +
            `<span class="map-stars">${starsMarkup(stars)}</span>` +
            '</button>',
        );
      }

      parts.push('</div></div>');
    }

    this.body.innerHTML = parts.join('');

    for (const node of this.body.querySelectorAll<HTMLButtonElement>('.map-node')) {
      node.addEventListener('click', () => {
        const index = Number(node.dataset.index);
        if (Number.isNaN(index)) return;
        this.close();
        this.onSelect(index);
      });
    }
  }
}
