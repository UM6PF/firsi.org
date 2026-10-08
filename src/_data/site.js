// Adresse publique du site, utilisée pour les balises canonical, hreflang et Open Graph.
// À définir dans la variable d'environnement SITE_URL lors du build (sans / final).
export default {
  url: process.env.SITE_URL || "",
  og_image: "/assets/img/accueil-etudiantes.jpg",
};
