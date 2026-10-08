// Vérifie le site généré : liens internes cassés, ressources manquantes, erreurs JavaScript.
// Usage : node tools/check.mjs [_site]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const root = process.argv[2] || '_site';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain' };
const resolve = p => {
  let f = path.join(root, decodeURIComponent(p));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  return fs.existsSync(f) ? f : null;
};
const server = http.createServer((req, res) => {
  const f = resolve(new URL(req.url, 'http://x').pathname);
  if (!f) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

const pages = [];
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name === 'index.html' || e.name === '404.html') pages.push('/' + path.relative(root, p).replace(/\\/g, '/').replace(/index\.html$/, '')); } };
walk(root);

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage();
const problems = [];
for (const url of pages) {
  const errs = [];
  page.removeAllListeners();
  page.on('pageerror', e => errs.push('JS: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(base)) errs.push(`HTTP ${r.status()}: ${r.url().replace(base, '')}`); });
  await page.goto(base + url, { waitUntil: 'networkidle' }).catch(e => errs.push('nav: ' + e.message));
  const links = await page.$$eval('a[href]', as => as.map(a => a.getAttribute('href')));
  for (const h of links) {
    if (!h || h.startsWith('#') || /^(https?:|mailto:|tel:|javascript:)/.test(h)) continue;
    const p = new URL(h, base + url).pathname;
    if (!resolve(p)) errs.push('lien cassé: ' + h);
  }
  if (errs.length) problems.push([url, [...new Set(errs)]]);
}
await browser.close();
server.close();
console.log(`${pages.length} pages vérifiées`);
for (const [u, e] of problems) console.log(`\n${u}\n  - ` + e.join('\n  - '));
if (!problems.length) console.log('Aucun problème.');
