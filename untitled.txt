// ============================================================
// DAKPRO ÉLITE — acheteur-produits.js
// Catalogue produits dynamique
// - Firebase Realtime Database
// - Multilingue + devise
// - Aperçu produit complet
// - Quantité dynamique
// - Calcul du total en temps réel
// - PAIEMENT DIRECT — SANS PANIER
// - Partage / affiliation dynamique
// ============================================================

import {
    ref,
    onValue,
    get,
    update
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

/* ============================================================
   TRADUCTIONS
   ============================================================ */

const translations = {

    fr: {
        name: "Français",
        currency: "FCFA",
        rate: 1,

        title: "🛍️ Catalogue des Produits DAKPRO ÉLITE",
        viewBtn: "👁️ Aperçu",
        shareBtn: "🔗 Lien d'affiliation",

        modalBuy: "💳 Payer directement",
        modalClose: "Fermer",

        loading: "Chargement des produits en cours...",
        empty: "Aucun produit disponible pour le moment.",

        descTitle: "Description du produit",
        qtyLabel: "Quantité",
        unitPriceLabel: "Prix unitaire",
        totalLabel: "Total général",

        loginRequired:
            "Veuillez vous connecter ou vous inscrire pour effectuer votre commande.",

        productNotFound:
            "Produit introuvable dans la base de données.",

        paymentError:
            "Une erreur est survenue lors de la préparation du paiement. Veuillez réessayer.",

        shareCopied:
            "Lien d'affiliation copié !",

        copyLink:
            "Copiez votre lien d'affiliation :",

        noDescription:
            "Aucune description disponible.",

        orderPreparing:
            "Préparation de votre commande..."
    },

    en: {
        name: "English",
        currency: "USD",
        rate: 1 / 600,

        title: "🛍️ DAKPRO ÉLITE Product Catalog",
        viewBtn: "👁️ Preview",
        shareBtn: "🔗 Affiliate Link",

        modalBuy: "💳 Pay directly",
        modalClose: "Close",

        loading: "Loading products...",
        empty: "No products available at the moment.",

        descTitle: "Product Description",
        qtyLabel: "Quantity",
        unitPriceLabel: "Unit price",
        totalLabel: "Grand total",

        loginRequired:
            "Please log in or register to place your order.",

        productNotFound:
            "Product not found in the database.",

        paymentError:
            "An error occurred while preparing your payment. Please try again.",

        shareCopied:
            "Affiliate link copied!",

        copyLink:
            "Copy your affiliate link:",

        noDescription:
            "No description available.",

        orderPreparing:
            "Preparing your order..."
    },

    es: {
        name: "Español",
        currency: "EUR",
        rate: 1 / 655.957,

        title: "🛍️ Catálogo de Productos DAKPRO ÉLITE",
        viewBtn: "👁️ Vista previa",
        shareBtn: "🔗 Enlace de afiliado",

        modalBuy: "💳 Pagar directamente",
        modalClose: "Cerrar",

        loading: "Cargando productos...",
        empty: "No hay productos disponibles por el momento.",

        descTitle: "Descripción del producto",
        qtyLabel: "Cantidad",
        unitPriceLabel: "Precio unitario",
        totalLabel: "Total general",

        loginRequired:
            "Inicie sesión o regístrese para realizar su pedido.",

        productNotFound:
            "Producto no encontrado en la base de datos.",

        paymentError:
            "Se produjo un error al preparar el pago. Inténtelo de nuevo.",

        shareCopied:
            "¡Enlace de afiliado copiado!",

        copyLink:
            "Copie su enlace de afiliado:",

        noDescription:
            "No hay descripción disponible.",

        orderPreparing:
            "Preparando su pedido..."
    },

    zh: {
        name: "中文",
        currency: "CNY",
        rate: 1 / 85,

        title: "🛍️ DAKPRO ÉLITE 产品目录",
        viewBtn: "👁️ 预览",
        shareBtn: "🔗 推广链接",

        modalBuy: "💳 直接支付",
        modalClose: "关闭",

        loading: "正在加载产品...",
        empty: "暂无可用产品。",

        descTitle: "产品描述",
        qtyLabel: "数量",
        unitPriceLabel: "单价",
        totalLabel: "总计",

        loginRequired:
            "请登录或注册后再进行订单支付。",

        productNotFound:
            "数据库中找不到该产品。",

        paymentError:
            "准备支付时发生错误，请重试。",

        shareCopied:
            "推广链接已复制！",

        copyLink:
            "请复制您的推广链接：",

        noDescription:
            "暂无产品描述。",

        orderPreparing:
            "正在准备您的订单..."
    },

    bn: {
        name: "বাংলা",
        currency: "BDT",
        rate: 1 / 5,

        title: "🛍️ DAKPRO ÉLITE পণ্য ক্যাটালগ",
        viewBtn: "👁️ পূর্বরূপ",
        shareBtn: "🔗 অ্যাফিলিয়েট লিঙ্ক",

        modalBuy: "💳 সরাসরি পেমেন্ট",
        modalClose: "বন্ধ করুন",

        loading: "পণ্য লোড হচ্ছে...",
        empty: "এই মুহূর্তে কোনো পণ্য উপলব্ধ নেই।",

        descTitle: "পণ্যের বিবরণ",
        qtyLabel: "পরিমাণ",
        unitPriceLabel: "একক মূল্য",
        totalLabel: "সর্বমোট",

        loginRequired:
            "অর্ডার করার জন্য অনুগ্রহ করে লগইন বা নিবন্ধন করুন।",

        productNotFound:
            "ডাটাবেসে পণ্যটি পাওয়া যায়নি।",

        paymentError:
            "পেমেন্ট প্রস্তুত করার সময় একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।",

        shareCopied:
            "অ্যাফিলিয়েট লিঙ্ক কপি হয়েছে!",

        copyLink:
            "আপনার অ্যাফিলিয়েট লিঙ্ক কপি করুন:",

        noDescription:
            "কোনো বিবরণ নেই।",

        orderPreparing:
            "আপনার অর্ডার প্রস্তুত করা হচ্ছে..."
    },

    yo: {
        name: "Yorùbá",
        currency: "NGN",
        rate: 1.2,

        title: "🛍️ Àwọn Ọjà DAKPRO ÉLITE",
        viewBtn: "👁️ Wo",
        shareBtn: "🔗 Ọna Aṣoju",

        modalBuy: "💳 San taara",
        modalClose: "Pade",

        loading: "A n gbe awọn ọja wọle...",
        empty: "Ko si ọja ti o wa lọwọlọwọ.",

        descTitle: "Apejuwe Ọja",
        qtyLabel: "Opoiye",
        unitPriceLabel: "Iye Ọja Kan",
        totalLabel: "Apapọ",

        loginRequired:
            "Jọwọ wọle tabi forukọsilẹ lati ṣe aṣẹ.",

        productNotFound:
            "A ko ri ọja naa ninu ibi ipamọ data.",

        paymentError:
            "Aṣiṣe kan waye nigba ti a n mura isanwo.",

        shareCopied:
            "Ọna aṣoju ti daakọ!",

        copyLink:
            "Daakọ ọna aṣoju rẹ:",

        noDescription:
            "Ko si apejuwe ọja.",

        orderPreparing:
            "A n mura aṣẹ rẹ..."
    },

    fon: {
        name: "Fɔ̀ngbè",
        currency: "FCFA",
        rate: 1,

        title: "🛍️ DAKPRO ÉLITE Nǔ tɛnmɛ bǐ",
        viewBtn: "👁️ Kpɔ nǔ",
        shareBtn: "🔗 Alɔgɔ tɛnmɛ",

        modalBuy: "💳 Hò gbadanu",
        modalClose: "Sɔ́",

        loading: "E ɖò nǔ lɛ ɖè wɛ...",
        empty: "Nǔ ɖebǔ mɛ ɖò tɛnmɛ nɛ ɔ mɛ ǎ.",

        descTitle: "Nǔ e ɖò nǔ tɛnmɛ ɔ mɛ",
        qtyLabel: "Sɔ́xwé",
        unitPriceLabel: "Akwɛ ɖokpo",
        totalLabel: "Akwɛ bǐ",

        loginRequired:
            "Tɔ́ kpɔ̀n ɖo akɔntɛ o, alɛ a yi ɖo akɔntɛ ɖé wɛ ɖo nǔ.",

        productNotFound:
            "Nǔ ɔ mɛ ɖo database mɛ ǎ.",

        paymentError:
            "Nuɖeɖe ɖé va ɖo payment preparation mɛ.",

        shareCopied:
            "Alɔgɔ tɛnmɛ ko daakɔ!",

        copyLink:
            "Daakɔ alɔgɔ tɛnmɛ tɔ́n:",

        noDescription:
            "Nǔ e ɖò nǔ mɛ ɖebǔ.",

        orderPreparing:
            "E ɖò nǔ tɔ́n ɖè wɛ..."
    }
};


/* ============================================================
   ÉTAT GLOBAL
   ============================================================ */

let currentLang =
    localStorage.getItem("dakpro_lang") || "fr";

let currentProducts = {};

let currentUserId = null;

let currentAuth = null;

let currentDb = null;

let activeProductId = null;

let activeProduct = null;

let activeUnitPriceFCFA = 0;

let activeQuantity = 1;


/* ============================================================
   OUTILS
   ============================================================ */

function getTranslation() {
    return translations[currentLang] || translations.fr;
}


/**
 * Convertit le prix source FCFA uniquement pour l'affichage.
 * Le prix réel enregistré reste en FCFA.
 */
function convertPriceFromFCFA(value) {

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return 0;
    }

    return numericValue * getTranslation().rate;
}


/**
 * Formatage propre des devises.
 */
function formatCurrency(valueFCFA) {

    const t = getTranslation();

    const converted = convertPriceFromFCFA(valueFCFA);

    let formatted;

    if (
        t.currency === "USD" ||
        t.currency === "EUR" ||
        t.currency === "BDT" ||
        t.currency === "NGN"
    ) {

        formatted = new Intl.NumberFormat(
            currentLang === "zh" ? "zh-CN" : "en-US",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        ).format(converted);

    } else {

        formatted = new Intl.NumberFormat(
            "fr-FR",
            {
                maximumFractionDigits: 0
            }
        ).format(Math.round(converted));
    }

    return `${formatted} ${t.currency}`;
}


/**
 * Échappement HTML.
 */
function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/**
 * Récupération de l'image principale.
 */
function getProductImage(product) {

    if (!product) return "";

    if (product.image) {
        return product.image;
    }

    if (product.imageUrl) {
        return product.imageUrl;
    }

    if (
        Array.isArray(product.images) &&
        product.images.length > 0
    ) {
        return product.images[0];
    }

    return "";
}


/**
 * Récupération de la vidéo.
 */
function getProductVideo(product) {

    if (!product) return "";

    return product.video ||
           product.videoUrl ||
           "";
}


/**
 * Prix source du produit en FCFA.
 */
function getNormalPrice(product) {

    return Number(
        product?.prixNormal ??
        product?.prix ??
        product?.price ??
        0
    ) || 0;
}


/**
 * Prix promotionnel source en FCFA.
 */
function getPromoPrice(product) {

    return Number(
        product?.prixPromo ??
        product?.promoPrice ??
        0
    ) || 0;
}


/**
 * Prix effectivement vendu.
 */
function getEffectivePrice(product) {

    const normal = getNormalPrice(product);

    const promo = getPromoPrice(product);

    if (
        promo > 0 &&
        normal > 0 &&
        promo < normal
    ) {
        return promo;
    }

    return normal;
}


/**
 * Vérifie si le produit est en promotion.
 */
function isProductPromo(product) {

    const normal = getNormalPrice(product);

    const promo = getPromoPrice(product);

    return (
        promo > 0 &&
        normal > 0 &&
        promo < normal
    );
}


/**
 * Pourcentage de réduction.
 */
function getReduction(product) {

    if (!isProductPromo(product)) {
        return 0;
    }

    const normal = getNormalPrice(product);

    const promo = getPromoPrice(product);

    return Math.round(
        ((normal - promo) / normal) * 100
    );
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

    if (!container || !db) {
        console.error(
            "DAKPRO ÉLITE : container ou database manquant."
        );
        return;
    }

    currentDb = db;

    currentAuth = auth || null;

    currentUserId =
        userId ||
        (
            auth &&
            auth.currentUser
                ? auth.currentUser.uid
                : null
        );

    const t = getTranslation();

    /* --------------------------------------------------------
       CACHE LOCAL
       -------------------------------------------------------- */

    let initialProducts = null;

    try {

        const cached =
            localStorage.getItem(
                "dakpro_cached_products"
            );

        if (cached) {
            initialProducts = JSON.parse(cached);
        }

    } catch (error) {

        console.warn(
            "Cache produits invalide.",
            error
        );
    }


    /* --------------------------------------------------------
       INTERFACE
       -------------------------------------------------------- */

    container.innerHTML = `

        <style>

            .dakpro-catalog {
                width: 100%;
                box-sizing: border-box;
            }

            .catalog-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 12px;
                margin-bottom: 20px;
                padding-bottom: 12px;
                border-bottom: 1px solid rgba(212,175,55,.30);
                flex-wrap: wrap;
            }

            .catalog-title {
                color: #d4af37;
                font-size: 18px;
                font-weight: 800;
                line-height: 1.3;
            }

            .header-lang-wrapper {
                position: relative;
                display: inline-block;
                flex-shrink: 0;
            }

            .header-lang-btn {
                background: #12161f;
                border: 1px solid #d4af37;
                color: #d4af37;
                padding: 8px 12px;
                border-radius: 20px;
                font-size: 11px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                font-weight: 700;
                white-space: nowrap;
            }

            .header-lang-btn:hover {
                background: #253041;
            }

            .header-lang-menu {
                display: none;
                position: absolute;
                top: calc(100% + 8px);
                right: 0;
                background: #12161f;
                border: 1px solid #d4af37;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 5px 20px rgba(0,0,0,.8);
                z-index: 6000;
                min-width: 180px;
                max-height: 300px;
                overflow-y: auto;
            }

            .header-lang-menu.show {
                display: block;
            }

            .header-lang-option {
                width: 100%;
                padding: 10px 14px;
                background: transparent;
                border: none;
                color: #fff;
                text-align: left;
                font-size: 12px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .header-lang-option:hover {
                background: #d4af37;
                color: #000;
                font-weight: 700;
            }

            .products-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0,1fr));
                gap: 12px;
                align-items: stretch;
            }

            @media (min-width: 600px) {
                .products-grid {
                    grid-template-columns: repeat(3, minmax(0,1fr));
                    gap: 14px;
                }
            }

            @media (min-width: 1024px) {
                .products-grid {
                    grid-template-columns: repeat(4, minmax(0,1fr));
                    gap: 16px;
                }
            }

            @media (min-width: 1600px) {
                .products-grid {
                    grid-template-columns: repeat(6, minmax(0,1fr));
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
                min-width: 0;
                height: 100%;
                box-sizing: border-box;
                transition:
                    border-color .2s ease,
                    transform .2s ease;
            }

            .product-card:hover {
                border-color: #d4af37;
                transform: translateY(-2px);
            }

            .media-wrapper {
                width: 100%;
                height: 160px;
                border-radius: 6px;
                background: #080b10;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                margin-bottom: 8px;
            }

            .product-img {
                width: 100%;
                height: 100%;
                object-fit: contain;
                display: block;
            }

            .product-video {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .product-info-body {
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
            }

            .product-title {
                font-size: 13px;
                font-weight: 700;
                color: #fff;
                margin-bottom: 5px;
                line-height: 1.25;
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
                line-height: 1.35;
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

            .price-promo {
                color: #d4af37;
                font-weight: 800;
                font-size: 14px;
            }

            .price-normal {
                color: #777;
                font-size: 11px;
                text-decoration: line-through;
            }

            .badge-reduction {
                background: #ef4444;
                color: #fff;
                font-size: 9px;
                padding: 2px 5px;
                border-radius: 4px;
                font-weight: 700;
            }

            .card-actions {
                display: flex;
                gap: 6px;
                flex-direction: column;
                margin-top: auto;
            }

            .btn-view,
            .btn-share,
            .btn-order {
                width: 100%;
                padding: 9px;
                border-radius: 6px;
                font-weight: 700;
                cursor: pointer;
                font-size: 11px;
                transition: .2s;
                box-sizing: border-box;
            }

            .btn-view {
                background: #12161f;
                color: #d4af37;
                border: 1px solid #d4af37;
            }

            .btn-view:hover {
                background: #d4af37;
                color: #000;
            }

            .btn-share {
                background: #1e293b;
                color: #38bdf8;
                border: 1px solid #38bdf8;
            }

            .btn-share:hover {
                background: #38bdf8;
                color: #000;
            }

            .btn-order {
                background: #d4af37;
                color: #000;
                border: 1px solid #d4af37;
            }

            .btn-order:hover {
                background: #f0c84b;
            }

            .modal-overlay {
                position: fixed;
                inset: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,.88);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                padding: 15px;
                box-sizing: border-box;
            }

            .modal-content {
                background: #0a0d14;
                border: 1px solid #d4af37;
                border-radius: 14px;
                padding: 20px;
                max-width: 600px;
                width: 100%;
                max-height: 92vh;
                overflow-y: auto;
                box-sizing: border-box;
            }

            .modal-product-image {
                width: 100%;
                height: 240px;
                object-fit: contain;
                background: #080b10;
                border-radius: 10px;
                margin-bottom: 12px;
                border: 1px solid #333;
            }

            .modal-product-title {
                color: #d4af37;
                margin-bottom: 8px;
                font-size: 18px;
                line-height: 1.3;
            }

            .modal-description-box {
                background: #12161f;
                padding: 12px;
                border-radius: 8px;
                border: 1px solid #222;
                margin-bottom: 12px;
            }

            .modal-description {
                color: #ccc;
                font-size: 12px;
                line-height: 1.5;
                white-space: pre-line;
                max-height: 180px;
                overflow-y: auto;
                margin: 0;
            }

            .qty-box {
                display: flex;
                align-items: center;
                gap: 10px;
                margin: 12px 0;
                background: #12161f;
                padding: 8px 12px;
                border-radius: 8px;
                border: 1px solid #333;
            }

            .btn-qty {
                width: 32px;
                height: 32px;
                background: #d4af37;
                color: #000;
                border: none;
                border-radius: 6px;
                font-weight: bold;
                cursor: pointer;
                font-size: 18px;
            }

            .qty-val {
                font-size: 16px;
                font-weight: bold;
                color: #fff;
                min-width: 35px;
                text-align: center;
            }

            .total-box {
                font-size: 13px;
                color: #fff;
                margin-bottom: 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 10px;
                background: #1e293b;
                padding: 12px;
                border-radius: 8px;
            }

            .total-value {
                color: #22c55e;
                font-size: 16px;
                font-weight: 800;
                white-space: nowrap;
            }

            .modal-buttons {
                display: flex;
                gap: 8px;
            }

            .modal-buttons .btn-view {
                width: 100px;
                background: #222;
                color: #fff;
                border-color: #444;
            }

            .empty-products {
                color: #888;
                text-align: center;
                grid-column: 1 / -1;
                padding: 40px 15px;
            }

        </style>

        <div class="dakpro-catalog">

            <div class="catalog-header">

                <div
                    class="catalog-title"
                    id="catalogTitleLabel"
                >
                    ${escapeHTML(t.title)}
                </div>

                <div class="header-lang-wrapper">

                    <button
                        type="button"
                        class="header-lang-btn"
                        id="headerLangBtn"
                    >
                        🌐
                        <span id="currentLangLabel">
                            ${escapeHTML(t.name)}
                            (${escapeHTML(t.currency)})
                        </span>
                        ▾
                    </button>

                    <div
                        class="header-lang-menu"
                        id="headerLangMenu"
                    >

                        <button
                            type="button"
                            class="header-lang-option"
                            data-lang="fr"
                        >
                            🇫🇷 Français (FCFA)
                        </button>

                        <button
                            type="button"
                            class="header-lang-option"
                            data-lang="en"
                        >
                            🇬🇧 English (USD)
                        </button>

                        <button
                            type="button"
                            class="header-lang-option"
                            data-lang="es"
                        >
                            🇪🇸 Español (EUR)
                        </button>

                        <button
                            type="button"
                            class="header-lang-option"
                            data-lang="zh"
                        >
                            🇨🇳 中文 (CNY)
                        </button>

                        <button
                            type="button"
                            class="header-lang-option"
                            data-lang="bn"
                        >
                            🇧🇩 বাংলা (BDT)
                        </button>

                        <button
                            type="button"
                            class="header-lang-option"
                            data-lang="yo"
                        >
                            🇳🇬 Yorùbá (NGN)
                        </button>

                        <button
                            type="button"
                            class="header-lang-option"
                            data-lang="fon"
                        >
                            🇧🇯 Fɔ̀ngbè (FCFA)
                        </button>

                    </div>

                </div>

            </div>

            <div
                id="productsGrid"
                class="products-grid"
            >

                <div
                    class="empty-products"
                    id="loadingText"
                >
                    ${escapeHTML(t.loading)}
                </div>

            </div>

            <div id="productModalContainer"></div>

        </div>
    `;


    /* --------------------------------------------------------
       MENU LANGUE
       -------------------------------------------------------- */

    const mainBtn =
        container.querySelector("#headerLangBtn");

    const menu =
        container.querySelector("#headerLangMenu");


    mainBtn?.addEventListener("click", (event) => {

        event.stopPropagation();

        menu?.classList.toggle("show");
    });


    menu?.addEventListener("click", (event) => {

        event.stopPropagation();
    });


    /* --------------------------------------------------------
       CHANGEMENT DE LANGUE
       -------------------------------------------------------- */

    container
        .querySelectorAll(".header-lang-option")
        .forEach((button) => {

            button.addEventListener("click", () => {

                const selectedLang =
                    button.dataset.lang;

                if (
                    !selectedLang ||
                    !translations[selectedLang]
                ) {
                    return;
                }

                currentLang = selectedLang;

                localStorage.setItem(
                    "dakpro_lang",
                    currentLang
                );

                menu?.classList.remove("show");

                updateLanguageInterface();

                renderProducts(
                    currentProducts,
                    currentDb,
                    currentUserId
                );

                /*
                 * Si une fiche produit est déjà ouverte,
                 * elle est reconstruite immédiatement dans
                 * la nouvelle langue.
                 */
                if (activeProductId && activeProduct) {

                    afficherDetailsProduit(
                        activeProductId,
                        currentDb,
                        currentUserId,
                        currentAuth
                    );
                }
            });
        });


    /* --------------------------------------------------------
       FERMETURE DU MENU
       -------------------------------------------------------- */

    const closeLanguageMenu = (event) => {

        if (
            !event.target.closest(
                ".header-lang-wrapper"
            )
        ) {
            menu?.classList.remove("show");
        }
    };

    document.addEventListener(
        "click",
        closeLanguageMenu
    );


    /* --------------------------------------------------------
       PRODUITS EN CACHE
       -------------------------------------------------------- */

    if (initialProducts) {

        currentProducts = initialProducts;

        renderProducts(
            initialProducts,
            currentDb,
            currentUserId
        );
    }


    /* --------------------------------------------------------
       FIREBASE — PUBLICATIONS
       -------------------------------------------------------- */

    const pubRef =
        ref(currentDb, "publications");


    onValue(
        pubRef,
        (snapshot) => {

            if (snapshot.exists()) {

                const products =
                    snapshot.val() || {};

                currentProducts = products;

                window._lastProductsSnapshot =
                    products;

                try {

                    localStorage.setItem(
                        "dakpro_cached_products",
                        JSON.stringify(products)
                    );

                } catch (error) {

                    console.warn(
                        "Impossible de sauvegarder le cache.",
                        error
                    );
                }

                renderProducts(
                    products,
                    currentDb,
                    currentUserId
                );

            } else {

                renderEmptyProducts();
            }
        },
        (error) => {

            console.error(
                "Erreur Firebase publications:",
                error
            );

            const grid =
                container.querySelector(
                    "#productsGrid"
                );

            if (grid) {

                grid.innerHTML = `
                    <div class="empty-products">
                        ❌ ${escapeHTML(
                            error?.message ||
                            "Erreur de chargement."
                        )}
                    </div>
                `;
            }
        }
    );


    /* --------------------------------------------------------
       PRODUIT DIRECTEMENT DANS L'URL
       Exemple :
       ?produit=ABC123
       ?produit=ABC123&ref=UID
       -------------------------------------------------------- */

    const urlParams =
        new URLSearchParams(
            window.location.search
        );

    const urlProductId =
        urlParams.get("produit");


    if (urlProductId) {

        setTimeout(() => {

            afficherDetailsProduit(
                urlProductId,
                currentDb,
                currentUserId,
                currentAuth
            );

        }, 300);
    }


    /* --------------------------------------------------------
       FONCTION DE NETTOYAGE
       -------------------------------------------------------- */

    return () => {

        document.removeEventListener(
            "click",
            closeLanguageMenu
        );
    };
}


/* ============================================================
   MISE À JOUR LANGUE
   ============================================================ */

function updateLanguageInterface() {

    const t = getTranslation();

    const title =
        document.getElementById(
            "catalogTitleLabel"
        );

    const label =
        document.getElementById(
            "currentLangLabel"
        );


    if (title) {

        title.textContent =
            t.title;
    }


    if (label) {

        label.textContent =
            `${t.name} (${t.currency})`;
    }
}


/* ============================================================
   AFFICHAGE PRODUITS
   ============================================================ */

function renderProducts(
    products,
    dbInstance,
    uid
) {

    const gridContainer =
        document.getElementById(
            "productsGrid"
        );

    if (!gridContainer) {
        return;
    }

    const t = getTranslation();

    gridContainer.innerHTML = "";


    if (
        !products ||
        typeof products !== "object"
    ) {

        renderEmptyProducts();

        return;
    }


    let displayedCount = 0;


    Object.keys(products).forEach((pubId) => {

        const item =
            products[pubId];


        if (!item) {
            return;
        }


        /*
         * Seuls les produits actifs sont affichés.
         */
        if (item.actif === false) {
            return;
        }


        const normalPrice =
            getNormalPrice(item);

        const effectivePrice =
            getEffectivePrice(item);

        const promo =
            isProductPromo(item);

        const reduction =
            getReduction(item);


        const title =
            item.nom ||
            item.titre ||
            item.title ||
            "Produit DAKPRO ÉLITE";


        const description =
            item.description ||
            t.noDescription;


        const image =
            getProductImage(item);


        const video =
            getProductVideo(item);


        const mediaSrc =
            video || image;


        let mediaHTML = "";


        if (video) {

            mediaHTML = `
                <video
                    src="${escapeHTML(video)}"
                    class="product-video"
                    controls
                    preload="metadata"
                    playsinline
                ></video>
            `;

        } else if (image) {

            mediaHTML = `
                <img
                    src="${escapeHTML(image)}"
                    alt="${escapeHTML(title)}"
                    class="product-img"
                    loading="lazy"
                    onerror="this.style.display='none';"
                >
            `;

        } else {

            mediaHTML = `
                <div style="
                    color:#d4af37;
                    font-size:40px;
                ">
                    🛍️
                </div>
            `;
        }


        const card =
            document.createElement("div");


        card.className =
            "product-card";


        card.innerHTML = `

            <div class="media-wrapper">
                ${mediaHTML}
            </div>

            <div class="product-info-body">

                <div>

                    <div class="product-title">
                        ${escapeHTML(title)}
                    </div>

                    <div class="product-desc">
                        ${escapeHTML(description)}
                    </div>

                </div>

                <div>

                    <div class="price-container">

                        <span class="price-promo">
                            ${formatCurrency(effectivePrice)}
                        </span>

                        ${
                            promo
                                ? `
                                    <span class="price-normal">
                                        ${formatCurrency(normalPrice)}
                                    </span>

                                    <span class="badge-reduction">
                                        -${reduction}%
                                    </span>
                                `
                                : ""
                        }

                    </div>

                    <div class="card-actions">

                        <button
                            type="button"
                            class="btn-view"
                            data-action="view"
                        >
                            ${escapeHTML(t.viewBtn)}
                        </button>

                        <button
                            type="button"
                            class="btn-share"
                            data-action="share"
                        >
                            ${escapeHTML(t.shareBtn)}
                        </button>

                    </div>

                </div>

            </div>
        `;


        gridContainer.appendChild(card);

        displayedCount++;


        /* ----------------------------------------------------
           APERÇU
           ---------------------------------------------------- */

        card
            .querySelector(
                '[data-action="view"]'
            )
            ?.addEventListener(
                "click",
                () => {

                    afficherDetailsProduit(
                        pubId,
                        dbInstance,
                        uid,
                        currentAuth
                    );
                }
            );


        /* ----------------------------------------------------
           PARTAGE
           ---------------------------------------------------- */

        card
            .querySelector(
                '[data-action="share"]'
            )
            ?.addEventListener(
                "click",
                () => {

                    partagerLienAffilie(
                        pubId,
                        title,
                        uid
                    );
                }
            );

    });


    if (displayedCount === 0) {

        renderEmptyProducts();
    }
}


/* ============================================================
   PRODUITS VIDES
   ============================================================ */

function renderEmptyProducts() {

    const grid =
        document.getElementById(
            "productsGrid"
        );

    if (!grid) {
        return;
    }

    const t = getTranslation();

    grid.innerHTML = `
        <div class="empty-products">
            ${escapeHTML(t.empty)}
        </div>
    `;
}


/* ============================================================
   LIEN D'AFFILIATION
   ============================================================ */

async function partagerLienAffilie(
    pubId,
    title,
    currentUid
) {

    /*
     * On conserve l'architecture actuelle :
     * ?produit=ID&ref=UID
     */

    const currentUrl =
        new URL(
            window.location.href
        );


    currentUrl.search = "";

    currentUrl.hash = "";

    currentUrl.searchParams.set(
        "produit",
        pubId
    );


    if (currentUid) {

        currentUrl.searchParams.set(
            "ref",
            currentUid
        );
    }


    const affiliateUrl =
        currentUrl.toString();


    /*
     * Partage natif téléphone.
     */

    if (
        navigator.share &&
        /Android|iPhone|iPad|iPod/i.test(
            navigator.userAgent
        )
    ) {

        try {

            await navigator.share({
                title: title,
                text: title,
                url: affiliateUrl
            });

            return;

        } catch (error) {

            /*
             * L'utilisateur peut simplement
             * avoir fermé la fenêtre de partage.
             */
            if (
                error?.name ===
                "AbortError"
            ) {
                return;
            }
        }
    }


    /*
     * Copie du lien.
     */

    if (
        navigator.clipboard &&
        window.isSecureContext
    ) {

        try {

            await navigator.clipboard.writeText(
                affiliateUrl
            );

            alert(
                `✅ ${getTranslation().shareCopied}\n\n${affiliateUrl}`
            );

            return;

        } catch (error) {

            console.warn(
                "Clipboard indisponible.",
                error
            );
        }
    }


    /*
     * Solution de secours.
     */

    window.prompt(
        getTranslation().copyLink,
        affiliateUrl
    );
}


/* ============================================================
   AFFICHAGE DÉTAILS PRODUIT
   ============================================================ */

async function afficherDetailsProduit(
    productId,
    db,
    userId,
    auth
) {

    if (!db || !productId) {
        return;
    }


    const modalEl =
        document.getElementById(
            "productModalContainer"
        );


    if (!modalEl) {
        return;
    }


    try {

        const pubSnap =
            await get(
                ref(
                    db,
                    `publications/${productId}`
                )
            );


        if (!pubSnap.exists()) {

            alert(
                getTranslation().productNotFound
            );

            return;
        }


        const product =
            pubSnap.val();


        activeProductId =
            productId;

        activeProduct =
            product;


        activeUnitPriceFCFA =
            getEffectivePrice(product);


        activeQuantity = 1;


        renderProductModal(
            productId,
            product,
            db,
            userId,
            auth
        );


    } catch (error) {

        console.error(
            "Erreur chargement produit:",
            error
        );

        alert(
            getTranslation().productNotFound
        );
    }
}


/* ============================================================
   MODAL PRODUIT
   ============================================================ */

function renderProductModal(
    productId,
    product,
    db,
    userId,
    auth
) {

    const modalEl =
        document.getElementById(
            "productModalContainer"
        );


    if (!modalEl) {
        return;
    }


    const t =
        getTranslation();


    const title =
        product.nom ||
        product.titre ||
        product.title ||
        "Produit DAKPRO ÉLITE";


    const description =
        product.description ||
        t.noDescription;


    const image =
        getProductImage(product);


    const video =
        getProductVideo(product);


    const normalPrice =
        getNormalPrice(product);


    const unitPrice =
        getEffectivePrice(product);


    const promo =
        isProductPromo(product);


    const reduction =
        getReduction(product);


    const totalFCFA =
        unitPrice * activeQuantity;


    let mediaHTML;


    if (video) {

        mediaHTML = `
            <video
                src="${escapeHTML(video)}"
                class="modal-product-image"
                controls
                preload="metadata"
                playsinline
            ></video>
        `;

    } else if (image) {

        mediaHTML = `
            <img
                src="${escapeHTML(image)}"
                alt="${escapeHTML(title)}"
                class="modal-product-image"
                onerror="this.style.display='none';"
            >
        `;

    } else {

        mediaHTML = `
            <div
                class="modal-product-image"
                style="
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    color:#d4af37;
                    font-size:60px;
                "
            >
                🛍️
            </div>
        `;
    }


    modalEl.innerHTML = `

        <div
            class="modal-overlay"
            id="dakproProductModal"
        >

            <div
                class="modal-content"
                role="dialog"
                aria-modal="true"
                aria-label="${escapeHTML(title)}"
            >

                ${mediaHTML}

                <h2 class="modal-product-title">
                    ${escapeHTML(title)}
                </h2>


                <div class="price-container">

                    <span
                        class="price-promo"
                        style="font-size:17px;"
                    >
                        ${formatCurrency(unitPrice)}
                    </span>

                    ${
                        promo
                            ? `
                                <span class="price-normal">
                                    ${formatCurrency(normalPrice)}
                                </span>

                                <span class="badge-reduction">
                                    -${reduction}%
                                </span>
                            `
                            : ""
                    }

                </div>


                <div class="modal-description-box">

                    <h4 style="
                        color:#fff;
                        font-size:12px;
                        margin:0 0 7px;
                    ">
                        ${escapeHTML(t.descTitle)}
                    </h4>

                    <p class="modal-description">
                        ${escapeHTML(description)}
                    </p>

                </div>


                <!-- QUANTITÉ -->

                <div class="qty-box">

                    <span style="
                        font-size:12px;
                        color:#aaa;
                        flex:1;
                    ">
                        ${escapeHTML(t.qtyLabel)}
                    </span>

                    <button
                        type="button"
                        class="btn-qty"
                        id="btn-minus"
                        aria-label="Diminuer"
                    >
                        −
                    </button>

                    <span
                        class="qty-val"
                        id="qty-display"
                    >
                        ${activeQuantity}
                    </span>

                    <button
                        type="button"
                        class="btn-qty"
                        id="btn-plus"
                        aria-label="Augmenter"
                    >
                        +
                    </button>

                </div>


                <!-- PRIX UNITAIRE -->

                <div style="
                    display:flex;
                    justify-content:space-between;
                    gap:10px;
                    padding:9px 10px;
                    margin-bottom:8px;
                    background:#12161f;
                    border-radius:8px;
                    color:#aaa;
                    font-size:12px;
                ">

                    <span>
                        ${escapeHTML(t.unitPriceLabel)}
                    </span>

                    <strong style="color:#fff;">
                        ${formatCurrency(unitPrice)}
                    </strong>

                </div>


                <!-- TOTAL -->

                <div class="total-box">

                    <span>
                        ${escapeHTML(t.totalLabel)}
                    </span>

                    <strong
                        class="total-value"
                        id="total-display"
                    >
                        ${formatCurrency(totalFCFA)}
                    </strong>

                </div>


                <!-- BOUTONS -->

                <div class="modal-buttons">

                    <button
                        type="button"
                        class="btn-order"
                        id="btn-modal-buy"
                    >
                        ${escapeHTML(t.modalBuy)}
                    </button>

                    <button
                        type="button"
                        class="btn-view"
                        id="btn-modal-close"
                    >
                        ${escapeHTML(t.modalClose)}
                    </button>

                </div>

            </div>

        </div>
    `;


    /* --------------------------------------------------------
       + QUANTITÉ
       -------------------------------------------------------- */

    document
        .getElementById("btn-plus")
        ?.addEventListener(
            "click",
            () => {

                activeQuantity++;

                updateModalQuantity();
            }
        );


    /* --------------------------------------------------------
       - QUANTITÉ
       -------------------------------------------------------- */

    document
        .getElementById("btn-minus")
        ?.addEventListener(
            "click",
            () => {

                if (activeQuantity > 1) {

                    activeQuantity--;

                    updateModalQuantity();
                }
            }
        );


    /* --------------------------------------------------------
       FERMER
       -------------------------------------------------------- */

    document
        .getElementById("btn-modal-close")
        ?.addEventListener(
            "click",
            fermerProduitModal
        );


    document
        .getElementById("dakproProductModal")
        ?.addEventListener(
            "click",
            (event) => {

                if (
                    event.target.id ===
                    "dakproProductModal"
                ) {

                    fermerProduitModal();
                }
            }
        );


    /* --------------------------------------------------------
       PAIEMENT DIRECT
       -------------------------------------------------------- */

    document
        .getElementById("btn-modal-buy")
        ?.addEventListener(
            "click",
            async () => {

                await preparerPaiementDirect(
                    productId,
                    product,
                    activeQuantity,
                    db,
                    userId,
                    auth
                );
            }
        );
}


/* ============================================================
   MISE À JOUR RAPIDE DE LA QUANTITÉ
   ============================================================ */

function updateModalQuantity() {

    const qtyDisplay =
        document.getElementById(
            "qty-display"
        );

    const totalDisplay =
        document.getElementById(
            "total-display"
        );


    if (qtyDisplay) {

        qtyDisplay.textContent =
            activeQuantity;
    }


    if (totalDisplay) {

        totalDisplay.textContent =
            formatCurrency(
                activeUnitPriceFCFA *
                activeQuantity
            );
    }
}


/* ============================================================
   PAIEMENT DIRECT
   ============================================================ */

async function preparerPaiementDirect(
    productId,
    product,
    quantity,
    db,
    userId,
    auth
) {

    /*
     * Vérification utilisateur.
     */

    const currentUser =
        auth?.currentUser || null;


    const finalUserId =
        userId ||
        currentUser?.uid ||
        null;


    if (!finalUserId) {

        alert(
            getTranslation().loginRequired
        );

        /*
         * Conservation de ton architecture.
         */
        window.location.href =
            "profil-acheteur.html";

        return;
    }


    /*
     * Prix source EN FCFA.
     */
    const unitPriceFCFA =
        getEffectivePrice(product);


    const finalTotalFCFA =
        unitPriceFCFA *
        quantity;


    if (
        !Number.isFinite(unitPriceFCFA) ||
        unitPriceFCFA <= 0
    ) {

        alert(
            "Prix du produit invalide."
        );

        return;
    }


    if (
        !Number.isInteger(quantity) ||
        quantity < 1
    ) {

        alert(
            "Quantité invalide."
        );

        return;
    }


    /*
     * Données de commande.
     *
     * IMPORTANT :
     * Aucun cart/
     * Aucun panier/
     * Aucun gs/total.
     */

    const paymentPayload = {

        produitId: productId,

        nom:
            product.nom ||
            product.titre ||
            product.title ||
            "Produit DAKPRO ÉLITE",

        description:
            product.description || "",

        image:
            getProductImage(product),

        video:
            getProductVideo(product),

        quantite:
            quantity,

        prixUnitaireFCFA:
            unitPriceFCFA,

        totalFCFA:
            finalTotalFCFA,

        deviseAffichage:
            getTranslation().currency,

        prixUnitaireAffiche:
            formatCurrency(unitPriceFCFA),

        totalAffiche:
            formatCurrency(finalTotalFCFA),

        langue:
            currentLang,

        statut:
            "en_attente_paiement",

        dateCreation:
            Date.now()
    };


    try {

        /*
         * Stockage temporaire de la commande
         * destinée au module paiement.
         *
         * Cela ne crée PAS un panier.
         */

        const updates = {};


        updates[
            `users/${finalUserId}/commandePaiement`
        ] = paymentPayload;


        /*
         * On conserve aussi les informations
         * dans une clé de préparation de paiement
         * afin que paiement.js puisse les lire.
         */

        updates[
            `users/${finalUserId}/paiementEnCours`
        ] = paymentPayload;


        await update(
            ref(db),
            updates
        );


        /*
         * Sauvegarde locale rapide.
         * Utile si le module paiement se charge
         * immédiatement après.
         */

        try {

            localStorage.setItem(
                "dakpro_payment_product",
                JSON.stringify(
                    paymentPayload
                )
            );

        } catch (error) {

            console.warn(
                "Impossible de sauvegarder la préparation locale.",
                error
            );
        }


        /*
         * Fermeture du produit.
         */

        fermerProduitModal();


        /*
         * Chargement du module paiement
         * sans casser ton architecture.
         */

        if (
            typeof window.chargerModule ===
            "function"
        ) {

            window.chargerModule(
                "paiement"
            );

        } else {

            /*
             * Fallback si chargerModule()
             * n'est pas disponible.
             */

            window.location.href =
                "paiement.html";
        }


    } catch (error) {

        console.error(
            "Erreur préparation paiement :",
            error
        );

        alert(
            getTranslation().paymentError
        );
    }
}


/* ============================================================
   FERMETURE MODAL
   ============================================================ */

function fermerProduitModal() {

    const modal =
        document.getElementById(
            "productModalContainer"
        );


    if (modal) {

        modal.innerHTML = "";
    }


    activeProductId = null;

    activeProduct = null;

    activeUnitPriceFCFA = 0;

    activeQuantity = 1;
}


/* ============================================================
   EXPOSITION OPTIONNELLE
   ============================================================ */

/*
 * Permet à d'autres modules de DAKPRO ÉLITE
 * d'ouvrir directement un produit :
 *
 * window.ouvrirProduitDAKPRO("ID_PRODUIT");
 */

window.ouvrirProduitDAKPRO =
    function(productId) {

        if (
            !currentDb ||
            !productId
        ) {
            return;
        }

        afficherDetailsProduit(
            productId,
            currentDb,
            currentUserId,
            currentAuth
        );
    };


/*
 * Permet éventuellement au module principal
 * de changer la langue globalement.
 */

window.changerLangueDAKPRO =
    function(lang) {

        if (!translations[lang]) {
            return;
        }

        currentLang = lang;

        localStorage.setItem(
            "dakpro_lang",
            currentLang
        );


        updateLanguageInterface();


        if (currentDb) {

            renderProducts(
                currentProducts,
                currentDb,
                currentUserId
            );
        }


        if (
            activeProductId &&
            activeProduct
        ) {

            renderProductModal(
                activeProductId,
                activeProduct,
                currentDb,
                currentUserId,
                currentAuth
            );
        }
    };