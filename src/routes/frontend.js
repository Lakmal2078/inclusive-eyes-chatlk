import { html } from 'hono/html';
import { serviceWorker, icon192, icon512 } from '../static/pwa-assets.js';
import css from '../static/css/style.js';
import js from '../static/app-bundle.js';

export function serveFrontend(c) {
  return c.html(html`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#075E54"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><link rel="manifest" href="/manifest.json"><link rel="stylesheet" href="/style.css"><title>ChatLK</title></head><body><main id="app"></main><script type="module" src="/app.js"></script></body></html>`);
}
export const serveStyle = c => c.body(css, { headers: { 'content-type': 'text/css; charset=utf-8' } });
export const serveApp = c => c.body(js, { headers: { 'content-type': 'text/javascript; charset=utf-8' } });
export const serveManifest = c => c.json({ name: 'ChatLK', short_name: 'ChatLK', start_url: '/', display: 'standalone', theme_color: '#075E54', background_color: '#ECE5DD', icons: [{ src: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' }, { src: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' }] });
export const serveServiceWorker = c => c.body(serviceWorker, { headers: { 'content-type': 'application/javascript' } });
export const serveIcon192 = c => c.body(icon192, { headers: { 'content-type': 'image/svg+xml' } });
export const serveIcon512 = c => c.body(icon512, { headers: { 'content-type': 'image/svg+xml' } });
