import {
  BUILDINGS,
  COLS,
  ROWS,
  type BuildingId,
  type LevelDef,
  type LevelPreset,
} from '../game/data';
import { buildingIcon } from '../game/icons';
import { ACTS, LEVELS } from '../game/levels';
import './levelEditor.css';

/**
 * Dev-редактор уровней.
 *
 * Собирает `LevelDef` мышью и отдаёт готовый JSON, который можно вставить
 * в файл `src/game/levels/NN.json`. Модуль грузится динамически
 * только в dev-сборке.
 */

type PaintTool = 'building' | 'wall' | 'erase';

interface EditorDraft {
  id: number;
  name: string;
  subtitle: string;
  brief: string;
  goal: number;
  startMoney: number;
  parTime: number | null;
  timeLimit: number | null;
  noDemolish: boolean;
  available: BuildingId[];
  presets: LevelPreset[];
  blocked: Array<[number, number]>;
  tool: PaintTool;
  paint: BuildingId;
}

interface Issue {
  text: string;
  error: boolean;
}

interface PersistedDraft {
  level: LevelDef;
  tool: PaintTool;
  paint: BuildingId;
}

const STORAGE_KEY = 'chain-reaction.editor.v1';
const ALL_BUILDINGS = Object.keys(BUILDINGS) as BuildingId[];

const parseInt10 = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseOptional = (value: string): number | null => {
  if (value.trim() === '') return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export class LevelEditor {
  private readonly root: HTMLElement;
  private readonly heading: HTMLElement;
  private readonly target: HTMLElement;
  private readonly loadSelect: HTMLSelectElement;
  private readonly idInput: HTMLInputElement;
  private readonly nameInput: HTMLInputElement;
  private readonly subtitleInput: HTMLInputElement;
  private readonly briefInput: HTMLTextAreaElement;
  private readonly goalInput: HTMLInputElement;
  private readonly moneyInput: HTMLInputElement;
  private readonly parInput: HTMLInputElement;
  private readonly limitInput: HTMLInputElement;
  private readonly noDemolishInput: HTMLInputElement;
  private readonly availableBox: HTMLElement;
  private readonly paintBox: HTMLElement;
  private readonly grid: HTMLElement;
  private readonly presetsBox: HTMLElement;
  private readonly presetCount: HTMLElement;
  private readonly issuesBox: HTMLElement;
  private readonly jsonArea: HTMLTextAreaElement;
  private readonly testBtn: HTMLButtonElement;
  private readonly copyBtn: HTMLButtonElement;
  private readonly downloadBtn: HTMLButtonElement;

  private readonly cells: HTMLButtonElement[] = [];
  private draft: EditorDraft;
  private openFlag = false;

  constructor(
    private readonly onTest: (level: LevelDef) => void,
    private readonly onClose: () => void,
  ) {
    this.root = document.createElement('div');
    this.root.id = 'level-editor';
    this.root.className = 'editor hidden';
    this.root.innerHTML = `
      <div class="editor-sheet">
        <div class="editor-head">
          <div>
            <div class="sub">Dev · редактор уровней</div>
            <h2 id="ed-heading">Новый уровень</h2>
            <div class="editor-target" id="ed-target"></div>
          </div>
          <div class="editor-head-actions">
            <select id="ed-load" class="editor-select" title="Загрузить уровень из кампании"></select>
            <button id="ed-new" class="editor-mini" title="Новый пустой уровень">Новый</button>
            <button id="ed-close" class="editor-mini" title="Закрыть (Esc)">✕</button>
          </div>
        </div>

        <div class="editor-body">
          <div class="editor-col">
            <fieldset class="editor-group">
              <legend>Паспорт</legend>
              <div class="editor-row2">
                <label>ID <input id="ed-id" type="number" min="1" step="1" /></label>
                <label>Цель, ₽ <input id="ed-goal" type="number" min="1" step="10" /></label>
              </div>
              <label>Название <input id="ed-name" maxlength="40" placeholder="Приёмный пункт" /></label>
              <label>Подзаголовок <input id="ed-subtitle" maxlength="40" placeholder="Первые шаги" /></label>
              <label>Описание миссии <textarea id="ed-brief" rows="3"></textarea></label>
              <div class="editor-row2">
                <label>Стартовый капитал, ₽ <input id="ed-money" type="number" min="0" step="10" /></label>
                <label>Норматив, с <input id="ed-par" type="number" min="1" step="10" placeholder="—" /></label>
              </div>
              <div class="editor-row2">
                <label>Лимит времени, с <input id="ed-limit" type="number" min="1" step="10" placeholder="—" /></label>
                <label class="editor-check"><input id="ed-nodemolish" type="checkbox" /> Запрет сноса</label>
              </div>
            </fieldset>

            <fieldset class="editor-group">
              <legend>Палитра <span id="ed-avail-count"></span></legend>
              <div id="ed-available" class="editor-checks"></div>
              <div class="editor-note">Порядок галочек = порядок горячих клавиш 1–9.</div>
            </fieldset>
          </div>

          <div class="editor-col">
            <div class="editor-tools">
              <button class="editor-tool" data-tool="building">Ставить</button>
              <button class="editor-tool" data-tool="wall">Стена</button>
              <button class="editor-tool" data-tool="erase">Стереть</button>
              <span class="editor-sep"></span>
              <div id="ed-paint" class="editor-paint"></div>
            </div>

            <div class="editor-grid-wrap">
              <div id="ed-grid" class="editor-grid"></div>
            </div>

            <div class="editor-presets-head">
              <span>Предустановки <span id="ed-preset-count"></span></span>
              <span class="editor-hint">клик — одно здание, правый клик — стереть</span>
            </div>
            <div id="ed-presets" class="editor-presets"></div>
          </div>
        </div>

        <div class="editor-foot">
          <div id="ed-issues" class="editor-issues"></div>
          <div class="editor-actions">
            <button id="ed-copy">Скопировать JSON</button>
            <button id="ed-download">Скачать уровень</button>
            <button id="ed-test" class="editor-primary">Играть</button>
          </div>
        </div>

        <details class="editor-json" open>
          <summary>JSON уровня</summary>
          <textarea id="ed-json" readonly spellcheck="false"></textarea>
        </details>
      </div>`;

    document.body.appendChild(this.root);

    const q = <T extends HTMLElement>(id: string): T => {
      const node = this.root.querySelector<T>(`#${id}`);
      if (!node) throw new Error(`Редактор уровней: не найден #${id}`);
      return node;
    };

    this.heading = q('ed-heading');
    this.target = q('ed-target');
    this.loadSelect = q<HTMLSelectElement>('ed-load');
    this.idInput = q<HTMLInputElement>('ed-id');
    this.nameInput = q<HTMLInputElement>('ed-name');
    this.subtitleInput = q<HTMLInputElement>('ed-subtitle');
    this.briefInput = q<HTMLTextAreaElement>('ed-brief');
    this.goalInput = q<HTMLInputElement>('ed-goal');
    this.moneyInput = q<HTMLInputElement>('ed-money');
    this.parInput = q<HTMLInputElement>('ed-par');
    this.limitInput = q<HTMLInputElement>('ed-limit');
    this.noDemolishInput = q<HTMLInputElement>('ed-nodemolish');
    this.availableBox = q('ed-available');
    this.paintBox = q('ed-paint');
    this.grid = q('ed-grid');
    this.presetsBox = q('ed-presets');
    this.presetCount = q('ed-preset-count');
    this.issuesBox = q('ed-issues');
    this.jsonArea = q<HTMLTextAreaElement>('ed-json');
    this.testBtn = q<HTMLButtonElement>('ed-test');
    this.copyBtn = q<HTMLButtonElement>('ed-copy');
    this.downloadBtn = q<HTMLButtonElement>('ed-download');

    this.loadSelect.innerHTML =
      '<option value="">Загрузить уровень…</option>' +
      LEVELS.map((level) => `<option value="${level.id}">${level.id}. ${level.name}</option>`).join('');

    const saved = this.loadPersisted();
    this.draft = saved
      ? this.draftFromLevel(saved.level, saved.tool, saved.paint)
      : this.blankDraft();

    this.buildGrid();
    this.bind();
    this.renderAll();
  }

  get isOpen(): boolean {
    return this.openFlag;
  }

  open(level?: LevelDef): void {
    if (level) {
      this.draft = this.draftFromLevel(level);
    } else {
      const saved = this.loadPersisted();
      this.draft = saved
        ? this.draftFromLevel(saved.level, saved.tool, saved.paint)
        : this.blankDraft();
    }

    this.openFlag = true;
    this.renderAll();
    this.root.classList.remove('hidden');
    this.loadSelect.value = '';
    this.nameInput.focus();
  }

  close(): void {
    if (!this.openFlag) return;
    this.openFlag = false;
    this.root.classList.add('hidden');
    this.onClose();
  }

  /* ---------------------------------------------------------------- */
  /* разметка                                                          */
  /* ---------------------------------------------------------------- */

  private buildGrid(): void {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'editor-cell';
        cell.dataset.r = String(r);
        cell.dataset.c = String(c);
        this.cells.push(cell);
        this.grid.appendChild(cell);
      }
    }
  }

  private renderAll(): void {
    this.renderForm();
    this.renderAvailable();
    this.renderPaint();
    this.renderTools();
    this.refreshGrid();
    this.renderPresets();
    this.sync();
  }

  private renderForm(): void {
    const draft = this.draft;
    this.idInput.value = String(draft.id);
    this.nameInput.value = draft.name;
    this.subtitleInput.value = draft.subtitle;
    this.briefInput.value = draft.brief;
    this.goalInput.value = String(draft.goal);
    this.moneyInput.value = String(draft.startMoney);
    this.parInput.value = draft.parTime === null ? '' : String(draft.parTime);
    this.limitInput.value = draft.timeLimit === null ? '' : String(draft.timeLimit);
    this.noDemolishInput.checked = draft.noDemolish;
  }

  private renderAvailable(): void {
    const draft = this.draft;
    this.availableBox.innerHTML = ALL_BUILDINGS.map((id) => {
      const order = draft.available.indexOf(id);
      const on = order >= 0;
      return `<label class="editor-check${on ? ' on' : ''}">
        <input type="checkbox" data-type="${id}"${on ? ' checked' : ''} />
        <span class="editor-check-ico">${buildingIcon(id, 16)}</span>
        <span>${BUILDINGS[id].name}</span>
        <em>${on ? order + 1 : ''}</em>
      </label>`;
    }).join('');

    this.root.querySelector('#ed-avail-count')!.textContent = draft.available.length
      ? `${draft.available.length} шт.`
      : '';
  }

  private renderPaint(): void {
    this.paintBox.innerHTML = ALL_BUILDINGS.map(
      (id) =>
        `<button type="button" data-paint="${id}" class="${id === this.draft.paint ? 'on' : ''}" title="${BUILDINGS[id].name}">${buildingIcon(id, 20)}</button>`,
    ).join('');
    this.paintBox.classList.toggle('off', this.draft.tool !== 'building');
  }

  private renderTools(): void {
    this.root.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((button) => {
      button.classList.toggle('on', button.dataset.tool === this.draft.tool);
    });
  }

  private refreshGrid(): void {
    const draft = this.draft;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = this.cells[r * COLS + c]!;
        const preset = draft.presets.find((item) => item.r === r && item.c === c);
        const blocked = draft.blocked.some(([br, bc]) => br === r && bc === c);

        cell.className = `editor-cell${preset ? ' has' : ''}${blocked ? ' blocked' : ''}`;

        if (preset) {
          cell.innerHTML =
            `<span class="editor-cell-ico">${buildingIcon(preset.type, 26)}</span>` +
            (preset.deposit !== undefined
              ? `<i class="editor-cell-dep">${preset.deposit}</i>`
              : '');
          cell.title = `${BUILDINGS[preset.type].name} · ${r},${c}`;
        } else if (blocked) {
          cell.innerHTML = '<span class="editor-cell-wall">✕</span>';
          cell.title = `Стена · ${r},${c}`;
        } else {
          cell.innerHTML = '';
          cell.title = `${r},${c}`;
        }
      }
    }
  }

  private renderPresets(): void {
    const presets = this.draft.presets;
    this.presetCount.textContent = presets.length ? `(${presets.length})` : '';
    if (presets.length === 0) {
      this.presetsBox.innerHTML =
        '<div class="editor-empty">Пока пусто: выберите здание и кликните по полю.</div>';
      return;
    }

    this.presetsBox.innerHTML = presets
      .map(
        (preset, index) => `<div class="editor-preset" data-index="${index}">
          <span class="editor-preset-ico">${buildingIcon(preset.type, 18)}</span>
          <span class="editor-preset-name">${BUILDINGS[preset.type].name}</span>
          <span class="editor-preset-pos">${preset.r},${preset.c}</span>
          <label>залежи <input data-field="deposit" type="number" min="1" step="10" value="${preset.deposit ?? ''}" placeholder="∞" /></label>
          <label>темп <input data-field="rate" type="number" min="0.1" step="0.1" value="${preset.rate ?? ''}" placeholder="1" /></label>
          <button type="button" data-remove title="Убрать">✕</button>
        </div>`,
      )
      .join('');
  }

  /* ---------------------------------------------------------------- */
  /* события                                                           */
  /* ---------------------------------------------------------------- */

  private bind(): void {
    this.idInput.addEventListener('input', () => {
      this.draft.id = Math.max(1, parseInt10(this.idInput.value, 1));
      this.sync();
    });
    this.nameInput.addEventListener('input', () => {
      this.draft.name = this.nameInput.value;
      this.sync();
    });
    this.subtitleInput.addEventListener('input', () => {
      this.draft.subtitle = this.subtitleInput.value;
      this.sync();
    });
    this.briefInput.addEventListener('input', () => {
      this.draft.brief = this.briefInput.value;
      this.sync();
    });
    this.goalInput.addEventListener('input', () => {
      this.draft.goal = parseInt10(this.goalInput.value, 0);
      this.sync();
    });
    this.moneyInput.addEventListener('input', () => {
      this.draft.startMoney = parseInt10(this.moneyInput.value, 0);
      this.sync();
    });
    this.parInput.addEventListener('input', () => {
      this.draft.parTime = parseOptional(this.parInput.value);
      this.sync();
    });
    this.limitInput.addEventListener('input', () => {
      this.draft.timeLimit = parseOptional(this.limitInput.value);
      this.sync();
    });
    this.noDemolishInput.addEventListener('change', () => {
      this.draft.noDemolish = this.noDemolishInput.checked;
      this.sync();
    });

    this.availableBox.addEventListener('change', (event) => {
      const input = (event.target as HTMLElement).closest<HTMLInputElement>('input[data-type]');
      if (!input) return;
      const id = input.dataset.type as BuildingId;
      const order = this.draft.available.indexOf(id);
      if (input.checked && order < 0) this.draft.available.push(id);
      else if (!input.checked && order >= 0) this.draft.available.splice(order, 1);
      this.renderAvailable();
      this.sync();
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((button) => {
      button.addEventListener('click', () => {
        this.draft.tool = button.dataset.tool as PaintTool;
        this.renderTools();
        this.renderPaint();
      });
    });

    this.paintBox.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-paint]');
      if (!button) return;
      this.draft.paint = button.dataset.paint as BuildingId;
      this.renderPaint();
    });

    this.grid.addEventListener('pointerdown', (event) => {
      const cell = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-r]');
      if (!cell) return;
      event.preventDefault();
      this.paintCell(Number(cell.dataset.r), Number(cell.dataset.c));
    });

    this.grid.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      const cell = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-r]');
      if (cell) this.eraseCell(Number(cell.dataset.r), Number(cell.dataset.c));
    });

    this.presetsBox.addEventListener('pointerdown', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-remove]');
      if (!button) return;
      const row = button.closest<HTMLElement>('[data-index]');
      const index = Number(row?.dataset.index);
      if (Number.isFinite(index)) {
        this.draft.presets.splice(index, 1);
        this.refreshGrid();
        this.renderPresets();
        this.sync();
      }
    });

    this.presetsBox.addEventListener('input', (event) => {
      const input = (event.target as HTMLElement).closest<HTMLInputElement>('input[data-field]');
      if (!input) return;
      const row = input.closest<HTMLElement>('[data-index]');
      const index = Number(row?.dataset.index);
      const preset = this.draft.presets[index];
      if (!preset) return;

      const base = { type: preset.type, r: preset.r, c: preset.c };
      if (input.dataset.field === 'deposit') {
        const deposit = input.value.trim() === '' ? undefined : Math.max(1, parseInt10(input.value, 1));
        this.draft.presets[index] = {
          ...base,
          ...(preset.rate === undefined ? {} : { rate: preset.rate }),
          ...(deposit === undefined ? {} : { deposit }),
        };
      } else if (input.dataset.field === 'rate') {
        const rate = input.value.trim() === '' ? undefined : Math.max(0.1, parseOptional(input.value) ?? 1);
        this.draft.presets[index] = {
          ...base,
          ...(preset.deposit === undefined ? {} : { deposit: preset.deposit }),
          ...(rate === undefined ? {} : { rate }),
        };
      }

      this.refreshGrid();
      this.sync();
    });

    this.loadSelect.addEventListener('change', () => {
      const level = LEVELS.find((item) => item.id === Number(this.loadSelect.value));
      if (!level) return;
      this.draft = this.draftFromLevel(level);
      this.renderAll();
      this.loadSelect.value = '';
    });

    this.root.querySelector('#ed-new')!.addEventListener('click', () => {
      if (!confirm('Сбросить черновик и начать новый уровень?')) return;
      this.draft = this.blankDraft();
      this.renderAll();
    });

    this.root.querySelector('#ed-close')!.addEventListener('click', () => this.close());

    this.root.addEventListener('pointerdown', (event) => {
      if (event.target === this.root) this.close();
    });

    this.copyBtn.addEventListener('click', () => void this.copy());
    this.downloadBtn.addEventListener('click', () => this.download());
    this.testBtn.addEventListener('click', () => {
      this.onTest(this.buildLevel());
    });

    window.addEventListener('keydown', (event) => {
      if (!this.openFlag) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        this.close();
      }
    });
  }

  private paintCell(r: number, c: number): void {
    const draft = this.draft;
    if (draft.tool === 'erase') {
      this.eraseCell(r, c);
      return;
    }

    const presetIndex = draft.presets.findIndex((item) => item.r === r && item.c === c);
    const blockedIndex = draft.blocked.findIndex(([br, bc]) => br === r && bc === c);

    if (draft.tool === 'wall') {
      if (presetIndex >= 0) draft.presets.splice(presetIndex, 1);
      if (blockedIndex < 0) draft.blocked.push([r, c]);
    } else {
      if (blockedIndex >= 0) draft.blocked.splice(blockedIndex, 1);
      if (presetIndex >= 0) {
        const current = draft.presets[presetIndex]!;
        draft.presets[presetIndex] = { ...current, type: draft.paint };
      } else {
        draft.presets.push({ type: draft.paint, r, c });
      }
    }

    this.refreshGrid();
    this.renderPresets();
    this.sync();
  }

  private eraseCell(r: number, c: number): void {
    const draft = this.draft;
    const presetIndex = draft.presets.findIndex((item) => item.r === r && item.c === c);
    const blockedIndex = draft.blocked.findIndex(([br, bc]) => br === r && bc === c);
    if (presetIndex < 0 && blockedIndex < 0) return;

    if (presetIndex >= 0) draft.presets.splice(presetIndex, 1);
    if (blockedIndex >= 0) draft.blocked.splice(blockedIndex, 1);
    this.refreshGrid();
    this.renderPresets();
    this.sync();
  }

  /* ---------------------------------------------------------------- */
  /* модель и вывод                                                    */
  /* ---------------------------------------------------------------- */

  private blankDraft(): EditorDraft {
    const maxId = LEVELS.reduce((max, level) => Math.max(max, level.id), 0);
    return {
      id: maxId + 1,
      name: '',
      subtitle: '',
      brief: '',
      goal: 500,
      startMoney: 300,
      parTime: 120,
      timeLimit: null,
      noDemolish: false,
      available: ['mine', 'smelter', 'press', 'warehouse'],
      presets: [],
      blocked: [],
      tool: 'building',
      paint: 'mine',
    };
  }

  private draftFromLevel(level: LevelDef, tool: PaintTool = 'building', paint?: BuildingId): EditorDraft {
    return {
      id: level.id,
      name: level.name,
      subtitle: level.subtitle,
      brief: level.brief,
      goal: level.goal,
      startMoney: level.startMoney,
      parTime: level.parTime ?? null,
      timeLimit: level.timeLimit ?? null,
      noDemolish: level.noDemolish ?? false,
      available: [...level.available],
      presets: level.presets.map((preset) => ({ ...preset })),
      blocked: (level.blocked ?? []).map(([r, c]) => [r, c] as [number, number]),
      tool,
      paint: paint ?? level.available[0] ?? 'mine',
    };
  }

  private buildLevel(): LevelDef {
    const draft = this.draft;
    const presets: LevelPreset[] = draft.presets.map((preset) => ({
      type: preset.type,
      r: preset.r,
      c: preset.c,
      ...(preset.deposit === undefined ? {} : { deposit: preset.deposit }),
      ...(preset.rate === undefined ? {} : { rate: preset.rate }),
    }));

    return {
      id: draft.id,
      name: draft.name.trim(),
      subtitle: draft.subtitle.trim(),
      brief: draft.brief.trim(),
      goal: Math.round(draft.goal),
      startMoney: Math.round(draft.startMoney),
      available: [...draft.available],
      presets,
      ...(draft.blocked.length > 0
        ? { blocked: draft.blocked.map(([r, c]) => [r, c] as [number, number]) }
        : {}),
      ...(draft.timeLimit === null ? {} : { timeLimit: Math.round(draft.timeLimit) }),
      ...(draft.parTime === null ? {} : { parTime: Math.round(draft.parTime) }),
      ...(draft.noDemolish ? { noDemolish: true } : {}),
    };
  }

  private issuesFor(level: LevelDef): Issue[] {
    const issues: Issue[] = [];
    const add = (text: string, error = false): void => {
      issues.push({ text, error });
    };

    if (level.id < 1) add('ID должен быть положительным', true);
    else if (LEVELS.some((item) => item.id === level.id)) {
      add(`id ${level.id} уже занят — скачанный файл заменит существующий ${this.levelFileName(level.id)}`, false);
    }

    if (!level.name) add('Укажите название уровня', true);
    if (!level.subtitle) add('Подзаголовок пуст — карта покажет только название', false);
    if (!level.brief) add('Описание миссии пустое', true);
    if (level.goal <= 0) add('Цель должна быть больше нуля', true);
    if (level.startMoney < 0) add('Стартовый капитал не может быть отрицательным', true);
    if (level.available.length === 0) add('Выберите хотя бы одну постройку для палитры', true);
    if (level.available.length > 9) add('Больше девяти построек не влезет в горячие клавиши 1–9', false);

    if (level.parTime !== undefined && level.parTime <= 0) add('Норматив должен быть больше нуля', true);
    if (level.timeLimit !== undefined && level.timeLimit <= 0) add('Лимит времени должен быть больше нуля', true);
    if (
      level.parTime !== undefined &&
      level.timeLimit !== undefined &&
      level.parTime > level.timeLimit
    ) {
      add('Норматив больше лимита времени — третью звезду взять невозможно', false);
    }

    for (const preset of level.presets) {
      if (this.draft.blocked.some(([r, c]) => r === preset.r && c === preset.c)) {
        add(`На клетке ${preset.r},${preset.c} одновременно стена и здание`, true);
      }
    }

    return issues;
  }

  private actIndexFor(id: number): number {
    const index = id - 1;
    return ACTS.findIndex((act) => index >= act.from && index <= act.to);
  }

  /** Имя файла уровня: 01.json, 02.json, … — как в src/game/levels. */
  private levelFileName(id: number): string {
    return `${String(id).padStart(2, '0')}.json`;
  }

  private targetLabel(id: number): string {
    const file = `src/game/levels/${this.levelFileName(id)}`;
    const actIndex = this.actIndexFor(id);
    if (actIndex < 0) {
      return `${file} — id вне пяти актов, добавьте диапазон в ACTS`;
    }
    return `${file} · ACT${actIndex + 1} (${ACTS[actIndex]!.title})`;
  }

  private sync(): void {
    const level = this.buildLevel();
    this.heading.textContent = level.name || 'Новый уровень';
    this.target.textContent = this.targetLabel(level.id);

    const json = JSON.stringify(level, null, 2).replace(
      /\[\s+(-?\d+),\s+(-?\d+)\s+\]/g,
      '[$1, $2]',
    );
    if (this.jsonArea.value !== json) this.jsonArea.value = json;

    const issues = this.issuesFor(level);
    const hasErrors = issues.some((issue) => issue.error);
    this.issuesBox.innerHTML = issues.length
      ? issues
          .map(
            (issue) =>
              `<span class="${issue.error ? 'bad' : 'warn'}">${issue.error ? '✕' : '!'} ${issue.text}</span>`,
          )
          .join('')
      : '<span class="ok">✓ Готово — можно копировать JSON или скачать файл уровня</span>';

    this.testBtn.disabled = hasErrors;
    this.copyBtn.disabled = hasErrors;
    this.downloadBtn.disabled = hasErrors;

    this.persist(level);
  }

  private persist(level: LevelDef): void {
    try {
      const data: PersistedDraft = { level, tool: this.draft.tool, paint: this.draft.paint };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // приватный режим — черновик просто не сохранится
    }
  }

  private loadPersisted(): PersistedDraft | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as Partial<PersistedDraft>;
      if (!data.level || typeof data.level.id !== 'number') return null;
      return {
        level: data.level,
        tool: data.tool ?? 'building',
        paint: data.paint ?? data.level.available[0] ?? 'mine',
      };
    } catch {
      return null;
    }
  }

  /* ---------------------------------------------------------------- */
  /* действия                                                          */
  /* ---------------------------------------------------------------- */

  private async copy(): Promise<void> {
    const text = this.jsonArea.value;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      this.jsonArea.select();
      document.execCommand('copy');
    }
    this.flash(this.copyBtn, 'Скопировано ✓');
  }

  private download(): void {
    const level = this.buildLevel();
    this.saveJson(this.levelFileName(level.id), `${this.jsonArea.value}\n`);
    this.flash(this.downloadBtn, 'Скачано ✓');
  }

  private saveJson(fileName: string, text: string): void {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  private flash(button: HTMLButtonElement, text: string): void {
    const original = button.textContent ?? '';
    button.textContent = text;
    window.setTimeout(() => {
      button.textContent = original;
    }, 1400);
  }
}
