import fs from "node:fs";

// Règles de redirection 301 de l'ancien site firsi.org (voir redirections_ancien_site.json).
// Le champ « from » du routage CloudCannon est une expression régulière appliquée à l'adresse entière :
// chaque adresse est déclinée avec le préfixe /index.php (ancien Drupal) et avec un « / » final facultatif,
// sauf quand la version avec « / » est justement la nouvelle adresse (pour éviter une boucle).
const { pages } = JSON.parse(fs.readFileSync(new URL("./redirections_ancien_site.json", import.meta.url), "utf8"));
const echap = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default [
  { from: "/index\\.php/?", to: "/" },
  ...pages.flatMap(({ from, to }) =>
    [from, "/index.php" + from].map(f => ({
      from: echap(f) + (f + "/" === to ? "" : "/?"),
      to,
    }))
  ),
];
