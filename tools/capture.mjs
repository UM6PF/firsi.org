// Captures pleine page de chaque URL, sur ordinateur et mobile, pour la comparaison visuelle.
// Usage : node tools/capture.mjs <dossier-site> <pages.json> <dossier-sortie>
// pages.json : [{ "name": "mission", "path": "/mission.html" }, ...]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const [root, pagesFile, outDir] = process.argv.slice(2);
const pages = JSON.parse(fs.readFileSync(pagesFile, 'utf8'));
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
fs.mkdirSync(outDir, { recursive: true });

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.json': 'application/json',
  '.pdf': 'application/pdf', '.xml': 'application/xml', '.txt': 'text/plain' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(root, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'Content-Type': types[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ channel: 'msedge' });
const viewports = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } };

for (const [vp, size] of Object.entries(viewports)) {
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  for (const pg of pages) {
    if (only && !only.includes(pg.name)) continue;
    const page = await ctx.newPage();
    await page.clock.install({ time: new Date('2026-10-08T10:00:00Z') });
    await page.goto(base + pg.path, { waitUntil: 'networkidle' }).catch(() => {});
    // Parcourt la page pour déclencher le chargement différé des images.
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += size.height / 2) { await page.evaluate(v => window.scrollTo(0, v), y); await page.waitForTimeout(60); }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.evaluate(() => Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));
    await page.clock.runFor(8000);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, `${pg.name}.${vp}.png`), fullPage: true, animations: 'disabled' });
    await page.close();
  }
  await ctx.close();
}
await browser.close();
server.close();
console.log('captures terminées :', outDir);
