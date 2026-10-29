import fs from "node:fs";

// Règles de redirection 301 de l'ancien site firsi.org (voir redirections_ancien_site.json et documents_ancien_site.json).
// Le champ « from » du routage CloudCannon est une expression régulière appliquée à l'adresse entière :
// chaque adresse est déclinée avec le préfixe /index.php (ancien Drupal) et avec un « / » final facultatif,
// sauf quand la version avec « / » est justement la nouvelle adresse (pour éviter une boucle).
const lire = f => JSON.parse(fs.readFileSync(new URL(f, import.meta.url), "utf8"));
const { pages } = lire("./redirections_ancien_site.json");
const { documents } = lire("./documents_ancien_site.json");
const echap = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Documents : l'adresse peut arriver encodée (%20, %C3%A9…) ou non ; accents composés ou décomposés.
const variantes = chemin => [...new Set([chemin, chemin.normalize("NFC"), chemin.normalize("NFD")].flatMap(c => [c, encodeURI(c)]))];

export default [
  { from: "/index\\.php/?", to: "/" },
  ...pages.flatMap(({ from, to }) =>
    [from, "/index.php" + from].map(f => ({
      from: echap(f) + (f + "/" === to ? "" : "/?"),
      to,
    }))
  ),
  ...documents.flatMap(({ ancien, nouveau }) =>
    variantes(ancien).map(f => ({ from: echap(f), to: nouveau }))
  ),
];
