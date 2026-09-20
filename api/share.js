export default async function handler(req, res) {
  // Récupère l'ID du produit et le code d'affiliation
  const { id, ref } = req.query;

  // ⚠️ Indiquez l'URL exacte de votre base Firebase Realtime Database
  const FIREBASE_DB_URL = "https://VOTRE_PROJET_FIREBASE.firebaseio.com";
  const SITE_URL = "https://dakproelite-acheteur.vercel.app";

  if (!id) {
    return res.redirect(SITE_URL);
  }

  try {
    // Interrogation directe de Firebase côté serveur
    const response = await fetch(`${FIREBASE_DB_URL}/publications/${id}.json`);
    const product = await response.json();

    if (!product) {
      return res.redirect(SITE_URL);
    }

    // Extraction des informations du produit
    const title = product.nom || product.titre || "Produit DAKPROELITE";
    const description = product.description 
      ? product.description.substring(0, 150) + "..." 
      : "Cliquez ici pour découvrir ce produit et commander directement sur DAKPROELITE.";
    const image = product.image || product.imageUrl || (Array.isArray(product.images) ? product.images[0] : `${SITE_URL}/icon.png`);

    // URL de destination vers laquelle le client sera redirigé
    const destinationUrl = `${SITE_URL}/index.html?id=${id}${ref ? '&ref=' + ref : ''}`;

    // Génération du HTML lu par WhatsApp, Facebook, TikTok
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  
  <!-- Open Graph Meta Tags -->
  <meta property="og:type" content="product" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:secure_url" content="${image}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="600" />
  <meta property="og:image:height" content="600" />
  <meta property="og:url" content="${destinationUrl}" />
  <meta property="og:site_name" content="DAKPROELITE" />

  <!-- Twitter / TikTok Link Cards -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />

  <!-- Redirection automatique du client vers l'application -->
  <script>
    window.location.href = "${destinationUrl}";
  </script>
  <meta http-equiv="refresh" content="0;url=${destinationUrl}">
</head>
<body style="background:#0a0d14; color:#fff; font-family:sans-serif; text-align:center; padding-top:50px;">
  <p>Redirection vers DAKPROELITE en cours...</p>
  <a href="${destinationUrl}" style="color:#d4af37;">Cliquez ici si la redirection ne fonctionne pas.</a>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (error) {
    console.error("Erreur serveur :", error);
    return res.redirect(SITE_URL);
  }
}


