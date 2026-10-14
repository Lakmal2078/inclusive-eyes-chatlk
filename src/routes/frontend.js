import { html } from 'hono/html';
import {
  serviceWorker,
  icon192,
  icon512,
  icon192PngBase64,
  icon512PngBase64,
  appleTouchIconBase64,
  favicon32PngBase64,
  faviconIcoBase64,
  offlineHtml,
  manifestJson
} from '../static/pwa-assets.js';
import css from '../static/css/style.js';
import js from '../static/app-bundle.js';

let appJsCode = js;
try {
  if (typeof process !== 'undefined' && process.versions?.node) {
    const { readFileSync, existsSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const appPath = fileURLToPath(new URL('../static/js/app.js', import.meta.url));
    if (existsSync(appPath)) {
      appJsCode = readFileSync(appPath, 'utf8');
    }
  }
} catch {}

function base64ToUint8Array(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function serveFrontend(c) {
  return c.html(html`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#0D6B60">
  <meta name="color-scheme" content="light dark">
  <meta name="description" content="ChatLK — private, local-first conversations for Sinhala, Tamil, and English communities">
  <meta property="og:title" content="ChatLK — Conversations that feel closer.">
  <meta property="og:description" content="ChatLK — private, local-first conversations for Sinhala, Tamil, and English communities">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="icon" href="/favicon.ico">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.json">
  <link rel="stylesheet" href="/style.css">
  <title>ChatLK — Conversations that feel closer.</title>
</head>
<body>
  <main id="app"></main>
  <script type="module" src="/app.js"></script>
</body>
</html>`);
}

export const serveStyle = c => c.body(css, { headers: { 'content-type': 'text/css; charset=utf-8' } });
export const serveApp = c => c.body(appJsCode, { headers: { 'content-type': 'text/javascript; charset=utf-8' } });
export const serveManifest = c => c.body(manifestJson, { headers: { 'content-type': 'application/manifest+json; charset=utf-8' } });
export const serveServiceWorker = c => c.body(serviceWorker, { headers: { 'content-type': 'application/javascript; charset=utf-8' } });
export const serveOfflinePage = c => c.html(offlineHtml);

export const serveIcon192 = c => c.body(icon192, { headers: { 'content-type': 'image/svg+xml' } });
export const serveIcon512 = c => c.body(icon512, { headers: { 'content-type': 'image/svg+xml' } });

export const serveIcon192Png = c => c.body(base64ToUint8Array(icon192PngBase64), { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' } });
export const serveIcon512Png = c => c.body(base64ToUint8Array(icon512PngBase64), { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' } });
export const serveAppleTouchIcon = c => c.body(base64ToUint8Array(appleTouchIconBase64), { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' } });
export const serveFavicon32 = c => c.body(base64ToUint8Array(favicon32PngBase64), { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' } });
export const serveFaviconIco = c => c.body(base64ToUint8Array(faviconIcoBase64), { headers: { 'content-type': 'image/x-icon', 'cache-control': 'public, max-age=86400' } });
