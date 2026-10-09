// Convertit une page HTML en PDF A4 avec Edge (Playwright).
// Usage : node tools/pdf.mjs <entrée.html> <sortie.pdf> [titre du pied de page]
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const [input, output, titre = 'Guide de l\'équipe communication'] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage();
await page.goto(pathToFileURL(path.resolve(input)).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.pdf({
  path: output,
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate: '<div style="width:100%;font-family:Arial,sans-serif;font-size:7.5pt;color:#8A94A6;padding:0 17mm;display:flex;justify-content:space-between"><span>FIRSI · ' + titre + '</span><span class="pageNumber"></span></div>',
});
await browser.close();
console.log('PDF écrit :', output);
