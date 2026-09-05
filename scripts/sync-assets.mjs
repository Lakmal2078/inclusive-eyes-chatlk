import { readFile, writeFile } from 'node:fs/promises';
import esbuild from 'esbuild';

const css = await readFile('src/static/css/style.css', 'utf8');
const js = await readFile('src/static/js/app.js', 'utf8');
await writeFile('src/static/css/style.js', `export default ${JSON.stringify(css)};\n`);
await writeFile('src/static/app-bundle.js', `export default ${JSON.stringify(js)};\n`);

await esbuild.build({
  entryPoints: ['src/components/ChatRoom.tsx'],
  outfile: 'src/components/ChatRoom.js',
  format: 'esm',
  jsx: 'automatic'
});

await esbuild.build({
  entryPoints: ['src/components/ChatSettings.tsx'],
  outfile: 'src/components/ChatSettings.js',
  format: 'esm',
  jsx: 'automatic'
});

await esbuild.build({
  entryPoints: ['src/components/UserPresenceStatus.tsx'],
  outfile: 'src/components/UserPresenceStatus.js',
  format: 'esm',
  jsx: 'automatic'
});
