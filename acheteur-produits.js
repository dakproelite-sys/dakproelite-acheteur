import { ref, onValue, get, set, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

/* =====================================================
   DICTIONNAIRE DE TRADUCTION & TAUX DE DEVISES INTERNES
   ===================================================== */
const translations = {
    fr: { name: "Français", currency: "FCFA", rate: 1, title: "🛍️ Catalogue des Produits DAKPROÉLITE", viewBtn: "👁️ Aperçu", shareBtn: "🔗 Lien Affiliation", cartBtn: "🛒 Ajouter au Panier", modalBuy: "💳 SHOP NOW (Acheter)", modalClose: "Fermer", loading: "Chargement des produits en cours...", empty: "Aucun produit disponible pour le moment.", descTitle: "Description du produit :" },
    en: { name: "English", currency: "USD", rate: 1 / 600, title: "🛍️ DAKPROÉLITE Product Catalog", viewBtn: "👁️ Preview", shareBtn: "🔗 Affiliate Link", cartBtn: "🛒 Add to Cart", modalBuy: "💳 SHOP NOW (Buy)", modalClose: "Close", loading: "Loading products...", empty: "No products available at the moment.", descTitle: "Product Description:" },
    es: { name: "Español", currency: "EUR", rate: 1 / 655.957, title: "🛍️ Catálogo de Productos DAKPROÉLITE", viewBtn: "👁️ Vista previa", shareBtn: "🔗 Enlace de Afiliado", cartBtn: "🛒 Añadir al Carrito", modalBuy: "💳 SHOP NOW (Comprar)", modalClose: "Cerrar", loading: "Cargando productos...", empty: "No hay productos disponibles por el momento.", descTitle: "Descripción del producto:" },
    zh: { name: "中文", currency: "CNY", rate: 1 / 85, title: "🛍️ DAKPROÉLITE 产品目录", viewBtn: "👁️ 预览", shareBtn: "🔗 推广链接", cartBtn: "🛒 加入购物车", modalBuy: "💳 立即购买", modalClose: "关闭", loading: "正在加载产品...", empty: "暂无可用产品。", descTitle: "产品描述：" },
    bn: { name: "বাংলা", currency: "BDT", rate: 1 / 5, title: "🛍️ DAKPROÉLITE পণ্য ক্যাটালগ", viewBtn: "👁️ পূর্বরূপ", shareBtn: "🔗 অ্যাফিলিয়েট লিঙ্ক", cartBtn: "🛒 কার্টে যোগ করুন", modalBuy: "💳 এখনই কিনুন", modalClose: "বন্ধ করুন", loading: "পণ্য লোড হচ্ছে...", empty: "এই মুহূর্তে কোনো পণ্য উপলব্ধ নেই。", descTitle: "পণ্যের বিবরণ:" },
    yo: { name: "Yorùbá", currency: "NGN", rate: 1.2, title: "🛍️ Àwọn Ọja DAKPROÉLITE", viewBtn: "👁️ Wo Ṣaaju", shareBtn: "🔗 Ọna Aṣoju", cartBtn: "🛒 Fi Kun Kẹkẹ", modalBuy: "💳 Ra Bayi", modalClose: "Pade", loading: "N ṣe agbega awọn ọja...", empty: "Ko si ọja ti o wa ni akoko yii.", descTitle: "Apejuwe Ọja:" },
    fon: { name: "Fɔ̀ngbè", currency: "FCFA", rate: 1, title: "🛍️ DAKPROÉLITE Nǔ tɛnmɛ bǐ", viewBtn: "👁️ Kpé nǔ", shareBtn: "🔗 Alɔgɔ tɛnmɛ", cartBtn: "🛒 Dó tɛnmɛ", modalBuy: "💳 Hò Nǔ", modalClose: "Sɔ́", loading: "E ɖò nǔ lɛ ɖè wɛ...", empty: "Nǔ ɖebǔ mɛ ɖò tɛnmɛ nɛ ɔ mɛ ǎ.", descTitle: "Nǔ e ɖò nǔ tɛnmɛ ɔ mɛ:" }
};

let currentLang = localStorage.getItem("dakpro_lang") || "fr";

function formatCurrency(val) {
    const t = translations[currentLang] || translations['fr'];
    let converted = Number(val || 0) * t.rate;
    if (t.currency === "USD" || t.currency === "EUR" || t.currency === "BDT" || t.currency === "NGN") {
        converted = converted.toFixed(2);
    } else {
        converted = Math.round(converted);
    }
    return `${new Intl.NumberFormat('fr-FR').format(converted)} ${t.currency}`;
}

function escapeHTML(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Initialisation du catalogue produits dynamique pour DAKPROÉLITE
 */
export function init(container, db, auth, userId) {
    if (!container || !db) return;

    const currentUid = userId || (auth && auth.currentUser ? auth.currentUser.uid : null);
    const t = translations[currentLang] || translations['fr'];

    let cachedProducts = localStorage.getItem("dakpro_cached_products");
    let initialProducts = cachedProducts ? JSON.parse(cachedProducts) : null;

    container.innerHTML = `
        <style>
            .catalog-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                border-bottom: 1px solid rgba(212, 175, 55, 0.3);
                padding-bottom: 12px;
                flex-wrap: wrap;
                gap: 10px;
            }
            .catalog-title { color: #d4af37; font-size: 18px; font-weight: bold; }
            .catalog-lang-select {
                background: #12161f;
                color: #d4af37;
                border: 1px solid #d4af37;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 700;
                cursor: pointer;
                outline: none;
            }
            .products-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                align-items: stretch;
            }
            @media (min-width: 600px) { .products-grid { grid-template-columns: repeat(3, 1fr); gap: 14px; } }
            @media (min-width: 1024px) { .products-grid { grid-template-columns: repeat(4, 1fr); gap: 16px; } }
            @media (min-width: 1600px) { .products-grid { grid-template-columns: repeat(6, 1fr); gap: 16px; } }

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
            .product-card:hover { border-color: #d4af37; transform: translateY(-2px); }
            .media-wrapper {
                width: 100%; height: 160px; border-radius: 6px; background: #080b10;
                display: flex; align-items: center; justify-content: center; overflow: hidden; margin-bottom: 8px;
            }
            .product-img { width: 100%; height: 100%; object-fit: contain; display: block; }
            .product-video { width: 100%; height: 100%; object-fit: cover; }
            .product-info-body { flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
            .product-title { 
                font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 4px; line-height: 1.2;
                word-break: break-word; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
            }
            .product-desc { 
                font-size: 11px; color: #aaa; margin-bottom: 8px; line-height: 1.3; 
                display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
            }
            .price-container { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; }
            .price-promo { color: #d4af37; font-weight: 800; font-size: 14px; }
            .price-normal { color: #777; font-size: 11px; text-decoration: line-through; }
            .badge-reduction { background: #ef4444; color: #fff; font-size: 9px; padding: 2px 4px; border-radius: 4px; font-weight: 700; }
            
            .card-actions { display: flex; gap: 6px; flex-direction: column; margin-top: auto; }
            .btn-view {
                width: 100%; background: #12161f; color: #d4af37; border: 1px solid #d4af37;
                padding: 7px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 11px; transition: 0.2s;
            }
            .btn-view:hover { background: #d4af37; color: #000; }
            .btn-share {
                width: 100%; background: #1e293b; color: #38bdf8; border: 1px solid #38bdf8;
                padding: 6px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 11px; transition: 0.2s;
            }
            .btn-share:hover { background: #38bdf8; color: #000; }
            .btn-order {
                width: 100%; background: #22c55e; color: #fff; border: none;
                padding: 8px; border-radius: 6px; font-weight: 800; cursor: pointer; font-size: 11px; transition: 0.2s;
            }
            .btn-order:hover { background: #16a34a; }

            .modal-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.85); display: flex; justify-content: center; align-items: center;
                z-index: 10000; padding: 15px;
            }
            .modal-content {
                background: #0a0d14; border: 1px solid #d4af37; border-radius: 14px;
                padding: 20px; max-width: 520px; width: 100%; max-height: 90vh; overflow-y: auto;
            }
        </style>

        <div class="catalog-header">
            <div class="catalog-title" id="catalogTitleLabel">${t.title}</div>
            <div>
                <select id="catalogLangSelector" class="catalog-lang-select">
                    <option value="fr" ${currentLang==='fr'?'selected':''}>🇫🇷 Français (FCFA)</option>
                    <option value="en" ${currentLang==='en'?'selected':''}>🇬🇧 English (USD)</option>
                    <option value="es" ${currentLang==='es'?'selected':''}>🇪🇸 Español (EUR)</option>
                    <option value="zh" ${currentLang==='zh'?'selected':''}>🇨🇳 中文 (CNY)</option>
                    <option value="bn" ${currentLang==='bn'?'selected':''}>🇧🇩 বাংলা (BDT)</option>
                    <option value="yo" ${currentLang==='yo'?'selected':''}>🇳🇬 Yorùbá (NGN)</option>
                    <option value="fon" ${currentLang==='fon'?'selected':''}>🇧🇯 Fɔ̀ngbè (FCFA)</option>
                </select>
            </div>
        </div>

        <div id="productsGrid" class="products-grid">
            <div style="color: #888; text-align: center; grid-column: 1/-1; padding: 40px;" id="loadingText">
                ${t.loading}
            </div>
        </div>

        <div id="productModalContainer"></div>
    `;

    // Écouteur de changement de langue / devise instantané
    const langSelector = document.getElementById("catalogLangSelector");
    if (langSelector) {
        langSelector.addEventListener("change", (e) => {
            currentLang = e.target.value;
            localStorage.setItem("dakpro_lang", currentLang);
            if (window._lastProductsSnapshot) {
                renderProducts(window._lastProductsSnapshot, db, currentUid);
            }
        });
    }

    const fallbackImage = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='280' height='190' viewBox='0 0 24 24' fill='none' stroke='%23d4af37' stroke-width='1.5'><rect x='3' y='3' width='18' height='18' rx='2'/><path d='M21 16l-5-5-4 5-3-3-4 4'/><circle cx='8.5' cy='8.5' r='1.5'/></svg>";

    if (initialProducts) {
        window._lastProductsSnapshot = initialProducts;
        renderProducts(initialProducts, db, currentUid);
    }

    const pubRef = ref(db, "publications");
    onValue(pubRef, (snapshot) => {
        if (snapshot.exists()) {
            const products = snapshot.val();
            window._lastProductsSnapshot = products;
            localStorage.setItem("dakpro_cached_products", JSON.stringify(products));
            renderProducts(products, db, currentUid);
        } else {
            const gridContainer = document.getElementById("productsGrid");
            if (gridContainer) {
                const tr = translations[currentLang] || translations['fr'];
                gridContainer.innerHTML = `<div style="color: #888; text-align: center; grid-column: 1/-1; padding: 40px;">${tr.empty}</div>`;
            }
        }
    });

    function renderProducts(products, dbInstance, uid) {
        const gridContainer = document.getElementById("productsGrid");
        if (!gridContainer) return;

        const tr = translations[currentLang] || translations['fr'];
        document.getElementById("catalogTitleLabel").textContent = tr.title;

        gridContainer.innerHTML = "";

        Object.keys(products).forEach((pubId) => {
            const item = products[pubId];
            if (!item || item.actif === false) return;
            
            const prixNormal = parseFloat(item.prixNormal || item.prix || item.price || 0);
            const prixPromo = parseFloat(item.prixPromo || item.promoPrice || 0);
            
            const effectivePrice = (prixPromo > 0 && prixPromo < prixNormal) ? prixPromo : prixNormal;
            const isPromo = (prixPromo > 0 && prixPromo < prixNormal);
            const reduction = isPromo ? Math.round(((prixNormal - prixPromo) / prixNormal) * 100) : 0;

            const title = item.nom || item.titre || item.title || "Produit DAKPROÉLITE";
            const description = item.description || "Aucune description disponible.";
            const image = item.image || item.imageUrl || (Array.isArray(item.images) ? item.images[0] : fallbackImage);
            const video = item.video || item.videoUrl || "";

            const isVideo = Boolean(video) || /\.(mp4|webm|ogg)(\?|$)/i.test(image);
            const mediaSrc = video || image;
            let mediaHTML = "";

            if (isVideo && mediaSrc) {
                mediaHTML = `<video src="${escapeHTML(mediaSrc)}" class="product-video" controls preload="metadata"></video>`;
            } else {
                mediaHTML = `<img src="${escapeHTML(image)}" alt="${escapeHTML(title)}" class="product-img" onerror="this.onerror=null; this.src='${fallbackImage}';">`;
            }

            const card = document.createElement("div");
            card.className = "product-card";
            card.innerHTML = `
                <div class="media-wrapper">
                    ${mediaHTML}
                </div>
                <div class="product-info-body">
                    <div>
                        <div class="product-title">${escapeHTML(title)}</div>
                        <div class="product-desc">${escapeHTML(description)}</div>
                    </div>
                    <div>
                        <div class="price-container">
                            <span class="price-promo">${formatCurrency(effectivePrice)}</span>
                            ${isPromo ? `<span class="price-normal">${formatCurrency(prixNormal)}</span> <span class="badge-reduction">-${reduction}%</span>` : ''}
                        </div>
                        <div class="card-actions">
                            <button class="btn-view" id="btn-view-${pubId}">${tr.viewBtn}</button>
                            <button class="btn-share" id="btn-share-${pubId}">${tr.shareBtn}</button>
                            <button class="btn-order" id="btn-add-${pubId}">${tr.cartBtn}</button>
                        </div>
                    </div>
                </div>
            `;

            gridContainer.appendChild(card);

            card.querySelector(`#btn-view-${pubId}`)?.addEventListener("click", () => {
                afficherDetailsProduit(pubId, dbInstance, uid);
            });

            card.querySelector(`#btn-share-${pubId}`)?.addEventListener("click", () => {
                partagerLienAffilie(pubId, title, uid);
            });

            card.querySelector(`#btn-add-${pubId}`)?.addEventListener("click", () => {
                ajouterAuPanierGS(pubId, dbInstance, uid);
            });
        });
    }
}

function partagerLienAffilie(pubId, title, currentUid) {
    const siteBase = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
    const affiliateUrl = `${siteBase}/?produit=${pubId}${currentUid ? '&ref=' + encodeURIComponent(currentUid) : ''}`;

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(affiliateUrl).then(() => {
            alert(`✅ Lien d'affiliation copié pour "${title}" !\n\nLien : ${affiliateUrl}`);
        }).catch(() => {
            prompt("Copiez votre lien d'affiliation :", affiliateUrl);
        });
    } else {
        prompt("Copiez votre lien d'affiliation :", affiliateUrl);
    }
}

async function afficherDetailsProduit(productId, db, userId) {
    const pubSnap = await get(ref(db, `publications/${productId}`));
    if (!pubSnap.exists()) return alert("Produit introuvable dans la base de données.");
    
    const product = pubSnap.val();
    const prixNormal = parseFloat(product.prixNormal || product.prix || product.price || 0);
    const prixPromo = parseFloat(product.prixPromo || product.promoPrice || 0);
    const unitPrice = (prixPromo > 0 && prixPromo < prixNormal) ? prixPromo : prixNormal;
    const isPromo = (prixPromo > 0 && prixPromo < prixNormal);
    const reduction = isPromo ? Math.round(((prixNormal - prixPromo) / prixNormal) * 100) : 0;

    const title = product.nom || product.titre || product.title || "Produit DAKPROÉLITE";
    const description = product.description || "Aucune description détaillée disponible.";
    const fallbackImage = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='280' height='190' viewBox='0 0 24 24' fill='none' stroke='%23d4af37' stroke-width='1.5'><rect x='3' y='3' width='18' height='18' rx='2'/><path d='M21 16l-5-5-4 5-3-3-4 4'/><circle cx='8.5' cy='8.5' r='1.5'/></svg>";
    const image = product.image || product.imageUrl || (Array.isArray(product.images) ? product.images[0] : fallbackImage);

    const t = translations[currentLang] || translations['fr'];
    const modalEl = document.getElementById("productModalContainer");
    modalEl.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <img src="${escapeHTML(image)}" alt="${escapeHTML(title)}" style="width:100%; height:220px; object-fit:contain; background:#080b10; border-radius:10px; margin-bottom:12px; border:1px solid #333;" onerror="this.onerror=null; this.src='${fallbackImage}';">
                <h2 style="color: #d4af37; margin-bottom: 8px; font-size: 18px;">${escapeHTML(title)}</h2>
                
                <div class="price-container" style="margin-bottom: 12px;">
                    <span class="price-promo" style="font-size: 18px;">${formatCurrency(unitPrice)}</span>
                    ${isPromo ? `<span class="price-normal" style="font-size: 13px;">${formatCurrency(prixNormal)}</span> <span class="badge-reduction">-${reduction}%</span>` : ''}
                </div>

                <div style="background:#12161f; padding:12px; border-radius:8px; border:1px solid #222; margin-bottom:15px;">
                    <h4 style="color:#fff; font-size:12px; margin-bottom:4px;">${t.descTitle}</h4>
                    <p style="color:#ccc; font-size:13px; line-height:1.5; white-space:pre-line;">${escapeHTML(description)}</p>
                </div>

                <div style="display: flex; gap: 10px;">
                    <button class="btn-order" id="btn-modal-add" style="flex:1;">${t.modalBuy}</button>
                    <button class="btn-view" id="btn-modal-close" style="background: #222; color: #fff; border-color:#444;">${t.modalClose}</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById("btn-modal-add")?.addEventListener("click", () => {
        ajouterAuPanierGS(productId, db, userId);
    });

    document.getElementById("btn-modal-close")?.addEventListener("click", () => {
        modalEl.innerHTML = "";
    });
}

async function ajouterAuPanierGS(productId, db, userId) {
    if (!userId) {
        alert("Veuillez vous connecter pour commander sur DAKPROÉLITE.");
        window.location.href = "profil-acheteur.html";
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
        const prixNormal = parseFloat(product.prixNormal || product.prix || product.price || 0);
        const prixPromo = parseFloat(product.prixPromo || product.promoPrice || 0);
        const unitPrice = (prixPromo > 0 && prixPromo < prixNormal) ? prixPromo : prixNormal;
        const title = product.nom || product.titre || product.title || "Produit DAKPROÉLITE";
        const image = product.image || product.imageUrl || (Array.isArray(product.images) ? product.images[0] : "");
        const t = translations[currentLang] || translations['fr'];

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
            devise: t.currency,
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
        localStorage.setItem("dakpro_cached_cart_total", globalTotal.toString());

        setTimeout(() => {
            if (typeof window.chargerModule === 'function') {
                window.chargerModule('paiement');
            } else {
                window.location.href = "paiement.html";
            }
        }, 500);

    } catch (error) {
        console.error("Erreur lors de l'ajout au panier :", error);
        alert("❌ Une erreur est survenue lors de l'ajout au panier.");
        if (btn) {
            btn.disabled = false;
            btn.textContent = translations[currentLang].cartBtn;
            btn.style.background = "#22c55e";
            btn.style.color = "#fff";
        }
    }
}
