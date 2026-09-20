import { ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

/**
 * Initialisation du module Profil Acheteur (Affichage Dynamique)
 * @param {HTMLElement} container - Conteneur DOM parent
 * @param {Database} db - Instance Realtime Database
 * @param {Auth} auth - Instance Firebase Auth
 * @param {string} userId - ID de l'utilisateur connecté
 */
export function init(container, db, auth, userId) {
    if (!container || !db) return;

    if (!userId) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ff8585;">
                Veuillez vous connecter pour accéder à votre profil.
            </div>
        `;
        return;
    }

    // Structure HTML et styles d'affichage dynamique
    container.innerHTML = `
        <style>
            .profile-card {
                background: #0a0d14;
                border: 1px solid #2a2a32;
                border-radius: 16px;
                padding: 30px;
                max-width: 650px;
                margin: 0 auto;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
            }
            .profile-header {
                display: flex;
                align-items: center;
                gap: 20px;
                margin-bottom: 25px;
                border-bottom: 1px solid #1c1c21;
                padding-bottom: 20px;
            }
            .avatar-initials {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: linear-gradient(135deg, #d4af37, #8a7322);
                color: #000;
                font-size: 28px;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid #d4af37;
                text-transform: uppercase;
                flex-shrink: 0;
            }
            .user-heading {
                flex: 1;
            }
            .user-display-name {
                font-size: 22px;
                font-weight: bold;
                color: #fff;
            }
            .user-role-badge {
                display: inline-block;
                background: rgba(212, 175, 55, 0.15);
                color: #d4af37;
                border: 1px solid #d4af37;
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 11px;
                margin-top: 5px;
                font-weight: bold;
            }
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-bottom: 20px;
            }
            .info-box {
                background: #12161f;
                border: 1px solid #222;
                border-radius: 10px;
                padding: 12px 15px;
            }
            .info-box.full {
                grid-column: 1 / -1;
            }
            .info-label {
                font-size: 11px;
                color: #888;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
            }
            .info-value {
                font-size: 15px;
                color: #fff;
                font-weight: 500;
            }
            .form-input {
                width: 100%;
                padding: 10px;
                background: #0a0d14;
                border: 1px solid #d4af37;
                border-radius: 6px;
                color: #fff;
                outline: none;
                font-size: 14px;
                margin-top: 4px;
            }
            .btn-action {
                background: #d4af37;
                color: #000;
                font-weight: bold;
                padding: 12px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                width: 100%;
                font-size: 15px;
                transition: 0.3s;
            }
            .btn-action:hover {
                background: #f3e5ab;
            }
            @media (max-width: 600px) {
                .profile-header { flex-direction: column; text-align: center; }
                .info-grid { grid-template-columns: 1fr; }
            }
        </style>

        <div class="profile-card">
            <!-- Avatar Texte & Nom -->
            <div class="profile-header">
                <div class="avatar-initials" id="avatarInitials">--</div>
                <div class="user-heading">
                    <div class="user-display-name" id="userDisplayName">Chargement...</div>
                    <span class="user-role-badge">Acheteur VIP</span>
                </div>
            </div>

            <!-- Fiche d'informations dynamiques -->
            <div class="info-grid">
                <div class="info-box">
                    <div class="info-label">Prénom</div>
                    <div class="info-value" id="valPrenom">--</div>
                </div>
                <div class="info-box">
                    <div class="info-label">Nom</div>
                    <div class="info-value" id="valNom">--</div>
                </div>
                <div class="info-box full">
                    <div class="info-label">Adresse E-mail</div>
                    <div class="info-value" id="valEmail">--</div>
                </div>
                <div class="info-box full">
                    <div class="info-label">Téléphone</div>
                    <div class="info-value" id="valPhone">--</div>
                </div>
            </div>

            <button class="btn-action" id="btnToggleEdit">✏️ Modifier mes informations</button>
            <div id="profileMsg" style="margin-top: 15px; text-align: center; font-size: 13px; display: none;"></div>
        </div>
    `;

    let isEditing = false;
    let currentData = {};

    // 1. LECTURE DYNAMIQUE EN TEMPS RÉEL (Realtime Database + Auth)
    const userRef = ref(db, `users/${userId}`);
    onValue(userRef, (snapshot) => {
        const authUser = auth.currentUser;
        const dbData = snapshot.exists() ? snapshot.val() : {};

        currentData = {
            prenom: dbData.prenom || "",
            nom: dbData.nom || "",
            telephone: dbData.telephone || dbData.phone || "",
            email: (authUser ? authUser.email : "") || dbData.email || "Non renseigné"
        };

        if (!isEditing) {
            afficherDonnees(currentData);
        }
    });

    // Affichage texte des données reçues
    function afficherDonnees(data) {
        const prenom = data.prenom || "Non renseigné";
        const nom = data.nom || "Non renseigné";
        const phone = data.telephone || "Non renseigné";
        const email = data.email;

        document.getElementById("valPrenom").textContent = prenom;
        document.getElementById("valNom").textContent = nom;
        document.getElementById("valEmail").textContent = email;
        document.getElementById("valPhone").textContent = phone;

        // Nom complet d'en-tête
        const nomComplet = (data.prenom || data.nom) 
            ? `${data.prenom} ${data.nom}`.trim() 
            : (email !== "Non renseigné" ? email.split('@')[0] : "Acheteur VIP");
        
        document.getElementById("userDisplayName").textContent = nomComplet;

        // Génération d'initiales abrégées
        document.getElementById("avatarInitials").textContent = genererInitiales(data.prenom, data.nom, email);
    }

    // Générateur d'initiales (2 lettres)
    function genererInitiales(prenom, nom, email) {
        if (prenom && nom) return (prenom.charAt(0) + nom.charAt(0)).toUpperCase();
        if (prenom) return prenom.substring(0, 2).toUpperCase();
        if (nom) return nom.substring(0, 2).toUpperCase();
        if (email && email !== "Non renseigné") return email.substring(0, 2).toUpperCase();
        return "VIP";
    }

    // 2. BASCULEMENT ENTRE LECTURE DYNAMIQUE ET ÉDITION
    const btnToggle = document.getElementById("btnToggleEdit");
    const msgEl = document.getElementById("profileMsg");

    btnToggle.addEventListener("click", async () => {
        if (!isEditing) {
            // Passer en mode Édition
            isEditing = true;
            btnToggle.textContent = "💾 Enregistrer les modifications";

            document.getElementById("valPrenom").innerHTML = `<input type="text" id="inputPrenom" class="form-input" value="${currentData.prenom}">`;
            document.getElementById("valNom").innerHTML = `<input type="text" id="inputNom" class="form-input" value="${currentData.nom}">`;
            document.getElementById("valPhone").innerHTML = `<input type="tel" id="inputPhone" class="form-input" value="${currentData.telephone}">`;

        } else {
            // Enregistrer dans la Realtime Database
            const nouveauPrenom = document.getElementById("inputPrenom").value.trim();
            const nouveauNom = document.getElementById("inputNom").value.trim();
            const nouveauPhone = document.getElementById("inputPhone").value.trim();

            try {
                msgEl.style.display = "block";
                msgEl.style.color = "#d4af37";
                msgEl.textContent = "Enregistrement...";

                await update(ref(db, `users/${userId}`), {
                    prenom: nouveauPrenom,
                    nom: nouveauNom,
                    telephone: nouveauPhone,
                    updatedAt: Date.now()
                });

                isEditing = false;
                btnToggle.textContent = "✏️ Modifier mes informations";
                msgEl.style.color = "#70e090";
                msgEl.textContent = "✅ Profil mis à jour !";

                setTimeout(() => {
                    msgEl.style.display = "none";
                }, 3000);

            } catch (error) {
                console.error("Erreur de mise à jour :", error);
                msgEl.style.color = "#ff8585";
                msgEl.textContent = "❌ Impossible d'enregistrer les modifications.";
            }
        }
    });
}