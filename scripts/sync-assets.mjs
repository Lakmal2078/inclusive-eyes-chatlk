import { readFile, writeFile } from 'node:fs/promises';
const css = await readFile('src/static/css/style.css', 'utf8');
const js = await readFile('src/static/js/app.js', 'utf8');
await writeFile('src/static/css/style.js', `export default ${JSON.stringify(css)};\n`);
await writeFile('src/static/app-bundle.js', `export default ${JSON.stringify(js)};\n`);
