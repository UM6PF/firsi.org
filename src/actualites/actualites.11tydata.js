import fs from "node:fs";
import { pageUrl } from "../../eleventy.config.js";

// Données communes à tous les articles (src/actualites/fr/*.md et src/actualites/en/*.md).
// La langue vient du dossier, l'identifiant de l'article du nom de fichier.
const parts = data => data.page.filePathStem.split("/"); // ["", "actualites", "fr", "khaoula-riad"]
const other = lang => (lang === "en" ? "fr" : "en");
const exists = (lang, id) => fs.existsSync(new URL(`./${lang}/${id}.md`, import.meta.url));

// Mois abrégés (pastille de date de la grande carte de l'accueil).
const MOIS = {
  fr: ["Janv", "Févr", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

export default {
  layout: "pages/article.liquid",
  section: "actualites",
  og_type: "article",
  brouillon: false,
  eleventyComputed: {
    lang: data => parts(data)[2],
    article_id: data => parts(data)[3],
    permalink: data => pageUrl("actualites", parts(data)[2]) + parts(data)[3] + "/index.html",
    alternate_url: data => {
      const [, , lang, id] = parts(data);
      const alt = other(lang);
      return exists(alt, id) ? pageUrl("actualites", alt) + id + "/" : pageUrl("actualites", alt);
    },
    // <title> = « <titre> | FIRSI »
    title: data => `${data.titre} | FIRSI`,
    // Description et image de partage (balises <meta>) : résumé et image de l'article.
    seo: data => ({ description: data.resume, image: data.image }),
    // Le prototype de la page article (FR) n'a pas de classe sur <body> ; la version EN a « pb-sticky ».
    body_class: data => (parts(data)[2] === "en" ? "pb-sticky" : ""),
    // Badge dérivé de la catégorie (src/_data/categories.json).
    badge: data => {
      const c = (data.categories || []).find(x => x.id === data.categorie);
      return c ? { classe: c.classe, libelle: c[parts(data)[2]].badge } : { classe: "", libelle: "" };
    },
    // Texte court (liste, accueil) : date_courte si renseignée, sinon date_affichee.
    date_liste: data => data.date_courte || data.date_affichee,
    // Jour et mois abrégé calculés depuis « date » (accueil).
    date_jour: data => (data.page.date ? String(data.page.date.getUTCDate()) : ""),
    date_mois: data => (data.page.date ? MOIS[parts(data)[2]][data.page.date.getUTCMonth()] : ""),
  },
};
