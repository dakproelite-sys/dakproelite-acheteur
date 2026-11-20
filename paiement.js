/* ============================================================
   DAKPRO ÉLITE — paiement.js
   ============================================================

   PAIEMENT :
   FedaPay Checkout LIVE

   IMPORTANT :
   - La clé PUBLIQUE peut être dans ce fichier.
   - AUCUNE clé secrète FedaPay ici.
   - AUCUN PIN Mobile Money ici.
   - AUCUN CVC/CVV enregistré.
   - Le paiement définitif est confirmé côté serveur/webhook.
   - Le panier n'est vidé qu'après confirmation réelle.
   ============================================================ */

import {
  ref,
  onValue,
  get,
  set,
  update
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";


/* ============================================================
   CONFIGURATION
   ============================================================ */

const FEDAPAY_PUBLIC_KEY =
  "pk_live_DUGntocyIWTtfHBOvFpPtq54";

const FEDAPAY_ENVIRONMENT =
  "live";

const FEDAPAY_SCRIPT_URL =
  "https://cdn.fedapay.com/checkout.js?v=1.1.7";

const LOGISTICS_CONFIG = {
  minShippingFee: 2500,
  ratePerKgAir: 8500,
  customsDutyPercent: 15,
  customsHandlingPerKg: 1000
};

const COLOR_MAP = [
  { keys: ["black", "noir", "noire", "blk"], label: "Noir", hex: "#111827" },
  { keys: ["white", "blanc", "blanche", "wht", "ivory", "ivoire"], label: "Blanc", hex: "#f8fafc" },
  { keys: ["red", "rouge", "wine", "burgundy", "bordeaux"], label: "Rouge", hex: "#dc2626" },
  { keys: ["blue", "bleu", "navy", "marine", "sky", "cyan"], label: "Bleu", hex: "#2563eb" },
  { keys: ["green", "vert", "verte", "olive", "army", "khaki", "kaki"], label: "Vert", hex: "#16a34a" },
  { keys: ["yellow", "jaune", "gold", "or", "doré"], label: "Jaune / Doré", hex: "#eab308" },
  { keys: ["orange", "coral", "corail", "apricot", "abricot"], label: "Orange", hex: "#ea580c" },
  { keys: ["pink", "rose", "blush"], label: "Rose", hex: "#ec4899" },
  { keys: ["purple", "violet", "violette", "lavender", "lilac"], label: "Violet", hex: "#9333ea" },
  { keys: ["brown", "marron", "coffee", "café", "chocolate", "camel", "tan", "beige", "sand", "sable"], label: "Marron / Beige", hex: "#92400e" },
  { keys: ["grey", "gray", "gris", "grise", "silver", "argent"], label: "Gris", hex: "#6b7280" }
];


/* ============================================================
   OUTILS
   ============================================================ */

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHTML(value);
}

export function formatCFA(amount) {
  return (
    new Intl.NumberFormat("fr-FR")
      .format(Math.round(Number(amount) || 0))
    + " FCFA"
  );
}

function generateOrderId() {
  const random = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();

  return `ORD-${Date.now()}-${random}`;
}

function generatePaymentReference(orderId) {
  return String(orderId)
    .replace(/[^A-Za-z0-9]/g, "")
    .substring(0, 25);
}

function splitName(fullName) {
  const value = String(fullName || "").trim();

  if (!value) {
    return {
      firstname: "Client",
      lastname: "DAKPRO"
    };
  }

  const parts = value.split(/\s+/);

  if (parts.length === 1) {
    return {
      firstname: parts[0],
      lastname: "DAKPRO"
    };
  }

  return {
    firstname: parts.shift(),
    lastname: parts.join(" ")
  };
}

function cleanPhone(phone) {
  return String(phone || "")
    .trim()
    .replace(/[^\d+]/g, "");
}

function parserPoidsEnGrammes(rawWeight) {
  if (rawWeight === null || rawWeight === undefined || rawWeight === "") return 0;
  if (typeof rawWeight === "number" && !isNaN(rawWeight)) {
    if (rawWeight > 0 && rawWeight < 10 && !Number.isInteger(rawWeight)) {
      return Math.round(rawWeight * 1000);
    }
    return rawWeight > 0 ? Math.round(rawWeight) : 0;
  }
  const str = String(rawWeight).trim().toLowerCase().replace(",", ".");
  const isKg = /kg/.test(str);
  const matches = str.match(/(\d+(?:\.\d+)?)/g);
  if (!matches || matches.length === 0) return 0;
  const val = matches.length > 1
    ? (parseFloat(matches[0]) + parseFloat(matches[1])) / 2
    : parseFloat(matches[0]);
  if (isNaN(val) || val <= 0) return 0;
  if (isKg || (val < 10 && !Number.isInteger(val))) {
    return Math.round(val * 1000);
  }
  return Math.round(val);
}

function estimerPoidsSecuriteGrammes(p = {}) {
  const cat = `${p.categorie || p.category || ""} ${p.nom || p.title || ""}`.toLowerCase();
  if (/chaussure|shoe|sneaker|boot|sandal|sac|bag/.test(cat)) return 650;
  if (/robe|dress|veste|jacket|manteau|coat|pantalon|jean/.test(cat)) return 420;
  if (/t-shirt|shirt|polo|haut|top|blouse|chemise/.test(cat)) return 220;
  if (/montre|watch|bijou|jewelry|lunette|glass|coque|case/.test(cat)) return 120;
  if (/appareil|electromenager|machine|blender/.test(cat)) return 1500;
  return 250;
}

function detecterCouleurExacte(texte, explicitColor) {
  const source = `${explicitColor || ""} ${texte || ""}`.toLowerCase();
  for (const item of COLOR_MAP) {
    for (const k of item.keys) {
      const regex = new RegExp(`\\b${k}\\b`, "i");
      if (regex.test(source)) {
        return {
          couleurExacte: explicitColor ? String(explicitColor).trim() : item.label,
          couleurHex: item.hex
        };
      }
    }
  }
  if (explicitColor && String(explicitColor).trim()) {
    return { couleurExacte: String(explicitColor).trim(), couleurHex: "#d4af37" };
  }
  return { couleurExacte: "Couleur modèle", couleurHex: "#d4af37" };
}

function formaterStock(stockVal) {
  if (stockVal === null || stockVal === undefined || stockVal === "") {
    return { texte: "Disponible", estEpuise: false, maxQte: null };
  }
  const num = Number(stockVal);
  if (!isNaN(num)) {
    if (num <= 0) return { texte: "Rupture de stock", estEpuise: true, maxQte: 0 };
    return { texte: `${num} en stock`, estEpuise: false, maxQte: num };
  }
  const str = String(stockVal).trim();
  const epuise = /rupture|out|0|épuisé|indisponible/i.test(str);
  return { texte: str, estEpuise: epuise, maxQte: null };
}

function extraireVariantesProduit(p = {}, fallbackPrix = 0, fallbackPoidsGr = 250) {
  const source = p.variantes || p.variants || p.variantList || p.skus || p.stanProducts || [];
  const entries = Array.isArray(source)
    ? source
    : (source && typeof source === "object" ? Object.values(source) : []);
  const mainImg = p.image || p.imageUrl || p.bigImage || p.photo || "";
  const fallbackStock = p.stock ?? p.quantiteStock ?? p.inventory ?? p.warehouseInventoryNum ?? p.qte ?? null;
  const list = [];

  entries.forEach((v, idx) => {
    if (typeof v === "string" && v.trim()) {
      const col = detecterCouleurExacte(p.nom || p.title || "", "");
      list.push({
        id: `var_${idx}`,
        nom: `Modèle ${idx + 1}`,
        couleurExacte: col.couleurExacte,
        couleurHex: col.couleurHex,
        sku: p.sku || p.productSku || "",
        image: v.trim(),
        prix: fallbackPrix,
        poidsGr: fallbackPoidsGr,
        stock: fallbackStock
      });
    } else if (v && typeof v === "object") {
      const img = v.image || v.imageUrl || v.url || v.img || v.variantImage || v.bigImage || mainImg || "";
      const prixVar = Number(
        v.prixPromo ?? v.prix ?? v.price ?? v.variantSellPrice ?? v.sellPrice ?? fallbackPrix
      ) || 0;
      const rawVarWeight = v.poids ?? v.weight ?? v.variantWeight ?? v.packingWeight ?? v.skuWeight ?? v.productWeight ?? 0;
      const poidsVar = parserPoidsEnGrammes(rawVarWeight) || fallbackPoidsGr;
      const stockVar = v.stock ?? v.quantiteStock ?? v.inventory ?? v.warehouseInventoryNum ?? v.qte ?? fallbackStock;
      const explicitColor = v.couleur || v.color || v.variantColor || "";
      const explicitSize = v.taille || v.size || v.variantSize || "";
      const rawLabel = v.nom || v.name || v.variantNameEn || v.variantName || v.variantKey || v.variantProperty || "";

      let nomAffiche = rawLabel;
      if (!nomAffiche && (explicitColor || explicitSize)) {
        nomAffiche = [explicitColor, explicitSize].filter(Boolean).join(" - ");
      }
      if (!nomAffiche) {
        nomAffiche = `Modèle ${idx + 1}`;
      }

      const colInfo = detecterCouleurExacte(`${nomAffiche} ${v.variantKey || ""}`, explicitColor);
      list.push({
        id: v.vid || v.id || `var_${idx}`,
        nom: nomAffiche,
        couleurExacte: colInfo.couleurExacte,
        couleurHex: colInfo.couleurHex,
        sku: v.sku || v.variantSku || p.sku || p.productSku || "",
        image: img,
        prix: prixVar > 0 ? prixVar : fallbackPrix,
        poidsGr: poidsVar,
        stock: stockVar
      });
    }
  });

  if (list.length === 0 && mainImg) {
    const col = detecterCouleurExacte(p.nom || p.title || "", p.couleur || p.color || "");
    list.push({
      id: "var_default",
      nom: p.variantName || "Modèle Standard",
      couleurExacte: col.couleurExacte,
      couleurHex: col.couleurHex,
      sku: p.sku || p.productSku || "",
      image: mainImg,
      prix: fallbackPrix,
      poidsGr: fallbackPoidsGr,
      stock: fallbackStock
    });
  }

  return list;
}

// Paliers de remise : 10 articles -> 3%, 50 articles et plus -> 5%
function obtenirRemiseVolume(totalArticles) {
  if (totalArticles >= 50) return { pourcent: 5, palier: 50 };
  if (totalArticles >= 10) return { pourcent: 3, palier: 10 };
  return { pourcent: 0, palier: 0 };
}

function calculerLogistiquePanier(itemsList) {
  const sousTotalBrut = itemsList.reduce((acc, it) => acc + (Number(it.prixUnitaire || 0) * Number(it.quantite || 1)), 0);
  const totalArticles = itemsList.reduce((acc, it) => acc + Number(it.quantite || 1), 0);
  const poidsTotalGr = itemsList.reduce((acc, it) => {
    const pUnit = Number(it.poidsGr || 0) > 0 ? Number(it.poidsGr) : estimerPoidsSecuriteGrammes(it);
    return acc + (pUnit * Number(it.quantite || 1));
  }, 0);

  let poidsFacturableKg = poidsTotalGr / 1000;
  let transportFixe = 0;
  let douaneFixe = 0;

  itemsList.forEach(it => {
    const qte = Number(it.quantite || 1);
    const pub = it.publication || {};
    const l = Number(pub.longueur || pub.length || pub.packLength || 0) || 0;
    const w = Number(pub.largeur || pub.width || pub.packWidth || 0) || 0;
    const h = Number(pub.hauteur || pub.height || pub.packHeight || 0) || 0;

    if (l > 0 && w > 0 && h > 0) {
      const volKg = ((l * w * h) / 5000) * qte;
      const realKg = ((Number(it.poidsGr || 0) || estimerPoidsSecuriteGrammes(pub)) * qte) / 1000;
      if (volKg > realKg) {
        poidsFacturableKg += (volKg - realKg);
      }
    }

    const fTrans = Number(pub.fraisTransport ?? pub.shippingPrice ?? 0) || 0;
    const fDouane = Number(pub.fraisDouane ?? pub.customsFee ?? 0) || 0;
    if (fTrans > 0) transportFixe += fTrans * qte;
    if (fDouane > 0) douaneFixe += fDouane * qte;
  });

  const remiseInfo = totalArticles > 0 ? obtenirRemiseVolume(totalArticles) : { pourcent: 0, palier: 0 };
  const remiseMontant = Math.round(sousTotalBrut * (remiseInfo.pourcent / 100));
  const sousTotal = Math.max(0, sousTotalBrut - remiseMontant);

  const transport = totalArticles <= 0
    ? 0
    : (transportFixe > 0
      ? transportFixe
      : Math.max(LOGISTICS_CONFIG.minShippingFee, Math.round(poidsFacturableKg * LOGISTICS_CONFIG.ratePerKgAir)));

  const douane = totalArticles <= 0
    ? 0
    : (douaneFixe > 0
      ? douaneFixe
      : Math.round((sousTotal * (LOGISTICS_CONFIG.customsDutyPercent / 100)) + (poidsFacturableKg * LOGISTICS_CONFIG.customsHandlingPerKg)));

  const total = sousTotal + transport + douane;

  return {
    sousTotalBrut,
    remisePourcent: remiseInfo.pourcent,
    remisePalier: remiseInfo.palier,
    remiseMontant,
    sousTotal,
    transport,
    douane,
    total,
    poidsGr: Math.round(poidsTotalGr),
    poidsKg: poidsTotalGr / 1000,
    poidsFacturableKg
  };
}


/* ============================================================
   CHARGEMENT FEDAPAY
   ============================================================ */

function loadFedaPayScript() {
  return new Promise(
    (resolve, reject) => {
      if (window.FedaPay) {
        resolve(window.FedaPay);
        return;
      }

      const existing = document.querySelector(
        'script[data-dakpro-fedapay="true"]'
      );

      if (existing) {
        let elapsed = 0;

        const timer = setInterval(() => {
          if (window.FedaPay) {
            clearInterval(timer);
            resolve(window.FedaPay);
            return;
          }

          elapsed += 100;

          if (elapsed >= 15000) {
            clearInterval(timer);
            reject(
              new Error(
                "FedaPay Checkout n'a pas pu être chargé."
              )
            );
          }
        }, 100);

        return;
      }

      const script = document.createElement("script");
      script.src = FEDAPAY_SCRIPT_URL;
      script.async = true;
      script.dataset.dakproFedapay = "true";

      script.onload = () => {
        if (window.FedaPay) {
          resolve(window.FedaPay);
        } else {
          reject(
            new Error(
              "FedaPay est chargé mais indisponible."
            )
          );
        }
      };

      script.onerror = () => {
        reject(
          new Error(
            "Impossible de charger FedaPay Checkout."
          )
        );
      };

      document.head.appendChild(script);
    }
  );
}


/* ============================================================
   INTERFACE
   ============================================================ */

export function init(
  container,
  db,
  auth,
  userId
) {
  if (!container || !db) {
    console.error(
      "DAKPRO : paiement impossible à initialiser."
    );
    return;
  }

  const currentUid =
    userId ||
    (
      auth && auth.currentUser
        ? auth.currentUser.uid
        : null
    );

  if (!currentUid) {
    container.innerHTML = `
      <div style="
        padding:40px 16px;
        text-align:center;
        background:#0a0d14;
        border-radius:14px;
        color:#fff;
        font-family:Poppins,Arial,sans-serif;
      ">
        <div style="font-size:44px;margin-bottom:12px;">🔐</div>
        <h2 style="color:#d4af37;">Connexion nécessaire</h2>
        <p style="color:#aaa;">Connectez-vous pour effectuer votre paiement.</p>
      </div>
    `;
    return;
  }


  /* ==========================================================
     INTERFACE COMPLETE (RESPONSIVE MOBILE SANS ZOOM FORCÉ)
     ========================================================== */

  container.innerHTML = `
    <style>
      .dak-payment {
        width:100%;
        max-width:100%;
        box-sizing:border-box;
        color:#fff;
        font-family:Poppins,Arial,sans-serif;
        overflow-x:hidden;
      }

      .dak-payment-title {
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px;
        flex-wrap:wrap;
        padding-bottom:12px;
        margin-bottom:16px;
        border-bottom:1px solid #292d37;
        color:#d4af37;
        font-size:18px;
        font-weight:800;
      }

      .dak-payment-grid {
        display:grid;
        grid-template-columns:1fr;
        gap:16px;
      }

      @media(min-width:960px) {
        .dak-payment-grid {
          grid-template-columns:minmax(280px,0.9fr) minmax(320px,1.1fr);
          gap:20px;
        }
      }

      .dak-box {
        background:#0a0d14;
        border:1px solid #252932;
        border-radius:14px;
        padding:16px;
        box-sizing:border-box;
        max-width:100%;
      }

      .dak-box-title {
        color:#d4af37;
        font-weight:800;
        font-size:15px;
        padding-bottom:10px;
        margin-bottom:14px;
        border-bottom:1px solid #242832;
      }

      .dak-label {
        display:block;
        color:#aaa;
        font-size:12px;
        margin-bottom:6px;
      }

      .dak-input {
        width:100%;
        box-sizing:border-box;
        padding:11px;
        border-radius:8px;
        border:1px solid #333;
        background:#12161f;
        color:#fff;
        outline:none;
        font-size:14px;
      }

      .dak-input:focus {
        border-color:#d4af37;
      }

      .dak-field {
        margin-bottom:12px;
      }

      .dak-methods-box {
        background:#12161f;
        border:1px solid #292d37;
        border-radius:12px;
        padding:12px;
        margin-bottom:14px;
      }

      .dak-methods-label {
        color:#d4af37;
        font-size:11px;
        font-weight:700;
        margin-bottom:10px;
        text-align:center;
      }

      .dak-methods-grid {
        display:grid;
        grid-template-columns:repeat(3, minmax(0, 1fr));
        gap:8px;
      }

      @media(min-width:520px) {
        .dak-methods-grid {
          grid-template-columns:repeat(5, minmax(0, 1fr));
        }
      }

      .dak-method-card {
        background:#ffffff;
        border-radius:8px;
        padding:6px 4px;
        min-height:36px;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        border:1px solid #e2e8f0;
      }

      .dak-method-card span {
        font-size:8px;
        font-weight:900;
        line-height:1.1;
        white-space:nowrap;
      }

      .dak-secure {
        margin-top:10px;
        padding:9px;
        background:rgba(34,197,94,.08);
        border:1px solid rgba(34,197,94,.25);
        border-radius:8px;
        color:#70e090;
        font-size:11px;
      }

      .dak-preview-group {
        margin-bottom:14px;
      }

      .dak-preview-heading {
        font-size:11px;
        font-weight:800;
        text-transform:uppercase;
        letter-spacing:.4px;
        color:#d4af37;
        margin-bottom:8px;
      }

      .dak-preview-heading.secondary {
        color:#93c5fd;
      }

      .dak-cart {
        max-height:460px;
        overflow-y:auto;
        margin-bottom:14px;
      }

      .dak-cart-item {
        background:#12161f;
        border:1px solid #242936;
        border-radius:10px;
        padding:11px;
        margin-bottom:10px;
        font-size:13px;
      }

      .dak-cart-item.primary-item {
        border-color:rgba(212,175,55,.55);
        background:rgba(212,175,55,.06);
      }

      .dak-item-top {
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:10px;
      }

      .dak-item-meta {
        display:flex;
        flex-wrap:wrap;
        gap:6px;
        margin-top:6px;
        font-size:11px;
        color:#cbd5e1;
      }

      .dak-pill {
        background:#0a0d14;
        border:1px solid #2c3242;
        border-radius:6px;
        padding:2px 7px;
        font-size:10px;
      }

      .dak-variants-bar {
        display:flex;
        gap:6px;
        overflow-x:auto;
        margin-top:9px;
        padding-top:8px;
        border-top:1px dashed #292f3e;
        -webkit-overflow-scrolling:touch;
      }

      .dak-var-pill {
        flex:0 0 auto;
        background:#0a0d14;
        border:1px solid #334155;
        color:#e2e8f0;
        border-radius:7px;
        padding:5px 8px;
        font-size:10px;
        font-weight:700;
        cursor:pointer;
        display:inline-flex;
        align-items:center;
        gap:5px;
      }

      .dak-var-pill:hover {
        border-color:#d4af37;
        color:#d4af37;
      }

      .dak-var-pill.active {
        border-color:#22c55e;
        color:#86efac;
        background:rgba(34,197,94,.08);
      }

      .dak-summary {
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:8px;
        color:#ccc;
        font-size:12px;
        margin-bottom:8px;
      }

      .dak-total {
        display:flex;
        justify-content:space-between;
        align-items:center;
        padding-top:12px;
        margin-top:10px;
        border-top:1px dashed #333;
        color:#d4af37;
        font-size:18px;
        font-weight:900;
      }

      .dak-pay-button {
        width:100%;
        margin-top:16px;
        padding:14px;
        border:0;
        border-radius:9px;
        background:#d4af37;
        color:#000;
        font-size:15px;
        font-weight:900;
        cursor:pointer;
      }

      .dak-pay-button:hover {
        background:#f3e5ab;
      }

      .dak-pay-button:disabled {
        opacity:.55;
        cursor:not-allowed;
      }

      .dak-clear {
        border:1px solid #ef4444;
        background:transparent;
        color:#ef4444;
        padding:7px 11px;
        border-radius:7px;
        font-size:12px;
        cursor:pointer;
      }

      .dak-status {
        display:none;
        margin-top:14px;
        padding:12px;
        border-radius:8px;
        font-size:12px;
        line-height:1.5;
      }

      .dak-help {
        background:#12161f;
        border:1px solid #292d37;
        border-radius:10px;
        padding:12px;
        color:#aaa;
        font-size:12px;
        line-height:1.6;
      }
    </style>

    <div class="dak-payment">

      <div class="dak-payment-title">
        <span>💳 DAKPRO ÉLITE — Paiement sécurisé</span>
        <button id="btnClearCart" class="dak-clear">🗑️ Vider le panier</button>
      </div>

      <div class="dak-payment-grid">

        <!-- CLIENT & MOYENS DE PAIEMENT -->
        <div class="dak-box">

          <div class="dak-box-title">👤 Informations du client</div>

          <div class="dak-methods-box">
            <div class="dak-methods-label">
              Moyens de paiement acceptés (Mobile Money &amp; Cartes Bancaires)
            </div>
            <div class="dak-methods-grid">
              <div class="dak-method-card" title="Visa">
                <span style="color:#1A1F71;font-style:italic;font-size:11px;">VISA</span>
              </div>
              <div class="dak-method-card" title="Mastercard">
                <svg width="22" height="14" viewBox="0 0 32 20" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="11" cy="10" r="8" fill="#EB001B"/>
                  <circle cx="21" cy="10" r="8" fill="#F79E1B" fill-opacity="0.85"/>
                </svg>
                <span style="color:#111827;">Mastercard</span>
              </div>
              <div class="dak-method-card" style="background:#FFCC00;" title="MTN Mobile Money">
                <span style="color:#004F71;">MTN MoMo</span>
              </div>
              <div class="dak-method-card" style="background:#0066B3;" title="Moov Money">
                <span style="color:#ffffff;">Moov Money</span>
              </div>
              <div class="dak-method-card" style="background:#00A859;" title="Celtiis Cash">
                <span style="color:#ffffff;">Celtiis Cash</span>
              </div>
              <div class="dak-method-card" style="background:#FF7900;" title="Orange Money">
                <span style="color:#ffffff;">Orange</span>
              </div>
              <div class="dak-method-card" style="background:#1DC4FF;" title="Wave">
                <span style="color:#002B5B;">Wave</span>
              </div>
              <div class="dak-method-card" style="background:#FFF200;" title="Mixx by Yas">
                <span style="color:#111827;">Mixx by Yas</span>
              </div>
              <div class="dak-method-card" style="background:#8B0000;" title="Coris Money">
                <span style="color:#FFD700;">Coris Money</span>
              </div>
              <div class="dak-method-card" style="background:#0f172a;border-color:#d4af37;" title="Cartes &amp; Mobile Money">
                <span style="color:#d4af37;">Mobile / Carte</span>
              </div>
            </div>

            <div class="dak-secure">
              🔒 Paiement chiffré et confirmé côté serveur après validation
            </div>
          </div>

          <div class="dak-field">
            <label class="dak-label">Nom complet</label>
            <input id="payCustomerName" class="dak-input" type="text" placeholder="Jean Dupont">
          </div>

          <div class="dak-field">
            <label class="dak-label">Adresse e-mail</label>
            <input id="payCustomerEmail" class="dak-input" type="email" placeholder="client@email.com">
          </div>

          <div class="dak-field">
            <label class="dak-label">Téléphone</label>
            <input id="payCustomerPhone" class="dak-input" type="tel" placeholder="+229 90 00 00 00">
          </div>

          <div class="dak-help">
            <strong style="color:#d4af37;">Comment ça fonctionne ?</strong><br><br>
            1️⃣ Vérifiez vos informations.<br>
            2️⃣ Vérifiez l'aperçu des produits, variantes, poids, transport et douane.<br>
            3️⃣ Cliquez sur « Payer maintenant ».<br>
            4️⃣ Choisissez votre moyen de paiement et validez.<br>
            5️⃣ La commande est mise à jour après confirmation serveur.
          </div>

        </div>

        <!-- LIVRAISON & APERÇU COMPLET -->
        <div class="dak-box">

          <div class="dak-box-title">📍 Livraison</div>

          <div class="dak-field">
            <label class="dak-label">Nom du destinataire</label>
            <input id="shippingName" class="dak-input" type="text">
          </div>

          <div class="dak-field">
            <label class="dak-label">Téléphone</label>
            <input id="shippingPhone" class="dak-input" type="tel">
          </div>

          <div class="dak-field">
            <label class="dak-label">Adresse exacte</label>
            <input id="shippingAddress" class="dak-input" type="text" placeholder="Quartier, rue, maison...">
          </div>

          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <div class="dak-field" style="flex:1;min-width:120px;">
              <label class="dak-label">Ville</label>
              <input id="shippingCity" class="dak-input" type="text" placeholder="Cotonou">
            </div>

            <div class="dak-field" style="flex:1;min-width:120px;">
              <label class="dak-label">Pays</label>
              <input id="shippingCountry" class="dak-input" type="text" value="Bénin">
            </div>
          </div>

          <div class="dak-box-title" style="margin-top:16px;">
            🛒 Aperçu des produits &amp; variantes
          </div>

          <div id="cartItemsContainer" class="dak-cart">
            Chargement du panier...
          </div>

          <div class="dak-summary">
            <span>Nombre d'articles</span>
            <strong id="checkoutItemsCount">0</strong>
          </div>

          <div class="dak-summary">
            <span>Poids total</span>
            <strong id="checkoutWeightSummary">0 g (0.00 kg)</strong>
          </div>

          <div class="dak-summary">
            <span>Sous-total articles</span>
            <strong id="checkoutSubtotalAmount">0 FCFA</strong>
          </div>

          <div class="dak-summary">
            <span id="checkoutDiscountLabel">Réduction : 3% dès 10 pièces • 5% dès 50 pièces</span>
            <strong id="checkoutDiscountAmount" style="color:#70e090;">-0 FCFA</strong>
          </div>

          <div class="dak-summary">
            <span>Frais de transport (<span id="checkoutShippingKg">0.00 kg</span>)</span>
            <strong id="checkoutShippingAmount" style="color:#7dd3fc;">0 FCFA</strong>
          </div>

          <div class="dak-summary">
            <span>Douane / Dédouanement</span>
            <strong id="checkoutCustomsAmount" style="color:#fcd34d;">0 FCFA</strong>
          </div>

          <div class="dak-total">
            <span>Total</span>
            <span id="checkoutTotalAmount">0 FCFA</span>
          </div>

          <button id="btnExecutePayment" class="dak-pay-button">
            ⚡ Payer maintenant
          </button>

          <div id="payStatusMessage" class="dak-status"></div>

        </div>

      </div>

    </div>
  `;


  /* ==========================================================
     VARIABLES
     ========================================================== */

  let currentCartTotalFCFA = 0;
  let currentLogisticsDetails = calculerLogistiquePanier([]);
  let currentCartItems = {};
  let currentCartList = [];
  let currentCartCount = 0;
  let paymentInProgress = false;


  /* ==========================================================
     DOM
     ========================================================== */

  const customerName = document.getElementById("payCustomerName");
  const customerEmail = document.getElementById("payCustomerEmail");
  const customerPhone = document.getElementById("payCustomerPhone");

  const shippingName = document.getElementById("shippingName");
  const shippingPhone = document.getElementById("shippingPhone");
  const shippingAddress = document.getElementById("shippingAddress");
  const shippingCity = document.getElementById("shippingCity");
  const shippingCountry = document.getElementById("shippingCountry");

  const cartItemsContainer = document.getElementById("cartItemsContainer");
  const checkoutItemsCount = document.getElementById("checkoutItemsCount");
  const checkoutWeightSummary = document.getElementById("checkoutWeightSummary");
  const checkoutSubtotalAmount = document.getElementById("checkoutSubtotalAmount");
  const checkoutDiscountLabel = document.getElementById("checkoutDiscountLabel");
  const checkoutDiscountAmount = document.getElementById("checkoutDiscountAmount");
  const checkoutShippingKg = document.getElementById("checkoutShippingKg");
  const checkoutShippingAmount = document.getElementById("checkoutShippingAmount");
  const checkoutCustomsAmount = document.getElementById("checkoutCustomsAmount");
  const checkoutTotalAmount = document.getElementById("checkoutTotalAmount");

  const executePaymentBtn = document.getElementById("btnExecutePayment");
  const payStatusMessage = document.getElementById("payStatusMessage");


  /* ==========================================================
     MESSAGE
     ========================================================== */

  function showStatus(message, type = "info") {
    if (!payStatusMessage) return;
    payStatusMessage.style.display = "block";

    if (type === "success") {
      payStatusMessage.style.background = "rgba(34,197,94,.08)";
      payStatusMessage.style.border = "1px solid rgba(34,197,94,.3)";
      payStatusMessage.style.color = "#70e090";
    } else if (type === "error") {
      payStatusMessage.style.background = "rgba(239,68,68,.08)";
      payStatusMessage.style.border = "1px solid rgba(239,68,68,.3)";
      payStatusMessage.style.color = "#ff8585";
    } else {
      payStatusMessage.style.background = "rgba(212,175,55,.08)";
      payStatusMessage.style.border = "1px solid rgba(212,175,55,.25)";
      payStatusMessage.style.color = "#d4af37";
    }

    payStatusMessage.textContent = message;
  }


  /* ==========================================================
     1 — PROFIL UTILISATEUR
     ========================================================== */

  get(ref(db, `users/${currentUid}`))
    .then(snapshot => {
      if (!snapshot.exists()) return;
      const user = snapshot.val() || {};

      const fullName = user.nom || user.displayName || user.name || "";
      const email = user.email || (auth && auth.currentUser ? auth.currentUser.email : "") || "";
      const phone = user.telephone || user.phone || "";

      if (customerName && !customerName.value) customerName.value = fullName;
      if (customerEmail && !customerEmail.value) customerEmail.value = email;
      if (customerPhone && !customerPhone.value) customerPhone.value = phone;

      if (shippingName && !shippingName.value) shippingName.value = fullName;
      if (shippingPhone && !shippingPhone.value) shippingPhone.value = phone;
      if (shippingAddress && user.adresse) shippingAddress.value = user.adresse;
      if (shippingCity && user.ville) shippingCity.value = user.ville;
      if (shippingCountry && user.pays) shippingCountry.value = user.pays;
    })
    .catch(error => console.warn("Profil non chargé :", error));


  /* ==========================================================
     AJOUT / SÉLECTION DE VARIANTE SUR UN PRODUIT DU PANIER
     ========================================================== */

  window.dakproAjouterVariantePanier = async function(cartKey, variantIndex) {
    const entry = currentCartItems[cartKey];
    if (!entry || !Array.isArray(entry.variantesDisponibles)) return;
    const variant = entry.variantesDisponibles[variantIndex];
    if (!variant) return;

    const stockInfo = formaterStock(variant.stock);
    if (stockInfo.estEpuise) {
      showStatus("Cette variante est en rupture de stock.", "error");
      return;
    }

    const prixVar = Number(variant.prix) > 0 ? Number(variant.prix) : Number(entry.prixUnitaire || 0);
    const poidsVar = Number(variant.poidsGr) > 0 ? Number(variant.poidsGr) : (Number(entry.poidsGr) || 250);
    const varKey = `${cartKey}_var_${String(variant.id || variantIndex).replace(/[^a-zA-Z0-9_-]/g, "")}`;

    try {
      const existingSnap = await get(ref(db, `users/${currentUid}/panier/${varKey}`));
      const existingVal = existingSnap.exists() ? (existingSnap.val() || {}) : null;
      const nextQty = existingVal ? (parseInt(existingVal.quantite || 1, 10) + 1) : 1;

      if (stockInfo.maxQte !== null && nextQty > stockInfo.maxQte) {
        showStatus(`Stock maximum atteint (${stockInfo.maxQte}).`, "error");
        return;
      }

      const payload = {
        id: entry.id,
        produitId: entry.id,
        nom: entry.nom,
        variante: variant.nom,
        couleurChoisie: variant.couleurExacte,
        sku: variant.sku || entry.sku || "",
        image: variant.image || entry.image || "",
        prixUnitaire: prixVar,
        poidsGr: poidsVar,
        quantite: nextQty,
        total: prixVar * nextQty,
        updatedAt: Date.now()
      };

      const updates = {};
      updates[`users/${currentUid}/panier/${varKey}`] = payload;
      updates[`users/${currentUid}/gs/cart/${varKey}`] = payload;
      await update(ref(db), updates);

      showStatus(`Variante ajoutée : ${variant.nom} (${variant.couleurExacte})`, "success");
    } catch (err) {
      console.error("Erreur ajout variante panier :", err);
      showStatus("Impossible d'ajouter cette variante.", "error");
    }
  };


  /* ==========================================================
     2 — PANIER (users/{uid}/panier + gs/cart + réception directe)
     ========================================================== */

  const primaryCartRef = ref(db, `users/${currentUid}/panier`);
  const fallbackCartRef = ref(db, `users/${currentUid}/gs/cart`);

  let latestPrimaryCart = null;
  let latestFallbackCart = null;

  async function renderCartSnapshot(rawCart) {
    currentCartTotalFCFA = 0;
    currentCartItems = {};
    currentCartList = [];
    currentCartCount = 0;

    if (!cartItemsContainer) return;
    cartItemsContainer.innerHTML = "";

    if (!rawCart || typeof rawCart !== "object" || Object.keys(rawCart).length === 0) {
      currentLogisticsDetails = calculerLogistiquePanier([]);
      cartItemsContainer.innerHTML = `
        <div style="padding:18px;text-align:center;color:#888;">
          🛒 Votre panier est vide.
        </div>
      `;
      updateCartSummary();
      return;
    }

    const keys = Object.keys(rawCart);

    for (const key of keys) {
      const item = rawCart[key] || {};
      const prodId = item.id || item.produitId || key;

      let qty = parseInt(item.quantite || item.qty || 1, 10);
      if (!Number.isFinite(qty) || qty < 1) qty = 1;

      let realPrice = Number(item.prixUnitaire || item.prix || item.prixNormal || 0);
      let publication = null;

      try {
        let pubSnap = await get(ref(db, `publications/${prodId}`));
        if (!pubSnap.exists()) {
          pubSnap = await get(ref(db, `vendeur_publications/${prodId}`));
        }

        if (pubSnap.exists()) {
          publication = pubSnap.val() || {};
          const normal = Number(publication.prixNormal || publication.prix || 0);
          const promo = Number(publication.prixPromo || 0);

          if (promo > 0 && normal > 0 && promo < normal) {
            realPrice = promo;
          } else if (normal > 0) {
            realPrice = normal;
          } else if (promo > 0) {
            realPrice = promo;
          }
        }
      } catch (error) {
        console.warn("Prix publication non disponible :", error);
      }

      if (!Number.isFinite(realPrice) || realPrice < 0) realPrice = 0;

      const rawWeight = item.poidsGr ?? item.poids ?? item.weight
        ?? publication?.poids ?? publication?.weight ?? publication?.productWeight ?? publication?.packingWeight ?? 0;
      const poidsGr = parserPoidsEnGrammes(rawWeight) || estimerPoidsSecuriteGrammes(publication || item);

      const stockVal = item.stock ?? publication?.stock ?? publication?.quantiteStock ?? publication?.inventory ?? null;
      const stockInfo = formaterStock(stockVal);

      const variantsList = publication
        ? extraireVariantesProduit(publication, realPrice, poidsGr)
        : [];

      const couleurInfo = detecterCouleurExacte(
        `${item.variante || item.nom || ""} ${publication?.nom || ""}`,
        item.couleurChoisie || item.couleur || item.color || ""
      );

      const subtotal = realPrice * qty;
      currentCartCount += qty;

      const normalizedItem = {
        id: prodId,
        nom: item.nom || item.title || publication?.nom || publication?.title || "Produit DAKPRO ÉLITE",
        variante: item.variante || item.variantName || (variantsList[0]?.nom || "Standard"),
        couleurChoisie: couleurInfo.couleurExacte,
        couleurHex: couleurInfo.couleurHex,
        sku: item.sku || publication?.sku || "",
        image: item.image || item.imageUrl || publication?.image || publication?.imageUrl || "",
        prixUnitaire: realPrice,
        poidsGr: poidsGr,
        stockTexte: stockInfo.texte,
        stockEpuise: stockInfo.estEpuise,
        variantesDisponibles: variantsList,
        publication: publication || {},
        quantite: qty,
        total: subtotal
      };

      currentCartItems[key] = normalizedItem;
      currentCartList.push({ cartKey: key, ...normalizedItem });
    }

    currentLogisticsDetails = calculerLogistiquePanier(currentCartList);
    currentCartTotalFCFA = currentLogisticsDetails.total;

    const primaryItem = currentCartList[0] || null;
    const secondaryItems = currentCartList.slice(1);

    function buildItemCardHTML(it, isPrimary) {
      const varButtonsHTML = Array.isArray(it.variantesDisponibles) && it.variantesDisponibles.length > 0
        ? `
          <div class="dak-variants-bar">
            ${it.variantesDisponibles.map((v, vIdx) => {
              const isCurrentVar = String(it.variante || "").toLowerCase() === String(v.nom || "").toLowerCase();
              return `
                <button
                  type="button"
                  class="dak-var-pill ${isCurrentVar ? "active" : ""}"
                  onclick="window.dakproAjouterVariantePanier('${escapeAttr(it.cartKey)}', ${vIdx})"
                  title="Ajouter la variante ${escapeAttr(v.nom)}"
                >
                  <span style="width:8px;height:8px;border-radius:50%;background:${escapeAttr(v.couleurHex)};display:inline-block;"></span>
                  <span>+ ${escapeHTML(v.nom)}</span>
                </button>
              `;
            }).join("")}
          </div>
        `
        : "";

      return `
        <div class="dak-cart-item ${isPrimary ? "primary-item" : ""}">
          <div class="dak-item-top">
            <div style="flex:1;min-width:0;">
              <strong>${escapeHTML(it.nom)}</strong>
              <div class="dak-item-meta">
                <span class="dak-pill">
                  <span style="width:7px;height:7px;border-radius:50%;background:${escapeAttr(it.couleurHex)};display:inline-block;margin-right:4px;"></span>
                  ${escapeHTML(it.variante)} (${escapeHTML(it.couleurChoisie)})
                </span>
                <span class="dak-pill" style="color:${it.stockEpuise ? "#f87171" : "#4ade80"};">
                  ${escapeHTML(it.stockTexte)}
                </span>
                <span class="dak-pill">
                  ${it.poidsGr * it.quantite} g
                </span>
              </div>
              <div style="color:#d4af37;font-size:11px;margin-top:6px;">
                ${formatCFA(it.prixUnitaire)} × ${it.quantite}
              </div>
            </div>

            <strong style="color:#70e090;white-space:nowrap;">
              ${formatCFA(it.total)}
            </strong>
          </div>
          ${varButtonsHTML}
        </div>
      `;
    }

    let html = "";
    if (primaryItem) {
      html += `
        <div class="dak-preview-group">
          <div class="dak-preview-heading">⭐ Produit principal / Normal</div>
          ${buildItemCardHTML(primaryItem, true)}
        </div>
      `;
    }
    if (secondaryItems.length > 0) {
      html += `
        <div class="dak-preview-group">
          <div class="dak-preview-heading secondary">➕ Autres produits choisis (${secondaryItems.length})</div>
          ${secondaryItems.map(it => buildItemCardHTML(it, false)).join("")}
        </div>
      `;
    }

    cartItemsContainer.innerHTML = html;
    updateCartSummary();
  }

  // Réception directe lorsqu'un autre module (ex: index / panier) envoie des articles
  window.dakproRecevoirPanier = function(cartData) {
    if (!cartData) return;
    if (Array.isArray(cartData)) {
      const mapObj = {};
      cartData.forEach((it, i) => {
        if (it && typeof it === "object") {
          mapObj[it.id || it.produitId || `item_${i}`] = it;
        }
      });
      latestPrimaryCart = mapObj;
    } else if (typeof cartData === "object") {
      latestPrimaryCart = cartData;
    }
    renderCartSnapshot(latestPrimaryCart);
  };

  window.addEventListener("dakpro:cart-updated", event => {
    if (event && event.detail) {
      window.dakproRecevoirPanier(event.detail);
    }
  });

  onValue(
    primaryCartRef,
    snapshot => {
      latestPrimaryCart = snapshot.exists() ? (snapshot.val() || {}) : null;
      const activeCart = latestPrimaryCart || latestFallbackCart;
      renderCartSnapshot(activeCart);
    },
    error => {
      console.error("Erreur panier :", error);
      showStatus("Impossible de charger votre panier.", "error");
    }
  );

  onValue(
    fallbackCartRef,
    snapshot => {
      latestFallbackCart = snapshot.exists() ? (snapshot.val() || {}) : null;
      if (!latestPrimaryCart) {
        renderCartSnapshot(latestFallbackCart);
      }
    }
  );


  /* ==========================================================
     TOTAL & LOGISTIQUE (RÉDUCTION EN DIRECT DÈS 10 ET 50 PIÈCES)
     ========================================================== */

  function updateCartSummary() {
    const d = currentLogisticsDetails || calculerLogistiquePanier([]);

    if (checkoutItemsCount) {
      checkoutItemsCount.textContent = currentCartCount;
    }

    if (checkoutWeightSummary) {
      checkoutWeightSummary.textContent = `${d.poidsGr} g (${d.poidsKg.toFixed(2)} kg)`;
    }

    if (checkoutSubtotalAmount) {
      checkoutSubtotalAmount.textContent = formatCFA(d.sousTotalBrut);
    }

    if (checkoutDiscountLabel) {
      checkoutDiscountLabel.textContent = d.remisePourcent > 0
        ? `🎉 Réduction active : -${d.remisePourcent}% (${currentCartCount} pièces)`
        : "Réduction : 3% dès 10 pièces • 5% dès 50 pièces";
    }

    if (checkoutDiscountAmount) {
      checkoutDiscountAmount.textContent = `-${formatCFA(d.remiseMontant)}`;
    }

    if (checkoutShippingKg) {
      checkoutShippingKg.textContent = `${d.poidsFacturableKg.toFixed(2)} kg`;
    }

    if (checkoutShippingAmount) {
      checkoutShippingAmount.textContent = formatCFA(d.transport);
    }

    if (checkoutCustomsAmount) {
      checkoutCustomsAmount.textContent = formatCFA(d.douane);
    }

    if (checkoutTotalAmount) {
      checkoutTotalAmount.textContent = formatCFA(currentCartTotalFCFA);
    }

    if (executePaymentBtn) {
      executePaymentBtn.textContent = currentCartTotalFCFA > 0
        ? `⚡ Payer maintenant (${formatCFA(currentCartTotalFCFA)})`
        : "⚡ Payer maintenant";
    }
  }


  /* ==========================================================
     3 — VIDER LE PANIER
     ========================================================== */

  document
    .getElementById("btnClearCart")
    ?.addEventListener("click", async () => {
      if (!confirm("Voulez-vous vraiment vider votre panier ?")) return;

      try {
        const updates = {};
        updates[`users/${currentUid}/panier`] = null;
        updates[`users/${currentUid}/gs/cart`] = null;
        updates[`users/${currentUid}/gs/total`] = 0;

        latestPrimaryCart = null;
        latestFallbackCart = null;

        await update(ref(db), updates);
        showStatus("✅ Panier vidé.", "success");
      } catch (error) {
        console.error(error);
        showStatus("❌ Impossible de vider le panier.", "error");
      }
    });


  /* ==========================================================
     4 — PAIEMENT
     ========================================================== */

  executePaymentBtn
    ?.addEventListener("click", async () => {
      if (paymentInProgress) return;

      if (currentCartTotalFCFA <= 0 || Object.keys(currentCartItems).length === 0) {
        showStatus("Votre panier est vide.", "error");
        return;
      }

      const shipName = shippingName?.value.trim() || "";
      const shipPhone = shippingPhone?.value.trim() || "";
      const shipAddress = shippingAddress?.value.trim() || "";
      const shipCity = shippingCity?.value.trim() || "";
      const shipCountry = shippingCountry?.value.trim() || "Bénin";

      if (!shipName || !shipPhone || !shipAddress) {
        showStatus(
          "Veuillez renseigner le nom, le téléphone et l'adresse de livraison.",
          "error"
        );
        return;
      }

      const clientName = customerName?.value.trim() || shipName;
      const clientEmail = customerEmail?.value.trim() || "";
      const clientPhone = customerPhone?.value.trim() || shipPhone;

      if (!clientEmail) {
        showStatus("Veuillez renseigner une adresse e-mail.", "error");
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
        showStatus("Adresse e-mail invalide.", "error");
        return;
      }

      paymentInProgress = true;
      executePaymentBtn.disabled = true;

      showStatus("Préparation de votre paiement sécurisé...", "info");

      try {
        const FedaPay = await loadFedaPayScript();
        const orderId = generateOrderId();
        const paymentReference = generatePaymentReference(orderId);
        const amount = Math.round(currentCartTotalFCFA);
        const name = splitName(clientName);
        const d = currentLogisticsDetails;

        const cleanArticles = {};
        Object.entries(currentCartItems).forEach(([k, v]) => {
          const { publication, variantesDisponibles, ...rest } = v;
          cleanArticles[k] = rest;
        });

        const orderPayload = {
          commandeId: orderId,
          acheteurId: currentUid,
          acheteurEmail: clientEmail,
          articles: cleanArticles,
          sousTotalArticles: d.sousTotal,
          remisePourcent: d.remisePourcent,
          remiseMontant: d.remiseMontant,
          fraisTransport: d.transport,
          fraisDouane: d.douane,
          poidsGr: d.poidsGr,
          poidsKg: d.poidsKg,
          montantTotal: amount,
          devise: "XOF",
          date: Date.now(),
          client: {
            nom: clientName,
            email: clientEmail,
            telephone: clientPhone
          },
          livraison: {
            destinataire: shipName,
            telephone: shipPhone,
            adresse: shipAddress,
            ville: shipCity,
            pays: shipCountry
          },
          moyenPaiement: {
            fournisseur: "FedaPay",
            type: "Checkout",
            environnement: "live",
            reference: paymentReference
          },
          paiement: {
            fournisseur: "FedaPay",
            statut: "pending",
            reference: paymentReference,
            transactionId: null,
            verification: "server",
            creeLe: Date.now()
          },
          statut: "En attente de paiement",
          statutPaiement: "pending",
          statutLivraison: "En attente du paiement",
          paiementConfirme: false
        };

        await set(
          ref(db, `commandes/${currentUid}/${orderId}`),
          orderPayload
        );

        const widget = FedaPay.init({
          public_key: FEDAPAY_PUBLIC_KEY,
          environment: FEDAPAY_ENVIRONMENT,
          locale: "fr",
          transaction: {
            amount: amount,
            description: `Commande DAKPRO ÉLITE ${paymentReference}`,
            custom_metadata: {
              commandeId: orderId,
              acheteurId: currentUid,
              reference: paymentReference
            }
          },
          currency: {
            iso: "XOF"
          },
          customer: {
            email: clientEmail,
            firstname: name.firstname,
            lastname: name.lastname,
            phone_number: {
              number: cleanPhone(clientPhone),
              country: "bj"
            }
          },
          onComplete: async response => {
            console.log("FedaPay Checkout terminé :", response);

            const transaction = response?.transaction || null;
            const transactionId = transaction?.id || null;

            try {
              await update(
                ref(db, `commandes/${currentUid}/${orderId}`),
                {
                  "paiement/checkoutTermine": true,
                  "paiement/checkoutTermineLe": Date.now(),
                  "paiement/transactionId": transactionId,
                  "paiement/reponseFrontend": response?.reason
                    ? String(response.reason)
                    : "checkout_termine"
                }
              );
            } catch (error) {
              console.warn(
                "Impossible d'enregistrer le retour Checkout :",
                error
              );
            }

            showStatus(
              "⏳ Paiement transmis. Vérification sécurisée de la transaction en cours...",
              "info"
            );

            paymentInProgress = false;
            executePaymentBtn.disabled = false;

            waitForServerConfirmation(currentUid, orderId);
          }
        });

        if (!widget || typeof widget.open !== "function") {
          throw new Error("FedaPay Checkout ne peut pas être ouvert.");
        }

        showStatus(
          `Ouverture du paiement — montant réel : ${formatCFA(amount)}`,
          "info"
        );

        widget.open();
      } catch (error) {
        console.error("Erreur paiement :", error);

        paymentInProgress = false;
        executePaymentBtn.disabled = false;

        showStatus(
          "❌ Impossible d'ouvrir le paiement. Vérifiez votre connexion ou la configuration.",
          "error"
        );
      }
    });


  /* ==========================================================
     ATTENTE CONFIRMATION SERVEUR
     ========================================================== */

  function waitForServerConfirmation(uid, orderId) {
    const orderRef = ref(db, `commandes/${uid}/${orderId}`);
    let finished = false;

    const unsubscribe = onValue(
      orderRef,
      snapshot => {
        if (finished || !snapshot.exists()) return;

        const order = snapshot.val() || {};
        const status = String(
          order.paiement?.statut ||
          order.statutPaiement ||
          ""
        ).toLowerCase();

        if (
          status === "paid" ||
          status === "approved" ||
          status === "payé" ||
          status === "payee"
        ) {
          finished = true;
          unsubscribe();

          showStatus(
            `✅ Paiement confirmé. Commande ${orderId} validée.`,
            "success"
          );

          setTimeout(() => {
            if (typeof window.chargerModule === "function") {
              window.chargerModule("commandes");
            }
          }, 1500);
        }
      }
    );

    setTimeout(() => {
      if (!finished) {
        unsubscribe();
        showStatus(
          "⏳ Le paiement est toujours en cours de vérification. Ne repayer pas immédiatement. Consultez votre commande dans quelques instants.",
          "info"
        );
      }
    }, 120000);
  }
}
