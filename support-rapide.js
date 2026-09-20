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
 * Base de connaissances pour la Réponse Automatique Intelligente (Bot)
 */
function obtenirReponseAutomatique(texteMessage) {
    const text = texteMessage.toLowerCase();

    // 1. Devenir Affilié / Vendeur
    if (text.includes("affilié") || text.includes("affiliation") || text.includes("vendre") || text.includes("rejoindre")) {
        return `Bonjour ! 👋\n\nPour devenir **vendeur affilié** sur **DAKPROELITE**, c'est très simple :\n\n1. Copiez le **lien d'affiliation** situé sous les fiches produits.\n2. Partagez-le sur vos canaux de vente (WhatsApp, Facebook, etc.).\n3. Dès qu'une vente est réalisée via votre lien, votre commission est créditée automatiquement !\n\nSi vous souhaitez vous inscrire sur notre plateforme dédiée aux affiliés, laissez-nous un message ici et nous vous enverrons votre lien d'inscription unique.`;
    }

    // 2. Paiement & Moyen de Règlement
    if (text.includes("payer") || text.includes("paiement") || text.includes("moyen") || text.includes("carte") || text.includes("momov") || text.includes("mtn") || text.includes("moov") || text.includes("wave") || text.includes("celtis")) {
        return `Pour effectuer votre paiement sur **DAKPROELITE** :\n\n1. Ajoutez vos articles au **Panier**.\n2. Rendez-vous dans la section **Paiement Sécurisé**.\n3. Validez la transaction.\n\nNous acceptons plusieurs modes de paiement sécurisés :\n💳 **Cartes Bancaires (Visa, Mastercard)**\n📱 **Mobile Money (MTN, Moov, Wave, Celtis)**\n\nUne fois le paiement validé, accédez à la rubrique **Mes Commandes** pour télécharger votre reçu officiel.`;
    }

    // 3. Rôle du Panier
    if (text.includes("panier") || text.includes("calcul")) {
        return `Le **Panier** vous sert de calculateur dynamique :\nIl récapitule l'ensemble de vos articles, ajuste les quantités, calcule le montant total global de vos achats et vous redirige vers le paiement sécurisé en toute simplicité.`;
    }

    // 4. Rôle de la rubrique Commandes & Reçu / QR Code
    if (text.includes("reçu") || text.includes("recu") || text.includes("qr") || text.includes("commande")) {
        return `Dans l'espace **Mes Commandes**, vous pouvez :\n\n- Confirmer la réception de vos achats pour lancer le processus de livraison.\n- Télécharger votre **reçu officiel muni d'un QR Code sécurisé**.\n- Présenter ce reçu lors de la réception du colis ou l'envoyer directement au support pour toute vérification.`;
    }

    // 5. Retard de Colis / Réclamation
    if (text.includes("pas encore") || text.includes("retard") || text.includes("mon colis") || text.includes("ou est") || text.includes("où est")) {
        return `Nous sommes navrés pour ce délai d'attente ! 📦\n\nAfin que nous puissions analyser rapidement votre situation, merci de nous préciser :\n1. Le **Numéro de commande / colis**.\n2. Le **Nom du produit** acheté.\n3. Une **capture ou photo du reçu de paiement**.\n4. Vérifiez si votre compte a bien été débité.\n\nNotre équipe vérifie immédiatement l'acheminement avec notre livreur et revient vers vous. Merci pour votre patience !`;
    }

    // 6. Modalités de Livraison & Transitaires
    if (text.includes("livraison") || text.includes("livrer") || text.includes("expédition") || text.includes("dhl") || text.includes("transitaire")) {
        return `Nous expédions vos commandes dans **le monde entier** ! 🌍\n\n- Expédition via nos partenaires comme **DHL** et des services de livraison internationaux express.\n- Vous pouvez indiquer les coordonnées de votre **transitaire habituel** pour une livraison directe à son magasin.\n- Sinon, optez pour la livraison directe à votre adresse lors du règlement.`;
    }

    // Réponse par défaut
    return `Merci pour votre message ! 💬\nVotre demande a été transmise à notre assistance **DAKPROELITE**.\nSi vous souhaitez discuter directement avec notre administrateur sur WhatsApp, cliquez sur le bouton **"Contacter l'Admin sur WhatsApp"** ci-dessous.`;
}

/**
 * Initialisation du module Support Rapide
 */
export function init(container, db, auth, userId) {
    if (!container || !db) return;

    const currentUid = userId || (auth && auth.currentUser ? auth.currentUser.uid : null);
    const ADMIN_WHATSAPP = "2290197455309"; // Numéro WhatsApp Administrateur

    if (!currentUid) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ff8585; font-family: 'Segoe UI', sans-serif;">
                Veuillez vous connecter pour accéder au Support Rapide.
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
                height: 320px;
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
                padding: 10px 18px;
                border-radius: 8px;
                font-weight: bold;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 13px;
                text-decoration: none;
                transition: 0.2s;
            }
            .btn-whatsapp:hover {
                background: #1eb854;
            }
        </style>

        <div class="support-container">
            <div class="support-header">
                <span>💬 Assistance Instantanée DAKPROELITE</span>
                <a id="linkWhatsappDirect" href="#" target="_blank" class="btn-whatsapp">
                    📲 WhatsApp Admin
                </a>
            </div>

            <!-- Informations client chargées dynamiquement -->
            <div class="info-card">
                <div style="font-size: 12px; color: #d4af37; font-weight: bold; margin-bottom: 10px;">
                    👤 Identifiant Client Connecté
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
                <div style="color: #666; text-align: center; margin: auto; font-size: 12px;">Initialisation de votre assistant...</div>
            </div>

            <!-- Saisie -->
            <div class="chat-input-area">
                <input type="text" id="inputSupportMsg" class="form-input" style="flex:1; min-width: 250px;" placeholder="Posez votre question (ex: livraison, paiement, affiliation...)" />
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

    // Mise à jour du lien WhatsApp direct
    function mettreAJourLienWhatsapp(dernierTexte = "") {
        const nom = suppNom.value.trim();
        const prenom = suppPrenom.value.trim();
        const phone = suppPhone.value.trim();

        const messageWhatsApp = 
`*--- ASSISTANCE DAKPROELITE ---*
👤 *Client :* ${prenom} ${nom}
📞 *Tél :* ${phone}
🆔 *UID :* ${currentUid}

💬 *Question :*
${dernierTexte || "Bonjour, j'ai besoin d'assistance sur la plateforme."}`;

        linkWhatsappDirect.href = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(messageWhatsApp)}`;
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
                <div style="color: #777; text-align: center; margin: auto; font-size: 12px; line-height: 1.6;">
                    👋 Bonjour ! Bienvenue sur l'assistance **DAKPROELITE**.<br>
                    Posez vos questions sur la **livraison**, les **paiements**, le **panier** ou le **programme d'affiliation**.
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
        const nom = suppNom.value.trim();
        const prenom = suppPrenom.value.trim();
        const phone = suppPhone.value.trim();
        const email = suppEmail.value.trim();
        const text = inputMsg.value.trim();

        if (!text) return;

        inputMsg.value = "";

        try {
            // 1. Sauvegarde des coordonnées
            await set(ref(db, `users/${currentUid}/coordonnees`), {
                nom,
                prenom,
                telephone: phone,
                email
            });

            // 2. Enregistrement du message acheteur dans Firebase
            await push(ref(db, `messages_support/${currentUid}`), {
                sender: "user",
                texte: text,
                timestamp: serverTimestamp(),
                nomClient: `${prenom} ${nom}`,
                telephoneClient: phone,
                emailClient: email
            });

            // Mise à jour du lien WhatsApp avec la question courante
            mettreAJourLienWhatsapp(text);

            // 3. Traitement de la réponse automatique par le bot
            const reponseBot = obtenirReponseAutomatique(text);

            setTimeout(async () => {
                await push(ref(db, `messages_support/${currentUid}`), {
                    sender: "bot",
                    texte: reponseBot,
                    timestamp: serverTimestamp()
                });
            }, 600);

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