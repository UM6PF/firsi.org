// Compare deux dossiers de captures et écrit les différences.
// Usage : node tools/diff.mjs <avant> <après> <dossier-diff>
// Pour chaque capture : identique, ou zone (boîte englobante) des pixels différents.
// Si les tailles diffèrent, compare la zone commune (en haut à gauche) et signale la différence de taille.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const [beforeDir, afterDir, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });

const crop = (img, w, h) => {
  const o = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) img.data.copy(o.data, y * w * 4, y * img.width * 4, y * img.width * 4 + w * 4);
  return o;
};

let ok = 0, ko = 0;
for (const file of fs.readdirSync(beforeDir).filter(f => f.endsWith('.png')).sort()) {
  const afterFile = path.join(afterDir, file);
  if (!fs.existsSync(afterFile)) { console.log(`MANQUANT  ${file}`); ko++; continue; }
  let a = PNG.sync.read(fs.readFileSync(path.join(beforeDir, file)));
  let b = PNG.sync.read(fs.readFileSync(afterFile));
  const size = a.width !== b.width || a.height !== b.height ? ` [taille ${a.width}x${a.height} -> ${b.width}x${b.height}]` : '';
  const w = Math.min(a.width, b.width), h = Math.min(a.height, b.height);
  if (size) { a = crop(a, w, h); b = crop(b, w, h); }
  const d = new PNG({ width: w, height: h });
  const n = pixelmatch(a.data, b.data, d.data, w, h, { threshold: 0 });
  if (n === 0 && !size) { ok++; continue; }
  ko++;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (d.data[i] === 255 && d.data[i + 1] === 0 && d.data[i + 2] === 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (n) fs.writeFileSync(path.join(outDir, file), PNG.sync.write(d));
  console.log(`DIFF  ${file}  ${n} px${n ? ` zone x${x0}-${x1} y${y0}-${y1}` : ''}${size}`);
}
console.log(`\n${ok} identiques, ${ko} différentes`);
