import { ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

/**
 * Helper d'échappement anti-XSS
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
 * Formateur monétaire pour Franc CFA (FCFA)
 */
function formatCFA(amount) {
    return new Intl.NumberFormat('fr-FR').format(Math.round(amount || 0)) + " FCFA";
}

/**
 * Charge la librairie QR Code de manière asynchrone
 */
function loadQRCodeLibrary() {
    return new Promise((resolve) => {
        if (window.QRCode) return resolve(true);
        const existingScript = document.getElementById('script-qrcode');
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(true));
            return;
        }
        const script = document.createElement("script");
        script.id = "script-qrcode";
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
    });
}

/**
 * Génération du modal de reçu / récépissé
 */
async function showReceiptModal(order) {
    await loadQRCodeLibrary();

    const modalId = "receipt-modal";
    let modal = document.getElementById(modalId);
    if (modal) modal.remove();

    const dateStr = new Date(order.date || Date.now()).toLocaleString("fr-FR");
    const articlesHTML = Object.values(order.articles || {}).map(art => `
        <tr style="border-bottom: 1px solid #222;">
            <td style="padding: 8px; font-size: 12px;">${escapeHTML(art.nom)}</td>
            <td style="padding: 8px; font-size: 12px; text-align: center;">x${art.quantite}</td>
            <td style="padding: 8px; font-size: 12px; text-align: right; color: #d4af37;">${formatCFA(art.total)}</td>
        </tr>
    `).join("");

    modal = document.createElement("div");
    modal.id = modalId;
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0,0,0,0.85); display: flex; align-items: center;
        justify-content: center; z-index: 10000; padding: 15px;
    `;

    modal.innerHTML = `
        <div style="background: #0d1117; border: 2px solid #d4af37; border-radius: 12px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 20px; color: #fff; font-family: 'Poppins', sans-serif;">
            <div style="text-align: center; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 15px;">
                <h3 style="color: #d4af37; margin-bottom: 5px;">DAKPRO ÉLITE</h3>
                <p style="font-size: 11px; color: #aaa;">Récépissé Officiel de Commande</p>
                <p style="font-size: 10px; color: #666;">ID: ${escapeHTML(order.commandeId)}</p>
            </div>

            <div style="font-size: 12px; margin-bottom: 15px;">
                <p><strong>Date :</strong> ${dateStr}</p>
                <p><strong>Client :</strong> ${escapeHTML(order.livraison?.destinataire || "Client")}</p>
                <p><strong>Adresse :</strong> ${escapeHTML(order.livraison?.adresse || "")}, ${escapeHTML(order.livraison?.ville || "")}</p>
                <p><strong>Statut :</strong> <span style="color: #22c55e;">${escapeHTML(order.statut || "Payé")}</span></p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                <thead>
                    <tr style="border-bottom: 1px solid #444; color: #aaa; font-size: 11px;">
                        <th style="text-align: left; padding: 5px;">Article</th>
                        <th style="text-align: center; padding: 5px;">Qté</th>
                        <th style="text-align: right; padding: 5px;">Total</th>
                    </tr>
                </thead>
                <tbody>${articlesHTML}</tbody>
            </table>

            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; border-top: 1px dashed #d4af37; padding-top: 10px; color: #d4af37; margin-bottom: 20px;">
                <span>Total Réglé :</span>
                <span>${formatCFA(order.montantTotal)}</span>
            </div>

            <div style="display: flex; flex-direction: column; align-items: center; gap: 10px; background: #161b22; padding: 15px; border-radius: 8px;">
                <div id="qrcode-container"></div>
                <p style="font-size: 10px; color: #888;">Présentez ce QR Code au livreur lors de la réception.</p>
            </div>

            <button id="btnCloseReceipt" style="width: 100%; margin-top: 20px; padding: 12px; background: #d4af37; color: #000; border: none; font-weight: bold; border-radius: 8px; cursor: pointer;">
                Fermer
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    const qrContainer = document.getElementById("qrcode-container");
    if (qrContainer && window.QRCode) {
        new window.QRCode(qrContainer, {
            text: order.commandeId,
            width: 128,
            height: 128,
            colorDark: "#000000",
            colorLight: "#ffffff"
        });
    }

    document.getElementById("btnCloseReceipt")?.addEventListener("click", () => modal.remove());
}

/**
 * Initialisation du module de suivi des commandes Acheteur DAKPROELITE
 * @param {HTMLElement} container - Élément DOM parent (#dashboard-container)
 * @param {Database} db - Instance Realtime Database
 * @param {Auth} auth - Instance Firebase Auth
 * @param {string} userId - UID de l'acheteur connecté
 */
export function init(container, db, auth, userId) {
    if (!container || !db) return;

    const currentUid = userId || (auth && auth.currentUser ? auth.currentUser.uid : null);

    if (!currentUid) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ff8585; font-family: 'Poppins', sans-serif;">
                Veuillez vous connecter pour consulter vos commandes DAKPRO ÉLITE.
            </div>
        `;
        return;
    }

    loadQRCodeLibrary();

    container.innerHTML = `
        <style>
            .orders-title {
                color: #d4af37;
                font-size: 20px;
                font-weight: bold;
                margin-bottom: 20px;
                border-bottom: 1px solid #2a2a32;
                padding-bottom: 10px;
            }
            .order-card {
                background: #0a0d14;
                border: 1px solid #222;
                border-radius: 12px;
                padding: 18px;
                margin-bottom: 18px;
            }
            .order-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                flex-wrap: wrap;
                gap: 8px;
            }
            .status-badge {
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: bold;
                display: inline-block;
            }
            .status-paid { background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid #22c55e; }
            .status-shipping { background: rgba(59, 130, 246, 0.15); color: #3b82f6; border: 1px solid #3b82f6; }
            .status-delivered { background: rgba(212, 175, 55, 0.15); color: #d4af37; border: 1px solid #d4af37; }
            .order-item-row {
                display: flex;
                align-items: center;
                gap: 12px;
                background: #12161f;
                padding: 10px;
                border-radius: 8px;
                margin-bottom: 8px;
            }
            .order-item-img {
                width: 50px;
                height: 50px;
                border-radius: 6px;
                object-fit: cover;
                border: 1px solid #333;
                background: #0a0d14;
            }
            .order-actions {
                display: flex;
                gap: 10px;
                margin-top: 15px;
                justify-content: flex-end;
                flex-wrap: wrap;
            }
            .btn-receipt {
                background: #12161f;
                color: #d4af37;
                border: 1px solid #d4af37;
                padding: 8px 14px;
                border-radius: 6px;
                font-weight: bold;
                cursor: pointer;
                font-size: 12px;
            }
            .btn-confirm-delivery {
                background: #22c55e;
                color: #000;
                border: none;
                padding: 8px 14px;
                border-radius: 6px;
                font-weight: bold;
                cursor: pointer;
                font-size: 12px;
            }
        </style>

        <div class="orders-title">
            📦 Historique & Suivi des Commandes - DAKPRO ÉLITE
        </div>
        <div id="ordersListContainer">
            <div style="color: #888; text-align: center; padding: 40px;">
                Chargement sécurisé de vos commandes...
            </div>
        </div>
    `;

    const ordersRef = ref(db, `commandes/${currentUid}`);
    onValue(ordersRef, (snapshot) => {
        const listContainer = document.getElementById("ordersListContainer");
        if (!listContainer) return;

        if (!snapshot.exists()) {
            listContainer.innerHTML = `
                <div style="text-align: center; color: #888; padding: 40px; background: #0a0d14; border-radius: 12px;">
                    Vous n'avez pas encore passé de commande.
                </div>
            `;
            return;
        }

        const ordersData = snapshot.val();
        const sortedOrders = Object.values(ordersData).sort((a, b) => (b.date || 0) - (a.date || 0));

        listContainer.innerHTML = "";

        sortedOrders.forEach((order) => {
            const card = document.createElement("div");
            card.className = "order-card";

            const articlesHTML = Object.values(order.articles || {}).map(art => `
                <div class="order-item-row">
                    <img src="${escapeHTML(art.image || 'https://via.placeholder.com/50')}" class="order-item-img" onerror="this.src='https://via.placeholder.com/50'">
                    <div style="flex:1;">
                        <div style="font-weight:600; font-size:13px; color:#fff;">${escapeHTML(art.nom)}</div>
                        <div style="font-size:11px; color:#aaa;">${formatCFA(art.prixUnitaire)} x ${art.quantite}</div>
                    </div>
                    <div style="font-weight:bold; color:#d4af37; font-size:13px;">${formatCFA(art.total)}</div>
                </div>
            `).join("");

            const isDelivered = order.statutLivraison === "Livré";

            card.innerHTML = `
                <div class="order-header">
                    <div>
                        <span style="color:#d4af37; font-weight:bold; font-size:14px;">#${escapeHTML(order.commandeId)}</span>
                        <div style="font-size:11px; color:#888;">${new Date(order.date || Date.now()).toLocaleDateString("fr-FR")}</div>
                    </div>
                    <div>
                        <span class="status-badge ${isDelivered ? 'status-delivered' : 'status-shipping'}">
                            ${escapeHTML(order.statutLivraison || 'En cours')}
                        </span>
                    </div>
                </div>

                <div style="margin-bottom: 12px;">${articlesHTML}</div>

                <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #222; padding-top:10px;">
                    <span style="font-size:12px; color:#aaa;">Total Commandé :</span>
                    <span style="font-size:16px; font-weight:bold; color:#d4af37;">${formatCFA(order.montantTotal)}</span>
                </div>

                <div class="order-actions">
                    <button class="btn-receipt" data-order-id="${escapeHTML(order.commandeId)}">📄 Voir Récépissé</button>
                    ${!isDelivered ? `<button class="btn-confirm-delivery" data-order-id="${escapeHTML(order.commandeId)}">✅ Confirmer la Réception</button>` : ''}
                </div>
            `;

            // Action : Voir le reçu
            card.querySelector(".btn-receipt")?.addEventListener("click", () => {
                showReceiptModal(order);
            });

            // Action : Confirmer la livraison
            card.querySelector(".btn-confirm-delivery")?.addEventListener("click", async () => {
                if (confirm("Confirmez-vous avoir bien reçu cette commande en bon état ?")) {
                    try {
                        await update(ref(db, `commandes/${currentUid}/${order.commandeId}`), {
                            statutLivraison: "Livré",
                            dateLivraison: Date.now()
                        });
                        alert("Livraison confirmée. Merci pour votre confiance !");
                    } catch (e) {
                        console.error("Erreur de confirmation :", e);
                        alert("Impossible de mettre à jour le statut de la commande.");
                    }
                }
            });

            listContainer.appendChild(card);
        });
    });
}