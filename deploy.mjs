import { copyFile, mkdir, realpath } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import process from 'node:process';

const vault = process.argv[2];
if (!vault) throw new Error('Usage: npm run deploy -- /absolute/path/to/vault');
// Offline deployment defaults to Obsidian's standard config directory; pass a custom one as the second argument.
const configDir = process.argv[3] ?? '.obsidian';
const destination = join(await realpath(resolve(vault)), configDir, 'plugins/section-lens');
await mkdir(destination, { recursive: true });
for (const name of ['manifest.json', 'main.js']) {
  if (resolve(name) !== join(destination, name)) await copyFile(name, join(destination, name));
}
console.log(`Deployed Section Lens to ${destination}. Reload the plugin in Obsidian.`);
