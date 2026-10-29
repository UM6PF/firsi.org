// Contrôle qualité du site généré : poids, images, accessibilité de base, référencement, affichage mobile.
// Usage : node tools/audit.mjs [_site]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const root = process.argv[2] || '_site';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json' };
const server = http.createServer((q, s) => {
  let f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(s);
});
await new Promise(r => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;
const pages = [];
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name === 'index.html') pages.push('/' + path.relative(root, p).replace(/\\/g, '/').replace(/index\.html$/, '')); } };
walk(root);

const browser = await chromium.launch({ channel: 'msedge' });
const rows = [];
for (const [vp, size] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport: size });
  for (const url of pages) {
    const page = await ctx.newPage();
    let bytes = 0; const heavy = [];
    page.on('response', async r => { try { const b = (await r.body()).length; bytes += b; if (b > 300 * 1024) heavy.push(`${r.url().replace(base, '')} (${Math.round(b / 1024)} Ko)`); } catch {} });
    await page.goto(base + url, { waitUntil: 'networkidle' }).catch(() => {});
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); } window.scrollTo(0, 0); });
    await page.waitForLoadState('networkidle').catch(() => {});
    const info = await page.evaluate(() => {
      const imgs = [...document.images];
      return {
        title: document.title, lang: document.documentElement.lang,
        desc: document.querySelector('meta[name=description]')?.content || '',
        h1: document.querySelectorAll('h1').length,
        noAlt: imgs.filter(i => !i.hasAttribute('alt')).map(i => i.getAttribute('src')),
        oversized: imgs.filter(i => i.naturalWidth && i.clientWidth && i.naturalWidth > 2.2 * i.clientWidth * devicePixelRatio && i.naturalWidth > 900).map(i => `${i.getAttribute('src')} ${i.naturalWidth}px pour ${i.clientWidth}px`),
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        emptyLinks: [...document.querySelectorAll('a')].filter(a => !a.textContent.trim() && !a.getAttribute('aria-label') && !a.querySelector('img[alt]:not([alt=""])')).length,
      };
    });
    rows.push({ vp, url, ko: Math.round(bytes / 1024), heavy, ...info });
    await page.close();
  }
  await ctx.close();
}
await browser.close(); server.close();
fs.writeFileSync('.work/audit.json', JSON.stringify(rows, null, 1));
const desk = rows.filter(r => r.vp === 'desktop');
console.log(`${desk.length} pages. Poids moyen : ${Math.round(desk.reduce((s, r) => s + r.ko, 0) / desk.length)} Ko ; max : ${Math.max(...desk.map(r => r.ko))} Ko`);
for (const r of rows) {
  const pb = [];
  if (r.ko > 2500) pb.push(`lourde ${r.ko} Ko`);
  if (r.h1 !== 1) pb.push(`${r.h1} titre(s) h1`);
  if (!r.desc && !/404|contact-merci/.test(r.url)) pb.push('sans description');
  if (r.noAlt.length) pb.push(`images sans alt: ${r.noAlt.join(', ')}`);
  if (r.oversized.length) pb.push(`images surdimensionnées: ${r.oversized.join(' ; ')}`);
  if (r.overflow > 1) pb.push(`déborde de ${r.overflow}px`);
  if (r.emptyLinks) pb.push(`${r.emptyLinks} lien(s) sans texte`);
  if (pb.length) console.log(`[${r.vp}] ${r.url} : ${pb.join(' | ')}`);
}
