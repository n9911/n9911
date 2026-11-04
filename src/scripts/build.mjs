// Publish only the site, illustrations and downloads. No Git operations.
import { mkdir, copyFile, cp, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const output = path.join(root, '_site');
await mkdir(path.join(output, 'src/scripts'), { recursive: true });
await copyFile(path.join(root, 'index.html'), path.join(output, 'index.html'));
for (const folder of ['assets', 'styles']) await cp(path.join(root, 'src', folder), path.join(output, 'src', folder), { recursive: true });
await copyFile(path.join(root, 'src/scripts/site.js'), path.join(output, 'src/scripts/site.js'));
const launch = await readFile(path.join(root, 'src/LAUNCH.md'), 'utf8');
await copyFile(path.join(root, 'src/LAUNCH.md'), path.join(output, 'src/LAUNCH.md'));
await copyFile(path.join(root, 'src/launch.html'), path.join(output, 'src/launch.html'));
if (!launch.includes('assets/launch.zip')) throw new Error('Missing source download');
for (const item of await readdir(output)) if (item !== 'index.html' && item !== 'src') throw new Error(`Unexpected site output: ${item}`);
console.log('Built _site: index.html and src assets/styles/browser script. No repository writes.');
