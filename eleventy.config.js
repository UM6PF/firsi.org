import { HtmlBasePlugin } from "@11ty/eleventy";
import editableRegions from "@cloudcannon/editable-regions/eleventy";

// Pages du site : identifiant -> adresse (sans extension .html).
// L'identifiant est le même en français et en anglais.
export function pageUrl(id, lang = "fr") {
  const prefix = lang === "en" ? "/en" : "";
  if (!id || id === "index") return prefix + "/";
  return `${prefix}/${id}/`;
}

export default function (eleventyConfig) {
  // Sur GitHub Pages le site est servi sous /firsi.org/ ; sur CloudCannon à la racine.
  eleventyConfig.addPlugin(HtmlBasePlugin);
  // Zones éditables CloudCannon : génère /register-components.js, chargé uniquement dans l'éditeur.
  eleventyConfig.addPlugin(editableRegions);

  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/static": "/" });
  // Fichiers copiés tels quels : ne pas les traiter comme des gabarits.
  eleventyConfig.ignores.add("src/static/**");

  eleventyConfig.addFilter("page_url", (id, lang) => pageUrl(id, lang));

  // Actualités, de la plus récente à la plus ancienne, par langue.
  for (const lang of ["fr", "en"]) {
    eleventyConfig.addCollection(`actualites_${lang}`, api =>
      api.getFilteredByGlob(`src/actualites/${lang}/*.md`)
        .filter(item => !item.data.brouillon)
        .sort((a, b) => b.date - a.date));
  }

  eleventyConfig.addFilter("where_value", (list, key, value) => (list || []).filter(i => i.data[key] === value));

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["md", "liquid", "html"],
    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "liquid",
    pathPrefix: process.env.PATH_PREFIX || "/",
  };
}
