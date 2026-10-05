import { build } from 'esbuild';

const root = new URL('../', import.meta.url).pathname;

await build({
  entryPoints: [root + 'src/main.ts'],
  outfile: root + 'panel/main.js',
  bundle: true,
  minify: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2022',
});

await build({
  entryPoints: [root + 'src/background.ts'],
  outfile: root + 'background/main.js',
  bundle: true,
  minify: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2022',
});

console.log('TTS AutoPlay bundles built.');
