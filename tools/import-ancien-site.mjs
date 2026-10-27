// Import des actualités de l'ancien site firsi.org (Drupal) dans la collection src/actualites/fr/.
// Usage : node tools/import-ancien-site.mjs <articles.json>
//   articles.json : [{ "url": "/actualites/<slug>", "date": "JJ.MM.AAAA" }, …] (liste de l'ancien site)
// Pour chaque article : texte nettoyé (balises autorisées seulement), image principale et documents liés rapatriés,
// liens réécrits vers le nouveau site. Les fiches existantes (même sujet) sont mises à jour en gardant leurs réglages
// de mise à la une ; les nouvelles sont créées.
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';

const ANCIEN = 'https://firsi.org';
const [listeFichier] = process.argv.slice(2);
const liste = JSON.parse(fs.readFileSync(listeFichier, 'utf8'));
const redirections = JSON.parse(fs.readFileSync('src/_data/redirections_ancien_site.json', 'utf8')).pages;
const docsData = JSON.parse(fs.readFileSync('src/_data/documents_ancien_site.json', 'utf8'));
const DIR_IMG = 'src/assets/img/actualites';
const DIR_DOC = 'src/assets/docs/ancien-site';
fs.mkdirSync(DIR_IMG, { recursive: true });
fs.mkdirSync(DIR_DOC, { recursive: true });

const slugify = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9.]+/g, '-').replace(/-+/g, '-').replace(/-\./g, '.').replace(/^-|-$/g, '');
const yamlStr = s => JSON.stringify(s ?? '');

// Correspondance ancienne adresse d'article -> identifiant de fiche existante
const existants = {};
for (const r of redirections) {
  const m = r.from.match(/^\/actualites\/(.+)$/); const n = r.to.match(/^\/actualites\/([^/]+)\/$/);
  if (m && n) existants[m[1]] = n[1];
}
const redirige = new Map(redirections.map(r => [r.from, r.to]));

function categorie(titre) {
  const t = titre.toLowerCase();
  if (/rapport d.activit/.test(t)) return 'rapports';
  if (/bourse|retenus|campagne|candidature|admission|reconduction/.test(t)) return 'bourses';
  if (/^[a-zà-ÿ'-]+ [a-zà-ÿ'-]+ ?:/i.test(titre) && !/firsi|um6p|cycle|rencontre/i.test(titre.split(':')[0])) return 'portraits';
  return 'evenements';
}

async function telecharger(url, dossier, nom) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(path.join(dossier, nom), buf);
  return buf.length;
}

async function documentLocal(href) {
  const abs = new URL(href, ANCIEN);
  const chemin = decodeURIComponent(abs.pathname);
  const deja = docsData.documents.find(d => d.ancien === chemin);
  if (deja) return deja.nouveau;
  const nom = slugify(chemin.split('/').slice(-2).join('-'));
  const taille = await telecharger(abs.href, DIR_DOC, nom);
  if (taille > 40 * 1024 * 1024) { fs.unlinkSync(path.join(DIR_DOC, nom)); rapport.gros.push(`${chemin} (${Math.round(taille / 1048576)} Mo)`); return abs.href; }
  const nouveau = `/assets/docs/ancien-site/${nom}`;
  docsData.documents.push({ ancien: chemin, nouveau });
  return nouveau;
}

function lienInterne(href) {
  const u = new URL(href, ANCIEN);
  let p = decodeURIComponent(u.pathname).replace(/^\/index\.php/, '').replace(/\/$/, '') || '/';
  if (p === '/') return '/';
  const m = p.match(/^\/actualites\/(.+)$/);
  if (m) return `/actualites/${existants[m[1]] || m[1]}/` + u.hash;
  if (redirige.has(p)) return redirige.get(p) + u.hash;
  return null;
}

// Nettoyage : seules les balises de mise en forme autorisées dans l'éditeur sont conservées.
const AUTORISEES = new Set(['p', 'h2', 'h3', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'blockquote', 'br']);
const RENOMMER = { b: 'strong', i: 'em', h1: 'h2', h4: 'h3', h5: 'h3', h6: 'h3' };
async function nettoyer($, racine, notes) {
  for (const el of $(racine).find('*').toArray().reverse()) {
    const tag = el.tagName.toLowerCase();
    const $el = $(el);
    if (['script', 'style', 'iframe', 'svg', 'button', 'form', 'input', 'noscript'].includes(tag)) {
      if (tag === 'iframe') notes.push(`contenu intégré retiré (${$el.attr('src') || 'iframe'})`);
      $el.remove(); continue;
    }
    if (tag === 'img') { notes.push(`image dans le texte retirée (${$el.attr('alt') || $el.attr('src')})`); $el.remove(); continue; }
    const nom = RENOMMER[tag] || tag;
    if (!AUTORISEES.has(nom)) { $el.replaceWith($el.contents()); continue; }
    if (nom !== tag) { el.tagName = nom; el.name = nom; }
    const href = nom === 'a' ? $el.attr('href') : null;
    for (const a of Object.keys(el.attribs || {})) $el.removeAttr(a);
    if (nom === 'a' && href) {
      let cible = href.trim();
      if (/^mailto:|^tel:/.test(cible)) {}
      else if (/\/sites\/default\/files\//.test(cible)) cible = await documentLocal(cible);
      else if (/^(https?:)?\/\/(www\.)?firsi\.org|^\//.test(cible)) cible = lienInterne(cible) || new URL(cible, ANCIEN).href;
      $el.attr('href', cible);
      if (/^https?:/.test(cible) && !/firsi\.org/.test(cible)) { $el.attr('target', '_blank'); $el.attr('rel', 'noopener'); }
    } else if (nom === 'a') { $el.replaceWith($el.contents()); }
  }
  // paragraphes vides, puces typographiques « · » transformées en liste
  $(racine).find('p').each((_, p) => { const $p = $(p); if (!$p.text().replace(/ /g, ' ').trim() && !$p.find('br').length) $p.remove(); });
  return $(racine).html().replace(/ /g, ' ').replace(/<br>\s*<\/p>/g, '</p>').trim();
}

const rapport = { crees: [], mis_a_jour: [], notes: {}, gros: [], erreurs: [] };

for (const art of liste) {
  const ancienSlug = art.url.replace(/^\/actualites\//, '');
  try {
    const html = await (await fetch(ANCIEN + art.url)).text();
    const $ = cheerio.load(html);
    const titre = $('.info-banner h2').first().text().replace(/\s+/g, ' ').trim();
    const bloc = $('.fr-transition').first();
    const notes = [];
    // image principale : version originale (sans le style de redimensionnement Drupal)
    let image = '', imageAlt = '';
    const img = bloc.find('img').first();
    if (img.length) {
      const src = img.attr('src').replace(/\/styles\/[^/]+\/public\//, '/').replace(/\?itok=.*$/, '');
      const ext = (path.extname(decodeURIComponent(src)).toLowerCase() || '.jpg').replace('.jpeg', '.jpg');
      const nom = `${(existants[ancienSlug] || ancienSlug).slice(0, 70)}${ext}`;
      try { await telecharger(new URL(src, ANCIEN).href, DIR_IMG, nom); image = `/assets/img/actualites/${nom}`; }
      catch (e) { notes.push('image non récupérée : ' + e.message); }
      imageAlt = (img.attr('alt') || '').trim();
      img.closest('div').remove();
    }
    // texte : premier bloc de contenu, plus la zone de liens/boutons éventuelle
    const corps = bloc.children('div').first();
    const actions = bloc.find('.d-flex.flex-column.gap-4').first();
    const liens = actions.find('a').toArray().map(a => $(a));
    let corpsHtml = await nettoyer($, corps, notes);
    let pdf = '';
    const extras = [];
    for (const $a of liens) {
      const href = $a.attr('href') || ''; const texte = $a.text().replace(/\s+/g, ' ').trim() || 'Lien';
      if (/\.pdf($|\?)/i.test(href)) { const local = await documentLocal(href); if (!pdf) pdf = local; extras.push(`<p><a href="${local}">${texte}</a></p>`); }
      else if (href) { const cible = /^https?:/.test(href) && !/firsi\.org/.test(href) ? href : (lienInterne(href) || new URL(href, ANCIEN).href); extras.push(`<p><a href="${cible}"${/^https?:/.test(cible) && !/firsi\.org/.test(cible) ? ' target="_blank" rel="noopener"' : ''}>${texte}</a></p>`); }
    }
    if (!pdf) { const m = corpsHtml.match(/href="(\/assets\/docs\/[^"]+\.pdf)"/); if (m) pdf = m[1]; }
    corpsHtml = [corpsHtml, ...extras].filter(Boolean).join('\n');
    if (!corpsHtml) notes.push('aucun texte');

    // date : JJ.MM.AAAA de la liste ; sinon date de publication de la page
    let date = '';
    const d = art.date.match(/^(\d\d)\.(\d\d)\.(\d{4})$/);
    if (d) date = `${d[3]}-${d[2]}-${d[1]}`;
    else { const meta = $('meta[property="article:published_time"]').attr('content'); if (meta) date = meta.slice(0, 10); else notes.push('date inconnue'); }

    const texteBrut = cheerio.load(`<div>${corpsHtml}</div>`)('div').text().replace(/\s+/g, ' ').trim();
    let resume = texteBrut.slice(0, 200);
    if (texteBrut.length > 200) resume = resume.slice(0, resume.lastIndexOf(' ')) + '…';
    if (resume.length > 165) { resume = texteBrut.slice(0, 160); resume = resume.slice(0, resume.lastIndexOf(' ')) + '…'; }

    const id = existants[ancienSlug] || ancienSlug;
    const fichier = `src/actualites/fr/${id}.md`;
    let conserve = { a_la_une: false, ordre_une: null, titre_une: '', evenement: null };
    const existe = fs.existsSync(fichier);
    if (existe) {
      const fm = fs.readFileSync(fichier, 'utf8').split(/^---\s*$/m)[1];
      const v = k => (fm.match(new RegExp(`^${k}:\\s*(.*)$`, 'm')) || [])[1]?.trim();
      conserve.a_la_une = v('a_la_une') === 'true';
      conserve.ordre_une = v('ordre_une') && v('ordre_une') !== 'null' ? Number(v('ordre_une')) : null;
      conserve.titre_une = (v('titre_une') || '').replace(/^"|"$/g, '');
      if (!image) { image = (v('image') || '').replace(/^"|"$/g, ''); }
    }
    const cat = categorie(titre);
    const lignes = [
      '---',
      `titre: ${yamlStr(titre)}`,
      conserve.titre_une ? `titre_une: ${yamlStr(conserve.titre_une)}` : null,
      `date: ${date}`,
      `categorie: ${cat}`,
      `image: ${yamlStr(image)}`,
      `image_alt: ${yamlStr(imageAlt && !/^(voices|e|image|firsi)$/i.test(imageAlt) ? imageAlt : titre)}`,
      `resume: ${yamlStr(resume)}`,
      `pdf: ${yamlStr(pdf)}`,
      `a_la_une: ${conserve.a_la_une}`,
      conserve.ordre_une ? `ordre_une: ${conserve.ordre_une}` : null,
      'brouillon: false',
      cat === 'evenements' ? 'evenement:\n  date_debut:\n  date_fin:\n  lieu: ""\n  lien_inscription: ""' : null,
      `ancienne_adresse: ${yamlStr('https://firsi.org' + art.url)}`,
      '---',
      corpsHtml,
      '',
    ].filter(l => l !== null);
    fs.writeFileSync(fichier, lignes.join('\n'));
    (existe ? rapport.mis_a_jour : rapport.crees).push(`${date} ${id} [${cat}]`);
    if (notes.length) rapport.notes[id] = notes;
  } catch (e) { rapport.erreurs.push(`${art.url} : ${e.message}`); }
}

fs.writeFileSync('src/_data/documents_ancien_site.json', JSON.stringify(docsData, null, 2) + '\n');
console.log(JSON.stringify(rapport, null, 1));
