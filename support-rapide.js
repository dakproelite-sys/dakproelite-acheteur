import { ref, push, onValue, set, get, serverTimestamp, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

/**
 * Nettoyage anti-XSS des entrées utilisateur
 */
function escapeHTML(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Base de connaissances complète et sécurisée pour le Bot DAKPROELITE
 */
function obtenirReponseAutomatique(texteMessage) {
    const text = texteMessage.toLowerCase();

    // ----------------------------------------------------
    // 1. FONDATEUR, DÉVELOPPEUR & HISTOIRE DAKPROELITE
    // (Réservé exclusivement aux questions directes)
    // ----------------------------------------------------
    if (text.includes("fondateur") || text.includes("createur") || text.includes("créateur") || text.includes("développeur") || text.includes("developpeur") || text.includes("qui a crée") || text.includes("qui a créé") || text.includes("qui est le patron") || text.includes("qui a inventé")) {
        return `👨‍💻 **FONDATEUR & DÉVELOPPEUR DE DAKPROELITE**\n\n` +
               `La plateforme DAKPROELITE a été conçue, développée et fondée par **AGLIGNAMOU DAVID**.\n\n` +
               `📌 **Biographie & Parcours :**\n` +
               `• **Date & Lieu de Naissance :** Né le 13 septembre 1989 à Cotonou (Bénin).\n` +
               `• **Vision :** Passionné par l'innovation technologique et le commerce international, AGLIGNAMOU DAVID a pensé DAKPROELITE comme un écosystème numérique complet capable de briser les frontières commerciales, d'interconnecter les marchés africains et mondiaux, et de garantir une sécurité financière absolue pour chaque utilisateur grâce au système de paiement sous séquestre.\n\n` +
               `Grâce à son leadership, DAKPROELITE s'impose aujourd'hui comme un acteur majeur de la vente en ligne, garantissant transparence, rapidité et fiabilité.`;
    }

    // ----------------------------------------------------
    // 2. PRESENTATION, INTENTION & VISION GLOBALE
    // ----------------------------------------------------
    if (text.includes("intention") || text.includes("but") || text.includes("pourquoi") || text.includes("projet") || text.includes("c'est quoi dakproelite") || text.includes("presentation") || text.includes("présentation")) {
        return `🌍 **DAKPROELITE : LE MARCHÉ MONDIAL SÉCURISÉ** 🚀\n\n` +
               `DAKPROELITE est une marketplace internationale conçue pour connecter les acheteurs, vendeurs, livreurs, transitaires et ambassadeurs du monde entier sur une interface unique et hautement sécurisée.\n\n` +
               `✨ **Les piliers fondamentaux de DAKPROELITE :**\n` +
               `• **Commerce International Sans Frontières :** Achetez et vendez vos articles en toute liberté.\n` +
               `• **Sécurité Séquestre :** Les fonds de l'acheteur sont conservés en sécurité et ne sont versés au vendeur que lorsque l'acheteur confirme la réception conforme du colis.\n` +
               `• **Authentification par QR Code :** Chaque transaction est validée de façon unique via un reçu électronique à scanner lors de la livraison.\n` +
               `• **Opportunités Économiques :** Une infrastructure pensée pour faire croître les boutiques et offrir des revenus complémentaires aux affiliés et ambassadeurs.`;
    }

    // ----------------------------------------------------
    // 3. PROGRAMME AMBASSADEUR & AFFILIATION COMPLET
    // ----------------------------------------------------
    if (text.includes("ambassadeur") || text.includes("affilié") || text.includes("affiliation") || text.includes("parrainage") || text.includes("lien d'affiliation") || text.includes("gagner de l'argent") || text.includes("commission parrainage") || text.includes("programme ambassadeur")) {
        return `🏆 **PROGRAMME AMBASSADEUR & AFFILIATION DAKPROELITE** 💰\n\n` +
               `Le programme Ambassadeur DAKPROELITE vous permet de monetiser votre audience et d'obtenir des commissions récurrentes sur chaque vente générée.\n\n` +
               `👑 **Comment devenir Ambassadeur / Affilié ?**\n` +
               `1. Connectez-vous à votre espace membre et générez votre **Lien Unique d'Affiliation** ou vos liens produits.\n` +
               `2. Partagez vos liens sur vos réseaux sociaux (WhatsApp, TikTok, Facebook, Instagram, YouTube, blogs, etc.).\n` +
               `3. Lorsqu'un utilisateur effectue un achat via votre lien, votre commission est immédiatement créditée sur votre solde d'affiliation.\n\n` +
               `💎 **Avantages du statut Ambassadeur :**\n` +
               `• **Commissions Attractives :** Pourcentage direct sur chaque vente réalisée.\n` +
               `• **Tableau de Bord Détaillé :** Suivi en temps réel de vos clics, conversions et gains.\n` +
               `• **Retraits Rapides :** Demandez le retrait de vos gains à tout moment vers Mobile Money (MTN, Moov, Wave, Celtis) ou Virement bancaire.\n` +
               `• **Accompagnement :** Accès à des visuels de promotion et au support prioritaire.`;
    }

    // ----------------------------------------------------
    // 4. RÈGLEMENT INTÉRIEUR & STATUT LÉGAL COMPLET
    // ----------------------------------------------------
    if (text.includes("règlement") || text.includes("reglement") || text.includes("cgu") || text.includes("condition") || text.includes("regles") || text.includes("règles") || text.includes("statut") || text.includes("charte")) {
        return `⚖️ **RÈGLEMENT INTÉRIEUR ET CONDITIONS D'UTILISATION (CGU)** 📜\n\n` +
               `Afin de maintenir un environnement commercial sain et sécurisé, tous les utilisateurs de DAKPROELITE s'engagent à respecter les règles suivantes :\n\n` +
               `1. **Interdiction des Transactions Hors-Plateforme :** Toute tentative de détournement de transaction en dehors du système DAKPROELITE est formellement interdite. En cas de non-respect, la garantie séquestre saute et le compte est sujet à suspension.\n` +
               `2. **Authenticité des Produits :** Les vendeurs s'engagent à ne publier que des articles conformes, légaux et non contrefaits. Toute fraude entraîne le blocage immédiat du solde vendeur.\n` +
               `3. **Respect du Processus de Livraison :** La remise de l'article s'effectue uniquement contre validation du **Reçu QR Code** officiel.\n` +
               `4. **Courtoisie & Professionnalisme :** Les échanges entre acheteurs, vendeurs et livreurs doivent demeurer respectueux.\n` +
               `5. **Sanctions :** DAKPROELITE se réserve le droit de restreindre ou supprimer tout compte en cas de suspicion de fraude, d'escroquerie ou de violation de la présente charte.`;
    }

    // ----------------------------------------------------
    // 5. POLITIQUE DE CONFIDENTIALITÉ COMPLÈTE
    // ----------------------------------------------------
    if (text.includes("confidentialité") || text.includes("confidentialite") || text.includes("donnée") || text.includes("donnees") || text.includes("rgpd") || text.includes("vie privée") || text.includes("sécurité données")) {
        return `🔒 **POLITIQUE DE CONFIDENTIALITÉ ET DE PROTECTION DES DONNÉES** 🛡️\n\n` +
               `DAKPROELITE accorde une importance capitale à la protection de vos données personnelles et au respect de votre vie privée.\n\n` +
               `📋 **Engagements de Confidentialité :**\n` +
               `• **Collecte Restreinte :** Nous ne collectons que les informations strictement nécessaires au traitement de vos commandes et retraits (Nom, Prénom, Adresse, Téléphone, E-mail).\n` +
               `• **Chiffrement & Sécurité :** Vos données d'identification et d'authentification sont entièrement chiffrées selon les standards de sécurité internationaux Web & Firebase.\n` +
               `• **Non-Cession des Données :** Vos informations ne seront **jamais vendues, louées ou cédées** à des tiers à des fins publicitaires sans votre accord explicite.\n` +
               `• **Droit d'Accès et de Suppression :** Conformément aux lois sur la protection des données numériques, vous pouvez à tout moment demander la modification ou la suppression définitive de votre profil et de votre historique depuis votre espace client ou via le support direct.`;
    }

    // ----------------------------------------------------
    // 6. SECTION VENDEURS, BOUTIQUES & BOOST
    // ----------------------------------------------------
    if (text.includes("vendeur") || text.includes("devenir vendeur") || text.includes("boutique") || text.includes("vendre") || text.includes("creer boutique")) {
        return `🛍️ **ESPACE VENDEUR DAKPROELITE**\n\n` +
               `Devenez un vendeur partenaire sur DAKPROELITE :\n` +
               `1. Créez votre boutique et complétez votre profil professionnel.\n` +
               `2. Publiez vos produits avec des visuels clairs, prix et descriptions précises.\n` +
               `3. Expédiez les commandes rapidement dès notification.\n` +
               `4. Recevez vos paiements en toute sécurité sur votre solde dès validation par l'acheteur.`;
    }

    if (text.includes("boost") || text.includes("mise en avant") || text.includes("publicité") || text.includes("sponsoriser") || text.includes("visibilité")) {
        return `🚀 **BOOST & PUBLICITÉ PRODUITS** 📈\n\n` +
               `Augmentez vos ventes sur DAKPROELITE :\n` +
               `- Rendez-vous dans votre espace Vendeur, rubrique **Boosts & Publicité**.\n` +
               `- Choisissez votre formule de mise en avant.\n` +
               `- Vos articles seront positionnés en tête des recherches et sur la bannière principale.`;
    }

    if (text.includes("retrait") || text.includes("virement") || text.includes("récupérer mon argent") || text.includes("mes gains") || text.includes("solde")) {
        return `💰 **RETRAIT DE GAINS (VENDEURS & AFFILIÉS)** 💳\n\n` +
               `- Allez dans la section **Retraits** de votre tableau de bord.\n` +
               `- Choix des canaux : Mobile Money (MTN, Moov, Wave, Celtis) ou Virement bancaire.\n` +
               `- Traitement sécurisé sous 24h à 48h par le service financier.`;
    }

    if (text.includes("commission") || text.includes("frais de vente") || text.includes("pourcentage") || text.includes("tarif vendeur")) {
        return `📊 **FRAIS DE VENTE & TRANSPARENCE** 💸\n\n` +
               `- L'inscription et la création de boutique sont gratuites.\n` +
               `- Une commission minimale est appliquée sur chaque transaction réussie afin d'assurer le fonctionnement de la garantie séquestre et le développement de la plateforme.`;
    }

    // ----------------------------------------------------
    // 7. ACHETEURS, PAIEMENTS & LIVRAISON
    // ----------------------------------------------------
    if (text.includes("payer") || text.includes("paiement") || text.includes("moyen") || text.includes("momo") || text.includes("mtn") || text.includes("moov") || text.includes("wave") || text.includes("celtis") || text.includes("visa") || text.includes("mastercard") || text.includes("sécurité") || text.includes("securite") || text.includes("garantie")) {
        return `💳 **PAIEMENTS SÉCURISÉS & GARANTIS** 🛒\n\n` +
               `Modes de paiement acceptés :\n` +
               `- 📱 Mobile Money : MTN, Moov, Wave, Celtis Cash.\n` +
               `- 💳 Cartes bancaires : Visa, Mastercard.\n\n` +
               `🛡️ **Garantie Séquestre :** Votre argent demeure bloqué en sécurité jusqu'à la réception et la confirmation de votre commande.`;
    }

    if (text.includes("livreur") || text.includes("livraison") || text.includes("transitaire") || text.includes("dhl") || text.includes("colis")) {
        return `🚚 **LIVRAISONS ET EXPÉDITIONS**\n\n` +
               `- **Livraison Locale :** Assurée par notre réseau de coursier certifiés contre QR Code.\n` +
               `- **Livraison Internationale :** Prise en charge via transitaires agréés et partenaires logistiques internationaux (ex: DHL).\n` +
               `- **Suivi :** Indiquez votre numéro de commande dans ce tchat pour obtenir un suivi en temps réel.`;
    }

    if (text.includes("remboursement") || text.includes("annuler") || text.includes("litige")) {
        return `🔄 **GESTION DES LITIGES ET REMBOURSEMENT**\n\n` +
               `Si votre article n'est pas conforme ou n'a pas été livré :\n` +
               `1. Ne scannez pas le QR Code de confirmation.\n` +
               `2. Soumettez une réclamation au support avec photos/vidéos.\n` +
               `3. Après examen, l'équipe valide le remboursement de votre commande.`;
    }

    // ----------------------------------------------------
    // 8. SALUTATIONS & CONTACT
    // ----------------------------------------------------
    if (text.includes("bonjour") || text.includes("salut") || text.includes("hello") || text.includes("coucou") || text.includes("bonsoir")) {
        return `👋 **Bienvenue sur DAKPROELITE !**\n\n` +
               `Comment pouvons-nous vous aider aujourd'hui ? Vous pouvez me poser des questions sur nos produits, la vente, les paiements sécurisés, les livraisons, le programme ambassadeur ou notre règlement.`;
    }

    if (text.includes("contact") || text.includes("adresse") || text.includes("bureau") || text.includes("telephone") || text.includes("téléphone") || text.includes("email") || text.includes("support")) {
        return `📞 **CONTACT & SUPPORT OFFICIEL DAKPROELITE** 🏢\n\n` +
               `- **Plateforme :** DAKPROELITE Marketplace\n` +
               `- **E-mail Support :** contact@dakproelite.com\n` +
               `- **WhatsApp Direct :** +229 01 97 45 53 09\n` +
               `- **Disponibilité :** Service assistance disponible 24h/24 & 7j/7.`;
    }

    // ----------------------------------------------------
    // RÉPONSE PAR DÉFAUT ENRICHIE
    // ----------------------------------------------------
    return `Merci pour votre message ! 💬\n\n` +
           `Bienvenue sur **DAKPROELITE**, le marché mondial sécurisé pour acheter, vendre et faire fructifier vos activités.\n\n` +
           `Vous pouvez m'interroger sur :\n` +
           `- 🛍️ **Vendeurs :** Boutique, boost de produits, retrait des gains\n` +
           `- 📦 **Acheteurs :** Modes de paiement, garantie séquestre, suivi de colis\n` +
           `- 🏆 **Ambassadeurs & Affiliation :** Générer des commissions de parrainage\n` +
           `- ⚖️ **Règlement, CGU & Confidentialité :** Statut et protection des données\n\n` +
           `📞 **Support Direct :**\n` +
           `📧 contact@dakproelite.com | 📲 WhatsApp : +229 01 97 45 53 09`;
}

/**
 * Nettoyage automatique des messages de plus de 24 heures
 */
async function nettoyerAnciensMessages(db, currentUid) {
    try {
        const messagesRef = ref(db, `messages_support/${currentUid}`);
        const snapshot = await get(messagesRef);
        
        if (snapshot.exists()) {
            const now = Date.now();
            const VINGT_QUATRE_HEURES_MS = 24 * 60 * 60 * 1000;

            snapshot.forEach((childSnapshot) => {
                const msg = childSnapshot.val();
                if (msg.timestamp && (now - msg.timestamp > VINGT_QUATRE_HEURES_MS)) {
                    remove(ref(db, `messages_support/${currentUid}/${childSnapshot.key}`));
                }
            });
        }
    } catch (err) {
        console.warn("Nettoyage messages ignoré :", err);
    }
}

/**
 * Initialisation du module Support Rapide
 */
export function init(container, db, auth, userId) {
    if (!container || !db) return;

    const currentUid = userId || (auth && auth.currentUser ? auth.currentUser.uid : null);
    const ADMIN_WHATSAPP = "2290197455309";
    const ADMIN_EMAIL = "contact@dakproelite.com";

    if (!currentUid) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ff8585; font-family: 'Segoe UI', sans-serif; background: #0e121a; border-radius: 12px; border: 1px solid #2a2a32;">
                🔒 Veuillez vous connecter pour accéder à l'Assistance DAKPROELITE.
            </div>
        `;
        return;
    }

    nettoyerAnciensMessages(db, currentUid);

    container.innerHTML = `
        <style>
            .support-wrapper {
                font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
                color: #f5f5f7;
                max-width: 900px;
                margin: 0 auto;
            }
            .support-header {
                color: #d4af37;
                font-size: 19px;
                font-weight: 700;
                margin-bottom: 15px;
                border-bottom: 2px solid rgba(212, 175, 55, 0.2);
                padding-bottom: 10px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 10px;
            }
            .emergency-bar {
                background: linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(0, 0, 0, 0.4));
                border: 1px solid #d4af37;
                border-radius: 10px;
                padding: 12px 16px;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 12px;
                font-size: 13px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }
            .emergency-actions {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            .info-card {
                background: #121622;
                border: 1px solid #282e3e;
                border-radius: 12px;
                padding: 15px;
                margin-bottom: 15px;
            }
            .form-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 10px;
            }
            .field-group {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .field-group label {
                font-size: 11px;
                color: #aaa;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .form-input {
                background: #090c13;
                border: 1px solid #31374a;
                border-radius: 8px;
                padding: 10px 12px;
                color: #fff;
                font-size: 13px;
                outline: none;
                transition: border-color 0.2s;
            }
            .form-input:focus {
                border-color: #d4af37;
            }
            .chat-box {
                background: #080a10;
                border: 1px solid #1f2433;
                border-radius: 12px;
                height: 420px;
                overflow-y: auto;
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 14px;
                margin-bottom: 15px;
                scroll-behavior: smooth;
            }
            .msg-bubble-container {
                display: flex;
                flex-direction: column;
                max-width: 85%;
            }
            .msg-user-container {
                align-self: flex-end;
                align-items: flex-end;
            }
            .msg-admin-container {
                align-self: flex-start;
                align-items: flex-start;
            }
            .msg-bubble {
                padding: 12px 16px;
                border-radius: 12px;
                font-size: 13.5px;
                line-height: 1.55;
                white-space: pre-wrap;
                word-break: break-word;
                position: relative;
            }
            .msg-user {
                background: linear-gradient(135deg, #d4af37, #b8952b);
                color: #000;
                font-weight: 500;
                border-bottom-right-radius: 2px;
            }
            .msg-admin {
                background: #171c2b;
                color: #f0f0f5;
                border: 1px solid #2d354a;
                border-bottom-left-radius: 2px;
            }
            .msg-meta {
                font-size: 10px;
                opacity: 0.75;
                margin-top: 4px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .msg-actions {
                display: flex;
                gap: 6px;
                margin-top: 6px;
            }
            .btn-msg-action {
                background: rgba(255, 255, 255, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.15);
                color: #ddd;
                border-radius: 6px;
                padding: 4px 8px;
                font-size: 11px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 4px;
                transition: all 0.2s;
            }
            .btn-msg-action:hover {
                background: rgba(212, 175, 55, 0.2);
                border-color: #d4af37;
                color: #fff;
            }
            .chat-input-area {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            .btn-send {
                background: linear-gradient(135deg, #d4af37, #b8952b);
                color: #000;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                transition: transform 0.1s, background 0.2s;
            }
            .btn-send:hover {
                filter: brightness(1.1);
            }
            .btn-send:active {
                transform: scale(0.98);
            }
            .btn-whatsapp {
                background: #25D366;
                color: #fff;
                border: none;
                padding: 8px 14px;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 12px;
                text-decoration: none;
                transition: background 0.2s;
            }
            .btn-whatsapp:hover {
                background: #1eb854;
            }
            .btn-email {
                background: #ea4335;
                color: #fff;
                border: none;
                padding: 8px 14px;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 12px;
                text-decoration: none;
                transition: background 0.2s;
            }
            .btn-email:hover {
                background: #d33828;
            }
        </style>

        <div class="support-wrapper">
            <div class="support-header">
                <span>💬 Assistance Instantanée DAKPROELITE</span>
                <span style="font-size: 12px; color: #aaa; font-weight: normal;">Marché Mondial Sécurisé</span>
            </div>

            <!-- Urgence / Contact Direct -->
            <div class="emergency-bar">
                <span>⚠️ Besoins spécifiques ou assistance directe avec l'équipe ?</span>
                <div class="emergency-actions">
                    <a href="mailto:${ADMIN_EMAIL}" class="btn-email">
                        ✉️ ${ADMIN_EMAIL}
                    </a>
                    <a id="linkWhatsappDirect" href="https://wa.me/${ADMIN_WHATSAPP}" target="_blank" rel="noopener" class="btn-whatsapp">
                        📲 WhatsApp Direct
                    </a>
                </div>
            </div>

            <!-- Coordonnées Utilisateur -->
            <div class="info-card">
                <div style="font-size: 12px; color: #d4af37; font-weight: bold; margin-bottom: 10px;">
                    👤 Votre Profil Client
                </div>
                <div class="form-grid">
                    <div class="field-group">
                        <label>Nom & Prénom</label>
                        <input type="text" id="suppNom" class="form-input" placeholder="Votre nom complet" />
                    </div>
                    <div class="field-group">
                        <label>Téléphone / WhatsApp</label>
                        <input type="tel" id="suppPhone" class="form-input" placeholder="Ex: +229..." />
                    </div>
                    <div class="field-group">
                        <label>E-mail</label>
                        <input type="email" id="suppEmail" class="form-input" placeholder="votre@email.com" />
                    </div>
                </div>
            </div>

            <!-- Tchat en direct -->
            <div class="chat-box" id="chatBox">
                <div style="color: #888; text-align: center; margin: auto; font-size: 13px;">Chargement de l'assistance DAKPROELITE...</div>
            </div>

            <!-- Zone de Saisie -->
            <div class="chat-input-area">
                <input type="text" id="inputSupportMsg" class="form-input" style="flex:1; min-width: 250px;" placeholder="Posez votre question (boutiques, paiements, programme ambassadeur, règlement, politique de confidentialité...)" />
                <button id="btnSendMsg" class="btn-send">Envoyer</button>
            </div>
        </div>
    `;

    const suppNom = document.getElementById("suppNom");
    const suppPhone = document.getElementById("suppPhone");
    const suppEmail = document.getElementById("suppEmail");
    const chatBox = document.getElementById("chatBox");
    const inputMsg = document.getElementById("inputSupportMsg");
    const btnSend = document.getElementById("btnSendMsg");
    const linkWhatsappDirect = document.getElementById("linkWhatsappDirect");

    function mettreAJourLienWhatsapp(dernierTexte = "") {
        const nom = suppNom?.value.trim() || "";
        const phone = suppPhone?.value.trim() || "";

        const messageWhatsApp = 
`*--- ASSISTANCE DAKPROELITE ---*
👤 *Client :* ${nom}
📞 *Tél :* ${phone}

💬 *Demande :*
${dernierTexte || "Bonjour, je souhaite obtenir de l'aide sur DAKPROELITE."}`;

        if (linkWhatsappDirect) {
            linkWhatsappDirect.href = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(messageWhatsApp)}`;
        }
    }

    window.lireTexteAudio = function(texte) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(texte);
            utterance.lang = 'fr-FR';
            utterance.rate = 1.0;
            window.speechSynthesis.speak(utterance);
        } else {
            alert("La synthèse vocale n'est pas supportée par votre navigateur.");
        }
    };

    window.copierTexteMessage = function(texte, btnElement) {
        navigator.clipboard.writeText(texte).then(() => {
            const originalHTML = btnElement.innerHTML;
            btnElement.innerHTML = "✅ Copié !";
            setTimeout(() => {
                btnElement.innerHTML = originalHTML;
            }, 2000);
        }).catch(err => {
            console.error("Erreur de copie :", err);
        });
    };

    const userRef = ref(db, `users/${currentUid}`);
    get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (suppNom) {
                const nomComplet = [data.nom, data.prenom].filter(Boolean).join(" ");
                suppNom.value = nomComplet || data.nomClient || "";
            }
            if (data.telephone && suppPhone) suppPhone.value = data.telephone;
            if (data.email && suppEmail) suppEmail.value = data.email;
        } else if (auth?.currentUser?.email) {
            if (suppEmail) suppEmail.value = auth.currentUser.email;
        }
        mettreAJourLienWhatsapp();
    }).catch(console.error);

    const messagesRef = ref(db, `messages_support/${currentUid}`);
    onValue(messagesRef, (snapshot) => {
        if (!chatBox) return;

        if (!snapshot.exists()) {
            chatBox.innerHTML = `
                <div style="color: #aaa; text-align: center; margin: auto; font-size: 13px; line-height: 1.7; max-width: 550px;">
                    👋 **Bienvenue sur l'assistance DAKPROELITE !**<br><br>
                    Notre plateforme est conçue pour sécuriser toutes vos ventes et achats à l'échelle internationale.<br><br>
                    Posez une question sur la marketplace, les boutiques, la garantie séquestre, le programme ambassadeur, nos CGU ou notre politique de confidentialité.
                </div>
            `;
            return;
        }

        chatBox.innerHTML = "";
        const messages = snapshot.val();

        Object.entries(messages).forEach(([msgId, msg]) => {
            const isUser = msg.sender === "user";
            const containerDiv = document.createElement("div");
            containerDiv.className = `msg-bubble-container ${isUser ? 'msg-user-container' : 'msg-admin-container'}`;

            const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' }) : '';
            const texteEchappe = escapeHTML(msg.texte);

            let htmlContent = `
                <div class="msg-bubble ${isUser ? 'msg-user' : 'msg-admin'}">
                    <div style="font-size: 11px; font-weight: bold; margin-bottom: 4px; opacity: 0.85;">
                        ${isUser ? '👤 Vous' : '🤖 Assistant DAKPROELITE'}
                    </div>
                    <div>${texteEchappe}</div>
                </div>
                <div class="msg-meta">
                    <span>${timeStr}</span>
                </div>
            `;

            containerDiv.innerHTML = htmlContent;

            if (!isUser) {
                const actionsDiv = document.createElement("div");
                actionsDiv.className = "msg-actions";
                
                const texteBrutJson = JSON.stringify(msg.texte);

                actionsDiv.innerHTML = `
                    <button class="btn-msg-action" onclick='window.copierTexteMessage(${texteBrutJson}, this)'>
                        📋 Copier
                    </button>
                    <button class="btn-msg-action" onclick='window.lireTexteAudio(${texteBrutJson})'>
                        🔊 Écouter
                    </button>
                `;
                containerDiv.appendChild(actionsDiv);
            }

            chatBox.appendChild(containerDiv);
        });

        chatBox.scrollTop = chatBox.scrollHeight;
    });

    async function sendMessage() {
        const nom = suppNom?.value.trim() || "";
        const phone = suppPhone?.value.trim() || "";
        const email = suppEmail?.value.trim() || "";
        const text = inputMsg?.value.trim() || "";

        if (!text) return;

        if (inputMsg) inputMsg.value = "";

        try {
            await set(ref(db, `users/${currentUid}/coordonnees`), {
                nom,
                telephone: phone,
                email
            });

            await push(ref(db, `messages_support/${currentUid}`), {
                sender: "user",
                texte: text,
                timestamp: serverTimestamp(),
                nomClient: nom,
                telephoneClient: phone,
                emailClient: email
            });

            mettreAJourLienWhatsapp(text);

            const reponseBot = obtenirReponseAutomatique(text);

            setTimeout(async () => {
                await push(ref(db, `messages_support/${currentUid}`), {
                    sender: "bot",
                    texte: reponseBot,
                    timestamp: serverTimestamp()
                });
            }, 400);

        } catch (e) {
            console.error("Erreur Envoi Support :", e);
            alert("Une erreur s'est produite lors de l'envoi de votre message.");
        }
    }

    btnSend?.addEventListener("click", sendMessage);
    inputMsg?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });
}
