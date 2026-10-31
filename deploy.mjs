import { copyFile, mkdir, realpath } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const vault = process.argv[2];
if (!vault) throw new Error('Usage: npm run deploy -- /absolute/path/to/vault');
const destination = join(await realpath(resolve(vault)), '.obsidian/plugins/section-lens');
await mkdir(destination, { recursive: true });
for (const name of ['manifest.json', 'main.js']) {
  if (resolve(name) !== join(destination, name)) await copyFile(name, join(destination, name));
}
console.log(`Deployed Section Lens to ${destination}. Reload the plugin in Obsidian.`);
