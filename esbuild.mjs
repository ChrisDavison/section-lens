import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

const notices = await readFile('THIRD-PARTY-NOTICES.txt', 'utf8');

await build({
  entryPoints: ['src/main.ts'],
  outfile: 'main.js',
  bundle: true,
  format: 'cjs',
  target: 'es2022',
  external: ['obsidian', '@codemirror/state', '@codemirror/view', '@codemirror/language'],
  banner: { js: `/*! Section Lens — MIT licensed; built from src/.\n${notices}*/` },
});
