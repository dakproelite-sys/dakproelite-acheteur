import { ref, push, onValue, set, get, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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
 * Base de connaissances complète et élargie pour la Réponse Automatique Intelligente (Bot DAKPROELITE)
 * Couvre tous les profils : Vendeurs, Livreurs, Acheteurs, Affiliés, Visiteurs, Support et Technique.
 */
function obtenirReponseAutomatique(texteMessage) {
    const text = texteMessage.toLowerCase();

    // ----------------------------------------------------
    // 1. SECTION VENDEURS & BOUTIQUES
    // ----------------------------------------------------
    if (text.includes("vendeur") || text.includes("devenir vendeur") || text.includes("boutique") || text.includes("vendre")) {
        return `📜 **CHARTE ET ACCÈS VENDEUR DAKPROELITE** 🛍️\n\nPour vendre vos articles sur DAKPROELITE :\n1. Soumettez vos pièces d'identité et contact d'entreprise.\n2. Publiez des fiches produits claires (images HD, prix exacts, stocks).\n3. Traitez les commandes sous 24h à 48h maximum.\n4. Tout produit contrefait entraîne la fermeture définitive du compte.\n5. Vos revenus sont crédités sur votre solde dès confirmation de livraison par l'acheteur.`;
    }

    if (text.includes("boost") || text.includes("mise en avant") || text.includes("publicité") || text.includes("sponsoriser")) {
        return `🚀 **BOOST & PUBLICITÉ PRODUITS** 📈\n\nAugmentez la visibilité de vos articles :\n- Rendez-vous dans votre tableau de bord Vendeur rubrique **Abonnements / Boosts**.\n- Choisissez la durée souhaitée (24h, 7 jours, 30 jours).\n- Vos produits apparaîtront en tête du catalogue et sur la bannière principale DAKPROELITE.`;
    }

    if (text.includes("retrait") || text.includes("virement") || text.includes("récupérer mon argent") || text.includes("mes gains")) {
        return `💰 **RETRAIT DE VOS GAINS VENDEUR & AFFILIÉ** 💳\n\n- Accédez à la rubrique **Retraits** de votre espace.\n- Choisissez votre canal : Mobile Money (MTN, Moov, Wave, Celtis) ou Virement Bancaire.\n- Les demandes de retrait sont validées sous 24h à 48h ouvrées par la comptabilité DAKPROELITE.`;
    }

    if (text.includes("commission vendeur") || text.includes("frais de vente") || text.includes("pourcentage")) {
        return `📊 **COMMISSIONS SUR LES VENTES** 💸\n\n- L'inscription et la création de boutique sont entièrement gratuites.\n- DAKPROELITE prérompt une commission fixe minimale lors de la finalisation de chaque vente pour couvrir la maintenance sécurisée et la gestion des transactions.`;
    }

    if (text.includes("stock") || text.includes("rupture") || text.includes("quantité")) {
        return `📦 **GESTION DU STOCK ET DISPONIBILITÉ**\n\nMettez régulièrement à jour le stock de vos produits sur votre tableau de bord. Un vendeur qui valide une commande sans disposer du stock risque une pénalité ou la suspension temporaire de sa boutique.`;
    }

    // ----------------------------------------------------
    // 2. SECTION LIVREURS & LOGISTIQUE
    // ----------------------------------------------------
    if (text.includes("livreur") || text.includes("coursier") || text.includes("devenir livreur") || text.includes("partenaire livraison")) {
        return `📦 **REJOINDRE LE RÉSEAU DE LIVREURS DAKPROELITE** 🚚\n\nVous êtes un livreur indépendant ou une société de coursier ?\n1. Laissez vos informations (Zone de couverture, Engins, Téléphone/WhatsApp).\n2. Vous devez vous engager à respecter les créneaux et l'intégrité des colis.\n3. La remise s'effectue après validation du **Reçu QR Code** présent sur l'application de l'acheteur.`;
    }

    if (text.includes("transitaire") || text.includes("dhl") || text.includes("international") || text.includes("expédition")) {
        return `🌍 **LIVRAISON INTERNATIONALE & TRANSITAIRES**\n\n- **International :** Nous acheminons les colis via **DHL Express** et nos partenaires internationaux agréés.\n- **Transitaire Client :** L'acheteur peut enregistrer l'adresse de son transitaire habituel. Le colis y sera déposé contre reçu officiel signé.`;
    }

    if (text.includes("colis endommagé") || text.includes("perte") || text.includes("colis cassé")) {
        return `🛡️ **GESTION DES INCIDENTS DE LIVRAISON** ⚠️\n\nEn cas de colis défectueux ou perdu :\n1. Le livreur doit signer une attestation de constat à la remise.\n2. L'acheteur doit transmettre une photo/vidéo sur ce support sous 24h.\n3. DAKPROELITE bloque le paiement du vendeur jusqu'à la résolution du litige ou le remboursement.`;
    }

    if (text.includes("frais de livraison") || text.includes("tarif livraison") || text.includes("expedition")) {
        return `🚚 **FRAIS DE LIVRAISON ET EXPÉDITIONS**\n\nLes frais de livraison sont calculés automatiquement lors de la validation du panier en fonction de la zone géographique du destinataire, du poids du colis et du transporteur sélectionné.`;
    }

    // ----------------------------------------------------
    // 3. SECTION ACHETEURS, PAIEMENTS & COMMANDES
    // ----------------------------------------------------
    if (text.includes("payer") || text.includes("paiement") || text.includes("moyen") || text.includes("momo") || text.includes("mtn") || text.includes("moov") || text.includes("wave") || text.includes("celtis") || text.includes("visa") || text.includes("mastercard")) {
        return `💳 **MOYENS DE PAIEMENT ACCEPTÉS** 🛒\n\nEffectuez vos règlements en toute sérénité :\n- 📱 **Mobile Money :** MTN Mobile Money, Moov Money, Wave, Celtis Cash.\n- 💳 **Cartes Bancaires :** Visa, Mastercard (Locales et Internationales).\n\nLe montant est conservé en séquestre sécurisé par DAKPROELITE jusqu'à la livraison complète de vos articles.`;
    }

    if (text.includes("panier") || text.includes("calculer") || text.includes("total")) {
        return `🛒 **UTILISATION DU PANIER AUTOMATIQUE**\n\nLe **Panier** recalcule dynamiquement le coût total de vos achats, gère la modification des quantités, applique les réductions et vous redirige en un clic vers la page de paiement sécurisé.`;
    }

    if (text.includes("reçu") || text.includes("recu") || text.includes("qr") || text.includes("facture")) {
        return `📜 **REÇU D'ACHAT & QR CODE DE SÉCURITÉ**\n\nDès validation du paiement, retrouvez votre reçu électronique dans **Mes Commandes**.\nCe reçu inclut un **QR Code authentifié** à présenter au livreur ou à l'administrateur pour valider la réception finale.`;
    }

    if (text.includes("remboursement") || text.includes("annuler") || text.includes("retour")) {
        return `🔄 **POLITIQUE DE RETOUR & REMBOURSEMENT**\n\nSi le produit livré ne correspond pas à la fiche technique ou présente un défaut :\n1. Ne validez pas la livraison dans l'application.\n2. Ouvrez une réclamation ici en fournissant les photos du reçu et du produit.\n3. Après vérification par l'Admin, votre remboursement sera effectué sous 48h.`;
    }

    if (text.includes("retard") || text.includes("ou est mon colis") || text.includes("pas reçu") || text.includes("où est mon colis")) {
        return `📦 **SUIVI ET RETARD DE LIVRAISON** ⏱️\n\nVeuillez nous indiquer dans ce chat :\n1. Votre **Numéro de Commande**.\n2. Le **Nom du Produit**.\n3. La **Capture du Reçu de Paiement**.\n\nNotre équipe vérifie l'acheminement auprès du livreur et revient vers vous sous peu.`;
    }

    // ----------------------------------------------------
    // 4. PROGRAMME D'AFFILIATION
    // ----------------------------------------------------
    if (text.includes("affilié") || text.includes("affiliation") || text.includes("parrainage") || text.includes("lien d'affiliation")) {
        return `🤝 **PROGRAMME D'AFFILIATION DAKPROELITE** 💰\n\n1. Copiez votre lien d'affiliation sous n'importe quel produit du catalogue.\n2. Partagez-le sur WhatsApp, TikTok, Facebook ou vos blogs.\n3. Chaque achat effectué via votre lien crédite instantanément votre commission sur votre solde DAKPROELITE.\n4. Retirez vos gains directement sur votre Mobile Money !`;
    }

    // ----------------------------------------------------
    // 5. REGLEMENT, CONFIDENTIALITÉ & CADRE LÉGAL
    // ----------------------------------------------------
    if (text.includes("règlement") || text.includes("reglement") || text.includes("cgu") || text.includes("condition")) {
        return `⚖️ **RÈGLEMENT GÉNÉRAL DE DAKPROELITE** 📋\n\n- Interdiction absolue de contourner la plateforme pour réaliser des transactions en direct hors site.\n- Respect obligatoire des règles de courtoisie entre acheteurs, vendeurs et livreurs.\n- Tout compte impliqué dans des tentatives de fraude sera banni de manière permanente sans préavis.`;
    }

    if (text.includes("confidentialité") || text.includes("donnée") || text.includes("rgpd") || text.includes("sécurité")) {
        return `🔒 **PROTECTION ET CONFIDENTIALITÉ DES DONNÉES**\n\nVos informations (Nom, Téléphone, Adresse, Historique de commande) sont chiffrées sur nos serveurs Firebase sécurisés. DAKPROELITE ne vend ni ne partage aucune donnée personnelle à des tiers.`;
    }

    // ----------------------------------------------------
    // 6. PROFILS TECHNIQUES & ARCHITECTES DU SYSTÈME
    // ----------------------------------------------------
    if (text.includes("architecture") || text.includes("api") || text.includes("firebase") || text.includes("technique") || text.includes("code") || text.includes("développeur") || text.includes("developpeur") || text.includes("architecte")) {
        return `⚙️ **SPÉCIFICATIONS TECHNIQUES & ARCHITECTURE DAKPROELITE** 💻\n\n- **Frontend :** Modules Javascript ES6+ asynchrones, EJS & CSS3 adaptatif.\n- **Backend & Database :** Google Firebase Realtime Database avec écouteurs \`onValue\` temps réel.\n- **Hosting & CI/CD :** Netlify / Vercel / GitHub Repositories.\n- **Sécurité :** Nettoyage anti-XSS des entrées utilisateur (\`escapeHTML\`), jetons d'authentification Firebase Auth et validation par QR Code.`;
    }

    // ----------------------------------------------------
    // 7. VISITEURS, CONTACTS, BLOCAGES ET SUPPORT DIRECT
    // ----------------------------------------------------
    if (text.includes("bloqué") || text.includes("bloque") || text.includes("erreur") || text.includes("bug") || text.includes("probleme") || text.includes("problème")) {
        return `🚨 **ASSISTANCE EN CAS DE BLOCAGE OU BUG**\n\nSi vous rencontrez un blocage sur l'interface :\n1. Rafraîchissez votre navigateur ou l'application.\n2. Vérifiez votre connexion Internet.\n3. Si le problème persiste, contactez immédiatement le support :\n   📧 **Email :** contact@dakproelite.com\n   📲 **WhatsApp Direct :** +229 01 97 45 53 09`;
    }

    if (text.includes("bonjour") || text.includes("salut") || text.includes("hello") || text.includes("coucou")) {
        return `👋 **Bonjour et bienvenue sur DAKPROELITE !**\n\nComment pouvons-nous vous aider aujourd'hui ? Posez votre question sur nos produits, la livraison, le programme d'affiliation ou la création d'un compte vendeur.`;
    }

    if (text.includes("contact") || text.includes("adresse") || text.includes("bureau") || text.includes("siège") || text.includes("telephone") || text.includes("téléphone") || text.includes("email") || text.includes("e-mail")) {
        return `📞 **CONTACT & ASSISTANCE DIRECTE DAKPROELITE** 🏢\n\n- **Plateforme :** DAKPROELITE Marketplace International\n- **E-mail Support :** contact@dakproelite.com\n- **Support WhatsApp Direct :** +229 01 97 45 53 09\n- **Assistance en ligne :** Disponible 24h/24 et 7j/7 via cette messagerie intégrée.`;
    }

    if (text.includes("compte") || text.includes("inscription") || text.includes("connexion") || text.includes("mot de passe")) {
        return `🔐 **GESTION DU COMPTE UTILISATEUR**\n\n- Pour créer un compte, cliquez sur **Connexion / Inscription** sur la page d'accueil.\n- Si vous avez oublié votre mot de passe, utilisez la fonction de réinitialisation par e-mail ou contactez l'administrateur via WhatsApp au +229 01 97 45 53 09.`;
    }

    if (text.includes("promotions") || text.includes("réduction") || text.includes("code promo") || text.includes("remise")) {
        return `🏷️ **PROMOTIONS & CODES DE RÉDUCTION**\n\nRetrouvez régulièrement des offres exclusives et des codes promo sur nos bannières d'accueil ou partagés par nos affiliés partenaires lors d'évènements spéciaux.`;
    }

    if (text.includes("avis") || text.includes("évaluation") || text.includes("note")) {
        return `⭐ **AVIS ET ÉVALUATIONS**\n\nAprès chaque livraison réussie, vous pouvez donner votre avis sur le produit et attribuer une note au vendeur afin de guider la communauté DAKPROELITE.`;
    }

    // ----------------------------------------------------
    // RÉPONSE PAR DÉFAUT
    // ----------------------------------------------------
    return `Merci pour votre message ! 💬\nVotre demande a été enregistrée par le support DAKPROELITE.\n\nVous pouvez poser des questions sur :\n- 🛍️ **Vendeurs :** Inscription, Boosts, Retraits, Stocks\n- 📦 **Livreurs :** Livraisons, Transports, Transitaires, Frais\n- 💳 **Acheteurs :** Paiements, Panier, Reçus QR Code, Remboursements\n- 🤝 **Affiliés :** Liens d'affiliation, Commissions\n- ⚙️ **Technique :** Architecture système & Sécurité\n\nEn cas de blocage urgent, contactez-nous directement :\n📧 contact@dakproelite.com\n📲 WhatsApp : +229 01 97 45 53 09`;
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
            <div style="text-align: center; padding: 40px; color: #ff8585; font-family: 'Segoe UI', sans-serif;">
                Veuillez vous connecter pour accéder à l'Assistance DAKPROELITE.
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <style>
            .support-container {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                color: #f5f5f7;
            }
            .support-header {
                color: #d4af37;
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 15px;
                border-bottom: 1px solid #2a2a32;
                padding-bottom: 10px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 10px;
            }
            .emergency-bar {
                background: rgba(212, 175, 55, 0.1);
                border: 1px solid #d4af37;
                border-radius: 8px;
                padding: 10px 14px;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 10px;
                font-size: 13px;
            }
            .emergency-actions {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            .info-card {
                background: #12161f;
                border: 1px solid #2a2a32;
                border-radius: 12px;
                padding: 15px;
                margin-bottom: 15px;
            }
            .form-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
            }
            .form-input {
                background: #0a0d14;
                border: 1px solid #333;
                border-radius: 8px;
                padding: 9px 12px;
                color: #fff;
                font-size: 13px;
                outline: none;
            }
            .form-input:focus {
                border-color: #d4af37;
            }
            .chat-box {
                background: #0a0d14;
                border: 1px solid #222;
                border-radius: 12px;
                height: 380px;
                overflow-y: auto;
                padding: 15px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-bottom: 15px;
            }
            .msg-bubble {
                max-width: 85%;
                padding: 10px 14px;
                border-radius: 10px;
                font-size: 13px;
                line-height: 1.5;
                white-space: pre-wrap;
            }
            .msg-user {
                align-self: flex-end;
                background: #d4af37;
                color: #000;
                font-weight: 500;
            }
            .msg-admin {
                align-self: flex-start;
                background: #1e2330;
                color: #fff;
                border: 1px solid #333;
            }
            .chat-input-area {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            .btn-send {
                background: #d4af37;
                color: #000;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                transition: 0.2s;
            }
            .btn-send:hover {
                background: #b8952b;
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
                transition: 0.2s;
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
                transition: 0.2s;
            }
            .btn-email:hover {
                background: #d33828;
            }
        </style>

        <div class="support-container">
            <div class="support-header">
                <span>💬 Assistance Instantanée DAKPROELITE</span>
            </div>

            <!-- Bandeau de contact direct en cas de blocage -->
            <div class="emergency-bar">
                <span>⚠️ Un souci ou un blocage sur l'interface ? Contactez le support direct :</span>
                <div class="emergency-actions">
                    <a href="mailto:${ADMIN_EMAIL}" class="btn-email">
                        ✉️ contact@dakproelite.com
                    </a>
                    <a id="linkWhatsappDirect" href="https://wa.me/${ADMIN_WHATSAPP}" target="_blank" rel="noopener" class="btn-whatsapp">
                        📲 WhatsApp +229 01 97 45 53 09
                    </a>
                </div>
            </div>

            <!-- Informations client chargées dynamiquement -->
            <div class="info-card">
                <div style="font-size: 12px; color: #d4af37; font-weight: bold; margin-bottom: 10px;">
                    👤 Profil Utilisateur / Client
                </div>
                <div class="form-grid">
                    <div class="field-group">
                        <label>Nom</label>
                        <input type="text" id="suppNom" class="form-input" placeholder="Votre nom" />
                    </div>
                    <div class="field-group">
                        <label>Prénom</label>
                        <input type="text" id="suppPrenom" class="form-input" placeholder="Votre prénom" />
                    </div>
                    <div class="field-group">
                        <label>Téléphone / WhatsApp</label>
                        <input type="tel" id="suppPhone" class="form-input" placeholder="Ex: +229 01..." />
                    </div>
                    <div class="field-group">
                        <label>E-mail</label>
                        <input type="email" id="suppEmail" class="form-input" placeholder="votre@email.com" />
                    </div>
                </div>
            </div>

            <!-- Chat en direct -->
            <div class="chat-box" id="chatBox">
                <div style="color: #666; text-align: center; margin: auto; font-size: 12px;">Initialisation du support DAKPROELITE...</div>
            </div>

            <!-- Saisie -->
            <div class="chat-input-area">
                <input type="text" id="inputSupportMsg" class="form-input" style="flex:1; min-width: 250px;" placeholder="Posez votre question (ex: devenir vendeur, affiliation, livraisons, paiements, retraits, blocage...)" />
                <button id="btnSendMsg" class="btn-send">Envoyer</button>
            </div>
        </div>
    `;

    const suppNom = document.getElementById("suppNom");
    const suppPrenom = document.getElementById("suppPrenom");
    const suppPhone = document.getElementById("suppPhone");
    const suppEmail = document.getElementById("suppEmail");
    const chatBox = document.getElementById("chatBox");
    const inputMsg = document.getElementById("inputSupportMsg");
    const btnSend = document.getElementById("btnSendMsg");
    const linkWhatsappDirect = document.getElementById("linkWhatsappDirect");

    // Mise à jour du lien WhatsApp direct avec les informations utilisateur
    function mettreAJourLienWhatsapp(dernierTexte = "") {
        const nom = suppNom?.value.trim() || "";
        const prenom = suppPrenom?.value.trim() || "";
        const phone = suppPhone?.value.trim() || "";

        const messageWhatsApp = 
`*--- ASSISTANCE DAKPROELITE ---*
👤 *Client :* ${prenom} ${nom}
📞 *Tél :* ${phone}
🆔 *UID :* ${currentUid}

💬 *Message / Demande d'assistance :*
${dernierTexte || "Bonjour, j'ai besoin d'assistance sur la plateforme DAKPROELITE."}`;

        if (linkWhatsappDirect) {
            linkWhatsappDirect.href = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(messageWhatsApp)}`;
        }
    }

    // Récupération automatique du profil utilisateur dans Realtime Database
    const userRef = ref(db, `users/${currentUid}`);
    get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.nom && suppNom) suppNom.value = data.nom;
            if (data.prenom && suppPrenom) suppPrenom.value = data.prenom;
            if (data.telephone && suppPhone) suppPhone.value = data.telephone;
            if (data.email && suppEmail) suppEmail.value = data.email;
        } else if (auth.currentUser && auth.currentUser.email) {
            if (suppEmail) suppEmail.value = auth.currentUser.email;
        }
        mettreAJourLienWhatsapp();
    }).catch(console.error);

    // Écoute en temps réel des messages dans Firebase
    const messagesRef = ref(db, `messages_support/${currentUid}`);
    onValue(messagesRef, (snapshot) => {
        if (!chatBox) return;

        if (!snapshot.exists()) {
            chatBox.innerHTML = `
                <div style="color: #bbb; text-align: center; margin: auto; font-size: 12px; line-height: 1.6;">
                    👋 **Bienvenue sur l'assistance DAKPROELITE !**<br><br>
                    Tapez vos mots-clés dans la zone ci-dessous pour obtenir une réponse immédiate :<br>
                    🔹 **Vendeurs & Boutiques :** inscription, boost, retraits, stocks<br>
                    🔹 **Livreurs & Logistique :** dhl, transitaire, retard, incident<br>
                    🔹 **Acheteurs :** paiements, momo, carte, panier, reçu QR Code<br>
                    🔹 **Programme d'Affiliation :** lien, commissions<br>
                    🔹 **Support Direct :** contact, email, whatsapp, bug, bloqué
                </div>
            `;
            return;
        }

        chatBox.innerHTML = "";
        const messages = snapshot.val();

        Object.values(messages).forEach(msg => {
            const isUser = msg.sender === "user";
            const bubble = document.createElement("div");
            bubble.className = `msg-bubble ${isUser ? 'msg-user' : 'msg-admin'}`;
            
            const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' }) : '';

            bubble.innerHTML = `
                <div style="font-size: 10px; opacity: 0.8; font-weight: bold; margin-bottom: 2px;">
                    ${isUser ? 'Vous' : '🤖 Assistant DAKPROELITE'}
                </div>
                <div>${escapeHTML(msg.texte)}</div>
                <div style="font-size: 9px; opacity: 0.7; text-align: right; margin-top: 4px;">
                    ${timeStr}
                </div>
            `;
            chatBox.appendChild(bubble);
        });

        chatBox.scrollTop = chatBox.scrollHeight;
    });

    // Envoi de message avec déclenchement de la réponse automatique
    async function sendMessage() {
        const nom = suppNom?.value.trim() || "";
        const prenom = suppPrenom?.value.trim() || "";
        const phone = suppPhone?.value.trim() || "";
        const email = suppEmail?.value.trim() || "";
        const text = inputMsg?.value.trim() || "";

        if (!text) return;

        if (inputMsg) inputMsg.value = "";

        try {
            // 1. Sauvegarde des coordonnées dans Firebase
            await set(ref(db, `users/${currentUid}/coordonnees`), {
                nom,
                prenom,
                telephone: phone,
                email
            });

            // 2. Enregistrement du message utilisateur dans Firebase Realtime Database
            await push(ref(db, `messages_support/${currentUid}`), {
                sender: "user",
                texte: text,
                timestamp: serverTimestamp(),
                nomClient: `${prenom} ${nom}`,
                telephoneClient: phone,
                emailClient: email
            });

            // Mise à jour du lien WhatsApp direct
            mettreAJourLienWhatsapp(text);

            // 3. Réponse automatique instantanée du bot
            const reponseBot = obtenirReponseAutomatique(text);

            setTimeout(async () => {
                await push(ref(db, `messages_support/${currentUid}`), {
                    sender: "bot",
                    texte: reponseBot,
                    timestamp: serverTimestamp()
                });
            }, 500);

        } catch (e) {
            console.error("Erreur Support :", e);
            alert("Erreur lors de l'envoi de votre message.");
        }
    }

    btnSend?.addEventListener("click", sendMessage);
    inputMsg?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });
}
