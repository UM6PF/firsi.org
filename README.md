# Site de la FIRSI

Site vitrine de la Fondation Ibn Rochd pour les Sciences et l'Innovation, généré avec [Eleventy 3](https://www.11ty.dev/) et édité par l'équipe communication dans [CloudCannon](https://cloudcannon.com/).

Le design est figé : l'équipe ne modifie que le contenu (textes, images, ordre des éléments), jamais le balisage ni le CSS.

## Commandes

```bash
npm install          # une seule fois
npm start            # aperçu local sur http://localhost:8080 (rechargement automatique)
npm run build        # génère le site dans _site/
```

## Organisation

| Dossier | Contenu |
|---|---|
| `src/pages/fr/`, `src/pages/en/` | Contenu des pages : un fichier par page et par langue, uniquement des données (front matter YAML). |
| `src/actualites/fr/`, `src/actualites/en/` | Collection des actualités (et événements) : une fiche par article. |
| `src/_data/` | Données partagées : menu et pied de page (`nav.json`), logos partenaires, catégories d'actualités… |
| `src/_includes/pages/` | Gabarits des pages (balisage figé + zones éditables CloudCannon). |
| `src/_includes/partials/` | En-tête, pied de page, fil d'Ariane, titre avec mot mis en valeur (`hl.liquid`), scripts communs. |
| `src/assets/` | CSS (`firsi.css`, inchangé) et images. |
| `src/static/` | Fichiers copiés tels quels (redirections des anciennes adresses d'articles). |
| `archive/` | Prototype d'origine et maquettes, conservés pour référence (non publiés). |
| `tools/` | Outils de contrôle : captures avant/après et comparaison au pixel (`capture.mjs`, `diff.mjs`), liens et erreurs JS (`check.mjs`). |

## Adresses

Les pages sont publiées sans extension `.html` : `/mission/`, `/en/mission/`, `/actualites/<article>/`. Les anciennes adresses du prototype (`mission.html`, `mission-en.html`, `article.html?id=…`) redirigent vers les nouvelles.

## Zones éditables

Les zones sont déclarées avec les attributs `data-editable` du paquet officiel [`@cloudcannon/editable-regions`](https://github.com/CloudCannon/editable-regions). Le script d'édition (`/register-components.js`) n'est chargé que dans l'éditeur visuel de CloudCannon, jamais sur le site public.

## Variables d'environnement

- `SITE_URL` : adresse publique du site sans `/` final (ex. `https://www.firsi.org`), utilisée pour les balises canonical, hreflang, Open Graph et le `sitemap.xml`.
