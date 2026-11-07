import fs from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage } from 'node:http';
import { defineConfig, type Plugin } from 'vite';
import { formatLevelJson, levelFileName, readLevel } from './src/game/levels/validate';

const SAVE_PATH = '/__level/save';
const MAX_BODY = 256 * 1024;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;

    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('JSON слишком большой'));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

/**
 * Dev-only эндпоинт редактора уровней: принимает LevelDef и записывает
 * его в src/game/levels/NN.json. В production-сборке плагина нет.
 */
function levelSaver(): Plugin {
  return {
    name: 'level-saver',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(SAVE_PATH, (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        void (async () => {
          try {
            const body = await readBody(req);
            const payload = JSON.parse(body) as { level?: unknown };
            if (!payload.level) throw new Error('В теле запроса нет поля level');

            const level = readLevel(payload.level, 'редактор');
            const file = levelFileName(level.id);
            const target = path.resolve(server.config.root, 'src/game/levels', file);
            await fs.writeFile(target, formatLevelJson(level), 'utf8');

            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ ok: true, file, path: `src/game/levels/${file}` }));
          } catch (error) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(
              JSON.stringify({
                ok: false,
                error: error instanceof Error ? error.message : String(error),
              }),
            );
          }
        })();
      });
    },
  };
}

export default defineConfig({
  // относительный base: сборка работает и в корне домена, и в подпапке
  // (GitHub Pages отдаёт проект по /ChainReaction/)
  base: './',
  plugins: [levelSaver()],
  server: {
    open: true,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
  },
});
