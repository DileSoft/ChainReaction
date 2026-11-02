import './style.css';

import { Game } from './game/Game';
import { Renderer } from './game/Renderer';
import { Sound } from './game/Sound';
import { App } from './ui/App';

const canvas = document.getElementById('board');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Canvas #board не найден');
}

const game = new Game();
const sound = new Sound();
const renderer = new Renderer(canvas, game, sound);
const app = new App(game, renderer, sound);

// в dev-сборке удобно ковырять состояние из консоли и гонять автопроверку уровней
if (import.meta.env.DEV) {
  const host = window as unknown as {
    __game?: Game;
    __verify?: () => unknown;
  };
  host.__game = game;
  void import('./dev/verify').then(({ verifyLevels }) => {
    // отдельная модель: проверка не трогает прогресс и не мешает живому циклу
    host.__verify = () => verifyLevels(new Game());
  });
}

app.start();
