import { readFile, writeFile } from 'node:fs/promises';
import esbuild from 'esbuild';

const css = await readFile('src/static/css/style.css', 'utf8');
const js = await readFile('src/static/js/app.js', 'utf8');
await writeFile('src/static/css/style.js', `export default ${JSON.stringify(css)};\n`);
await writeFile('src/static/app-bundle.js', `export default ${JSON.stringify(js)};\n`);

const swJs = await readFile('public/sw.js', 'utf8');
const icon192Svg = await readFile('public/icon-192.svg', 'utf8');
const icon512Svg = await readFile('public/icon-512.svg', 'utf8');
const icon192Png = (await readFile('public/icon-192.png')).toString('base64');
const icon512Png = (await readFile('public/icon-512.png')).toString('base64');
const appleIcon = (await readFile('public/apple-touch-icon.png')).toString('base64');
const fav32Png = (await readFile('public/favicon-32x32.png')).toString('base64');
const favIco = (await readFile('public/favicon.ico')).toString('base64');
const offlineHtml = await readFile('public/offline.html', 'utf8');
const manifest = await readFile('public/manifest.json', 'utf8');

const pwaAssetsContent = `export const serviceWorker = ${JSON.stringify(swJs)};
export const icon192 = ${JSON.stringify(icon192Svg)};
export const icon512 = ${JSON.stringify(icon512Svg)};
export const icon192PngBase64 = ${JSON.stringify(icon192Png)};
export const icon512PngBase64 = ${JSON.stringify(icon512Png)};
export const appleTouchIconBase64 = ${JSON.stringify(appleIcon)};
export const favicon32PngBase64 = ${JSON.stringify(fav32Png)};
export const faviconIcoBase64 = ${JSON.stringify(favIco)};
export const offlineHtml = ${JSON.stringify(offlineHtml)};
export const manifestJson = ${JSON.stringify(manifest)};
`;
await writeFile('src/static/pwa-assets.js', pwaAssetsContent);


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

await esbuild.build({
  entryPoints: ['src/components/Status.tsx'],
  outfile: 'src/components/Status.js',
  format: 'esm',
  jsx: 'automatic'
});

await esbuild.build({
  entryPoints: ['src/components/Calls.tsx'],
  outfile: 'src/components/Calls.js',
  format: 'esm',
  jsx: 'automatic'
});
