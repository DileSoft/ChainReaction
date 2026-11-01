import {
  BOARD_H,
  BOARD_W,
  BUILDINGS,
  CELL,
  COLS,
  RESOURCES,
  ROWS,
  TICK_MS,
  type BuildingId,
  type ResourceId,
} from './data';
import type { Game } from './Game';
import type { Sound } from './Sound';
import type { Building, Cell, Tool } from './types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  color: string;
}

interface Ring {
  x: number;
  y: number;
  r: number;
  life: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

interface TransferFx {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  amount: number;
  t: number;
  dur: number;
}

const centre = (r: number, c: number): [number, number] => [
  c * CELL + CELL / 2,
  r * CELL + CELL / 2,
];

export class Renderer {
  tool: Tool | null = null;
  hover: Cell | null = null;

  private readonly ctx: CanvasRenderingContext2D;
  private readonly particles: Particle[] = [];
  private readonly rings: Ring[] = [];
  private readonly floats: FloatingText[] = [];
  private readonly transfers: TransferFx[] = [];
  private shake = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly game: Game,
    private readonly sound: Sound,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context недоступен');
    this.ctx = ctx;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = BOARD_W * dpr;
    canvas.height = BOARD_H * dpr;
    canvas.style.aspectRatio = '1 / 1';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    game.on((event) => {
      switch (event.kind) {
        case 'transfer':
          this.spawnTransfer(event.from, event.to, event.resource, event.amount);
          break;
        case 'explode':
          this.spawnExplosion(event.at, event.type);
          this.sound.boom();
          break;
        case 'income':
          this.spawnFloat(event.at, `+${event.amount}`, '#6ee787');
          if (Math.random() < 0.35) this.sound.cash();
          break;
        case 'toast':
        case 'win':
        case 'gameover':
          break;
      }
    });
  }

  /* ---------------------------------------------------------------- */
  /* геометрия / попадание по клетке                                   */
  /* ---------------------------------------------------------------- */

  cellFromPoint(clientX: number, clientY: number): Cell | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (BOARD_W / rect.width);
    const y = (clientY - rect.top) * (BOARD_H / rect.height);
    if (x < 0 || y < 0 || x >= BOARD_W || y >= BOARD_H) return null;
    return { r: Math.floor(y / CELL), c: Math.floor(x / CELL) };
  }

  /** Положение клетки на экране (координаты окна) — для HTML-подсказки. */
  cellRect(r: number, c: number): { left: number; top: number; size: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scale = rect.width / BOARD_W;
    return {
      left: rect.left + c * CELL * scale,
      top: rect.top + r * CELL * scale,
      size: CELL * scale,
    };
  }

  /** Убрать все визуальные эффекты (при перезапуске). */
  clearEffects(): void {
    this.transfers.length = 0;
    this.particles.length = 0;
    this.rings.length = 0;
    this.floats.length = 0;
    this.shake = 0;
  }

  /* ---------------------------------------------------------------- */
  /* эффекты                                                           */
  /* ---------------------------------------------------------------- */

  private spawnTransfer(from: Cell, to: Cell, resource: ResourceId, amount: number): void {
    if (this.transfers.length > 260) return;
    const [x1, y1] = centre(from.r, from.c);
    const [x2, y2] = centre(to.r, to.c);
    this.transfers.push({
      x1,
      y1,
      x2,
      y2,
      color: RESOURCES[resource].color,
      amount,
      t: 0,
      dur: TICK_MS * 0.85,
    });
  }

  private spawnFloat(at: Cell, text: string, color: string): void {
    const [x, y] = centre(at.r, at.c);
    this.floats.push({ x, y: y - 14, text, color, life: 1 });
  }

  private burst(at: Cell, color: string, count: number): void {
    const [cx, cy] = centre(at.r, at.c);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 3.5;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.014 + Math.random() * 0.02,
        size: 1.5 + Math.random() * 3,
        color,
      });
    }
  }

  private spawnExplosion(at: Cell, type: BuildingId): void {
    this.burst(at, '#ff8a3d', 22);
    this.burst(at, '#ffd166', 14);
    this.burst(at, BUILDINGS[type].accent, 8);

    const [x, y] = centre(at.r, at.c);
    this.rings.push({ x, y, r: 6, life: 1 });
    this.shake = 13;
  }

  update(dtMs: number): void {
    const k = dtMs / 16.67;

    for (let i = this.transfers.length - 1; i >= 0; i--) {
      const t = this.transfers[i]!;
      t.t += dtMs;
      if (t.t >= t.dur) this.transfers.splice(i, 1);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.x += p.vx * k;
      p.y += p.vy * k;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.life -= p.decay * k;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i]!;
      ring.r += 4.5 * k;
      ring.life -= 0.028 * k;
      if (ring.life <= 0) this.rings.splice(i, 1);
    }
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const text = this.floats[i]!;
      text.y -= 0.45 * k;
      text.life -= 0.013 * k;
      if (text.life <= 0) this.floats.splice(i, 1);
    }

    this.shake *= Math.pow(0.86, k);
    if (this.shake < 0.3) this.shake = 0;
  }

  /* ---------------------------------------------------------------- */
  /* рисование                                                         */
  /* ---------------------------------------------------------------- */

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  draw(now: number): void {
    const ctx = this.ctx;

    ctx.save();
    if (this.shake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * this.shake,
        (Math.random() - 0.5) * this.shake,
      );
    }

    ctx.clearRect(-40, -40, BOARD_W + 80, BOARD_H + 80);
    ctx.fillStyle = '#08121a';
    ctx.fillRect(-40, -40, BOARD_W + 80, BOARD_H + 80);

    this.drawGrid();
    if (this.hover && this.tool && this.tool !== 'demolish' && !this.game.over) {
      const { r, c } = this.hover;
      if (!this.game.at(r, c)) this.drawGhost(this.tool, r, c);
    }

    for (const building of this.game.grid) {
      if (!building) continue;
      const hovered =
        this.hover !== null && this.hover.r === building.r && this.hover.c === building.c;
      this.drawBuilding(building, hovered, now);
    }

    this.drawTransfers();
    this.drawRings();
    this.drawParticles();
    this.drawFloats();

    ctx.restore();
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * CELL;
        const y = r * CELL;
        ctx.fillStyle = (r + c) % 2 === 0 ? '#0e1922' : '#0c161e';
        this.roundRect(x + 2, y + 2, CELL - 4, CELL - 4, 9);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.035)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  private drawGhost(type: BuildingId, r: number, c: number): void {
    const ctx = this.ctx;
    const def = BUILDINGS[type];
    const affordable = this.game.money >= def.cost;
    const x = c * CELL;
    const y = r * CELL;
    const pad = 6;

    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = affordable ? 'rgba(63,185,80,.22)' : 'rgba(248,81,73,.22)';
    this.roundRect(x + pad, y + pad, CELL - pad * 2, CELL - pad * 2, 12);
    ctx.fill();
    ctx.strokeStyle = affordable ? '#3fb950' : '#f85149';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.globalAlpha = 0.8;
    ctx.font = '24px "Segoe UI Emoji","Apple Color Emoji",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.icon, x + CELL / 2, y + CELL / 2);
    ctx.restore();
  }

  private drawBuilding(building: Building, hovered: boolean, now: number): void {
    const ctx = this.ctx;
    const def = BUILDINGS[building.type];
    const accent = def.accent;
    const x = building.c * CELL;
    const y = building.r * CELL;
    const pad = 6;
    const w = CELL - pad * 2;
    const h = CELL - pad * 2;

    if (building.stability < 45) {
      const pulse = (Math.sin(now / 130) + 1) / 2;
      ctx.save();
      ctx.globalAlpha = 0.18 + 0.32 * pulse;
      ctx.fillStyle = '#f85149';
      this.roundRect(x + pad - 3, y + pad - 3, w + 6, h + 6, 14);
      ctx.fill();
      ctx.restore();
    } else if (building.stability < 75) {
      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = '#d29922';
      this.roundRect(x + pad - 2, y + pad - 2, w + 4, h + 4, 13);
      ctx.fill();
      ctx.restore();
    }

    const gradient = ctx.createLinearGradient(x, y, x, y + CELL);
    gradient.addColorStop(0, '#21323f');
    gradient.addColorStop(1, '#101a23');
    ctx.fillStyle = gradient;
    this.roundRect(x + pad, y + pad, w, h, 12);
    ctx.fill();

    if (hovered) {
      ctx.strokeStyle = 'rgba(255,255,255,.35)';
      ctx.lineWidth = 1.5;
      this.roundRect(x + pad, y + pad, w, h, 12);
      ctx.stroke();
    }

    ctx.fillStyle = accent;
    this.roundRect(x + pad, y + pad, 4, h, 2);
    ctx.fill();

    ctx.save();
    ctx.globalAlpha = building.warn ? 0.55 : 0.95;
    ctx.font = '24px "Segoe UI Emoji","Apple Color Emoji","Segoe UI Symbol",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.icon, x + CELL / 2 + 2, y + CELL / 2 - 8);
    ctx.restore();

    const outputKey = Object.keys(def.output)[0] as ResourceId | undefined;
    if (outputKey) {
      const total = Math.min(building.out[outputKey] ?? 0, 6);
      const startX = x + CELL / 2 + 2 - (6 * 6) / 2 + 3;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(startX + i * 6, y + CELL / 2 + 9, 2.1, 0, Math.PI * 2);
        ctx.fillStyle = i < total ? RESOURCES[outputKey].color : 'rgba(255,255,255,.09)';
        ctx.fill();
      }
    }

    const barWidth = w - 12;
    const barX = x + pad + 8;
    const barY = y + pad + h - 9;
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    this.roundRect(barX, barY, barWidth, 4, 2);
    ctx.fill();

    const fill = Math.max(0, Math.min(1, building.stability / 100));
    ctx.fillStyle = fill > 0.6 ? '#3fb950' : fill > 0.3 ? '#d29922' : '#f85149';
    this.roundRect(barX, barY, Math.max(2, barWidth * fill), 4, 2);
    ctx.fill();

    if (building.warn) {
      const pulse = (Math.sin(now / 180) + 1) / 2;
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.5 * pulse;
      ctx.fillStyle = building.warn === 'over' ? '#f85149' : '#5aa9e6';
      ctx.font = 'bold 15px "Segoe UI",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', x + CELL - pad - 10, y + pad + 11);
      ctx.restore();
    }
  }

  private drawTransfers(): void {
    const ctx = this.ctx;
    for (const transfer of this.transfers) {
      const progress = transfer.t / transfer.dur;
      const eased = progress * progress * (3 - 2 * progress);
      const x = transfer.x1 + (transfer.x2 - transfer.x1) * eased;
      const y = transfer.y1 + (transfer.y2 - transfer.y1) * eased;
      const alpha = Math.sin(Math.PI * progress) * 0.95;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = transfer.color;
      ctx.shadowColor = transfer.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(x, y, transfer.amount > 1 ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawRings(): void {
    const ctx = this.ctx;
    for (const ring of this.rings) {
      ctx.save();
      ctx.globalAlpha = ring.life * 0.8;
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 3 * ring.life;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    for (const particle of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, particle.life);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * Math.max(0.2, particle.life), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawFloats(): void {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const text of this.floats) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, text.life);
      ctx.fillStyle = text.color;
      ctx.font = 'bold 12px "Segoe UI",sans-serif';
      ctx.fillText(text.text, text.x, text.y);
      ctx.restore();
    }
  }
}
