import { pageUrl } from "../../eleventy.config.js";

// Données communes à toutes les pages fixes (src/pages/fr/*.md et src/pages/en/*.md).
// La langue vient du dossier, l'identifiant de page du nom de fichier
// (filePathStem plutôt que fileSlug, qui renvoie le nom du dossier pour index.md).
const parts = data => data.page.filePathStem.split("/"); // ["", "pages", "fr", "mission"]
const other = lang => (lang === "en" ? "fr" : "en");

export default {
  eleventyComputed: {
    lang: data => parts(data)[2],
    page_id: data => parts(data)[3],
    permalink: data => pageUrl(parts(data)[3], parts(data)[2]) + "index.html",
    alternate_url: data => pageUrl(parts(data)[3], other(parts(data)[2])),
  },
};
