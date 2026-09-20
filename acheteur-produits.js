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
 * Initialisation du catalogue produits dynamique pour DAKPROELITE
 * @param {HTMLElement} container - Conteneur DOM (#dashboard-container)
 * @param {Database} db - Instance Realtime Database
 * @param {Auth} auth - Instance Firebase Auth
 * @param {string} userId - UID de l'acheteur
 */
export function init(container, db, auth, userId) {
    if (!container || !db) return;

    const currentUid = userId || (auth && auth.currentUser ? auth.currentUser.uid : null);

    container.innerHTML = `
        <style>
            .catalog-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                border-bottom: 1px solid rgba(212, 175, 55, 0.3);
                padding-bottom: 12px;
            }
            .catalog-title { color: #d4af37; font-size: 20px; font-weight: bold; }
            
            .products-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                align-items: stretch;
            }

            @media (min-width: 600px) {
                .products-grid {
                    grid-template-columns: repeat(3, 1fr);
                    gap: 14px;
                }
            }

            @media (min-width: 1024px) {
                .products-grid {
                    grid-template-columns: repeat(4, 1fr);
                    gap: 16px;
                }
            }

            @media (min-width: 1600px) {
                .products-grid {
                    grid-template-columns: repeat(6, 1fr);
                    gap: 16px;
                }
            }

            .product-card {
                background: #0a0d14;
                border: 1px solid #222;
                border-radius: 10px;
                padding: 10px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                transition: border-color 0.3s ease, transform 0.2s ease;
                height: 100%;
            }
            .product-card:hover { 
                border-color: #d4af37; 
                transform: translateY(-2px);
            }
            .product-img {
                width: 100%;
                height: 150px;
                object-fit: cover;
                border-radius: 6px;
                background: #12161f;
                display: block;
            }
            .product-info-body {
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                padding-top: 8px;
            }
            .product-title { 
                font-size: 13px; 
                font-weight: 700; 
                color: #fff; 
                margin-bottom: 4px; 
                line-height: 1.2;
                word-break: break-word;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            .product-desc { 
                font-size: 11px; 
                color: #aaa; 
                margin-bottom: 8px; 
                line-height: 1.3; 
                white-space: pre-line;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            .price-container { 
                display: flex; 
                align-items: center; 
                gap: 6px; 
                margin-bottom: 8px; 
                flex-wrap: wrap; 
            }
            .price-promo { color: #22c55e; font-weight: 800; font-size: 14px; }
            .price-normal { color: #777; font-size: 11px; text-decoration: line-through; }
            .badge-reduction { background: #ef4444; color: #fff; font-size: 9px; padding: 2px 4px; border-radius: 4px; font-weight: 700; }
            
            .card-actions { display: flex; gap: 6px; flex-direction: column; margin-top: auto; }
            .btn-view {
                width: 100%;
                background: #12161f;
                color: #d4af37;
                border: 1px solid #d4af37;
                padding: 7px;
                border-radius: 6px;
                font-weight: 700;
                cursor: pointer;
                font-size: 11px;
                transition: 0.2s;
            }
            .btn-view:hover { background: #d4af37; color: #000; }
            .btn-share {
                width: 100%;
                background: #1e293b;
                color: #38bdf8;
                border: 1px solid #38bdf8;
                padding: 6px;
                border-radius: 6px;
                font-weight: 700;
                cursor: pointer;
                font-size: 11px;
                transition: 0.2s;
            }
            .btn-share:hover { background: #38bdf8; color: #000; }
            .btn-order {
                width: 100%;
                background: #d4af37;
                color: #000;
                border: none;
                padding: 8px;
                border-radius: 6px;
                font-weight: 800;
                cursor: pointer;
                font-size: 11px;
                transition: 0.2s;
            }
            .btn-order:hover { background: #f3e5ab; }

            /* Modal Détails Produit */
            .modal-overlay {
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.85);
                display: flex; justify-content: center; align-items: center;
                z-index: 1000; padding: 15px;
            }
            .modal-content {
                background: #0a0d14;
                border: 1px solid #d4af37;
                border-radius: 14px;
                padding: 20px;
                max-width: 520px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
            }
        </style>

        <div class="catalog-header">
            <div class="catalog-title">🛍️ Catalogue des Produits DAKPROELITE</div>
        </div>

        <div id="productsGrid" class="products-grid">
            <div style="color: #888; text-align: center; grid-column: 1/-1; padding: 40px;">
                Chargement des produits en cours...
            </div>
        </div>

        <div id="productModalContainer"></div>
    `;

    const fallbackImage = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='280' height='190' viewBox='0 0 24 24' fill='none' stroke='%23d4af37' stroke-width='1.5'><rect x='3' y='3' width='18' height='18' rx='2'/><path d='M21 16l-5-5-4 5-3-3-4 4'/><circle cx='8.5' cy='8.5' r='1.5'/></svg>";

    // Lecture dynamique des publications Firebase Realtime Database
    const pubRef = ref(db, "publications");
    onValue(pubRef, (snapshot) => {
        const gridContainer = document.getElementById("productsGrid");
        if (!gridContainer) return;

        if (snapshot.exists()) {
            const products = snapshot.val();
            gridContainer.innerHTML = "";

            Object.keys(products).forEach((pubId) => {
                const item = products[pubId];
                
                const prixNormal = parseFloat(item.prixNormal || item.prix || 0);
                const prixPromo = parseFloat(item.prixPromo || 0);
                
                const effectivePrice = (prixPromo > 0 && prixPromo < prixNormal) ? prixPromo : prixNormal;
                const isPromo = (prixPromo > 0 && prixPromo < prixNormal);
                const reduction = isPromo ? Math.round(((prixNormal - prixPromo) / prixNormal) * 100) : 0;

                const title = item.nom || item.titre || item.title || "Produit DAKPROELITE";
                const description = item.description || "Aucune description disponible.";
                const image = item.image || item.imageUrl || (Array.isArray(item.images) ? item.images[0] : fallbackImage);

                const card = document.createElement("div");
                card.className = "product-card";
                card.innerHTML = `
                    <img src="${escapeHTML(image)}" alt="${escapeHTML(title)}" class="product-img" onerror="this.onerror=null; this.src='${fallbackImage}';">
                    <div class="product-info-body">
                        <div>
                            <div class="product-title">${escapeHTML(title)}</div>
                            <div class="product-desc">${escapeHTML(description)}</div>
                        </div>
                        <div>
                            <div class="price-container">
                                <span class="price-promo">${formatCFA(effectivePrice)}</span>
                                ${isPromo ? `<span class="price-normal">${formatCFA(prixNormal)}</span> <span class="badge-reduction">-${reduction}%</span>` : ''}
                            </div>
                            <div class="card-actions">
                                <button class="btn-view" id="btn-view-${pubId}">👁️ Aperçu</button>
                                <button class="btn-share" id="btn-share-${pubId}">🔗 Lien Affiliation</button>
                                <button class="btn-order" id="btn-add-${pubId}">🛒 SHOP NOW</button>
                            </div>
                        </div>
                    </div>
                `;

                gridContainer.appendChild(card);

                // Événements
                card.querySelector(`#btn-view-${pubId}`).addEventListener("click", () => {
                    afficherDetailsProduit(pubId, db, currentUid);
                });

                card.querySelector(`#btn-share-${pubId}`).addEventListener("click", () => {
                    partagerLienAffilie(pubId, title, currentUid);
                });

                card.querySelector(`#btn-add-${pubId}`).addEventListener("click", () => {
                    ajouterAuPanierGS(pubId, db, currentUid);
                });
            });
        } else {
            gridContainer.innerHTML = `<div style="color: #888; text-align: center; grid-column: 1/-1; padding: 40px;">Aucun produit disponible pour le moment.</div>`;
        }
    });
}

/**
 * Génère et copie le lien d'affiliation propre au produit
 */
function partagerLienAffilie(pubId, title, currentUid) {
    const baseUrl = window.location.origin + window.location.pathname.replace("index.html", "");
    const affiliateUrl = `${baseUrl}produit.html?id=${pubId}${currentUid ? '&ref=' + currentUid : ''}`;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(affiliateUrl).then(() => {
            alert(`✅ Lien d'affiliation copié pour "${title}" !\n\nPartagez-le sur vos réseaux sociaux, WhatsApp ou sites partenaires.\n\nLien : ${affiliateUrl}`);
        }).catch(console.error);
    } else {
        prompt("Copiez votre lien d'affiliation :", affiliateUrl);
    }
}

/**
 * Affiche la fenêtre modale de détail d'un produit
 */
async function afficherDetailsProduit(productId, db, userId) {
    const pubSnap = await get(ref(db, `publications/${productId}`));
    if (!pubSnap.exists()) return alert("Produit introuvable dans la base de données.");
    
    const product = pubSnap.val();
    const prixNormal = parseFloat(product.prixNormal || product.prix || 0);
    const prixPromo = parseFloat(product.prixPromo || 0);
    const unitPrice = (prixPromo > 0 && prixPromo < prixNormal) ? prixPromo : prixNormal;
    const isPromo = (prixPromo > 0 && prixPromo < prixNormal);
    const reduction = isPromo ? Math.round(((prixNormal - prixPromo) / prixNormal) * 100) : 0;

    const title = product.nom || product.titre || "Produit DAKPROELITE";
    const description = product.description || "Aucune description détaillée disponible.";
    const fallbackImage = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='280' height='190' viewBox='0 0 24 24' fill='none' stroke='%23d4af37' stroke-width='1.5'><rect x='3' y='3' width='18' height='18' rx='2'/><path d='M21 16l-5-5-4 5-3-3-4 4'/><circle cx='8.5' cy='8.5' r='1.5'/></svg>";
    const image = product.image || product.imageUrl || (Array.isArray(product.images) ? product.images[0] : fallbackImage);

    const modalEl = document.getElementById("productModalContainer");
    modalEl.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <img src="${escapeHTML(image)}" alt="${escapeHTML(title)}" style="width:100%; height:220px; object-fit:cover; border-radius:10px; margin-bottom:12px; border:1px solid #333;" onerror="this.onerror=null; this.src='${fallbackImage}';">
                <h2 style="color: #d4af37; margin-bottom: 8px; font-size: 18px;">${escapeHTML(title)}</h2>
                
                <div class="price-container" style="margin-bottom: 12px;">
                    <span class="price-promo" style="font-size: 18px;">${formatCFA(unitPrice)}</span>
                    ${isPromo ? `<span class="price-normal" style="font-size: 13px;">${formatCFA(prixNormal)}</span> <span class="badge-reduction">-${reduction}%</span>` : ''}
                </div>

                <div style="background:#12161f; padding:12px; border-radius:8px; border:1px solid #222; margin-bottom:15px;">
                    <h4 style="color:#fff; font-size:12px; margin-bottom:4px;">Description du produit :</h4>
                    <p style="color:#ccc; font-size:13px; line-height:1.5; white-space:pre-line;">${escapeHTML(description)}</p>
                </div>

                <div style="display: flex; gap: 10px;">
                    <button class="btn-order" id="btn-modal-add">💳 SHOP NOW (Acheter)</button>
                    <button class="btn-view" id="btn-modal-close" style="background: #222; color: #fff; border-color:#444;">Fermer</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById("btn-modal-add").addEventListener("click", () => {
        ajouterAuPanierGS(productId, db, userId);
    });

    document.getElementById("btn-modal-close").addEventListener("click", () => {
        modalEl.innerHTML = "";
    });
}

/**
 * Ajoute un produit au panier synchronisé /gs et répercute le montant en FCFA
 */
async function ajouterAuPanierGS(productId, db, userId) {
    if (!userId) {
        alert("Veuillez vous connecter pour commander sur DAKPROELITE.");
        return;
    }

    const btn = document.getElementById(`btn-add-${productId}`) || document.getElementById("btn-modal-add");
    if (btn) {
        btn.disabled = true;
        btn.textContent = "✔ Ajouté !";
        btn.style.background = "#22c55e";
        btn.style.color = "#fff";
    }

    try {
        const pubSnap = await get(ref(db, `publications/${productId}`));
        if (!pubSnap.exists()) return alert("Produit introuvable.");

        const product = pubSnap.val();
        const prixNormal = parseFloat(product.prixNormal || product.prix || 0);
        const prixPromo = parseFloat(product.prixPromo || 0);
        const unitPrice = (prixPromo > 0 && prixPromo < prixNormal) ? prixPromo : prixNormal;
        const title = product.nom || product.titre || "Produit DAKPROELITE";
        const image = product.image || product.imageUrl || (Array.isArray(product.images) ? product.images[0] : "");

        const gsCartItemRef = ref(db, `users/${userId}/gs/cart/${productId}`);
        const currentItemSnap = await get(gsCartItemRef);

        let newQty = 1;
        if (currentItemSnap.exists()) {
            newQty = parseInt(currentItemSnap.val().quantite || currentItemSnap.val().qty || 1, 10) + 1;
        }

        const itemPayload = {
            id: productId,
            nom: title,
            quantite: newQty,
            prixUnitaire: unitPrice,
            total: unitPrice * newQty,
            image: image,
            dateAjout: Date.now()
        };

        const updates = {};
        updates[`users/${userId}/gs/cart/${productId}`] = itemPayload;
        updates[`users/${userId}/panier/${productId}`] = itemPayload;

        await update(ref(db), updates);

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
            if (typeof window.chargerModule === 'function') {
                window.chargerModule('paiement');
            } else {
                const modalEl = document.getElementById("productModalContainer");
                if (modalEl) modalEl.innerHTML = "";
            }
        }, 600);

    } catch (error) {
        console.error("Erreur lors de l'ajout au panier :", error);
        alert("❌ Une erreur est survenue lors de l'ajout au panier.");
        if (btn) {
            btn.disabled = false;
            btn.textContent = "🛒 SHOP NOW";
            btn.style.background = "#d4af37";
            btn.style.color = "#000";
        }
    }
}
