import {
    ref,
    push,
    onValue,
    set,
    get,
    serverTimestamp,
    remove
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";


/* ============================================================
   DAKPROÉLITE — SUPPORT RAPIDE
   VERSION INTÉGRÉE FIREBASE PUBLICATIONS + GALERIE

   ARCHITECTURE CONSERVÉE :
   - Firebase Realtime Database
   - users/{uid}
   - messages_support/{uid}
   - publications/
   - init(container, db, auth, userId)
   - WhatsApp
   - Email
   - Lecture audio
   - Copie
   - Réponses automatiques
   - Reconnaissance vocale
   - Recherche réelle des produits Firebase
   - Choix d'image depuis la galerie
   - Identification par comparaison d'image
   - Nettoyage automatique toutes les 10 minutes
   ============================================================ */


/* ============================================================
   CONFIGURATION
   ============================================================ */

const DAKPRO_CONFIG = {

    MARKETPLACE_URL:
        "https://marketplace.acheteur.dakproelite.com",

    VENDEUR_URL:
        "https://vendeur.dakproelite.com",

    LIVREUR_URL:
        "",

    ADMIN_WHATSAPP:
        "2290197455309",

    ADMIN_EMAIL:
        "contact@dakproelite.com",

    APP_NAME:
        "DAKPROÉLITE",

    /* 10 MINUTES */
    MESSAGE_RETENTION_MS:
        10 * 60 * 1000,

    MESSAGE_CLEANUP_INTERVAL_MS:
        10 * 60 * 1000,

    /* Nombre maximum d'images Firebase à comparer */
    MAX_IMAGES_TO_COMPARE:
        80
};


/* ============================================================
   PROTECTION HTML
   ============================================================ */

function escapeHTML(str) {

    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* ============================================================
   FORMATAGE DU BOT
   ============================================================ */

function formatBotText(str) {

    let html =
        escapeHTML(str);

    html = html.replace(
        /(https:\/\/[^\s<]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer" class="support-link">$1</a>'
    );

    html = html.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
    );

    html = html.replace(
        /\n/g,
        "<br>"
    );

    return html;
}


/* ============================================================
   NORMALISATION
   ============================================================ */

function normaliserTexte(str) {

    return String(str ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}


/* ============================================================
   EXTRACTION DES INFORMATIONS PRODUIT
   Compatible avec différentes structures Firebase
   ============================================================ */

function obtenirNomProduit(p = {}) {

    return (
        p.nom ||
        p.name ||
        p.titre ||
        p.title ||
        p.nomProduit ||
        p.libelle ||
        p.productName ||
        "Produit"
    );
}


function obtenirCategorieProduit(p = {}) {

    return (
        p.categorie ||
        p.category ||
        p.categorieProduit ||
        p.categoryName ||
        ""
    );
}


function obtenirDescriptionProduit(p = {}) {

    return (
        p.description ||
        p.desc ||
        p.details ||
        p.descriptionProduit ||
        ""
    );
}


function obtenirPrixProduit(p = {}) {

    return (
        p.prix ??
        p.price ??
        p.prixNormal ??
        p.priceNormal ??
        ""
    );
}


function obtenirPrixPromo(p = {}) {

    return (
        p.prixPromo ??
        p.prix_promo ??
        p.promoPrice ??
        p.pricePromo ??
        p.prixPromotion ??
        p.salePrice ??
        ""
    );
}


function obtenirStockProduit(p = {}) {

    return (
        p.stock ??
        p.quantite ??
        p.quantity ??
        ""
    );
}


function obtenirVendeurProduit(p = {}) {

    return (
        p.vendeur ||
        p.seller ||
        p.nomVendeur ||
        p.sellerName ||
        p.ownerName ||
        p.createur ||
        "Non renseigné"
    );
}


/* ============================================================
   EXTRACTION IMAGE PRODUIT
   ============================================================ */

function obtenirImageProduit(p = {}) {

    const possibles = [

        p.image,

        p.imageUrl,

        p.imageURL,

        p.photo,

        p.photoUrl,

        p.photoURL,

        p.urlImage,

        p.productImage,

        p.imageProduit,

        p.thumbnail,

        p.url,

        p.images?.[0],

        p.photos?.[0],

        p.gallery?.[0]
    ];

    for (const image of possibles) {

        if (typeof image === "string" &&
            /^https?:\/\//i.test(image)) {

            return image;
        }
    }

    return "";
}


/* ============================================================
   RÉCUPÉRER LES VRAIES PUBLICATIONS FIREBASE
   ============================================================ */

async function chargerPublicationsFirebase(db) {

    try {

        const publicationsRef =
            ref(db, "publications");

        const snapshot =
            await get(publicationsRef);

        if (!snapshot.exists()) {

            return [];
        }

        const data =
            snapshot.val();

        const produits = [];

        Object.entries(data || {})
            .forEach(([firebaseKey, produit]) => {

                if (!produit) return;

                produits.push({

                    ...produit,

                    firebaseKey,

                    nom: obtenirNomProduit(produit),

                    categorie:
                        obtenirCategorieProduit(produit),

                    description:
                        obtenirDescriptionProduit(produit),

                    prix:
                        obtenirPrixProduit(produit),

                    prixPromo:
                        obtenirPrixPromo(produit),

                    stock:
                        obtenirStockProduit(produit),

                    vendeur:
                        obtenirVendeurProduit(produit),

                    image:
                        obtenirImageProduit(produit)
                });
            });

        return produits;

    } catch (error) {

        console.error(
            "Erreur lecture publications Firebase :",
            error
        );

        return [];
    }
}


/* ============================================================
   RECHERCHE PRODUIT DANS FIREBASE
   ============================================================ */

async function rechercherProduitFirebase(
    db,
    texte
) {

    const recherche =
        normaliserTexte(texte);

    if (
        !recherche ||
        recherche.length < 2
    ) {

        return null;
    }

    const produits =
        await chargerPublicationsFirebase(db);

    if (!produits.length) {

        return null;
    }

    let meilleurProduit = null;

    let meilleurScore = 0;

    produits.forEach((p) => {

        const nom =
            normaliserTexte(
                p.nom
            );

        const categorie =
            normaliserTexte(
                p.categorie
            );

        const description =
            normaliserTexte(
                p.description
            );

        if (!nom) return;

        let score = 0;

        if (recherche === nom) {

            score += 150;
        }

        if (nom.includes(recherche)) {

            score += 100;
        }

        if (
            recherche.includes(nom) &&
            nom.length > 3
        ) {

            score += 80;
        }

        if (
            categorie.includes(recherche)
        ) {

            score += 35;
        }

        if (
            description.includes(recherche)
        ) {

            score += 20;
        }

        const mots =
            recherche
                .split(/\s+/)
                .filter(
                    mot => mot.length >= 3
                );

        mots.forEach((mot) => {

            if (nom.includes(mot)) {

                score += 15;
            }

            if (categorie.includes(mot)) {

                score += 7;
            }

            if (description.includes(mot)) {

                score += 4;
            }
        });

        if (score > meilleurScore) {

            meilleurScore =
                score;

            meilleurProduit =
                p;
        }
    });

    return meilleurScore >= 20
        ? meilleurProduit
        : null;
}


/* ============================================================
   RECHERCHE LOCALE DE SECOURS
   ============================================================ */

function rechercherProduitLocal(texte) {

    const produits =
        Array.isArray(
            window.allProductsData
        )
            ? window.allProductsData
            : [];

    if (!produits.length) {

        return null;
    }

    const recherche =
        normaliserTexte(texte);

    let meilleurProduit = null;

    let meilleurScore = 0;

    produits.forEach((p) => {

        const nom =
            normaliserTexte(
                obtenirNomProduit(p)
            );

        const categorie =
            normaliserTexte(
                obtenirCategorieProduit(p)
            );

        const description =
            normaliserTexte(
                obtenirDescriptionProduit(p)
            );

        let score = 0;

        if (nom === recherche) {

            score += 100;
        }

        if (nom.includes(recherche)) {

            score += 70;
        }

        if (categorie.includes(recherche)) {

            score += 25;
        }

        if (description.includes(recherche)) {

            score += 15;
        }

        if (score > meilleurScore) {

            meilleurScore =
                score;

            meilleurProduit =
                p;
        }
    });

    return meilleurScore >= 20
        ? meilleurProduit
        : null;
}


/* ============================================================
   FORMATAGE DU DÉTAIL PRODUIT
   ============================================================ */

function construireDetailsProduit(produit) {

    if (!produit) {

        return "";
    }

    const nom =
        obtenirNomProduit(produit);

    const categorie =
        obtenirCategorieProduit(produit);

    const description =
        obtenirDescriptionProduit(produit);

    const prix =
        obtenirPrixProduit(produit);

    const prixPromo =
        obtenirPrixPromo(produit);

    const stock =
        obtenirStockProduit(produit);

    const vendeur =
        obtenirVendeurProduit(produit);

    let texte =
        `🔎 **PRODUIT TROUVÉ SUR DAKPROÉLITE**

🛍️ **${nom}**

`;

    if (categorie) {

        texte +=
            `📂 **Catégorie :** ${categorie}\n\n`;
    }

    if (
        prixPromo !== "" &&
        prixPromo !== null &&
        prixPromo !== undefined
    ) {

        texte +=
            `🔥 **Prix promotionnel :** ${prixPromo} FCFA\n`;

        if (
            prix !== "" &&
            prix !== null &&
            prix !== undefined
        ) {

            texte +=
                `💰 **Prix normal :** ${prix} FCFA\n`;
        }

    } else if (
        prix !== "" &&
        prix !== null &&
        prix !== undefined
    ) {

        texte +=
            `💰 **Prix :** ${prix} FCFA\n`;
    }

    if (stock !== "") {

        texte +=
            `📦 **Stock :** ${stock}\n`;
    }

    if (vendeur) {

        texte +=
            `🏪 **Vendeur :** ${vendeur}\n`;
    }

    if (description) {

        texte +=
            `\n📝 **Description :**\n${description}\n`;
    }

    texte += `

🌐 **Marketplace :**
${DAKPRO_CONFIG.MARKETPLACE_URL}

📌 Vérifiez toujours la fiche réelle du produit avant de finaliser votre commande.`;

    return texte;
}


/* ============================================================
   RÉPONSES AUTOMATIQUES
   ============================================================ */

function obtenirReponseAutomatique(
    texteMessage,
    produit = null
) {

    const text =
        normaliserTexte(
            texteMessage
        );


    /* PRODUIT TROUVÉ */

    if (produit) {

        return construireDetailsProduit(
            produit
        );
    }


    /* ACCÈS MARKETPLACE */

    if (
        text.includes("lien acheteur") ||
        text.includes("application acheteur") ||
        text.includes("marketplace acheteur") ||
        text.includes("comment acceder") ||
        text.includes("ou acheter") ||
        text.includes("site acheteur") ||
        text.includes("lien marketplace")
    ) {

        return `🛍️ **ACCÉDER À LA MARKETPLACE DAKPROÉLITE**

🌐 ${DAKPRO_CONFIG.MARKETPLACE_URL}

Vous pouvez ouvrir ce lien depuis votre téléphone, tablette ou ordinateur.

📱 **INSTALLATION**

Lorsque l'option apparaît, appuyez sur :

**« Installer l'application sur l'appareil »**

🛒 **POUR ACHETER**

1. Recherchez votre produit.
2. Ouvrez sa fiche.
3. Ajoutez-le au panier.
4. Ouvrez votre panier.
5. Connectez-vous ou créez votre compte.
6. Effectuez le paiement.
7. Consultez votre commande.
8. Consultez votre reçu lorsqu'il est disponible.

🔐 Utilisez uniquement les interfaces officielles DAKPROÉLITE.`;
    }


    /* INSTALLATION */

    if (
        text.includes("installer l application") ||
        text.includes("installer application") ||
        text.includes("installer dakproelite") ||
        text.includes("installation") ||
        text.includes("installer sur mon telephone")
    ) {

        return `📱 **INSTALLER DAKPROÉLITE**

1️⃣ Ouvrez :

${DAKPRO_CONFIG.MARKETPLACE_URL}

2️⃣ Attendez le chargement.

3️⃣ Recherchez :

**« Installer l'application sur l'appareil »**

4️⃣ Appuyez dessus.

5️⃣ Confirmez l'installation.

⚠️ Si le bouton n'apparaît pas, rechargez la page et utilisez un navigateur compatible PWA.`;
    }


    /* ACHETEUR */

    if (
        text.includes("devenir acheteur") ||
        text.includes("creer compte acheteur") ||
        text.includes("inscription acheteur") ||
        text.includes("compte acheteur")
    ) {

        return `👤 **DEVENIR ACHETEUR DAKPROÉLITE**

🌐 ${DAKPRO_CONFIG.MARKETPLACE_URL}

1. Appuyez sur **S'inscrire / Créer un compte**.
2. Renseignez vos informations.
3. Vérifiez les informations.
4. Validez votre inscription.
5. Connectez-vous à votre espace acheteur.

🔐 Ne communiquez jamais votre mot de passe ou vos codes de validation.`;
    }


    /* ACHAT */

    if (
        text.includes("acheter un produit") ||
        text.includes("comment acheter") ||
        text.includes("passer une commande") ||
        text.includes("faire une commande") ||
        text.includes("commander un produit") ||
        text.includes("comment commander")
    ) {

        return `🛒 **COMMENT ACHETER SUR DAKPROÉLITE**

🌐 ${DAKPRO_CONFIG.MARKETPLACE_URL}

1️⃣ Recherchez le produit.
2️⃣ Ouvrez sa fiche.
3️⃣ Vérifiez les informations.
4️⃣ Appuyez sur **Ajouter au panier**.
5️⃣ Ouvrez votre panier.
6️⃣ Vérifiez les produits.
7️⃣ Connectez-vous ou inscrivez-vous.
8️⃣ Suivez la procédure de paiement.
9️⃣ Attendez la confirmation.
🔟 Consultez ensuite vos **Commandes**.

📌 Conservez votre numéro de commande et votre reçu lorsqu'il est disponible.`;
    }


    /* PANIER */

    if (
        text.includes("panier") ||
        text.includes("ajouter au panier") ||
        text.includes("vider panier") ||
        text.includes("produit dans mon panier")
    ) {

        return `🛒 **VOTRE PANIER DAKPROÉLITE**

1. Ouvrez la marketplace.
2. Sélectionnez un produit.
3. Appuyez sur **Ajouter au panier**.
4. Ouvrez **Panier**.
5. Vérifiez les articles.
6. Modifiez votre sélection si nécessaire.
7. Continuez vers le paiement.

⚠️ Vérifiez les produits et quantités avant de payer.`;
    }


    /* PAIEMENT */

    if (
        text.includes("payer") ||
        text.includes("paiement") ||
        text.includes("comment payer") ||
        text.includes("paiement securise") ||
        text.includes("payer ma commande") ||
        text.includes("moyen de paiement")
    ) {

        return `💳 **PAIEMENT DAKPROÉLITE**

1. Ouvrez votre panier.
2. Vérifiez votre commande.
3. Appuyez sur **Paiement**.
4. Connectez-vous si nécessaire.
5. Suivez les instructions.
6. Attendez la confirmation.

🔐 Ne communiquez jamais votre code secret ou code de validation à une personne extérieure à la procédure officielle.`;
    }


    /* REÇU */

    if (
        text.includes("recu") ||
        text.includes("preuve de paiement") ||
        text.includes("ou est mon recu")
    ) {

        return `🧾 **REÇU DE PAIEMENT**

Après confirmation :

1. Connectez-vous à votre espace acheteur.
2. Ouvrez **Commandes**.
3. Sélectionnez la commande.
4. Consultez les informations et le reçu lorsqu'il est disponible.

⚠️ Si le paiement n'est pas confirmé, ne considérez pas automatiquement la commande comme payée.`;
    }


    /* COMMANDES */

    if (
        text.includes("ma commande") ||
        text.includes("mes commandes") ||
        text.includes("suivre commande") ||
        text.includes("suivi commande") ||
        text.includes("ou est ma commande") ||
        text.includes("commande en cours")
    ) {

        return `📦 **SUIVRE VOTRE COMMANDE**

Connectez-vous à votre espace acheteur puis ouvrez :

**Commandes**

Vous pourrez consulter les informations disponibles concernant votre commande.

📌 Gardez votre numéro de commande.`;
    }


    /* LIVRAISON */

    if (
        text.includes("livraison") ||
        text.includes("livreur") ||
        text.includes("mon colis") ||
        text.includes("colis") ||
        text.includes("livre")
    ) {

        return `🚚 **LIVRAISON DAKPROÉLITE**

1. Consultez votre commande.
2. Vérifiez les informations de livraison.
3. Suivez les informations transmises.
4. Lorsque le colis est remis, vérifiez-le avant de confirmer sa réception.

⚠️ Ne communiquez jamais votre mot de passe ou vos codes de sécurité à une personne qui prétend être livreur.`;
    }


    /* RÉCEPTION */

    if (
        text.includes("confirmer reception") ||
        text.includes("colis recu") ||
        text.includes("reception colis") ||
        text.includes("confirmer que jai recu") ||
        text.includes("confirmer livraison")
    ) {

        return `✅ **CONFIRMATION DE RÉCEPTION**

Lorsque le colis est réellement remis :

1. Vérifiez le colis.
2. Vérifiez le produit.
3. Vérifiez la commande.
4. Utilisez la procédure officielle.
5. Confirmez uniquement si vous avez réellement reçu le colis.

⚠️ Ne confirmez jamais une livraison que vous n'avez pas reçue.`;
    }


    /* REMBOURSEMENT */

    if (
        text.includes("remboursement") ||
        text.includes("rembourser") ||
        text.includes("recuperer mon argent") ||
        text.includes("commande non recue") ||
        text.includes("litige") ||
        text.includes("produit non conforme")
    ) {

        return `🔄 **REMBOURSEMENT ET RÉCLAMATION**

1. Ne confirmez pas faussement la réception.
2. Conservez votre numéro de commande.
3. Conservez les preuves utiles.
4. Prenez des photos ou vidéos si nécessaire.
5. Contactez le support.
6. Expliquez clairement la situation.

📌 La demande sera examinée conformément aux règles applicables.`;
    }


    /* SÉCURITÉ */

    if (
        text.includes("fraude") ||
        text.includes("arnaque") ||
        text.includes("escroquerie") ||
        text.includes("tricher") ||
        text.includes("frauder") ||
        text.includes("compte bloque") ||
        text.includes("suspension")
    ) {

        return `🛡️ **SÉCURITÉ DAKPROÉLITE**

Il est notamment interdit de :

• fournir de fausses informations ;
• utiliser de faux documents ;
• effectuer de fausses réclamations ;
• tenter de frauder ;
• détourner une transaction hors plateforme ;
• utiliser frauduleusement le compte d'une autre personne.

⚠️ Une violation vérifiée peut entraîner des mesures conformément aux règles de la plateforme.`;
    }


    /* RÈGLEMENT */

    if (
        text.includes("reglement") ||
        text.includes("conditions") ||
        text.includes("cgu") ||
        text.includes("regles") ||
        text.includes("charte")
    ) {

        return `⚖️ **RÈGLES D'UTILISATION DAKPROÉLITE**

✅ Fournir des informations exactes.
✅ Utiliser son propre compte.
✅ Respecter les autres utilisateurs.
✅ Utiliser les procédures officielles.
✅ Ne pas frauder.
✅ Ne pas contourner le paiement.
✅ Ne pas fournir de faux documents.
✅ Respecter les procédures de commande et de livraison.`;
    }


    /* CONFIDENTIALITÉ */

    if (
        text.includes("confidentialite") ||
        text.includes("donnees personnelles") ||
        text.includes("vie privee") ||
        text.includes("protection des donnees") ||
        text.includes("rgpd")
    ) {

        return `🔒 **POLITIQUE DE CONFIDENTIALITÉ DAKPROÉLITE**

• Ne partagez pas votre mot de passe.
• Ne partagez pas vos codes de validation.
• Vérifiez les personnes avec lesquelles vous échangez.
• Utilisez les interfaces officielles.
• Ne transmettez pas vos informations sensibles à des inconnus.

📌 En cas de doute concernant une opération sensible, contactez le support.`;
    }


    /* VENDEUR */

    if (
        text.includes("devenir vendeur") ||
        text.includes("comment devenir vendeur") ||
        text.includes("inscription vendeur") ||
        text.includes("compte vendeur") ||
        text.includes("espace vendeur")
    ) {

        return `🏪 **DEVENIR VENDEUR DAKPROÉLITE**

🌐 ${DAKPRO_CONFIG.VENDEUR_URL}

La démarche peut comprendre :

1. Création ou accès au compte vendeur.
2. Renseignement du profil.
3. Fourniture des documents demandés.
4. Vérification.
5. Validation.
6. Accès aux fonctionnalités vendeur.
7. Publication des produits.

⚠️ Ne transmettez jamais de faux documents.`;
    }


    /* DOCUMENTS VENDEUR */

    if (
        text.includes("document vendeur") ||
        text.includes("documents vendeur") ||
        text.includes("piece d identite") ||
        text.includes("cni") ||
        text.includes("passeport")
    ) {

        return `📄 **DOCUMENTS VENDEUR**

🌐 ${DAKPRO_CONFIG.VENDEUR_URL}

Selon la procédure de vérification, la plateforme peut demander :

• Nom et prénom
• Pièce d'identité
• CNI / carte d'identité
• Passeport
• Photographie ou justificatif
• Informations nécessaires à la vérification

📌 Les documents doivent être authentiques et lisibles.`;
    }


    /* CARTE VENDEUR */

    if (
        text.includes("carte professionnelle") ||
        text.includes("carte vendeur") ||
        text.includes("badge vendeur") ||
        text.includes("vendeur professionnel")
    ) {

        return `🪪 **CARTE PROFESSIONNELLE VENDEUR**

Après validation du dossier vendeur, les fonctionnalités ou justificatifs professionnels prévus par DAKPROÉLITE peuvent être générés selon le statut.

📌 La génération dépend de la validation réelle du dossier.`;
    }


    /* PUBLIER */

    if (
        text.includes("publier produit") ||
        text.includes("publier un produit") ||
        text.includes("mettre un produit en vente") ||
        text.includes("ajouter produit vendeur") ||
        text.includes("mes produits vendeur")
    ) {

        return `📦 **PUBLIER UN PRODUIT**

🌐 ${DAKPRO_CONFIG.VENDEUR_URL}

1. Connectez-vous.
2. Ouvrez la rubrique produits.
3. Ajoutez le produit.
4. Ajoutez des photos.
5. Renseignez le nom.
6. Ajoutez les informations.
7. Indiquez le prix.
8. Vérifiez.
9. Publiez.

📌 Les photos et informations doivent réellement correspondre au produit.`;
    }


    /* GAINS */

    if (
        text.includes("vente vendeur") ||
        text.includes("gains vendeur") ||
        text.includes("solde vendeur") ||
        text.includes("argent vendeur") ||
        text.includes("commission vendeur")
    ) {

        return `💰 **VENTES ET GAINS VENDEUR**

🌐 ${DAKPRO_CONFIG.VENDEUR_URL}

Consultez votre tableau de bord vendeur pour connaître les informations réellement enregistrées concernant vos ventes, soldes et conditions financières.`;
    }


    /* RETRAIT */

    if (
        text.includes("retrait vendeur") ||
        text.includes("retirer mes gains") ||
        text.includes("retrait de gains") ||
        text.includes("retirer argent")
    ) {

        return `💳 **RETRAIT DES GAINS VENDEUR**

Connectez-vous à :

${DAKPRO_CONFIG.VENDEUR_URL}

Puis consultez les fonctionnalités financières disponibles dans votre espace.

📌 Les moyens de retrait disponibles dépendent de la configuration active.`;
    }


    /* LIVREUR */

    if (
        text.includes("devenir livreur") ||
        text.includes("comment devenir livreur") ||
        text.includes("inscription livreur") ||
        text.includes("compte livreur") ||
        text.includes("espace livreur")
    ) {

        return `🚚 **DEVENIR LIVREUR DAKPROÉLITE**

Pour devenir livreur, suivez la procédure officielle de vérification.

La démarche peut comprendre :

1. Création du compte.
2. Renseignement de l'identité.
3. Fourniture des documents.
4. Vérification.
5. Validation.
6. Accès aux fonctionnalités livreur.

⚠️ Ne fournissez jamais de faux documents.`;
    }


    /* DOCUMENTS LIVREUR */

    if (
        text.includes("documents livreur") ||
        text.includes("document livreur") ||
        text.includes("piece identite livreur") ||
        text.includes("cni livreur") ||
        text.includes("passeport livreur")
    ) {

        return `📄 **DOCUMENTS LIVREUR**

La procédure officielle peut demander :

• Nom et prénom
• Pièce d'identité
• CNI / carte d'identité
• Passeport
• Photographie ou justificatif
• Autres informations nécessaires

🔐 Les documents doivent être authentiques et appartenir à la personne concernée.`;
    }


    /* AFFILIATION */

    if (
        text.includes("affiliation") ||
        text.includes("affilie") ||
        text.includes("ambassadeur") ||
        text.includes("parrainage") ||
        text.includes("lien affiliation")
    ) {

        return `🏆 **PROGRAMME AMBASSADEUR & AFFILIATION**

Le principe peut comprendre :

1. Accès au programme.
2. Génération d'un lien ou outil de promotion.
3. Partage.
4. Suivi des résultats.
5. Attribution selon les règles applicables.

📌 Les conditions réellement applicables sont celles affichées dans votre espace.`;
    }


    /* UTILISATION */

    if (
        text.includes("comment utiliser") ||
        text.includes("comment ca marche") ||
        text.includes("montrez moi") ||
        text.includes("montre moi") ||
        text.includes("je ne comprends pas") ||
        text.includes("je ne sais pas")
    ) {

        return `📱 **COMMENT UTILISER DAKPROÉLITE ?**

🛍️ **ACHETEUR**

${DAKPRO_CONFIG.MARKETPLACE_URL}

1. Recherchez un produit.
2. Ouvrez sa fiche.
3. Ajoutez-le au panier.
4. Ouvrez le panier.
5. Connectez-vous.
6. Effectuez le paiement.
7. Consultez vos commandes.
8. Suivez votre livraison.

🏪 **VENDEUR**

${DAKPRO_CONFIG.VENDEUR_URL}

🚚 **LIVREUR**

Suivez la procédure officielle de création et vérification.

🏆 **AMBASSADEUR**

Consultez votre espace affiliation.

💬 Vous pouvez aussi écrire :

**« Je suis bloqué au paiement. »**`;
    }


    /* CONTACT */

    if (
        text.includes("contact") ||
        text.includes("support") ||
        text.includes("whatsapp") ||
        text.includes("email") ||
        text.includes("e mail") ||
        text.includes("telephone")
    ) {

        return `📞 **SUPPORT OFFICIEL DAKPROÉLITE**

📧 ${DAKPRO_CONFIG.ADMIN_EMAIL}

📲 +229 01 97 45 53 09

🌐 ${DAKPRO_CONFIG.MARKETPLACE_URL}

🏪 ${DAKPRO_CONFIG.VENDEUR_URL}`;
    }


    /* SALUTATION */

    if (
        text.includes("bonjour") ||
        text.includes("bonsoir") ||
        text.includes("salut") ||
        text.includes("hello") ||
        text.includes("coucou")
    ) {

        return `👋 **BIENVENUE SUR DAKPROÉLITE !**

Je suis l'assistant d'aide de la plateforme.

Je peux vous aider concernant :

🛍️ Achats
🛒 Panier
💳 Paiements
🧾 Reçus
📦 Commandes
🚚 Livraisons
🏪 Vendeurs
🚚 Livreurs
🏆 Affiliation
🔐 Confidentialité
⚖️ Règlement
🛡️ Sécurité
📱 Installation

Posez votre question.`;
    }


    /* PAR DÉFAUT */

    return `💬 **ASSISTANCE DAKPROÉLITE**

Je peux vous guider dans l'utilisation de la plateforme.

🛍️ Acheteur
🏪 Vendeur
🚚 Livreur
🏆 Ambassadeur
💳 Paiement
📦 Commandes
🔐 Sécurité

🌐 Marketplace :

${DAKPRO_CONFIG.MARKETPLACE_URL}

🏪 Vendeur :

${DAKPRO_CONFIG.VENDEUR_URL}

📧 Support :

${DAKPRO_CONFIG.ADMIN_EMAIL}`;
}


/* ============================================================
   NETTOYAGE COMPLET DE LA CONVERSATION
   TOUTES LES 10 MINUTES POUR L'UTILISATEUR CONNECTÉ
   ============================================================ */

async function nettoyerConversationSupport(
    db,
    currentUid
) {

    if (!currentUid) return;

    try {

        const messagesRef =
            ref(
                db,
                `messages_support/${currentUid}`
            );

        await remove(messagesRef);

        console.log(
            "🗑️ Conversation support supprimée."
        );

    } catch (error) {

        console.warn(
            "Nettoyage support ignoré :",
            error
        );
    }
}


/* ============================================================
   CONVERSION IMAGE EN MATRICE DE PIXELS
   ============================================================ */

function chargerImagePourComparaison(
    source
) {

    return new Promise(
        (resolve, reject) => {

            const img =
                new Image();

            img.crossOrigin =
                "anonymous";

            img.onload = () => {

                resolve(img);
            };

            img.onerror = () => {

                reject(
                    new Error(
                        "Image inaccessible"
                    )
                );
            };

            img.src =
                source;
        }
    );
}


/* ============================================================
   HASH PERCEPTUEL SIMPLE
   Permet de comparer une image locale avec
   une image publiée sur Firebase.
   ============================================================ */

async function calculerHashImage(
    source
) {

    try {

        let img;

        if (
            typeof source ===
            "string"
        ) {

            img =
                await chargerImagePourComparaison(
                    source
                );

        } else {

            img =
                await new Promise(
                    (resolve, reject) => {

                        const image =
                            new Image();

                        image.onload =
                            () => resolve(image);

                        image.onerror =
                            () =>
                                reject(
                                    new Error(
                                        "Image invalide"
                                    )
                                );

                        image.src =
                            URL.createObjectURL(
                                source
                            );
                    }
                );
        }


        const canvas =
            document.createElement(
                "canvas"
            );

        const size = 16;

        canvas.width =
            size;

        canvas.height =
            size;

        const ctx =
            canvas.getContext(
                "2d",
                {
                    willReadFrequently:
                        true
                }
            );

        ctx.drawImage(
            img,
            0,
            0,
            size,
            size
        );

        const imageData =
            ctx.getImageData(
                0,
                0,
                size,
                size
            ).data;


        const niveaux = [];

        for (
            let i = 0;
            i < imageData.length;
            i += 4
        ) {

            const gris =
                (
                    imageData[i] * 0.299 +
                    imageData[i + 1] * 0.587 +
                    imageData[i + 2] * 0.114
                );

            niveaux.push(
                gris
            );
        }


        const moyenne =
            niveaux.reduce(
                (a, b) => a + b,
                0
            ) /
            niveaux.length;


        return niveaux.map(
            value =>
                value >= moyenne
                    ? 1
                    : 0
        );

    } catch (error) {

        return null;
    }
}


/* ============================================================
   DISTANCE ENTRE DEUX HASH
   ============================================================ */

function distanceHash(
    hashA,
    hashB
) {

    if (
        !hashA ||
        !hashB ||
        hashA.length !==
            hashB.length
    ) {

        return 999;
    }

    let distance = 0;

    for (
        let i = 0;
        i < hashA.length;
        i++
    ) {

        if (
            hashA[i] !==
            hashB[i]
        ) {

            distance++;
        }
    }

    return distance;
}


/* ============================================================
   IDENTIFICATION D'UN PRODUIT PAR IMAGE
   ============================================================ */

async function identifierProduitParImage(
    db,
    fichierImage
) {

    try {

        const publications =
            await chargerPublicationsFirebase(
                db
            );

        if (!publications.length) {

            return null;
        }


        const hashImageUtilisateur =
            await calculerHashImage(
                fichierImage
            );

        if (!hashImageUtilisateur) {

            return null;
        }


        const produitsAvecImages =
            publications
                .filter(
                    produit =>
                        produit.image
                )
                .slice(
                    0,
                    DAKPRO_CONFIG.MAX_IMAGES_TO_COMPARE
                );


        let meilleurProduit =
            null;

        let meilleureDistance =
            Infinity;


        for (
            const produit
            of produitsAvecImages
        ) {

            try {

                const hashProduit =
                    await calculerHashImage(
                        produit.image
                    );

                if (!hashProduit) {

                    continue;
                }

                const distance =
                    distanceHash(
                        hashImageUtilisateur,
                        hashProduit
                    );


                if (
                    distance <
                    meilleureDistance
                ) {

                    meilleureDistance =
                        distance;

                    meilleurProduit =
                        produit;
                }

            } catch (error) {

                continue;
            }
        }


        /*
         * Seuil volontairement prudent.
         * Une distance trop élevée ne doit pas
         * être présentée comme une identification certaine.
         */

        if (
            meilleurProduit &&
            meilleureDistance <= 45
        ) {

            return {

                produit:
                    meilleurProduit,

                distance:
                    meilleureDistance
            };
        }

        return null;

    } catch (error) {

        console.error(
            "Identification image :",
            error
        );

        return null;
    }
}


/* ============================================================
   INITIALISATION
   ============================================================ */

export function init(
    container,
    db,
    auth,
    userId
) {

    if (
        !container ||
        !db
    ) {

        return;
    }


    const currentUid =
        userId ||
        (
            auth &&
            auth.currentUser
                ? auth.currentUser.uid
                : null
        );


    if (!currentUid) {

        container.innerHTML = `
            <div class="support-login-required">
                🔒 Veuillez vous connecter pour accéder
                à l'Assistance DAKPROÉLITE.
            </div>
        `;

        return;
    }


    /* ========================================================
       NETTOYAGE IMMÉDIAT
       ======================================================== */

    nettoyerConversationSupport(
        db,
        currentUid
    );


    /* ========================================================
       NETTOYAGE TOUTES LES 10 MINUTES
       ======================================================== */

    const cleanupInterval =
        setInterval(
            () => {

                nettoyerConversationSupport(
                    db,
                    currentUid
                );

            },
            DAKPRO_CONFIG.MESSAGE_CLEANUP_INTERVAL_MS
        );


    /* ========================================================
       INTERFACE
       ======================================================== */

    container.innerHTML = `

<style>

.support-wrapper {
    font-family:
        "Segoe UI",
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        sans-serif;
    color:#f5f5f7;
    width:100%;
    max-width:980px;
    margin:0 auto;
    box-sizing:border-box;
}

.support-header {
    background:
        linear-gradient(135deg,#111622,#080a10);
    border:1px solid rgba(212,175,55,.25);
    border-radius:16px;
    padding:17px;
    margin-bottom:14px;
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
    flex-wrap:wrap;
    box-shadow:0 10px 35px rgba(0,0,0,.35);
}

.support-title {
    display:flex;
    align-items:center;
    gap:10px;
    color:#d4af37;
    font-weight:800;
    font-size:18px;
}

.support-online {
    display:flex;
    align-items:center;
    gap:6px;
    color:#73e6a1;
    font-size:11px;
}

.support-online-dot {
    width:8px;
    height:8px;
    border-radius:50%;
    background:#49df88;
    box-shadow:0 0 10px rgba(73,223,136,.8);
}

.emergency-bar {
    background:
        linear-gradient(
            135deg,
            rgba(212,175,55,.14),
            rgba(0,0,0,.3)
        );
    border:1px solid rgba(212,175,55,.7);
    border-radius:12px;
    padding:12px;
    margin-bottom:14px;
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:10px;
    flex-wrap:wrap;
    font-size:12px;
}

.emergency-actions {
    display:flex;
    gap:7px;
    flex-wrap:wrap;
}

.btn-contact {
    display:inline-flex;
    align-items:center;
    justify-content:center;
    gap:6px;
    padding:8px 12px;
    border-radius:8px;
    text-decoration:none;
    font-size:11px;
    font-weight:700;
    cursor:pointer;
}

.btn-whatsapp {
    background:#25D366;
    color:#fff;
}

.btn-email {
    background:#ea4335;
    color:#fff;
}

.info-card {
    background:#121622;
    border:1px solid #282e3e;
    border-radius:14px;
    padding:14px;
    margin-bottom:14px;
}

.info-card-title {
    color:#d4af37;
    font-size:12px;
    font-weight:800;
    margin-bottom:10px;
}

.form-grid {
    display:grid;
    grid-template-columns:
        repeat(auto-fit,minmax(180px,1fr));
    gap:9px;
}

.field-group {
    display:flex;
    flex-direction:column;
    gap:4px;
}

.field-group label {
    font-size:10px;
    color:#aaa;
    font-weight:700;
    text-transform:uppercase;
}

.form-input {
    box-sizing:border-box;
    width:100%;
    background:#090c13;
    border:1px solid #31374a;
    border-radius:9px;
    padding:10px 12px;
    color:#fff;
    font-size:13px;
    outline:none;
}

.form-input:focus {
    border-color:#d4af37;
    box-shadow:0 0 0 2px rgba(212,175,55,.08);
}

.chat-box {
    background:
        radial-gradient(
            circle at top right,
            rgba(212,175,55,.05),
            transparent 30%
        ),
        #080a10;
    border:1px solid #1f2433;
    border-radius:16px;
    min-height:420px;
    height:52vh;
    max-height:620px;
    overflow-y:auto;
    padding:15px;
    display:flex;
    flex-direction:column;
    gap:13px;
    margin-bottom:10px;
    scroll-behavior:smooth;
    box-sizing:border-box;
}

.chat-box::-webkit-scrollbar {
    width:6px;
}

.chat-box::-webkit-scrollbar-thumb {
    background:rgba(212,175,55,.35);
    border-radius:20px;
}

.msg-bubble-container {
    display:flex;
    flex-direction:column;
    max-width:88%;
    animation:messageAppear .22s ease;
}

@keyframes messageAppear {
    from {
        opacity:0;
        transform:translateY(5px);
    }
    to {
        opacity:1;
        transform:translateY(0);
    }
}

.msg-user-container {
    align-self:flex-end;
    align-items:flex-end;
}

.msg-admin-container {
    align-self:flex-start;
    align-items:flex-start;
}

.msg-bubble {
    padding:12px 14px;
    border-radius:14px;
    font-size:13.5px;
    line-height:1.6;
    word-break:break-word;
    position:relative;
    box-sizing:border-box;
}

.msg-user {
    background:
        linear-gradient(135deg,#d4af37,#b8952b);
    color:#000;
    border-bottom-right-radius:3px;
}

.msg-admin {
    background:
        linear-gradient(135deg,#171c2b,#111622);
    color:#f0f0f5;
    border:1px solid #2d354a;
    border-bottom-left-radius:3px;
}

.msg-author {
    font-size:10px;
    font-weight:800;
    margin-bottom:5px;
    opacity:.82;
}

.msg-meta {
    font-size:9px;
    opacity:.65;
    margin-top:4px;
    display:flex;
    align-items:center;
    gap:8px;
}

.msg-actions {
    display:flex;
    gap:6px;
    flex-wrap:wrap;
    margin-top:6px;
}

.btn-msg-action {
    background:rgba(255,255,255,.06);
    border:1px solid rgba(255,255,255,.14);
    color:#ddd;
    border-radius:7px;
    padding:5px 8px;
    font-size:10px;
    cursor:pointer;
    display:inline-flex;
    align-items:center;
    gap:4px;
}

.btn-msg-action.active {
    background:rgba(212,175,55,.25);
    border-color:#d4af37;
}

.support-link {
    color:#e6c65c;
    text-decoration:underline;
    font-weight:600;
    word-break:break-all;
}

.chat-input-area {
    display:flex;
    gap:7px;
    align-items:stretch;
    flex-wrap:nowrap;
}

.input-message {
    flex:1;
    min-width:0;
}

.btn-voice,
.btn-gallery {
    width:45px;
    min-width:45px;
    border:1px solid #31374a;
    border-radius:9px;
    background:#111622;
    color:#fff;
    cursor:pointer;
    font-size:18px;
}

.btn-voice.recording {
    background:#a32222;
    border-color:#ff6060;
    animation:voicePulse 1s infinite;
}

@keyframes voicePulse {
    50% {
        box-shadow:
            0 0 0 5px rgba(255,70,70,.12);
    }
}

.btn-send {
    background:
        linear-gradient(135deg,#d4af37,#b8952b);
    color:#000;
    border:none;
    padding:11px 20px;
    border-radius:9px;
    font-weight:800;
    cursor:pointer;
    min-width:85px;
}

.btn-send:disabled {
    opacity:.6;
    cursor:wait;
}

.voice-status {
    display:none;
    margin-top:7px;
    color:#ff8585;
    font-size:11px;
    text-align:center;
}

.voice-status.visible {
    display:block;
}

.quick-actions {
    display:flex;
    gap:6px;
    overflow-x:auto;
    padding:4px 0 9px;
    scrollbar-width:none;
}

.quick-actions::-webkit-scrollbar {
    display:none;
}

.quick-btn {
    flex:0 0 auto;
    background:#111622;
    color:#ddd;
    border:1px solid #2c3446;
    border-radius:20px;
    padding:7px 10px;
    font-size:10px;
    cursor:pointer;
    white-space:nowrap;
}

.quick-btn:hover {
    border-color:#d4af37;
    color:#d4af37;
}

.empty-chat {
    color:#999;
    text-align:center;
    margin:auto;
    max-width:600px;
    line-height:1.7;
    padding:20px;
}

.support-login-required {
    text-align:center;
    padding:40px 20px;
    color:#ff8585;
    background:#0e121a;
    border-radius:12px;
    border:1px solid #2a2a32;
}

.support-product-card {
    margin-top:10px;
    padding:10px;
    border-radius:12px;
    background:#0b0e15;
    border:1px solid rgba(212,175,55,.35);
}

.support-product-image {
    display:block;
    width:100%;
    max-width:280px;
    max-height:280px;
    object-fit:contain;
    margin:8px auto;
    border-radius:10px;
    background:#050505;
}

.support-product-title {
    color:#d4af37;
    font-weight:800;
    margin-bottom:6px;
}

.support-product-price {
    font-weight:800;
    margin-top:6px;
}

.gallery-preview {
    width:100%;
    max-width:280px;
    max-height:280px;
    object-fit:contain;
    border-radius:10px;
    margin-top:8px;
    background:#050505;
}

@media (max-width:600px) {

    .support-title {
        font-size:15px;
    }

    .chat-box {
        height:55vh;
        min-height:390px;
    }

    .msg-bubble-container {
        max-width:94%;
    }

    .btn-send {
        padding:10px 14px;
        min-width:70px;
    }

    .btn-voice,
    .btn-gallery {
        width:42px;
        min-width:42px;
    }
}

</style>


<div class="support-wrapper">

    <div class="support-header">

        <div class="support-title">
            🤖
            <span>Assistant DAKPROÉLITE</span>
        </div>

        <div class="support-online">
            <span class="support-online-dot"></span>
            Assistance disponible
        </div>

    </div>


    <div class="emergency-bar">

        <span>
            ⚡ Besoin d'une assistance directe ?
        </span>

        <div class="emergency-actions">

            <a
                id="linkWhatsappDirect"
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-contact btn-whatsapp"
            >
                📲 WhatsApp
            </a>

            <a
                href="mailto:${DAKPRO_CONFIG.ADMIN_EMAIL}"
                class="btn-contact btn-email"
            >
                ✉️ E-mail
            </a>

        </div>

    </div>


    <div class="info-card">

        <div class="info-card-title">
            👤 VOS INFORMATIONS
        </div>

        <div class="form-grid">

            <div class="field-group">

                <label>Nom & Prénom</label>

                <input
                    type="text"
                    id="suppNom"
                    class="form-input"
                    placeholder="Votre nom complet"
                >

            </div>

            <div class="field-group">

                <label>Téléphone / WhatsApp</label>

                <input
                    type="tel"
                    id="suppPhone"
                    class="form-input"
                    placeholder="+229..."
                >

            </div>

            <div class="field-group">

                <label>E-mail</label>

                <input
                    type="email"
                    id="suppEmail"
                    class="form-input"
                    placeholder="votre@email.com"
                >

            </div>

        </div>

    </div>


    <div class="quick-actions">

        <button class="quick-btn" data-question="Comment acheter un produit ?">
            🛒 Acheter
        </button>

        <button class="quick-btn" data-question="Comment effectuer un paiement ?">
            💳 Paiement
        </button>

        <button class="quick-btn" data-question="Où trouver mon reçu de paiement ?">
            🧾 Reçu
        </button>

        <button class="quick-btn" data-question="Comment suivre ma commande ?">
            📦 Commande
        </button>

        <button class="quick-btn" data-question="Comment devenir vendeur ?">
            🏪 Vendeur
        </button>

        <button class="quick-btn" data-question="Quels documents faut-il pour devenir vendeur ?">
            📄 Documents
        </button>

        <button class="quick-btn" data-question="Comment devenir livreur ?">
            🚚 Livreur
        </button>

        <button class="quick-btn" data-question="Comment devenir ambassadeur ?">
            🏆 Affiliation
        </button>

        <button class="quick-btn" data-question="Comment installer l'application DAKPROÉLITE ?">
            📱 Installer
        </button>

    </div>


    <div
        class="chat-box"
        id="chatBox"
    >

        <div class="empty-chat">

            👋 <strong>
                Bienvenue sur l'assistance DAKPROÉLITE !
            </strong>

            <br><br>

            Vous pouvez poser une question ou envoyer
            une photo d'un produit.

            <br><br>

            🖼️ Utilisez le bouton galerie pour choisir
            une image depuis votre téléphone.

        </div>

    </div>


    <div class="chat-input-area">

        <input
            type="text"
            id="inputSupportMsg"
            class="form-input input-message"
            placeholder="Posez votre question..."
            autocomplete="off"
        >

        <button
            id="btnGallery"
            class="btn-gallery"
            title="Choisir une image depuis la galerie"
            type="button"
        >
            🖼️
        </button>

        <input
            type="file"
            id="inputImageSupport"
            accept="image/*"
            style="display:none"
        >

        <button
            id="btnVoiceInput"
            class="btn-voice"
            title="Parler"
            type="button"
        >
            🎤
        </button>

        <button
            id="btnSendMsg"
            class="btn-send"
            type="button"
        >
            Envoyer
        </button>

    </div>


    <div
        id="voiceStatus"
        class="voice-status"
    >
        🎙️ Écoute en cours... Parlez maintenant.
    </div>

</div>
`;


    /* ========================================================
       DOM
       ======================================================== */

    const suppNom =
        document.getElementById(
            "suppNom"
        );

    const suppPhone =
        document.getElementById(
            "suppPhone"
        );

    const suppEmail =
        document.getElementById(
            "suppEmail"
        );

    const chatBox =
        document.getElementById(
            "chatBox"
        );

    const inputMsg =
        document.getElementById(
            "inputSupportMsg"
        );

    const btnSend =
        document.getElementById(
            "btnSendMsg"
        );

    const btnVoice =
        document.getElementById(
            "btnVoiceInput"
        );

    const btnGallery =
        document.getElementById(
            "btnGallery"
        );

    const inputImageSupport =
        document.getElementById(
            "inputImageSupport"
        );

    const voiceStatus =
        document.getElementById(
            "voiceStatus"
        );

    const linkWhatsappDirect =
        document.getElementById(
            "linkWhatsappDirect"
        );


    /* ========================================================
       WHATSAPP
       ======================================================== */

    function mettreAJourLienWhatsapp(
        dernierTexte = ""
    ) {

        const nom =
            suppNom?.value.trim() ||
            "";

        const phone =
            suppPhone?.value.trim() ||
            "";

        const messageWhatsApp =
`*--- ASSISTANCE DAKPROÉLITE ---*

👤 *Client :*
${nom || "Non renseigné"}

📞 *Téléphone :*
${phone || "Non renseigné"}

💬 *Demande :*
${dernierTexte || "Bonjour, je souhaite obtenir de l'aide sur DAKPROÉLITE."}`;


        if (linkWhatsappDirect) {

            linkWhatsappDirect.href =
                `https://wa.me/${DAKPRO_CONFIG.ADMIN_WHATSAPP}?text=${encodeURIComponent(messageWhatsApp)}`;
        }
    }


    /* ========================================================
       AUDIO
       ======================================================== */

    window.lireTexteAudio =
        function(
            texte,
            btnElement
        ) {

            if (
                !(
                    "speechSynthesis"
                    in window
                )
            ) {

                alert(
                    "La synthèse vocale n'est pas supportée par votre navigateur."
                );

                return;
            }


            window.speechSynthesis.cancel();


            document
                .querySelectorAll(
                    ".btn-audio"
                )
                .forEach(
                    btn => {

                        btn.classList.remove(
                            "active"
                        );

                        btn.innerHTML =
                            "🔊 Écouter";
                    }
                );


            const utterance =
                new SpeechSynthesisUtterance(
                    String(
                        texte || ""
                    )
                );


            utterance.lang =
                "fr-FR";

            utterance.rate =
                .95;

            utterance.pitch =
                1;

            utterance.volume =
                1;


            utterance.onstart =
                () => {

                    if (btnElement) {

                        btnElement.classList.add(
                            "active"
                        );

                        btnElement.innerHTML =
                            "⏹️ Arrêter";
                    }
                };


            utterance.onend =
                () => {

                    if (btnElement) {

                        btnElement.classList.remove(
                            "active"
                        );

                        btnElement.innerHTML =
                            "🔊 Écouter";
                    }
                };


            utterance.onerror =
                () => {

                    if (btnElement) {

                        btnElement.classList.remove(
                            "active"
                        );

                        btnElement.innerHTML =
                            "🔊 Écouter";
                    }
                };


            window.speechSynthesis.speak(
                utterance
            );
        };


    window.arreterTexteAudio =
        function(
            btnElement
        ) {

            if (
                "speechSynthesis"
                in window
            ) {

                window.speechSynthesis.cancel();
            }

            if (btnElement) {

                btnElement.classList.remove(
                    "active"
                );

                btnElement.innerHTML =
                    "🔊 Écouter";
            }
        };


    /* ========================================================
       COPIE
       ======================================================== */

    window.copierTexteMessage =
        async function(
            texte,
            btnElement
        ) {

            try {

                if (
                    navigator.clipboard &&
                    navigator.clipboard.writeText
                ) {

                    await navigator.clipboard.writeText(
                        String(
                            texte || ""
                        )
                    );

                } else {

                    const textarea =
                        document.createElement(
                            "textarea"
                        );

                    textarea.value =
                        String(
                            texte || ""
                        );

                    textarea.style.position =
                        "fixed";

                    textarea.style.opacity =
                        "0";

                    document.body.appendChild(
                        textarea
                    );

                    textarea.select();

                    document.execCommand(
                        "copy"
                    );

                    textarea.remove();
                }


                if (btnElement) {

                    const original =
                        btnElement.innerHTML;

                    btnElement.innerHTML =
                        "✅ Copié !";

                    setTimeout(
                        () => {

                            btnElement.innerHTML =
                                original;

                        },
                        1800
                    );
                }

            } catch (error) {

                console.error(
                    "Erreur copie :",
                    error
                );

                alert(
                    "Impossible de copier le message."
                );
            }
        };


    /* ========================================================
       RECONNAISSANCE VOCALE
       ======================================================== */

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition ||
        null;


    let recognition =
        null;

    let isListening =
        false;


    if (SpeechRecognition) {

        recognition =
            new SpeechRecognition();

        recognition.lang =
            "fr-FR";

        recognition.continuous =
            false;

        recognition.interimResults =
            true;

        recognition.maxAlternatives =
            1;


        recognition.onstart =
            () => {

                isListening =
                    true;

                btnVoice?.classList.add(
                    "recording"
                );

                if (btnVoice) {

                    btnVoice.innerHTML =
                        "⏹️";
                }

                voiceStatus?.classList.add(
                    "visible"
                );
            };


        recognition.onresult =
            (event) => {

                let finalText =
                    "";

                let interimText =
                    "";


                for (
                    let i =
                        event.resultIndex;
                    i <
                        event.results.length;
                    i++
                ) {

                    const result =
                        event.results[i];

                    const transcript =
                        result[0]
                            ?.transcript ||
                        "";


                    if (
                        result.isFinal
                    ) {

                        finalText +=
                            transcript;

                    } else {

                        interimText +=
                            transcript;
                    }
                }


                if (inputMsg) {

                    if (finalText) {

                        inputMsg.value =
                            (
                                inputMsg.value
                                    ? inputMsg.value +
                                      " "
                                    : ""
                            ) +
                            finalText.trim();

                    } else if (
                        interimText
                    ) {

                        inputMsg.dataset.voicePreview =
                            interimText.trim();
                    }
                }
            };


        recognition.onerror =
            (event) => {

                console.warn(
                    "Reconnaissance vocale :",
                    event.error
                );

                if (
                    event.error ===
                    "not-allowed"
                ) {

                    alert(
                        "L'accès au microphone a été refusé."
                    );
                }

                arreterReconnaissance();
            };


        recognition.onend =
            () => {

                arreterReconnaissance();
            };

    } else {

        if (btnVoice) {

            btnVoice.title =
                "La dictée vocale n'est pas disponible.";

            btnVoice.style.opacity =
                ".5";
        }
    }


    function arreterReconnaissance() {

        isListening =
            false;

        btnVoice?.classList.remove(
            "recording"
        );

        if (btnVoice) {

            btnVoice.innerHTML =
                "🎤";
        }

        voiceStatus?.classList.remove(
            "visible"
        );
    }


    function basculerReconnaissance() {

        if (!recognition) {

            alert(
                "La dictée vocale n'est pas disponible sur ce navigateur."
            );

            return;
        }


        if (isListening) {

            recognition.stop();

            return;
        }


        try {

            recognition.start();

        } catch (error) {

            console.warn(
                "Impossible de démarrer la reconnaissance :",
                error
            );
        }
    }


    btnVoice?.addEventListener(
        "click",
        basculerReconnaissance
    );


    /* ========================================================
       PROFIL
       ======================================================== */

    const userRef =
        ref(
            db,
            `users/${currentUid}`
        );


    get(userRef)
        .then(
            snapshot => {

                if (
                    snapshot.exists()
                ) {

                    const data =
                        snapshot.val();


                    if (suppNom) {

                        const nomComplet =
                            [
                                data.nom,
                                data.prenom
                            ]
                            .filter(Boolean)
                            .join(" ");

                        suppNom.value =
                            nomComplet ||
                            data.nomClient ||
                            "";
                    }


                    if (
                        data.telephone &&
                        suppPhone
                    ) {

                        suppPhone.value =
                            data.telephone;
                    }


                    if (
                        data.email &&
                        suppEmail
                    ) {

                        suppEmail.value =
                            data.email;
                    }

                } else if (
                    auth?.currentUser
                        ?.email
                ) {

                    if (suppEmail) {

                        suppEmail.value =
                            auth.currentUser.email;
                    }
                }


                mettreAJourLienWhatsapp();
            }
        )
        .catch(
            error => {

                console.warn(
                    "Impossible de charger le profil :",
                    error
                );
            }
        );


    /* ========================================================
       RÉFÉRENCE MESSAGES
       ======================================================== */

    const messagesRef =
        ref(
            db,
            `messages_support/${currentUid}`
        );


    /* ========================================================
       AFFICHAGE DES MESSAGES
       ======================================================== */

    onValue(
        messagesRef,
        snapshot => {

            if (!chatBox)
                return;


            if (!snapshot.exists()) {

                chatBox.innerHTML = `

                    <div class="empty-chat">

                        👋
                        <strong>
                            Bienvenue sur l'assistance DAKPROÉLITE !
                        </strong>

                        <br><br>

                        Vous pouvez poser une question
                        ou envoyer une photo d'un produit.

                        <br><br>

                        🖼️ Utilisez le bouton galerie.

                    </div>
                `;

                return;
            }


            chatBox.innerHTML =
                "";


            const messages =
                snapshot.val();


            Object.entries(
                messages
            ).forEach(
                ([msgId, msg]) => {

                    if (!msg)
                        return;


                    const isUser =
                        msg.sender ===
                        "user";


                    const containerDiv =
                        document.createElement(
                            "div"
                        );


                    containerDiv.className =
                        `msg-bubble-container ${
                            isUser
                                ? "msg-user-container"
                                : "msg-admin-container"
                        }`;


                    const timeStr =
                        msg.timestamp
                            ? new Date(
                                Number(
                                    msg.timestamp
                                )
                              ).toLocaleTimeString(
                                "fr-FR",
                                {
                                    hour:
                                        "2-digit",
                                    minute:
                                        "2-digit"
                                }
                              )
                            : "";


                    const texteBrut =
                        String(
                            msg.texte ||
                            ""
                        );


                    const texteEchappe =
                        escapeHTML(
                            texteBrut
                        );


                    const contenu =
                        isUser
                            ? texteEchappe
                                  .replace(
                                      /\n/g,
                                      "<br>"
                                  )
                            : formatBotText(
                                  texteBrut
                              );


                    containerDiv.innerHTML = `

                        <div class="
                            msg-bubble
                            ${
                                isUser
                                    ? "msg-user"
                                    : "msg-admin"
                            }
                        ">

                            <div class="msg-author">

                                ${
                                    isUser
                                        ? "👤 Vous"
                                        : "🤖 Assistant DAKPROÉLITE"
                                }

                            </div>

                            <div>
                                ${contenu}
                            </div>

                        </div>

                        <div class="msg-meta">

                            <span>
                                ${timeStr}
                            </span>

                        </div>
                    `;


                    /* IMAGE DU MESSAGE */

                    if (
                        msg.imageUrl
                    ) {

                        const image =
                            document.createElement(
                                "img"
                            );

                        image.className =
                            "support-product-image";

                        image.src =
                            msg.imageUrl;

                        image.alt =
                            "Image du produit";

                        image.loading =
                            "lazy";

                        containerDiv
                            .querySelector(
                                ".msg-bubble"
                            )
                            ?.appendChild(
                                image
                            );
                    }


                    /* PRODUIT ASSOCIÉ */

                    if (
                        msg.produit
                    ) {

                        const produit =
                            msg.produit;


                        const productCard =
                            document.createElement(
                                "div"
                            );

                        productCard.className =
                            "support-product-card";


                        const imageUrl =
                            obtenirImageProduit(
                                produit
                            );


                        if (imageUrl) {

                            const image =
                                document.createElement(
                                    "img"
                                );

                            image.className =
                                "support-product-image";

                            image.src =
                                imageUrl;

                            image.alt =
                                obtenirNomProduit(
                                    produit
                                );

                            image.loading =
                                "lazy";

                            productCard.appendChild(
                                image
                            );
                        }


                        const title =
                            document.createElement(
                                "div"
                            );

                        title.className =
                            "support-product-title";

                        title.textContent =
                            obtenirNomProduit(
                                produit
                            );

                        productCard.appendChild(
                            title
                        );


                        const details =
                            document.createElement(
                                "div"
                            );

                        details.innerHTML =
                            formatBotText(
                                construireDetailsProduit(
                                    produit
                                )
                            );

                        productCard.appendChild(
                            details
                        );


                        const bubble =
                            containerDiv
                                .querySelector(
                                    ".msg-bubble"
                                );

                        bubble?.appendChild(
                            productCard
                        );
                    }


                    /* ACTIONS BOT */

                    if (!isUser) {

                        const actionsDiv =
                            document.createElement(
                                "div"
                            );

                        actionsDiv.className =
                            "msg-actions";


                        const btnCopy =
                            document.createElement(
                                "button"
                            );

                        btnCopy.type =
                            "button";

                        btnCopy.className =
                            "btn-msg-action";

                        btnCopy.innerHTML =
                            "📋 Copier";


                        btnCopy.addEventListener(
                            "click",
                            () => {

                                window.copierTexteMessage(
                                    texteBrut,
                                    btnCopy
                                );
                            }
                        );


                        const btnAudio =
                            document.createElement(
                                "button"
                            );

                        btnAudio.type =
                            "button";

                        btnAudio.className =
                            "btn-msg-action btn-audio";

                        btnAudio.innerHTML =
                            "🔊 Écouter";


                        btnAudio.addEventListener(
                            "click",
                            () => {

                                if (
                                    btnAudio.classList.contains(
                                        "active"
                                    )
                                ) {

                                    window.arreterTexteAudio(
                                        btnAudio
                                    );

                                } else {

                                    window.lireTexteAudio(
                                        texteBrut,
                                        btnAudio
                                    );
                                }
                            }
                        );


                        actionsDiv.appendChild(
                            btnCopy
                        );

                        actionsDiv.appendChild(
                            btnAudio
                        );


                        containerDiv.appendChild(
                            actionsDiv
                        );
                    }


                    chatBox.appendChild(
                        containerDiv
                    );
                }
            );


            chatBox.scrollTop =
                chatBox.scrollHeight;
        },
        error => {

            console.error(
                "Erreur lecture messages support :",
                error
            );

            if (chatBox) {

                chatBox.innerHTML = `

                    <div class="empty-chat">

                        ⚠️ Impossible de charger
                        l'assistance pour le moment.

                    </div>
                `;
            }
        }
    );


    /* ========================================================
       ENVOI MESSAGE
       ======================================================== */

    let sendingMessage =
        false;


    async function sendMessage() {

        if (sendingMessage)
            return;


        const nom =
            suppNom?.value.trim() ||
            "";

        const phone =
            suppPhone?.value.trim() ||
            "";

        const email =
            suppEmail?.value.trim() ||
            "";

        const text =
            inputMsg?.value.trim() ||
            "";


        if (!text) {

            inputMsg?.focus();

            return;
        }


        sendingMessage =
            true;


        if (btnSend) {

            btnSend.disabled =
                true;

            btnSend.textContent =
                "Envoi...";
        }


        if (inputMsg) {

            inputMsg.value =
                "";
        }


        try {

            await set(
                ref(
                    db,
                    `users/${currentUid}/coordonnees`
                ),
                {
                    nom,
                    telephone:
                        phone,
                    email
                }
            );


            await push(
                messagesRef,
                {
                    sender:
                        "user",

                    texte:
                        text,

                    timestamp:
                        serverTimestamp(),

                    nomClient:
                        nom,

                    telephoneClient:
                        phone,

                    emailClient:
                        email
                }
            );


            mettreAJourLienWhatsapp(
                text
            );


            /*
             * RECHERCHE DIRECTE DANS
             * publications/ FIREBASE
             */

            let produit =
                await rechercherProduitFirebase(
                    db,
                    text
                );


            /*
             * SECOURS :
             * window.allProductsData
             */

            if (!produit) {

                produit =
                    rechercherProduitLocal(
                        text
                    );
            }


            const reponseBot =
                obtenirReponseAutomatique(
                    text,
                    produit
                );


            setTimeout(
                async () => {

                    try {

                        const botData = {

                            sender:
                                "bot",

                            texte:
                                reponseBot,

                            timestamp:
                                serverTimestamp()
                        };


                        if (produit) {

                            botData.produit = {

                                firebaseKey:
                                    produit.firebaseKey ||
                                    "",

                                nom:
                                    obtenirNomProduit(
                                        produit
                                    ),

                                categorie:
                                    obtenirCategorieProduit(
                                        produit
                                    ),

                                description:
                                    obtenirDescriptionProduit(
                                        produit
                                    ),

                                prix:
                                    obtenirPrixProduit(
                                        produit
                                    ),

                                prixPromo:
                                    obtenirPrixPromo(
                                        produit
                                    ),

                                stock:
                                    obtenirStockProduit(
                                        produit
                                    ),

                                vendeur:
                                    obtenirVendeurProduit(
                                        produit
                                    ),

                                image:
                                    obtenirImageProduit(
                                        produit
                                    )
                            };


                            const imageProduit =
                                obtenirImageProduit(
                                    produit
                                );

                            if (
                                imageProduit
                            ) {

                                botData.imageUrl =
                                    imageProduit;
                            }
                        }


                        await push(
                            messagesRef,
                            botData
                        );

                    } catch (error) {

                        console.error(
                            "Erreur réponse bot :",
                            error
                        );
                    }

                },
                450
            );


        } catch (error) {

            console.error(
                "Erreur Envoi Support :",
                error
            );


            alert(
                "Une erreur s'est produite lors de l'envoi de votre message. Vérifiez votre connexion."
            );


        } finally {

            setTimeout(
                () => {

                    sendingMessage =
                        false;

                    if (btnSend) {

                        btnSend.disabled =
                            false;

                        btnSend.textContent =
                            "Envoyer";
                    }

                },
                500
            );
        }
    }


    btnSend?.addEventListener(
        "click",
        sendMessage
    );


    inputMsg?.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                    "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();
            }
        }
    );


    /* ========================================================
       QUESTIONS RAPIDES
       ======================================================== */

    container
        .querySelectorAll(
            ".quick-btn"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const question =
                            button.dataset.question ||
                            "";

                        if (!inputMsg)
                            return;

                        inputMsg.value =
                            question;

                        inputMsg.focus();

                        sendMessage();
                    }
                );
            }
        );


    /* ========================================================
       GALERIE DU TÉLÉPHONE
       ======================================================== */

    btnGallery?.addEventListener(
        "click",
        () => {

            inputImageSupport?.click();
        }
    );


    inputImageSupport?.addEventListener(
        "change",
        async event => {

            const file =
                event.target.files?.[0];


            if (!file)
                return;


            if (
                !file.type.startsWith(
                    "image/"
                )
            ) {

                alert(
                    "Veuillez sélectionner une image."
                );

                inputImageSupport.value =
                    "";

                return;
            }


            /*
             * Aperçu immédiat dans le chat
             */

            const previewContainer =
                document.createElement(
                    "div"
                );

            previewContainer.className =
                "msg-bubble-container msg-user-container";


            const previewBubble =
                document.createElement(
                    "div"
                );

            previewBubble.className =
                "msg-bubble msg-user";


            previewBubble.innerHTML =
                `
                    <div class="msg-author">
                        👤 Vous
                    </div>

                    <div>
                        🖼️ Image sélectionnée
                    </div>
                `;


            const previewImage =
                document.createElement(
                    "img"
                );

            previewImage.className =
                "gallery-preview";

            previewImage.alt =
                "Image sélectionnée";


            const objectUrl =
                URL.createObjectURL(
                    file
                );


            previewImage.src =
                objectUrl;


            previewBubble.appendChild(
                previewImage
            );


            previewContainer.appendChild(
                previewBubble
            );


            chatBox?.appendChild(
                previewContainer
            );


            if (chatBox) {

                chatBox.scrollTop =
                    chatBox.scrollHeight;
            }


            /*
             * Message d'analyse
             */

            const analyseContainer =
                document.createElement(
                    "div"
                );

            analyseContainer.className =
                "msg-bubble-container msg-admin-container";


            const analyseBubble =
                document.createElement(
                    "div"
                );

            analyseBubble.className =
                "msg-bubble msg-admin";


            analyseBubble.innerHTML =
                `
                    <div class="msg-author">
                        🤖 Assistant DAKPROÉLITE
                    </div>

                    🔎 Recherche du produit
                    dans les publications DAKPROÉLITE...
                `;


            analyseContainer.appendChild(
                analyseBubble
            );

            chatBox?.appendChild(
                analyseContainer
            );


            if (chatBox) {

                chatBox.scrollTop =
                    chatBox.scrollHeight;
            }


            try {

                /*
                 * IDENTIFICATION DIRECTE
                 * DANS publications/
                 */

                const resultat =
                    await identifierProduitParImage(
                        db,
                        file
                    );


                if (
                    resultat &&
                    resultat.produit
                ) {

                    const produit =
                        resultat.produit;


                    /*
                     * Enregistrer l'image utilisateur
                     * comme message utilisateur.
                     */

                    await push(
                        messagesRef,
                        {
                            sender:
                                "user",

                            texte:
                                "🖼️ Image envoyée depuis la galerie",

                            timestamp:
                                serverTimestamp(),

                            imageName:
                                file.name,

                            imageType:
                                file.type
                        }
                    );


                    const reponse =
                        construireDetailsProduit(
                            produit
                        );


                    const botData = {

                        sender:
                            "bot",

                        texte:
                            reponse,

                        timestamp:
                            serverTimestamp(),

                        imageUrl:
                            obtenirImageProduit(
                                produit
                            ),

                        produit: {

                            firebaseKey:
                                produit.firebaseKey ||
                                "",

                            nom:
                                obtenirNomProduit(
                                    produit
                                ),

                            categorie:
                                obtenirCategorieProduit(
                                    produit
                                ),

                            description:
                                obtenirDescriptionProduit(
                                    produit
                                ),

                            prix:
                                obtenirPrixProduit(
                                    produit
                                ),

                            prixPromo:
                                obtenirPrixPromo(
                                    produit
                                ),

                            stock:
                                obtenirStockProduit(
                                    produit
                                ),

                            vendeur:
                                obtenirVendeurProduit(
                                    produit
                                ),

                            image:
                                obtenirImageProduit(
                                    produit
                                )
                        }
                    };


                    await push(
                        messagesRef,
                        botData
                    );


                    analyseBubble.innerHTML =
                        `
                            <div class="msg-author">
                                🤖 Assistant DAKPROÉLITE
                            </div>

                            ✅ **Produit retrouvé**
                            dans les publications DAKPROÉLITE.
                        `;

                } else {

                    await push(
                        messagesRef,
                        {
                            sender:
                                "user",

                            texte:
                                "🖼️ Image envoyée depuis la galerie",

                            timestamp:
                                serverTimestamp(),

                            imageName:
                                file.name,

                            imageType:
                                file.type
                        }
                    );


                    const texteNonTrouve =
                        `🔎 **RECHERCHE DU PRODUIT**

Je n'ai pas trouvé avec suffisamment de certitude un produit correspondant à cette image dans les publications actuellement disponibles.

📌 Essayez :

• une photo plus nette ;
• une photo montrant mieux le produit ;
• ou écrivez directement le nom du produit.

🌐 ${DAKPRO_CONFIG.MARKETPLACE_URL}`;


                    await push(
                        messagesRef,
                        {
                            sender:
                                "bot",

                            texte:
                                texteNonTrouve,

                            timestamp:
                                serverTimestamp()
                        }
                    );


                    analyseBubble.innerHTML =
                        `
                            <div class="msg-author">
                                🤖 Assistant DAKPROÉLITE
                            </div>

                            ⚠️ Produit non identifié avec
                            suffisamment de certitude.
                        `;
                }

            } catch (error) {

                console.error(
                    "Erreur analyse image :",
                    error
                );


                analyseBubble.innerHTML =
                    `
                        <div class="msg-author">
                            🤖 Assistant DAKPROÉLITE
                        </div>

                        ⚠️ Impossible d'analyser cette image
                        pour le moment.
                    `;
            }


            URL.revokeObjectURL(
                objectUrl
            );


            inputImageSupport.value =
                "";
        }
    );


    /* ========================================================
       MISE À JOUR WHATSAPP
       ======================================================== */

    suppNom?.addEventListener(
        "input",
        () =>
            mettreAJourLienWhatsapp()
    );


    suppPhone?.addEventListener(
        "input",
        () =>
            mettreAJourLienWhatsapp()
    );


    suppEmail?.addEventListener(
        "input",
        () =>
            mettreAJourLienWhatsapp()
    );


    mettreAJourLienWhatsapp();


    /* ========================================================
       NETTOYAGE LORSQUE LE MODULE EST DÉTRUIT
       ======================================================== */

    /*
     * On conserve l'intervalle dans le DOM afin de pouvoir
     * le retrouver si le module est réinitialisé.
     */

    container.__dakproSupportCleanup =
        () => {

            clearInterval(
                cleanupInterval
            );
        };
}