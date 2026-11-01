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

app.start();
