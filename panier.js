/* ============================================================
   DAKPRO ÉLITE
   panier.js
   ============================================================ */

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {
  ref,
  onValue,
  get,
  set,
  update,
  remove
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

import {
  auth,
  db
} from "./firebase-config.js";


let currentUser = null;
let currentCart = {};
let currentEnrichedItems = [];
let currentTotals = calculerTotauxPanier([]);


// ============================================================
// CONFIGURATION LOGISTIQUE & COULEURS
// ============================================================

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


// ============================================================
// ÉLÉMENTS
// ============================================================

const cartList =
  document.getElementById("cartList");

const cartSummary =
  document.getElementById("cartSummary");

const totalItemsCount =
  document.getElementById("totalItemsCount");

const grandTotal =
  document.getElementById("grandTotal");

const btnPayment =
  document.getElementById("btnGoToPayment");

const btnClear =
  document.getElementById("btnClearCart");


// ============================================================
// FORMAT PRIX & PROTECTION HTML
// ============================================================

function formatPrice(number, currency = "FCFA") {
  return new Intl.NumberFormat("fr-FR")
    .format(Math.round(Number(number) || 0))
    + " "
    + currency;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// ============================================================
// OUTILS PRODUIT / VARIANTES / LOGISTIQUE
// ============================================================

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

function calculerTotauxPanier(itemsList) {
  const sousTotalBrut = itemsList.reduce(
    (acc, it) => acc + (Number(it.prixUnitaire || 0) * Number(it.quantite || 1)),
    0
  );
  const totalArticles = itemsList.reduce(
    (acc, it) => acc + Number(it.quantite || 1),
    0
  );
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
    totalArticles,
    sousTotalBrut,
    remisePourcent: remiseInfo.pourcent,
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


// ============================================================
// AUTHENTIFICATION
// ============================================================

onAuthStateChanged(auth, user => {
  if (!user) {
    currentUser = null;
    if (cartSummary) cartSummary.style.display = "none";
    if (cartList) {
      cartList.innerHTML = `
        <div class="empty-state">
          <h3>Vous n'êtes pas connecté</h3>
          <p>Veuillez vous connecter pour voir votre panier.</p>
          <a href="profil-acheteur.html" class="btn-home">Se connecter</a>
        </div>
      `;
    }
    return;
  }

  currentUser = user;
  ecouterPanier(user.uid);
});


// ============================================================
// ÉCOUTE DU PANIER FIREBASE
// ============================================================

function ecouterPanier(uid) {
  const cartRef = ref(db, `users/${uid}/panier`);

  onValue(
    cartRef,
    snapshot => {
      const data = snapshot.val();
      currentCart = data || {};

      if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
        currentEnrichedItems = [];
        currentTotals = calculerTotauxPanier([]);
        afficherPanierVide();
        return;
      }

      afficherPanier(data);
    },
    error => {
      console.error("Erreur Firebase panier :", error);
      if (cartSummary) cartSummary.style.display = "none";
      if (cartList) {
        cartList.innerHTML = `
          <div class="error-state">
            <h3>Impossible de charger le panier</h3>
            <p>${escapeHtml(error.message || "Erreur Firebase")}</p>
          </div>
        `;
      }
    }
  );
}


// ============================================================
// PANIER VIDE
// ============================================================

function afficherPanierVide() {
  if (cartList) {
    cartList.innerHTML = `
      <div class="empty-state">
        <h3>Votre panier est vide 🛒</h3>
        <p>Découvrez nos offres sur la boutique !</p>
        <a href="index.html" class="btn-home">Explorer la boutique</a>
      </div>
    `;
  }
  if (cartSummary) {
    cartSummary.style.display = "none";
  }
}


// ============================================================
// AFFICHAGE AVEC VARIANTES & CALCUL COMPLET
// ============================================================

async function afficherPanier(data) {
  let html = "";
  let mainCurrency = "FCFA";
  const enriched = [];

  for (const [productId, item] of Object.entries(data)) {
    if (!item) continue;

    const prodId = item.id || item.produitId || productId;
    const qty = Math.max(1, parseInt(item.quantite ?? item.quantity ?? 1, 10));

    let publication = null;
    try {
      let pubSnap = await get(ref(db, `publications/${prodId}`));
      if (!pubSnap.exists()) {
        pubSnap = await get(ref(db, `vendeur_publications/${prodId}`));
      }
      if (pubSnap.exists()) {
        publication = pubSnap.val() || {};
      }
    } catch (e) {
      console.warn("Publication introuvable :", e);
    }

    let price = Number(item.prixUnitaire ?? item.price ?? item.prix ?? 0);
    if (publication) {
      const normal = Number(publication.prixNormal || publication.prix || 0);
      const promo = Number(publication.prixPromo || 0);
      if (promo > 0 && normal > 0 && promo < normal) {
        price = promo;
      } else if (normal > 0) {
        price = normal;
      }
    }
    if (!Number.isFinite(price) || price < 0) price = 0;

    const rawWeight = item.poidsGr ?? item.poids ?? item.weight
      ?? publication?.poids ?? publication?.weight ?? publication?.productWeight ?? publication?.packingWeight ?? 0;
    const poidsGr = parserPoidsEnGrammes(rawWeight) || estimerPoidsSecuriteGrammes(publication || item);

    const variantesList = publication
      ? extraireVariantesProduit(publication, price, poidsGr)
      : [];

    const couleurInfo = detecterCouleurExacte(
      `${item.variante || item.nom || ""} ${publication?.nom || ""}`,
      item.couleurChoisie || item.couleur || item.color || ""
    );

    const varianteActuelle = item.variante || item.variantName || (variantesList[0]?.nom || "Standard");
    const currency = item.devise || "FCFA";
    mainCurrency = currency;

    const img = item.image || item.imageUrl || publication?.image || publication?.imageUrl || "https://via.placeholder.com/70";
    const name = item.nom || item.name || item.title || publication?.nom || publication?.title || "Produit";

    enriched.push({
      cartKey: productId,
      id: prodId,
      nom: name,
      variante: varianteActuelle,
      couleurChoisie: couleurInfo.couleurExacte,
      couleurHex: couleurInfo.couleurHex,
      image: img,
      prixUnitaire: price,
      poidsGr,
      quantite: qty,
      total: price * qty,
      publication: publication || {},
      variantesList
    });

    const variantsHtml = variantesList.length > 0
      ? `
        <div class="cart-variants-row" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
          ${variantesList.map((v, idx) => {
            const active = String(varianteActuelle).toLowerCase() === String(v.nom).toLowerCase();
            return `
              <button
                type="button"
                class="btn-variant-select ${active ? "active" : ""}"
                data-cart-id="${escapeHtml(productId)}"
                data-var-index="${idx}"
                style="
                  padding:4px 8px;
                  border-radius:6px;
                  font-size:11px;
                  cursor:pointer;
                  border:1px solid ${active ? "#22c55e" : "#475569"};
                  background:${active ? "rgba(34,197,94,0.15)" : "transparent"};
                  color:inherit;
                  display:inline-flex;
                  align-items:center;
                  gap:5px;
                ">
                <span style="width:8px;height:8px;border-radius:50%;background:${escapeHtml(v.couleurHex)};display:inline-block;"></span>
                <span>${escapeHtml(v.nom)}</span>
              </button>
            `;
          }).join("")}
        </div>
      `
      : "";

    html += `
      <div class="cart-item" data-id="${escapeHtml(productId)}">
        <img
          src="${escapeHtml(img)}"
          alt="${escapeHtml(name)}"
          class="cart-item-img"
          onerror="this.src='https://via.placeholder.com/70';"
        >

        <div class="cart-item-info">
          <div class="cart-item-title">${escapeHtml(name)}</div>
          <div class="cart-item-variant" style="font-size:12px;opacity:.85;margin-top:2px;">
            Variante : <strong>${escapeHtml(varianteActuelle)}</strong> (${escapeHtml(couleurInfo.couleurExacte)})
          </div>
          <div class="cart-item-price">${formatPrice(price, currency)}</div>
          ${variantsHtml}

          <div class="qty-controls" style="margin-top:8px;">
            <button type="button" class="btn-qty btn-minus" data-id="${escapeHtml(productId)}">−</button>
            <span class="qty-val">${qty}</span>
            <button type="button" class="btn-qty btn-plus" data-id="${escapeHtml(productId)}">+</button>
          </div>
        </div>

        <button type="button" class="btn-remove" data-id="${escapeHtml(productId)}" title="Supprimer">🗑️</button>
      </div>
    `;
  }

  currentEnrichedItems = enriched;
  currentTotals = calculerTotauxPanier(enriched);

  if (cartList) {
    cartList.innerHTML = html;
  }

  if (totalItemsCount) {
    totalItemsCount.textContent = currentTotals.totalArticles;
  }

  if (grandTotal) {
    const remiseNote = currentTotals.remisePourcent > 0
      ? ` (Remise -${currentTotals.remisePourcent}% + Transport/Douane)`
      : " (Transport & Douane inclus)";
    grandTotal.textContent = `${formatPrice(currentTotals.total, mainCurrency)}${remiseNote}`;
  }

  if (cartSummary) {
    cartSummary.style.display = "block";
  }

  attacherEvenements();
}


// ============================================================
// BOUTONS VARIANTES / + / - / SUPPRIMER
// ============================================================

function attacherEvenements() {
  document.querySelectorAll(".btn-variant-select").forEach(btn => {
    btn.addEventListener("click", async () => {
      const cartId = btn.dataset.cartId;
      const varIdx = parseInt(btn.dataset.varIndex, 10);
      const item = currentCart[cartId];
      const enrichedItem = currentEnrichedItems.find(x => x.cartKey === cartId);
      const variant = enrichedItem?.variantesList?.[varIdx];
      if (!currentUser || !item || !variant) return;

      const newPrice = Number(variant.prix) > 0
        ? Number(variant.prix)
        : Number(item.prixUnitaire ?? item.price ?? item.prix ?? 0);
      const qty = Math.max(1, parseInt(item.quantite ?? item.quantity ?? 1, 10));

      try {
        await update(
          ref(db, `users/${currentUser.uid}/panier/${cartId}`),
          {
            variante: variant.nom,
            couleurChoisie: variant.couleurExacte,
            image: variant.image || item.image || "",
            sku: variant.sku || item.sku || "",
            prixUnitaire: newPrice,
            poidsGr: Number(variant.poidsGr) > 0 ? Number(variant.poidsGr) : (enrichedItem.poidsGr || 250),
            total: Number((qty * newPrice).toFixed(2)),
            updatedAt: Date.now()
          }
        );
      } catch (error) {
        console.error(error);
        alert("Impossible de changer la variante.");
      }
    });
  });

  document.querySelectorAll(".btn-plus").forEach(button => {
    button.addEventListener("click", async () => {
      const id = button.dataset.id;
      const item = currentCart[id];
      if (!item || !currentUser) return;

      const oldQty = Number(item.quantite ?? item.quantity ?? 1);
      const newQty = oldQty + 1;
      const price = Number(item.prixUnitaire ?? item.price ?? item.prix ?? 0);

      try {
        await update(
          ref(db, `users/${currentUser.uid}/panier/${id}`),
          {
            quantite: newQty,
            total: Number((newQty * price).toFixed(2)),
            updatedAt: Date.now()
          }
        );
      } catch (error) {
        console.error(error);
        alert("Impossible de modifier le panier.");
      }
    });
  });

  document.querySelectorAll(".btn-minus").forEach(button => {
    button.addEventListener("click", async () => {
      const id = button.dataset.id;
      const item = currentCart[id];
      if (!item || !currentUser) return;

      const oldQty = Number(item.quantite ?? item.quantity ?? 1);
      if (oldQty <= 1) {
        await supprimerArticle(id);
        return;
      }

      const newQty = oldQty - 1;
      const price = Number(item.prixUnitaire ?? item.price ?? item.prix ?? 0);

      try {
        await update(
          ref(db, `users/${currentUser.uid}/panier/${id}`),
          {
            quantite: newQty,
            total: Number((newQty * price).toFixed(2)),
            updatedAt: Date.now()
          }
        );
      } catch (error) {
        console.error(error);
        alert("Impossible de modifier le panier.");
      }
    });
  });

  document.querySelectorAll(".btn-remove").forEach(button => {
    button.addEventListener("click", async () => {
      await supprimerArticle(button.dataset.id);
    });
  });
}


// ============================================================
// SUPPRIMER & VIDER LE PANIER
// ============================================================

async function supprimerArticle(id) {
  if (!currentUser) return;
  try {
    await remove(ref(db, `users/${currentUser.uid}/panier/${id}`));
  } catch (error) {
    console.error(error);
    alert("Impossible de supprimer cet article.");
  }
}

btnClear?.addEventListener("click", async () => {
  if (!currentUser) return;
  if (!confirm("Voulez-vous vraiment vider l'ensemble du panier ?")) return;

  try {
    await remove(ref(db, `users/${currentUser.uid}/panier`));
  } catch (error) {
    console.error(error);
    alert("Impossible de vider le panier.");
  }
});


// ============================================================
// ENVOI DIRECT VERS PAIEMENT.JS & OUVERTURE
// ============================================================

btnPayment?.addEventListener("click", async () => {
  if (!currentUser) {
    alert("Veuillez vous connecter avant de continuer.");
    return;
  }

  if (!currentCart || Object.keys(currentCart).length === 0) {
    alert("Votre panier est vide.");
    return;
  }

  const cartPayload = {};
  currentEnrichedItems.forEach(it => {
    cartPayload[it.cartKey] = {
      id: it.id,
      produitId: it.id,
      nom: it.nom,
      variante: it.variante,
      couleurChoisie: it.couleurChoisie,
      image: it.image,
      prixUnitaire: it.prixUnitaire,
      poidsGr: it.poidsGr,
      quantite: it.quantite,
      total: it.total,
      remisePourcent: currentTotals.remisePourcent,
      fraisTransport: currentTotals.transport,
      fraisDouane: currentTotals.douane,
      montantTotal: currentTotals.total
    };
  });

  try {
    await set(ref(db, `users/${currentUser.uid}/gs/cart`), cartPayload);
    await set(ref(db, `users/${currentUser.uid}/gs/total`), currentTotals.total);
  } catch (e) {
    console.warn("Sync gs/cart non bloquante :", e);
  }

  try {
    sessionStorage.setItem("dakpro_checkout_cart", JSON.stringify(cartPayload));
    sessionStorage.setItem("dakpro_checkout_totals", JSON.stringify(currentTotals));
  } catch (_) {}

  if (typeof window.dakproRecevoirPanier === "function") {
    window.dakproRecevoirPanier(cartPayload);
  }

  window.dispatchEvent(
    new CustomEvent("dakpro:cart-updated", { detail: cartPayload })
  );

  if (typeof window.chargerModule === "function") {
    window.chargerModule("paiement");
  }

  window.location.assign("./paiement.html");
});
