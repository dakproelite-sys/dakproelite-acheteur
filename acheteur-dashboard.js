import { ref, onValue, get, set, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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
 * Initialisation du Tableau de Bord Acheteur pour DAKPROELITE
 * @param {HTMLElement} container - Élément DOM parent (#dashboard-container)
 * @param {Database} db - Instance Realtime Database
 * @param {Auth} auth - Instance Firebase Auth
 * @param {string} userId - UID de l'utilisateur connecté
 */
export function init(container, db, auth, userId) {
    const currentUid = userId || (auth && auth.currentUser ? auth.currentUser.uid : null);

    if (!container || !db) return;

    if (!currentUid) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ff8585;">
                Veuillez vous connecter pour accéder à votre tableau de bord acheteur DAKPROELITE.
            </div>
        `;
        return;
    }

    // Structure globale de l'interface Acheteur DAKPROELITE
    container.innerHTML = `
        <style>
            .user-welcome-card {
                background: linear-gradient(135deg, #0a0d14 0%, #161b26 100%);
                border: 1px solid #2a2a32;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .user-welcome-title {
                color: #d4af37;
                font-size: 20px;
                font-weight: bold;
            }
            .user-email-badge {
                color: #aaa;
                font-size: 13px;
                margin-top: 4px;
            }
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
                gap: 12px;
                margin-bottom: 25px;
            }
            .stat-card {
                background: #0a0d14;
                border: 1px solid #2a2a32;
                border-radius: 10px;
                padding: 15px;
                text-align: center;
                transition: 0.3s;
            }
            .stat-card:hover {
                border-color: #d4af37;
            }
            .stat-value {
                font-size: 20px;
                font-weight: bold;
                color: #d4af37;
                margin-top: 5px;
            }
            .stat-label {
                font-size: 12px;
                color: #aaa;
            }
            .section-title {
                color: #d4af37;
                font-size: 18px;
                margin: 25px 0 12px 0;
                border-bottom: 1px solid #222;
                padding-bottom: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .products-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                gap: 20px;
            }
            .product-card {
                background: #0a0d14;
                border: 1px solid #222;
                border-radius: 12px;
                padding: 15px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                transition: 0.3s;
                position: relative;
            }
            .product-card:hover {
                border-color: #d4af37;
                transform: translateY(-3px);
            }
            .product-img {
                width: 100%;
                height: 150px;
                object-fit: cover;
                border-radius: 8px;
                margin-bottom: 10px;
                border: 1px solid #333;
                background: #12161f;
            }
            .product-title {
                font-size: 14px;
                font-weight: bold;
                color: #fff;
                margin-bottom: 5px;
                line-height: 1.3;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            .product-price {
                color: #22c55e;
                font-weight: bold;
                font-size: 15px;
                margin-bottom: 10px;
            }
            .btn-add-cart {
                background: #d4af37;
                color: #000;
                border: none;
                padding: 10px;
                border-radius: 6px;
                font-weight: bold;
                cursor: pointer;
                width: 100%;
                transition: 0.3s;
                font-size: 13px;
            }
            .btn-add-cart:hover {
                background: #f3e5ab;
            }
            .orders-list-table-container {
                width: 100%;
                overflow-x: auto;
            }
            .orders-list-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
                background: #0a0d14;
                border-radius: 8px;
                overflow: hidden;
                border: 1px solid #222;
                min-width: 650px;
            }
            .orders-list-table th, .orders-list-table td {
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid #1a1a22;
                font-size: 13px;
                vertical-align: middle;
            }
            .orders-list-table th {
                background: #121620;
                color: #d4af37;
            }
            .item-preview-img {
                width: 40px;
                height: 40px;
                object-fit: cover;
                border-radius: 6px;
                border: 1px solid #333;
                margin-right: 8px;
            }
            .status-badge {
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: bold;
                display: inline-block;
            }
            .status-payee { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
            .status-attente { background: rgba(212, 175, 55, 0.2); color: #d4af37; }
            .status-livree { background: rgba(52, 152, 219, 0.2); color: #3498db; }
        </style>

        <!-- Carte de Bienvenue Utilisateur -->
        <div class="user-welcome-card">
            <div>
                <div class="user-welcome-title" id="welcomeUserName">Chargement du profil...</div>
                <div class="user-email-badge" id="welcomeUserEmail">...</div>
            </div>
            <div style="font-size: 28px;">🛒</div>
        </div>

        <!-- Statistiques Acheteur Calculées en Temps Réel -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Achetés Aujourd'hui</div>
                <div class="stat-value" id="statTodayCount">0</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Achetés Cette Semaine</div>
                <div class="stat-value" id="statWeekCount">0</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Achetés Ce Mois</div>
                <div class="stat-value" id="statMonthCount">0</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Dépensé</div>
                <div class="stat-value" id="statTotalSpent">0 FCFA</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Commandes / Livraisons</div>
                <div class="stat-value" id="statPendingOrders">0</div>
            </div>
        </div>

        <!-- Section Dernières Commandes / Livraisons -->
        <div class="section-title">
            <span>📦 Mes Commandes & Produits Achetés</span>
        </div>
        <div id="recentOrdersContainer" class="orders-list-table-container">
            <div style="color: #888; padding: 15px; text-align: center; background: #0a0d14; border-radius: 8px;">
                Chargement de vos commandes...
            </div>
        </div>

        <!-- Catalogue Produits Disponibles -->
        <div class="section-title">
            <span>🛍️ Nouveautés & Produits Disponibles</span>
        </div>
        <div id="productsList" class="products-grid">
            <div style="color: #888; text-align: center; grid-column: 1/-1; padding: 20px;">
                Chargement du catalogue...
            </div>
        </div>
    `;

    const fallbackImage = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%23d4af37' stroke-width='1.5'><rect x='3' y='3' width='18' height='18' rx='2'/><path d='M21 16l-5-5-4 5-3-3-4 4'/><circle cx='8.5' cy='8.5' r='1.5'/></svg>";

    // 1. CHARGEMENT DES INFOS DU PROFIL UTILISATEUR (`users/{userId}`)
    const userProfileRef = ref(db, `users/${currentUid}`);
    onValue(userProfileRef, (snapshot) => {
        const nameEl = document.getElementById("welcomeUserName");
        const emailEl = document.getElementById("welcomeUserEmail");

        if (snapshot.exists()) {
            const data = snapshot.val();
            const nom = data.nom || data.displayName || data.prenom || "Acheteur";
            if (nameEl) nameEl.textContent = `Bienvenue, ${nom} 👋`;
            if (emailEl) emailEl.textContent = data.email || (auth.currentUser ? auth.currentUser.email : "");
        } else {
            if (nameEl) nameEl.textContent = `Bienvenue, ${auth.currentUser ? (auth.currentUser.displayName || 'Acheteur') : 'Acheteur'} 👋`;
            if (emailEl) emailEl.textContent = auth.currentUser ? auth.currentUser.email : "";
        }
    });

    // 2. ÉCOUTE ET CALCULS EN TEMPS RÉEL DES COMMANDES (`commandes/{userId}`)
    const ordersRef = ref(db, `commandes/${currentUid}`);
    onValue(ordersRef, (snapshot) => {
        let totalSpent = 0;
        let pendingCount = 0;
        
        let todayItemsCount = 0;
        let weekItemsCount = 0;
        let monthItemsCount = 0;

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        
        const dayOfWeek = now.getDay();
        const distanceToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday).getTime();

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        const ordersContainer = document.getElementById("recentOrdersContainer");

        if (snapshot.exists()) {
            const orders = snapshot.val();
            const orderKeys = Object.keys(orders).reverse();

            let tableHTML = `
                <table class="orders-list-table">
                    <thead>
                        <tr>
                            <th>N° Commande</th>
                            <th>Produit(s)</th>
                            <th>Qté</th>
                            <th>Date</th>
                            <th>Montant</th>
                            <th>Statut Paiement</th>
                            <th>Livraison</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            orderKeys.forEach((orderId) => {
                const order = orders[orderId];
                const amount = parseFloat(order.montantTotal || order.total || 0);
                totalSpent += amount;

                const statusPaiement = order.statut || "Payée";
                const statusLivraison = order.statutLivraison || "En préparation";

                const isPending = statusLivraison.toLowerCase().includes("cours") || 
                                  statusLivraison.toLowerCase().includes("préparation") || 
                                  statusPaiement.toLowerCase().includes("attente");

                if (isPending) pendingCount++;

                // Date de la commande
                const orderTimestamp = order.date ? new Date(order.date).getTime() : 0;
                const dateStr = order.date ? new Date(order.date).toLocaleDateString("fr-FR") : "Récents";

                // Extraction des articles et comptage temporel
                let productDisplay = "";
                let totalOrderQty = 0;

                if (order.articles) {
                    const articlesArr = Object.values(order.articles);
                    
                    articlesArr.forEach((item) => {
                        const qty = parseInt(item.quantite || item.qty || 1, 10);
                        totalOrderQty += qty;

                        if (orderTimestamp >= startOfToday) todayItemsCount += qty;
                        if (orderTimestamp >= startOfWeek) weekItemsCount += qty;
                        if (orderTimestamp >= startOfMonth) monthItemsCount += qty;
                    });

                    // Formatage du premier produit pour l'affichage tableau
                    const firstItem = articlesArr[0];
                    const itemTitle = firstItem.nom || firstItem.titre || "Produit DAKPROELITE";
                    const itemImg = firstItem.image || firstItem.imageUrl || fallbackImage;

                    if (articlesArr.length > 1) {
                        productDisplay = `
                            <div style="display:flex; align-items:center;">
                                <img src="${escapeHTML(itemImg)}" class="item-preview-img" onerror="this.src='${fallbackImage}';">
                                <div>
                                    <div style="font-weight:bold; color:#fff;">${escapeHTML(itemTitle)}</div>
                                    <div style="font-size:11px; color:#aaa;">+ ${articlesArr.length - 1} autre(s) produit(s)</div>
                                </div>
                            </div>
                        `;
                    } else {
                        productDisplay = `
                            <div style="display:flex; align-items:center;">
                                <img src="${escapeHTML(itemImg)}" class="item-preview-img" onerror="this.src='${fallbackImage}';">
                                <span style="font-weight:bold; color:#fff;">${escapeHTML(itemTitle)}</span>
                            </div>
                        `;
                    }
                } else {
                    productDisplay = `<span style="color:#aaa;">Produit DAKPROELITE</span>`;
                    totalOrderQty = 1;
                }

                const badgePaiementClass = statusPaiement.toLowerCase().includes("attente") ? "status-attente" : "status-payee";
                const badgeLivraisonClass = isPending ? "status-attente" : "status-livree";

                tableHTML += `
                    <tr>
                        <td style="font-weight:bold; color:#d4af37;">${escapeHTML(order.commandeId || orderId)}</td>
                        <td>${productDisplay}</td>
                        <td style="font-weight:bold; text-align:center;">${totalOrderQty}</td>
                        <td>${escapeHTML(dateStr)}</td>
                        <td style="color:#22c55e; font-weight:bold;">${formatCFA(amount)}</td>
                        <td><span class="status-badge ${badgePaiementClass}">${escapeHTML(statusPaiement)}</span></td>
                        <td><span class="status-badge ${badgeLivraisonClass}">${escapeHTML(statusLivraison)}</span></td>
                    </tr>
                `;
            });

            tableHTML += `</tbody></table>`;
            if (ordersContainer) ordersContainer.innerHTML = tableHTML;

        } else {
            if (ordersContainer) {
                ordersContainer.innerHTML = `
                    <div style="color: #888; padding: 20px; text-align: center; background: #0a0d14; border-radius: 8px;">
                        Vous n'avez pas encore passé de commande sur DAKPROELITE.
                    </div>
                `;
            }
        }

        // Mise à jour des compteurs statistiques temporels
        const statTodayEl = document.getElementById("statTodayCount");
        const statWeekEl = document.getElementById("statWeekCount");
        const statMonthEl = document.getElementById("statMonthCount");
        const statTotalSpentEl = document.getElementById("statTotalSpent");
        const statPendingEl = document.getElementById("statPendingOrders");

        if (statTodayEl) statTodayEl.textContent = todayItemsCount;
        if (statWeekEl) statWeekEl.textContent = weekItemsCount;
        if (statMonthEl) statMonthEl.textContent = monthItemsCount;
        if (statTotalSpentEl) statTotalSpentEl.textContent = formatCFA(totalSpent);
        if (statPendingEl) statPendingEl.textContent = pendingCount;
    });

    // 3. ÉCOUTE ET AFFICHAGE DES PUBLICATIONS (`publications`)
    const pubRef = ref(db, "publications");
    onValue(pubRef, (snapshot) => {
        const listContainer = document.getElementById("productsList");
        if (!listContainer) return;

        if (snapshot.exists()) {
            const publications = snapshot.val();
            listContainer.innerHTML = "";

            Object.keys(publications).forEach((pubId) => {
                const pub = publications[pubId];
                const priceNormal = parseFloat(pub.prixNormal || pub.prix || 0);
                const pricePromo = parseFloat(pub.prixPromo || 0);
                const effectivePrice = (pricePromo > 0 && pricePromo < priceNormal) ? pricePromo : priceNormal;

                const image = pub.image || pub.imageUrl || (Array.isArray(pub.images) ? pub.images[0] : fallbackImage);
                const title = pub.nom || pub.titre || "Produit DAKPROELITE";

                const card = document.createElement("div");
                card.className = "product-card";
                card.innerHTML = `
                    <img src="${escapeHTML(image)}" alt="${escapeHTML(title)}" class="product-img" onerror="this.src='${fallbackImage}';">
                    <div>
                        <div class="product-title">${escapeHTML(title)}</div>
                        <div class="product-price">${formatCFA(effectivePrice)}</div>
                    </div>
                    <button class="btn-add-cart" id="btn-cart-${pubId}">
                        🛒 Ajouter au panier
                    </button>
                `;

                listContainer.appendChild(card);

                const btnCart = card.querySelector(`#btn-cart-${pubId}`);
                if (btnCart) {
                    btnCart.addEventListener("click", () => {
                        ajouterAuPanierDirect(pubId, db, currentUid, btnCart);
                    });
                }
            });
        } else {
            listContainer.innerHTML = `<div style="color: #888; text-align: center; grid-column: 1/-1; padding: 20px;">Aucun produit disponible dans le catalogue pour le moment.</div>`;
        }
    });
}

/**
 * Fonction d'ajout au panier synchronisée dans `users/{userId}/gs/cart/{productId}` et `users/{userId}/panier/{productId}`
 */
async function ajouterAuPanierDirect(productId, db, userId, btn) {
    if (!userId) {
        alert("Veuillez vous connecter pour ajouter des articles au panier.");
        return;
    }

    try {
        if (btn) {
            btn.disabled = true;
            btn.textContent = "✔ Ajouté !";
            btn.style.background = "#22c55e";
            btn.style.color = "#fff";
        }

        const pubSnap = await get(ref(db, `publications/${productId}`));
        if (!pubSnap.exists()) {
            alert("Ce produit n'est plus disponible.");
            if (btn) {
                btn.disabled = false;
                btn.textContent = "🛒 Ajouter au panier";
                btn.style.background = "#d4af37";
                btn.style.color = "#000";
            }
            return;
        }

        const product = pubSnap.val();
        const priceNormal = parseFloat(product.prixNormal || product.prix || 0);
        const pricePromo = parseFloat(product.prixPromo || 0);
        const unitPrice = (pricePromo > 0 && pricePromo < priceNormal) ? pricePromo : priceNormal;
        const title = product.nom || product.titre || "Produit DAKPROELITE";
        const image = product.image || product.imageUrl || (Array.isArray(product.images) ? product.images[0] : "");

        const cartItemRef = ref(db, `users/${userId}/gs/cart/${productId}`);
        const currentItemSnap = await get(cartItemRef);

        let newQty = 1;
        if (currentItemSnap.exists()) {
            const currentData = currentItemSnap.val();
            newQty = (parseInt(currentData.quantite || currentData.qty || 0, 10)) + 1;
        }

        const itemPayload = {
            id: productId,
            nom: title,
            prixUnitaire: unitPrice,
            quantite: newQty,
            total: unitPrice * newQty,
            image: image,
            dateAjout: Date.now()
        };

        // Synchronisation atomique sur les deux parcours du panier
        const updates = {};
        updates[`users/${userId}/gs/cart/${productId}`] = itemPayload;
        updates[`users/${userId}/panier/${productId}`] = itemPayload;

        await update(ref(db), updates);

        // Recalcul du Total Global GS
        const allGsCartSnap = await get(ref(db, `users/${userId}/gs/cart`));
        let globalTotal = 0;

        if (allGsCartSnap.exists()) {
            const items = allGsCartSnap.val();
            Object.values(items).forEach(item => {
                globalTotal += parseFloat(item.total || 0);
            });
        }

        await set(ref(db, `users/${userId}/gs/total`), globalTotal);

        setTimeout(() => {
            if (btn) {
                btn.disabled = false;
                btn.textContent = "🛒 Ajouter au panier";
                btn.style.background = "#d4af37";
                btn.style.color = "#000";
            }
        }, 1200);

    } catch (error) {
        console.error("Erreur lors de l'ajout au panier GS :", error);
        alert("Erreur lors de l'ajout au panier.");
        if (btn) {
            btn.disabled = false;
            btn.textContent = "🛒 Ajouter au panier";
            btn.style.background = "#d4af37";
            btn.style.color = "#000";
        }
    }
}