// ============================================================
// DAKPRO ÉLITE — acheteur-produits.js
// Catalogue + aperçu + panier + paiement direct
// Firebase Realtime Database
// Multilingue + devises indicatives
// Affiliation
// ============================================================

import {
    ref,
    onValue,
    get,
    update
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

/* ============================================================
   1. TRADUCTIONS
   ============================================================ */

const translations = {
    fr: {
        name: "Français",
        currency: "FCFA",
        rate: 1,
        title: "🛍️ Catalogue des Produits DAKPRO ÉLITE",
        viewBtn: "👁️ Aperçu",
        shareBtn: "🔗 Lien d'affiliation",
        cartBtn: "🛒 Ajouter au panier",
        cartTitle: "🛒 Mon panier",
        cartEmpty: "Votre panier est vide.",
        cartCheckout: "💳 Payer le panier",
        modalBuy: "💳 Payer directement",
        modalClose: "Fermer",
        loading: "Chargement des produits en cours...",
        empty: "Aucun produit disponible pour le moment.",
        descTitle: "Description du produit",
        qtyLabel: "Quantité",
        unitPriceLabel: "Prix unitaire",
        totalLabel: "Total général",
        loginRequired: "Veuillez vous connecter ou vous inscrire pour effectuer votre commande.",
        productNotFound: "Produit introuvable dans la base de données.",
        paymentError: "Une erreur est survenue lors de la préparation du paiement. Veuillez réessayer.",
        shareCopied: "Lien d'affiliation copié !",
        copyLink: "Copiez votre lien d'affiliation :",
        noDescription: "Aucune description disponible.",
        addedToCart: "Produit ajouté au panier.",
        orderPreparing: "Préparation de votre commande..."
    },

    en: {
        name: "English",
        currency: "USD",
        rate: 1 / 600,
        title: "🛍️ DAKPRO ÉLITE Product Catalog",
        viewBtn: "👁️ Preview",
        shareBtn: "🔗 Affiliate Link",
        cartBtn: "🛒 Add to cart",
        cartTitle: "🛒 My cart",
        cartEmpty: "Your cart is empty.",
        cartCheckout: "💳 Pay cart",
        modalBuy: "💳 Pay directly",
        modalClose: "Close",
        loading: "Loading products...",
        empty: "No products available at the moment.",
        descTitle: "Product Description",
        qtyLabel: "Quantity",
        unitPriceLabel: "Unit price",
        totalLabel: "Grand total",
        loginRequired: "Please log in or register to place your order.",
        productNotFound: "Product not found in the database.",
        paymentError: "An error occurred while preparing your payment. Please try again.",
        shareCopied: "Affiliate link copied!",
        copyLink: "Copy your affiliate link:",
        noDescription: "No description available.",
        addedToCart: "Product added to cart.",
        orderPreparing: "Preparing your order..."
    },

    es: {
        name: "Español",
        currency: "EUR",
        rate: 1 / 655.957,
        title: "🛍️ Catálogo de Productos DAKPRO ÉLITE",
        viewBtn: "👁️ Vista previa",
        shareBtn: "🔗 Enlace de afiliado",
        cartBtn: "🛒 Añadir al carrito",
        cartTitle: "🛒 Mi carrito",
        cartEmpty: "Su carrito está vacío.",
        cartCheckout: "💳 Pagar carrito",
        modalBuy: "💳 Pagar directamente",
        modalClose: "Cerrar",
        loading: "Cargando productos...",
        empty: "No hay productos disponibles por el momento.",
        descTitle: "Descripción del producto",
        qtyLabel: "Cantidad",
        unitPriceLabel: "Precio unitario",
        totalLabel: "Total general",
        loginRequired: "Inicie sesión o regístrese para realizar su pedido.",
        productNotFound: "Producto no encontrado en la base de datos.",
        paymentError: "Se produjo un error al preparar el pago. Inténtelo de nuevo.",
        shareCopied: "¡Enlace de afiliado copiado!",
        copyLink: "Copie su enlace de afiliado:",
        noDescription: "No hay descripción disponible.",
        addedToCart: "Producto añadido al carrito.",
        orderPreparing: "Preparando su pedido..."
    },

    zh: {
        name: "中文",
        currency: "CNY",
        rate: 1 / 85,
        title: "🛍️ DAKPRO ÉLITE 产品目录",
        viewBtn: "👁️ 预览",
        shareBtn: "🔗 推广链接",
        cartBtn: "🛒 加入购物车",
        cartTitle: "🛒 我的购物车",
        cartEmpty: "您的购物车为空。",
        cartCheckout: "💳 支付购物车",
        modalBuy: "💳 直接支付",
        modalClose: "关闭",
        loading: "正在加载产品...",
        empty: "暂无可用产品。",
        descTitle: "产品描述",
        qtyLabel: "数量",
        unitPriceLabel: "单价",
        totalLabel: "总计",
        loginRequired: "请登录或注册后再进行订单支付。",
        productNotFound: "数据库中找不到该产品。",
        paymentError: "准备支付时发生错误，请重试。",
        shareCopied: "推广链接已复制！",
        copyLink: "请复制您的推广链接：",
        noDescription: "暂无产品描述。",
        addedToCart: "产品已加入购物车。",
        orderPreparing: "正在准备您的订单..."
    },

    bn: {
        name: "বাংলা",
        currency: "BDT",
        rate: 1 / 5,
        title: "🛍️ DAKPRO ÉLITE পণ্য ক্যাটালগ",
        viewBtn: "👁️ পূর্বরূপ",
        shareBtn: "🔗 অ্যাফিলিয়েট লিঙ্ক",
        cartBtn: "🛒 কার্টে যোগ করুন",
        cartTitle: "🛒 আমার কার্ট",
        cartEmpty: "আপনার কার্ট খালি।",
        cartCheckout: "💳 কার্ট পেমেন্ট",
        modalBuy: "💳 সরাসরি পেমেন্ট",
        modalClose: "বন্ধ করুন",
        loading: "পণ্য লোড হচ্ছে...",
        empty: "এই মুহূর্তে কোনো পণ্য উপলব্ধ নেই।",
        descTitle: "পণ্যের বিবরণ",
        qtyLabel: "পরিমাণ",
        unitPriceLabel: "একক মূল্য",
        totalLabel: "সর্বমোট",
        loginRequired: "অর্ডার করার জন্য অনুগ্রহ করে লগইন বা নিবন্ধন করুন।",
        productNotFound: "ডাটাবেসে পণ্যটি পাওয়া যায়নি।",
        paymentError: "পেমেন্ট প্রস্তুত করার সময় একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।",
        shareCopied: "অ্যাফিলিয়েট লিঙ্ক কপি হয়েছে!",
        copyLink: "আপনার অ্যাফিলিয়েট লিঙ্ক কপি করুন:",
        noDescription: "কোনো বিবরণ নেই।",
        addedToCart: "পণ্যটি কার্টে যোগ হয়েছে।",
        orderPreparing: "আপনার অর্ডার প্রস্তুত করা হচ্ছে..."
    },

    yo: {
        name: "Yorùbá",
        currency: "NGN",
        rate: 1.2,
        title: "🛍️ Àwọn Ọjà DAKPRO ÉLITE",
        viewBtn: "👁️ Wo",
        shareBtn: "🔗 Ọna Aṣoju",
        cartBtn: "🛒 Fi sínú àpò",
        cartTitle: "🛒 Àpò mi",
        cartEmpty: "Àpò rẹ ṣofo.",
        cartCheckout: "💳 San àpò",
        modalBuy: "💳 San taara",
        modalClose: "Pade",
        loading: "A n gbe awọn ọja wọle...",
        empty: "Ko si ọja ti o wa lọwọlọwọ.",
        descTitle: "Apejuwe Ọja",
        qtyLabel: "Opoiye",
        unitPriceLabel: "Iye Ọja Kan",
        totalLabel: "Apapọ",
        loginRequired: "Jọwọ wọle tabi forukọsilẹ lati ṣe aṣẹ.",
        productNotFound: "A ko ri ọja naa ninu ibi ipamọ data.",
        paymentError: "Aṣiṣe kan waye nigba ti a n mura isanwo.",
        shareCopied: "Ọna aṣoju ti daakọ!",
        copyLink: "Daakọ ọna aṣoju rẹ:",
        noDescription: "Ko si apejuwe ọja.",
        addedToCart: "A ti fi ọja naa sinu àpò.",
        orderPreparing: "A n mura aṣẹ rẹ..."
    },

    fon: {
        name: "Fɔ̀ngbè",
        currency: "FCFA",
        rate: 1,
        title: "🛍️ DAKPRO ÉLITE Nǔ tɛnmɛ bǐ",
        viewBtn: "👁️ Kpɔ nǔ",
        shareBtn: "🔗 Alɔgɔ tɛnmɛ",
        cartBtn: "🛒 Tɔn nǔ ɖo kɔ́kɔ́",
        cartTitle: "🛒 Kɔ́kɔ́ tɔ́n",
        cartEmpty: "Kɔ́kɔ́ tɔ́n ɖebǔ mɛ.",
        cartCheckout: "💳 Hò gbadanu",
        modalBuy: "💳 Hò gbadanu",
        modalClose: "Sɔ́",
        loading: "E ɖò nǔ lɛ ɖè wɛ...",
        empty: "Nǔ ɖebǔ mɛ ɖò tɛnmɛ nɛ ɔ mɛ ǎ.",
        descTitle: "Nǔ e ɖò nǔ tɛnmɛ ɔ mɛ",
        qtyLabel: "Sɔ́xwé",
        unitPriceLabel: "Akwɛ ɖokpo",
        totalLabel: "Akwɛ bǐ",
        loginRequired: "Tɔ́ kpɔ̀n ɖo akɔntɛ o, alɛ a yi ɖo akɔntɛ ɖé wɛ ɖo nǔ.",
        productNotFound: "Nǔ ɔ mɛ ɖo database mɛ ǎ.",
        paymentError: "Nuɖeɖe ɖé va ɖo payment preparation mɛ.",
        shareCopied: "Alɔgɔ tɛnmɛ ko daakɔ!",
        copyLink: "Daakɔ alɔgɔ tɛnmɛ tɔ́n:",
        noDescription: "Nǔ e ɖò nǔ mɛ ɖebǔ.",
        addedToCart: "Wɛ tɔn nǔ ɔ ɖo kɔ́kɔ́.",
        orderPreparing: "E ɖò nǔ tɔ́n ɖè wɛ..."
    }
};


/* ============================================================
   2. ÉTAT GLOBAL
   ============================================================ */

function lireLangueInitiale() {
    try {
        const saved = localStorage.getItem("dakpro_lang");
        return saved && translations[saved] ? saved : "fr";
    } catch {
        return "fr";
    }
}

let currentLang = lireLangueInitiale();

let currentProducts = {};
let currentUserId = null;
let currentAuth = null;
let currentDb = null;
let currentContainer = null;
let productsUnsubscribe = null;

let activeProductId = null;
let activeProduct = null;
let activeUnitPriceFCFA = 0;
let activeQuantity = 1;


/* ============================================================
   3. TRADUCTIONS ET PRIX
   ============================================================ */

function getTranslation() {
    return translations[currentLang] || translations.fr;
}

function convertPriceFromFCFA(value) {
    const amount = Number(value);

    if (!Number.isFinite(amount) || amount < 0) {
        return 0;
    }

    return amount * getTranslation().rate;
}

function formatCurrency(valueFCFA) {
    const t = getTranslation();
    const converted = convertPriceFromFCFA(valueFCFA);

    const locales = {
        fr: "fr-FR",
        en: "en-US",
        es: "es-ES",
        zh: "zh-CN",
        bn: "bn-BD",
        yo: "en-NG",
        fon: "fr-FR"
    };

    const decimals = t.currency === "FCFA" ? 0 : 2;

    const formatted = new Intl.NumberFormat(
        locales[currentLang] || "fr-FR",
        {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }
    ).format(converted);

    return `${formatted} ${t.currency}`;
}


/* ============================================================
   4. OUTILS DE SÉCURITÉ ET PRODUITS
   ============================================================ */

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getSafeMediaURL(value) {
    if (typeof value !== "string" || !value.trim()) {
        return "";
    }

    try {
        const url = new URL(value.trim(), window.location.href);

        if (!["http:", "https:"].includes(url.protocol)) {
            return "";
        }

        return url.href;
    } catch {
        return "";
    }
}

function getProductImage(product) {
    if (!product) return "";

    const candidate =
        product.image ||
        product.imageUrl ||
        (Array.isArray(product.images) ? product.images[0] : "");

    return getSafeMediaURL(candidate);
}

function getProductVideo(product) {
    if (!product) return "";

    return getSafeMediaURL(
        product.video || product.videoUrl || ""
    );
}

function getNormalPrice(product) {
    const value = Number(
        product?.prixNormal ??
        product?.prix ??
        product?.price ??
        0
    );

    return Number.isFinite(value) && value >= 0 ? value : 0;
}

function getPromoPrice(product) {
    const value = Number(
        product?.prixPromo ??
        product?.promoPrice ??
        0
    );

    return Number.isFinite(value) && value >= 0 ? value : 0;
}

function getEffectivePrice(product) {
    const normal = getNormalPrice(product);
    const promo = getPromoPrice(product);

    if (promo > 0 && normal > 0 && promo < normal) {
        return promo;
    }

    return normal;
}

function isProductPromo(product) {
    const normal = getNormalPrice(product);
    const promo = getPromoPrice(product);

    return promo > 0 && normal > 0 && promo < normal;
}

function getReduction(product) {
    if (!isProductPromo(product)) return 0;

    const normal = getNormalPrice(product);
    const promo = getPromoPrice(product);

    return Math.round(((normal - promo) / normal) * 100);
}

function getProductTitle(product) {
    return String(
        product?.nom ||
        product?.titre ||
        product?.title ||
        "Produit DAKPRO ÉLITE"
    );
}

function getProductDescription(product) {
    return String(
        product?.description ||
        getTranslation().noDescription
    );
}


/* ============================================================
   5. PANIER LOCAL
   ============================================================ */

function getCart() {
    try {
        const cart = JSON.parse(
            localStorage.getItem("dakpro_cart") || "[]"
        );

        return Array.isArray(cart) ? cart : [];
    } catch {
        return [];
    }
}

function saveCart(cart) {
    try {
        localStorage.setItem(
            "dakpro_cart",
            JSON.stringify(cart)
        );
    } catch (error) {
        console.error("Impossible d'enregistrer le panier :", error);
        alert("Impossible d'enregistrer le panier sur cet appareil.");
    }

    updateCartBadge();
}

function addToCart(productId, product, quantity = 1) {
    const qty = Number(quantity);
    const priceFCFA = getEffectivePrice(product);

    if (!productId || !product) {
        alert(getTranslation().productNotFound);
        return;
    }

    if (!Number.isInteger(qty) || qty < 1) {
        alert("Quantité invalide.");
        return;
    }

    if (!Number.isFinite(priceFCFA) || priceFCFA <= 0) {
        alert("Prix du produit invalide.");
        return;
    }

    const cart = getCart();
    const existing = cart.find(
        item => item.produitId === productId
    );

    if (existing) {
        existing.quantite =
            Math.max(1, Number(existing.quantite) || 1) + qty;

        existing.prixUnitaireFCFA = priceFCFA;
    } else {
        cart.push({
            produitId: productId,
            nom: getProductTitle(product),
            description: getProductDescription(product),
            image: getProductImage(product),
            prixUnitaireFCFA: priceFCFA,
            quantite: qty,
            dateAjout: Date.now()
        });
    }

    saveCart(cart);

    alert(`✅ ${getTranslation().addedToCart}`);
}

function updateCartBadge() {
    const count = getCart().reduce((sum, item) => {
        const quantity = Number(item.quantite) || 0;
        return sum + Math.max(0, quantity);
    }, 0);

    document
        .querySelectorAll("[data-dakpro-cart-count]")
        .forEach(element => {
            element.textContent = String(count);
        });
}


/* ============================================================
   6. INITIALISATION
   ============================================================ */

export function init(container, db, auth, userId) {
    if (!container || !db) {
        console.error(
            "DAKPRO ÉLITE : container ou base Firebase manquant."
        );
        return;
    }

    // Arrêter l'ancien écouteur si le module est réinitialisé.
    if (typeof productsUnsubscribe === "function") {
        productsUnsubscribe();
        productsUnsubscribe = null;
    }

    currentContainer = container;
    currentDb = db;
    currentAuth = auth || null;
    currentUserId = userId || auth?.currentUser?.uid || null;

    renderCatalogShell();

    // Charger immédiatement le cache si disponible.
    try {
        const cached = localStorage.getItem(
            "dakpro_cached_products"
        );

        if (cached) {
            const products = JSON.parse(cached);

            if (
                products &&
                typeof products === "object" &&
                !Array.isArray(products)
            ) {
                currentProducts = products;
                renderProducts(products);
            }
        }
    } catch (error) {
        console.warn("Cache produits invalide :", error);
    }

    // Charger les publications Firebase.
    const publicationsRef = ref(currentDb, "publications");

    productsUnsubscribe = onValue(
        publicationsRef,
        snapshot => {
            if (!snapshot.exists()) {
                currentProducts = {};
                renderEmptyProducts();
                return;
            }

            const products = snapshot.val() || {};

            currentProducts = products;

            try {
                localStorage.setItem(
                    "dakpro_cached_products",
                    JSON.stringify(products)
                );
            } catch (error) {
                console.warn("Impossible de mettre le cache à jour :", error);
            }

            renderProducts(products);
        },
        error => {
            console.error("Erreur Firebase :", error);

            const grid = getCatalogElement("#productsGrid");

            if (grid) {
                grid.innerHTML = `
                    <div class="empty-products">
                        ❌ ${escapeHTML(error?.message || "Erreur de chargement.")}
                    </div>
                `;
            }
        }
    );

    // Ouvrir un produit si son identifiant est dans l'URL.
    const params = new URLSearchParams(window.location.search);
    const productId = params.get("produit");

    if (productId) {
        afficherDetailsProduit(
            productId,
            currentDb,
            currentUserId,
            currentAuth
        );
    }

    updateCartBadge();
}


/* ============================================================
   7. STRUCTURE HTML ET CSS
   ============================================================ */

function renderCatalogShell() {
    if (!currentContainer) return;

    const t = getTranslation();

    currentContainer.innerHTML = `
        <style>
            .dakpro-catalog {
                width: 100%;
                box-sizing: border-box;
            }

            .dakpro-catalog *,
            .dakpro-catalog *::before,
            .dakpro-catalog *::after {
                box-sizing: border-box;
            }

            .dakpro-catalog .catalog-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 12px;
                margin-bottom: 20px;
                padding-bottom: 12px;
                border-bottom: 1px solid rgba(212,175,55,.3);
                flex-wrap: wrap;
            }

            .dakpro-catalog .catalog-title {
                color: #d4af37;
                font-size: 18px;
                font-weight: 800;
            }

            .dakpro-catalog .header-lang-wrapper {
                position: relative;
            }

            .dakpro-catalog .header-lang-btn {
                background: #12161f;
                border: 1px solid #d4af37;
                color: #d4af37;
                padding: 8px 12px;
                border-radius: 20px;
                cursor: pointer;
                font-size: 11px;
                font-weight: 700;
            }

            .dakpro-catalog .header-lang-menu {
                display: none;
                position: absolute;
                top: calc(100% + 8px);
                right: 0;
                background: #12161f;
                border: 1px solid #d4af37;
                border-radius: 10px;
                overflow: hidden;
                z-index: 6000;
                min-width: 180px;
                box-shadow: 0 5px 20px rgba(0,0,0,.8);
            }

            .dakpro-catalog .header-lang-menu.show {
                display: block;
            }

            .dakpro-catalog .header-lang-option {
                display: block;
                width: 100%;
                padding: 10px 14px;
                background: transparent;
                border: 0;
                color: #fff;
                text-align: left;
                cursor: pointer;
                font-size: 12px;
            }

            .dakpro-catalog .header-lang-option:hover {
                background: #d4af37;
                color: #000;
            }

            .dakpro-catalog .products-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 12px;
            }

            @media (min-width: 600px) {
                .dakpro-catalog .products-grid {
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                }
            }

            @media (min-width: 1024px) {
                .dakpro-catalog .products-grid {
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                }
            }

            @media (min-width: 1600px) {
                .dakpro-catalog .products-grid {
                    grid-template-columns: repeat(6, minmax(0, 1fr));
                }
            }

            .dakpro-catalog .product-card {
                min-width: 0;
                background: #0a0d14;
                border: 1px solid #222;
                border-radius: 10px;
                padding: 10px;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .dakpro-catalog .media-wrapper {
                width: 100%;
                height: 160px;
                border-radius: 6px;
                background: #080b10;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            }

            .dakpro-catalog .product-img,
            .dakpro-catalog .product-video {
                width: 100%;
                height: 100%;
                object-fit: contain;
            }

            .dakpro-catalog .product-title {
                color: #fff;
                font-size: 13px;
                font-weight: 700;
                line-height: 1.4;
                overflow-wrap: anywhere;
            }

            .dakpro-catalog .product-desc {
                color: #aaa;
                font-size: 11px;
                line-height: 1.45;
                margin: 5px 0 8px;
                overflow-wrap: anywhere;
                white-space: pre-line;
            }

            .dakpro-catalog .price-container {
                display: flex;
                align-items: center;
                gap: 6px;
                flex-wrap: wrap;
                margin-bottom: 8px;
            }

            .dakpro-catalog .price-promo {
                color: #d4af37;
                font-size: 14px;
                font-weight: 800;
            }

            .dakpro-catalog .price-normal {
                color: #777;
                font-size: 11px;
                text-decoration: line-through;
            }

            .dakpro-catalog .badge-reduction {
                background: #ef4444;
                color: #fff;
                font-size: 9px;
                padding: 2px 5px;
                border-radius: 4px;
                font-weight: 700;
            }

            .dakpro-catalog .card-actions {
                display: flex;
                flex-direction: column;
                gap: 6px;
                margin-top: auto;
            }

            .dakpro-catalog .card-actions button {
                width: 100%;
                padding: 9px 6px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 11px;
                font-weight: 700;
                overflow-wrap: anywhere;
            }

            .dakpro-catalog .btn-view {
                background: #12161f;
                color: #d4af37;
                border: 1px solid #d4af37;
            }

            .dakpro-catalog .btn-cart {
                background: #1e293b;
                color: #38bdf8;
                border: 1px solid #38bdf8;
            }

            .dakpro-catalog .btn-order {
                background: #d4af37;
                color: #000;
                border: 1px solid #d4af37;
            }

            .dakpro-catalog .btn-share {
                background: #172033;
                color: #fff;
                border: 1px solid #475569;
            }

            .dakpro-catalog .empty-products {
                color: #888;
                text-align: center;
                grid-column: 1 / -1;
                padding: 40px 15px;
            }

            .dakpro-catalog .modal-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,.88);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                padding: 15px;
            }

            .dakpro-catalog .modal-content {
                background: #0a0d14;
                border: 1px solid #d4af37;
                border-radius: 14px;
                padding: 20px;
                max-width: 600px;
                width: 100%;
                max-height: 92vh;
                overflow-y: auto;
            }

            .dakpro-catalog .modal-product-image {
                display: block;
                width: 100%;
                height: 240px;
                object-fit: contain;
                background: #080b10;
                border-radius: 10px;
                margin-bottom: 12px;
            }

            .dakpro-catalog .modal-product-title {
                color: #d4af37;
                font-size: 18px;
                overflow-wrap: anywhere;
            }

            .dakpro-catalog .modal-description-box {
                background: #12161f;
                padding: 12px;
                border-radius: 8px;
                margin-bottom: 12px;
            }

            .dakpro-catalog .modal-description {
                color: #ccc;
                font-size: 12px;
                line-height: 1.5;
                white-space: pre-line;
                overflow-wrap: anywhere;
            }

            .dakpro-catalog .qty-box {
                display: flex;
                align-items: center;
                gap: 10px;
                background: #12161f;
                padding: 8px 12px;
                border-radius: 8px;
                margin: 12px 0;
            }

            .dakpro-catalog .btn-qty {
                width: 32px;
                height: 32px;
                background: #d4af37;
                border: 0;
                border-radius: 6px;
                font-size: 18px;
                cursor: pointer;
            }

            .dakpro-catalog .qty-val {
                color: #fff;
                font-weight: bold;
                min-width: 35px;
                text-align: center;
            }

            .dakpro-catalog .total-box {
                display: flex;
                justify-content: space-between;
                gap: 10px;
                background: #1e293b;
                padding: 12px;
                border-radius: 8px;
                color: #fff;
            }

            .dakpro-catalog .total-value {
                color: #22c55e;
                font-weight: 800;
            }

            .dakpro-catalog .modal-buttons {
                display: flex;
                gap: 8px;
                margin-top: 12px;
                flex-wrap: wrap;
            }

            .dakpro-catalog .modal-buttons button {
                flex: 1 1 120px;
                padding: 11px 7px;
                border-radius: 7px;
                cursor: pointer;
                font-weight: 700;
            }

            @media (max-width: 420px) {
                .dakpro-catalog .modal-content {
                    padding: 12px;
                }

                .dakpro-catalog .modal-product-image {
                    height: 190px;
                }
            }
        </style>

        <div class="dakpro-catalog">
            <div class="catalog-header">
                <div class="catalog-title" data-role="catalog-title">
                    ${escapeHTML(t.title)}
                </div>

                <div class="header-lang-wrapper">
                    <button type="button"
                        class="header-lang-btn"
                        data-role="language-button">
                        🌐
                        <span data-role="language-label">
                            ${escapeHTML(t.name)} (${escapeHTML(t.currency)})
                        </span>
                        ▾
                    </button>

                    <div class="header-lang-menu" data-role="language-menu">
                        <button type="button" class="header-lang-option" data-lang="fr">🇫🇷 Français (FCFA)</button>
                        <button type="button" class="header-lang-option" data-lang="en">🇬🇧 English (USD)</button>
                        <button type="button" class="header-lang-option" data-lang="es">🇪🇸 Español (EUR)</button>
                        <button type="button" class="header-lang-option" data-lang="zh">🇨🇳 中文 (CNY)</button>
                        <button type="button" class="header-lang-option" data-lang="bn">🇧🇩 বাংলা (BDT)</button>
                        <button type="button" class="header-lang-option" data-lang="yo">🇳🇬 Yorùbá (NGN)</button>
                        <button type="button" class="header-lang-option" data-lang="fon">🇧🇯 Fɔ̀ngbè (FCFA)</button>
                    </div>
                </div>
            </div>

            <div class="products-grid" data-role="products-grid">
                <div class="empty-products">
                    ${escapeHTML(t.loading)}
                </div>
            </div>

            <div data-role="product-modal-container"></div>
        </div>
    `;

    const langButton = getCatalogElement('[data-role="language-button"]');
    const langMenu = getCatalogElement('[data-role="language-menu"]');

    langButton?.addEventListener("click", event => {
        event.stopPropagation();
        langMenu?.classList.toggle("show");
    });

    langMenu?.addEventListener("click", event => {
        event.stopPropagation();

        const button = event.target.closest("[data-lang]");

        if (button) {
            changerLangueDAKPRO(button.dataset.lang);
            langMenu.classList.remove("show");
        }
    });

    document.addEventListener("click", fermerMenuLangueExterieur);
}

function fermerMenuLangueExterieur(event) {
    if (!currentContainer) return;

    const wrapper = getCatalogElement(".header-lang-wrapper");
    const menu = getCatalogElement('[data-role="language-menu"]');

    if (wrapper && menu && !wrapper.contains(event.target)) {
        menu.classList.remove("show");
    }
}

function getCatalogElement(selector) {
    return currentContainer?.querySelector(selector) || null;
}


/* ============================================================
   8. INTERFACE LANGUE
   ============================================================ */

function updateLanguageInterface() {
    const t = getTranslation();

    const title = getCatalogElement('[data-role="catalog-title"]');
    const label = getCatalogElement('[data-role="language-label"]');

    if (title) title.textContent = t.title;

    if (label) {
        label.textContent = `${t.name} (${t.currency})`;
    }
}


/* ============================================================
   9. AFFICHAGE DU CATALOGUE
   ============================================================ */

function renderProducts(products) {
    const grid = getCatalogElement('[data-role="products-grid"]');

    if (!grid) return;

    if (!products || typeof products !== "object" || Array.isArray(products)) {
        renderEmptyProducts();
        return;
    }

    const t = getTranslation();
    grid.innerHTML = "";

    let count = 0;

    Object.entries(products).forEach(([productId, product]) => {
        if (!product || typeof product !== "object") return;

        // Compatibilité avec les anciens formats.
        if (product.actif === false) return;
        if (product.statut && String(product.statut).toLowerCase() !== "actif") {
            return;
        }

        const price = getEffectivePrice(product);

        // Ne pas afficher un produit sans prix valide.
        if (!Number.isFinite(price) || price <= 0) return;

        const title = getProductTitle(product);
        const description = getProductDescription(product);
        const image = getProductImage(product);
        const video = getProductVideo(product);

        let media = "";

        if (video) {
            media = `
                <video
                    src="${escapeHTML(video)}"
                    class="product-video"
                    controls
                    preload="metadata"
                    playsinline>
                </video>
            `;
        } else if (image) {
            media = `
                <img
                    src="${escapeHTML(image)}"
                    class="product-img"
                    alt="${escapeHTML(title)}"
                    loading="lazy">
            `;
        } else {
            media = `<div style="color:#d4af37;font-size:40px;">🛍️</div>`;
        }

        const promo = isProductPromo(product);
        const normal = getNormalPrice(product);
        const reduction = getReduction(product);

        const card = document.createElement("article");
        card.className = "product-card";

        card.innerHTML = `
            <div class="media-wrapper">${media}</div>

            <div class="product-title">${escapeHTML(title)}</div>

            <div class="product-desc">
                ${escapeHTML(description.slice(0, 180))}
                ${description.length > 180 ? "…" : ""}
            </div>

            <div class="price-container">
                <span class="price-promo">${formatCurrency(price)}</span>

                ${promo ? `
                    <span class="price-normal">${formatCurrency(normal)}</span>
                    <span class="badge-reduction">-${reduction}%</span>
                ` : ""}
            </div>

            <div class="card-actions">
                <button type="button" class="btn-view" data-action="view">
                    ${escapeHTML(t.viewBtn)}
                </button>

                <button type="button" class="btn-cart" data-action="cart">
                    ${escapeHTML(t.cartBtn)}
                </button>

                <button type="button" class="btn-order" data-action="buy">
                    ${escapeHTML(t.modalBuy)}
                </button>

                <button type="button" class="btn-share" data-action="share">
                    ${escapeHTML(t.shareBtn)}
                </button>
            </div>
        `;

        grid.appendChild(card);
        count++;

        card.querySelector('[data-action="view"]')?.addEventListener("click", () => {
            afficherDetailsProduit(productId, currentDb, currentUserId, currentAuth);
        });

        card.querySelector('[data-action="cart"]')?.addEventListener("click", () => {
            addToCart(productId, product, 1);
        });

        card.querySelector('[data-action="buy"]')?.addEventListener("click", () => {
            afficherDetailsProduit(productId, currentDb, currentUserId, currentAuth);
        });

        card.querySelector('[data-action="share"]')?.addEventListener("click", () => {
            partagerLienAffilie(productId, title, currentUserId);
        });
    });

    if (count === 0) {
        renderEmptyProducts();
    }
}

function renderEmptyProducts() {
    const grid = getCatalogElement('[data-role="products-grid"]');

    if (!grid) return;

    grid.innerHTML = `
        <div class="empty-products">
            ${escapeHTML(getTranslation().empty)}
        </div>
    `;
}


/* ============================================================
   10. AFFILIATION
   ============================================================ */

async function partagerLienAffilie(productId, title, uid) {
    const url = new URL(window.location.href);

    url.search = "";
    url.hash = "";

    url.searchParams.set("produit", productId);

    if (uid) {
        url.searchParams.set("ref", uid);
    }

    const affiliateUrl = url.toString();

    if (navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        try {
            await navigator.share({
                title,
                text: title,
                url: affiliateUrl
            });

            return;
        } catch (error) {
            if (error?.name === "AbortError") return;
        }
    }

    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(affiliateUrl);
            alert(`✅ ${getTranslation().shareCopied}`);
            return;
        } catch (error) {
            console.warn("Copie automatique impossible :", error);
        }
    }

    window.prompt(getTranslation().copyLink, affiliateUrl);
}


/* ============================================================
   11. APERÇU / DÉTAIL DU PRODUIT
   ============================================================ */

async function afficherDetailsProduit(productId, db, userId, auth) {
    const modal = getCatalogElement('[data-role="product-modal-container"]');

    if (!modal || !db || !productId) return;

    try {
        // Utiliser d'abord le cache en mémoire si le produit existe.
        let product = currentProducts?.[productId];

        // Sinon, récupérer directement dans Firebase.
        if (!product) {
            const snapshot = await get(ref(db, `publications/${productId}`));

            if (!snapshot.exists()) {
                alert(getTranslation().productNotFound);
                return;
            }

            product = snapshot.val();
        }

        if (!product || product.actif === false) {
            alert(getTranslation().productNotFound);
            return;
        }

        activeProductId = productId;
        activeProduct = product;
        activeUnitPriceFCFA = getEffectivePrice(product);
        activeQuantity = 1;

        renderProductModal(productId, product, db, userId, auth);
    } catch (error) {
        console.error("Erreur lors de l'ouverture du produit :", error);
        alert(getTranslation().productNotFound);
    }
}


/* ============================================================
   12. MODAL PRODUIT
   ============================================================ */

function renderProductModal(productId, product, db, userId, auth) {
    const modal = getCatalogElement('[data-role="product-modal-container"]');

    if (!modal) return;

    const t = getTranslation();
    const title = getProductTitle(product);
    const description = getProductDescription(product);
    const image = getProductImage(product);
    const video = getProductVideo(product);
    const unit = getEffectivePrice(product);
    const normal = getNormalPrice(product);
    const promo = isProductPromo(product);
    const reduction = getReduction(product);

    if (unit <= 0) {
        alert("Prix du produit invalide.");
        return;
    }

    let media = "";

    if (video) {
        media = `
            <video
                src="${escapeHTML(video)}"
                class="modal-product-image"
                controls
                playsinline
                preload="metadata">
            </video>
        `;
    } else if (image) {
        media = `
            <img
                src="${escapeHTML(image)}"
                class="modal-product-image"
                alt="${escapeHTML(title)}">
        `;
    } else {
        media = `
            <div class="modal-product-image"
                style="display:flex;justify-content:center;align-items:center;font-size:60px;">
                🛍️
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="modal-overlay" data-role="product-modal-overlay">
            <div class="modal-content" role="dialog" aria-modal="true" aria-label="${escapeHTML(title)}">
                ${media}

                <h2 class="modal-product-title">${escapeHTML(title)}</h2>

                <div class="price-container">
                    <span class="price-promo" style="font-size:18px">
                        ${formatCurrency(unit)}
                    </span>

                    ${promo ? `
                        <span class="price-normal">${formatCurrency(normal)}</span>
                        <span class="badge-reduction">-${reduction}%</span>
                    ` : ""}
                </div>

                <div class="modal-description-box">
                    <strong style="color:#fff">${escapeHTML(t.descTitle)}</strong>
                    <p class="modal-description">${escapeHTML(description)}</p>
                </div>

                <div class="qty-box">
                    <span style="color:#aaa;flex:1;font-size:12px">
                        ${escapeHTML(t.qtyLabel)}
                    </span>

                    <button type="button" class="btn-qty" data-action="minus" aria-label="Diminuer la quantité">−</button>
                    <span class="qty-val" data-role="quantity-display">1</span>
                    <button type="button" class="btn-qty" data-action="plus" aria-label="Augmenter la quantité">+</button>
                </div>

                <div style="display:flex;justify-content:space-between;gap:10px;padding:10px;background:#12161f;border-radius:8px;margin-bottom:8px;color:#aaa;">
                    <span>${escapeHTML(t.unitPriceLabel)}</span>
                    <strong style="color:#fff">${formatCurrency(unit)}</strong>
                </div>

                <div class="total-box">
                    <span>${escapeHTML(t.totalLabel)}</span>
                    <strong class="total-value" data-role="total-display">${formatCurrency(unit)}</strong>
                </div>

                <div class="modal-buttons">
                    <button type="button" class="btn-cart" data-action="modal-cart">
                        ${escapeHTML(t.cartBtn)}
                    </button>

                    <button type="button" class="btn-order" data-action="modal-buy">
                        ${escapeHTML(t.modalBuy)}
                    </button>

                    <button type="button" class="btn-view" data-action="modal-close">
                        ${escapeHTML(t.modalClose)}
                    </button>
                </div>
            </div>
        </div>
    `;

    modal.querySelector('[data-action="plus"]')?.addEventListener("click", () => {
        if (activeQuantity < 9999) {
            activeQuantity++;
            updateModalQuantity();
        }
    });

    modal.querySelector('[data-action="minus"]')?.addEventListener("click", () => {
        if (activeQuantity > 1) {
            activeQuantity--;
            updateModalQuantity();
        }
    });

    modal.querySelector('[data-action="modal-cart"]')?.addEventListener("click", () => {
        addToCart(productId, product, activeQuantity);
    });

    modal.querySelector('[data-action="modal-buy"]')?.addEventListener("click", async () => {
        await preparerPaiementDirect(
            productId,
            product,
            activeQuantity,
            db,
            userId,
            auth
        );
    });

    modal.querySelector('[data-action="modal-close"]')?.addEventListener("click", fermerProduitModal);

    modal.querySelector('[data-role="product-modal-overlay"]')?.addEventListener("click", event => {
        if (event.target.matches('[data-role="product-modal-overlay"]')) {
            fermerProduitModal();
        }
    });
}


/* ============================================================
   13. QUANTITÉ ET TOTAL
   ============================================================ */

function updateModalQuantity() {
    const qty = getCatalogElement('[data-role="quantity-display"]');
    const total = getCatalogElement('[data-role="total-display"]');

    if (qty) {
        qty.textContent = String(activeQuantity);
    }

    if (total) {
        total.textContent = formatCurrency(
            activeUnitPriceFCFA * activeQuantity
        );
    }
}


/* ============================================================
   14. PRÉPARATION DU PAIEMENT DIRECT
   ============================================================ */

async function preparerPaiementDirect(
    productId,
    product,
    quantity,
    db,
    userId,
    auth
) {
    const currentUser = auth?.currentUser || null;
    const finalUserId = userId || currentUser?.uid || null;

    if (!finalUserId) {
        alert(getTranslation().loginRequired);
        window.location.href = "profil-acheteur.html";
        return;
    }

    const unitPriceFCFA = getEffectivePrice(product);
    const qty = Number(quantity);
    const totalFCFA = unitPriceFCFA * qty;

    if (!Number.isFinite(unitPriceFCFA) || unitPriceFCFA <= 0) {
        alert("Prix du produit invalide.");
        return;
    }

    if (!Number.isInteger(qty) || qty < 1 || qty > 9999) {
        alert("Quantité invalide.");
        return;
    }

    const payload = {
        produitId: productId,
        nom: getProductTitle(product),
        description: getProductDescription(product),
        image: getProductImage(product),
        video: getProductVideo(product),
        quantite: qty,
        prixUnitaireFCFA: unitPriceFCFA,
        totalFCFA,
        deviseAffichage: getTranslation().currency,
        prixUnitaireAffiche: formatCurrency(unitPriceFCFA),
        totalAffiche: formatCurrency(totalFCFA),
        langue: currentLang,
        statut: "en_attente_paiement",
        dateCreation: Date.now()
    };

    try {
        const updates = {};

        updates[`users/${finalUserId}/commandePaiement`] = payload;
        updates[`users/${finalUserId}/paiementEnCours`] = payload;

        await update(ref(db), updates);

        try {
            localStorage.setItem(
                "dakpro_payment_product",
                JSON.stringify(payload)
            );
        } catch (storageError) {
            console.warn("Impossible d'enregistrer la commande localement :", storageError);
        }

        fermerProduitModal();

        if (typeof window.chargerModule === "function") {
            window.chargerModule("paiement");
        } else {
            window.location.href = "paiement.html";
        }
    } catch (error) {
        console.error("Erreur préparation paiement :", error);
        alert(getTranslation().paymentError);
    }
}


/* ============================================================
   15. FERMER LE MODAL
   ============================================================ */

function fermerProduitModal() {
    const modal = getCatalogElement('[data-role="product-modal-container"]');

    if (modal) {
        modal.innerHTML = "";
    }

    activeProductId = null;
    activeProduct = null;
    activeUnitPriceFCFA = 0;
    activeQuantity = 1;
}


/* ============================================================
   16. CHANGER DE LANGUE
   ============================================================ */

function changerLangueDAKPRO(lang) {
    if (!translations[lang]) return;

    currentLang = lang;

    try {
        localStorage.setItem("dakpro_lang", lang);
    } catch (error) {
        console.warn("Impossible de conserver la langue :", error);
    }

    updateLanguageInterface();

    if (currentProducts) {
        renderProducts(currentProducts);
    }

    if (activeProductId && activeProduct) {
        renderProductModal(
            activeProductId,
            activeProduct,
            currentDb,
            currentUserId,
            currentAuth
        );
    }
}

window.changerLangueDAKPRO = changerLangueDAKPRO;


/* ============================================================
   17. OUVRIR UN PRODUIT DEPUIS UN AUTRE MODULE
   ============================================================ */

window.ouvrirProduitDAKPRO = function(productId) {
    if (!currentDb || !productId) {
        console.warn("Le catalogue ou la base Firebase n'est pas initialisé.");
        return;
    }

    afficherDetailsProduit(
        productId,
        currentDb,
        currentUserId,
        currentAuth
    );
};


/* ============================================================
   18. BADGE DU PANIER
   ============================================================ */

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", updateCartBadge, {
        once: true
    });
} else {
    updateCartBadge();
}