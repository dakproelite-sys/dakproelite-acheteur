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


/*
 * Endpoint Netlify à créer pour confirmer
 * définitivement les paiements.
 *
 * Exemple :
 * /.netlify/functions/fedapay-webhook
 */
const PAYMENT_WEBHOOK_PATH =
  "/.netlify/functions/fedapay-webhook";


/* ============================================================
   10 MOYENS / LOGOS DYNAMIQUES FEDAPAY
   ============================================================ */

const FEDAPAY_PAYMENT_CHANNELS = [
  {
    id: "visa",
    title: "Visa",
    label: "Carte Visa",
    mode: "Carte Bancaire",
    cardBg: "#ffffff",
    cardBorder: "#e2e8f0",
    htmlLogo: `<span style="font-size:10px;font-weight:900;font-style:italic;color:#1A1F71;line-height:1;">VISA</span>`
  },
  {
    id: "mastercard",
    title: "Mastercard",
    label: "Mastercard",
    mode: "Carte Bancaire",
    cardBg: "#ffffff",
    cardBorder: "#e2e8f0",
    htmlLogo: `
      <svg width="20" height="12" viewBox="0 0 32 20" xmlns="http://www.w3.org/2000/svg">
        <circle cx="11" cy="10" r="8" fill="#EB001B"/>
        <circle cx="21" cy="10" r="8" fill="#F79E1B" fill-opacity="0.85"/>
      </svg>
      <span style="font-size:7px;font-weight:800;color:#0f172a;line-height:1;margin-top:2px;">Mastercard</span>
    `
  },
  {
    id: "mtn_momo",
    title: "MTN Mobile Money",
    label: "MTN MoMo",
    mode: "Mobile Money",
    cardBg: "#FFCC00",
    cardBorder: "#eab308",
    htmlLogo: `<span style="font-size:8px;font-weight:900;color:#004F71;line-height:1;">MTN MoMo</span>`
  },
  {
    id: "moov_money",
    title: "Moov Money",
    label: "Moov Money",
    mode: "Mobile Money",
    cardBg: "#0066B3",
    cardBorder: "#0284c7",
    htmlLogo: `<span style="font-size:8px;font-weight:900;color:#ffffff;line-height:1;">Moov Money</span>`
  },
  {
    id: "celtiis_cash",
    title: "Celtiis Cash",
    label: "Celtiis",
    mode: "Mobile Money",
    cardBg: "#00A859",
    cardBorder: "#10b981",
    htmlLogo: `<span style="font-size:8px;font-weight:900;color:#ffffff;line-height:1;">Celtiis</span>`
  },
  {
    id: "orange_money",
    title: "Orange Money",
    label: "Orange",
    mode: "Mobile Money",
    cardBg: "#FF7900",
    cardBorder: "#f97316",
    htmlLogo: `<span style="font-size:8px;font-weight:900;color:#ffffff;line-height:1;">Orange</span>`
  },
  {
    id: "wave",
    title: "Wave",
    label: "Wave",
    mode: "Mobile Money",
    cardBg: "#1DC4FF",
    cardBorder: "#38bdf8",
    htmlLogo: `<span style="font-size:8px;font-weight:900;color:#002B5B;line-height:1;">Wave</span>`
  },
  {
    id: "mixx_yas",
    title: "Mixx by Yas",
    label: "Mixx Yas",
    mode: "Mobile Money",
    cardBg: "#FFF200",
    cardBorder: "#facc15",
    htmlLogo: `<span style="font-size:8px;font-weight:900;color:#0f172a;line-height:1;">Mixx Yas</span>`
  },
  {
    id: "coris_money",
    title: "Coris Money",
    label: "Coris",
    mode: "Mobile Money",
    cardBg: "#8B0000",
    cardBorder: "#991b1b",
    htmlLogo: `<span style="font-size:8px;font-weight:900;color:#FFD700;line-height:1;">Coris</span>`
  },
  {
    id: "fedapay",
    title: "FedaPay",
    label: "FedaPay",
    mode: "Compte / Wallet",
    cardBg: "#0EA5E9",
    cardBorder: "#0284c7",
    htmlLogo: `<span style="font-size:8px;font-weight:900;color:#ffffff;line-height:1;">FedaPay</span>`
  }
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


export function formatCFA(amount) {

  return (
    new Intl.NumberFormat("fr-FR")
      .format(
        Math.round(
          Number(amount) || 0
        )
      )
    + " FCFA"
  );
}


function generateOrderId() {

  const random =
    Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

  return `ORD-${Date.now()}-${random}`;
}


function generatePaymentReference(orderId) {

  return String(orderId)
    .replace(
      /[^A-Za-z0-9]/g,
      ""
    )
    .substring(0, 25);
}


function splitName(fullName) {

  const value =
    String(fullName || "")
      .trim();

  if (!value) {

    return {
      firstname: "Client",
      lastname: "DAKPRO"
    };

  }

  const parts =
    value.split(/\s+/);

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
    .replace(
      /[^\d+]/g,
      ""
    );
}


/* ============================================================
   CHARGEMENT FEDAPAY
   ============================================================ */

function loadFedaPayScript() {

  return new Promise(
    (resolve, reject) => {

      if (window.FedaPay) {

        resolve(
          window.FedaPay
        );

        return;
      }


      const existing =
        document.querySelector(
          'script[data-dakpro-fedapay="true"]'
        );


      if (existing) {

        let elapsed = 0;

        const timer =
          setInterval(() => {

            if (window.FedaPay) {

              clearInterval(timer);

              resolve(
                window.FedaPay
              );

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


      const script =
        document.createElement(
          "script"
        );


      script.src =
        FEDAPAY_SCRIPT_URL;

      script.async = true;

      script.dataset.dakproFedapay =
        "true";


      script.onload = () => {

        if (window.FedaPay) {

          resolve(
            window.FedaPay
          );

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


      document.head.appendChild(
        script
      );

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
      auth &&
      auth.currentUser
        ? auth.currentUser.uid
        : null
    );


  if (!currentUid) {

    container.innerHTML = `

      <div style="
        padding:45px 20px;
        text-align:center;
        background:#0a0d14;
        border-radius:15px;
        color:#fff;
        font-family:Poppins,Arial,sans-serif;
      ">

        <div style="
          font-size:48px;
          margin-bottom:15px;
        ">
          🔐
        </div>

        <h2 style="
          color:#d4af37;
        ">
          Connexion nécessaire
        </h2>

        <p style="
          color:#aaa;
        ">
          Connectez-vous pour effectuer votre paiement.
        </p>

      </div>

    `;

    return;
  }


  /* ==========================================================
     INTERFACE COMPLETE
     ========================================================== */

  container.innerHTML = `

    <style>

      .dak-payment {
        width:100%;
        color:#fff;
        font-family:Poppins,Arial,sans-serif;
      }

      .dak-payment-title {
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:15px;
        flex-wrap:wrap;

        padding-bottom:14px;
        margin-bottom:20px;

        border-bottom:1px solid #292d37;

        color:#d4af37;
        font-size:21px;
        font-weight:800;
      }

      .dak-payment-grid {
        display:grid;
        grid-template-columns:
          minmax(300px,0.95fr)
          minmax(340px,1.15fr);

        gap:20px;
      }

      .dak-box {
        background:#0a0d14;
        border:1px solid #252932;
        border-radius:15px;
        padding:20px;
        box-shadow:
          0 10px 35px rgba(0,0,0,.18);
      }

      .dak-box-title {
        color:#d4af37;
        font-weight:800;
        font-size:16px;
        padding-bottom:10px;
        margin-bottom:15px;
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

        padding:12px;

        border-radius:8px;
        border:1px solid #333;

        background:#12161f;
        color:#fff;

        outline:none;
      }

      .dak-input:focus {
        border-color:#d4af37;
      }

      .dak-field {
        margin-bottom:13px;
      }

      .dak-provider {
        background:
          linear-gradient(
            135deg,
            #151922,
            #080a0f
          );

        border:1px solid #333;
        border-radius:12px;
        padding:14px;
        margin-bottom:18px;
      }

      .dak-logos-caption {
        font-size:10px;
        font-weight:700;
        color:#cbd5e1;
        text-align:center;
        margin-bottom:8px;
      }

      .dak-channels-grid {
        display:grid;
        grid-template-columns:repeat(5, minmax(0, 1fr));
        gap:6px;
      }

      .dak-logo-tile {
        border-radius:8px;
        padding:6px 4px;
        min-height:30px;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        cursor:pointer;
        border-width:2px;
        border-style:solid;
        transition:transform .15s ease, box-shadow .15s ease;
        user-select:none;
      }

      .dak-logo-tile:hover {
        transform:translateY(-1px);
      }

      .dak-logo-tile.active {
        box-shadow:0 0 0 2px #d4af37;
        transform:scale(1.03);
      }

      .dak-provider-text {
        color:#aaa;
        font-size:12px;
        line-height:1.6;
        margin-top:10px;
      }

      .dak-secure {
        margin-top:12px;
        padding:10px;

        background:rgba(34,197,94,.08);
        border:1px solid rgba(34,197,94,.25);

        border-radius:8px;

        color:#70e090;
        font-size:12px;
      }

      .dak-cart {
        max-height:460px;
        overflow-y:auto;
        margin-bottom:15px;
      }

      .dak-cart-item {
        display:flex;
        flex-direction:column;
        gap:8px;

        background:#12161f;
        border:1px solid #272c38;
        border-radius:10px;

        padding:12px;
        margin-bottom:10px;

        font-size:13px;
      }

      .dak-item-top {
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:10px;
      }

      .dak-item-img {
        width:64px;
        height:64px;
        border-radius:8px;
        object-fit:cover;
        background:#0a0d14;
        flex-shrink:0;
      }

      .dak-item-meta {
        font-size:11px;
        color:#9aa3b2;
        margin-top:2px;
      }

      .dak-item-desc {
        font-size:11px;
        color:#8b95a5;
        margin-top:4px;
        line-height:1.4;
      }

      .dak-item-breakdown {
        display:grid;
        grid-template-columns:repeat(4, minmax(0, 1fr));
        gap:6px;
        background:#0b0e15;
        border-radius:7px;
        padding:7px;
        font-size:11px;
      }

      .dak-item-controls {
        display:flex;
        flex-wrap:wrap;
        justify-content:space-between;
        align-items:center;
        gap:8px;
      }

      .dak-qty-box {
        display:inline-flex;
        align-items:center;
        gap:6px;
      }

      .dak-qty-btn {
        width:26px;
        height:26px;
        border-radius:6px;
        border:1px solid #3c4252;
        background:#181d29;
        color:#fff;
        font-weight:800;
        cursor:pointer;
      }

      .dak-summary {
        display:flex;
        justify-content:space-between;

        color:#ccc;
        font-size:13px;
        margin-bottom:8px;
      }

      .dak-discount-line {
        display:flex;
        justify-content:space-between;
        color:#70e090;
        font-size:13px;
        margin-bottom:8px;
      }

      .dak-total {
        display:flex;
        justify-content:space-between;

        padding-top:14px;
        margin-top:12px;

        border-top:1px dashed #333;

        color:#d4af37;
        font-size:20px;
        font-weight:900;
      }

      .dak-pay-button {
        width:100%;

        margin-top:18px;

        padding:15px;

        border:0;
        border-radius:9px;

        background:#d4af37;
        color:#000;

        font-size:16px;
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

        padding:8px 12px;
        border-radius:7px;

        cursor:pointer;
      }

      .dak-status {
        display:none;

        margin-top:15px;
        padding:12px;

        border-radius:8px;

        font-size:13px;
        line-height:1.5;
      }

      .dak-help {
        background:#12161f;
        border:1px solid #292d37;

        border-radius:10px;

        padding:13px;

        color:#aaa;
        font-size:12px;
        line-height:1.6;
      }

      /* Tablette (max 1024px) */
      @media(max-width:1024px) {
        .dak-payment-grid {
          grid-template-columns:1fr;
        }
      }

      /* Mobile / Android (max 640px) */
      @media(max-width:640px) {
        .dak-box {
          padding:14px;
          border-radius:12px;
        }
        .dak-payment-title {
          font-size:17px;
        }
        .dak-item-breakdown {
          grid-template-columns:repeat(2, minmax(0, 1fr));
        }
      }

      /* Grand écran / Desktop (min 1280px) */
      @media(min-width:1280px) {
        .dak-payment-grid {
          grid-template-columns:minmax(360px, 1fr) minmax(460px, 1.25fr);
          gap:24px;
        }
      }

    </style>


    <div class="dak-payment">

      <div class="dak-payment-title">

        <span>
          💳 DAKPRO ÉLITE — Paiement sécurisé
        </span>

        <button
          id="btnClearCart"
          class="dak-clear"
        >
          🗑️ Vider le panier
        </button>

      </div>


      <div class="dak-payment-grid">


        <!-- CLIENT -->

        <div class="dak-box">

          <div class="dak-box-title">
            👤 Informations du client &amp; Moyens de paiement
          </div>


          <div class="dak-provider">

            <div class="dak-logos-caption">
              Moyens de paiement acceptés via FedaPay (Mobile Money &amp; Cartes Bancaires)
            </div>

            <div id="fedapayChannelsGrid" class="dak-channels-grid"></div>

            <div class="dak-provider-text" id="selectedChannelInfo"></div>

            <div class="dak-secure">
              🔒 Paiement vérifié côté serveur — panier vidé uniquement après confirmation réelle
            </div>

          </div>


          <div class="dak-field">

            <label class="dak-label">
              Nom complet
            </label>

            <input
              id="payCustomerName"
              class="dak-input"
              type="text"
              placeholder="Jean Dupont"
            >

          </div>


          <div class="dak-field">

            <label class="dak-label">
              Adresse e-mail
            </label>

            <input
              id="payCustomerEmail"
              class="dak-input"
              type="email"
              placeholder="client@email.com"
            >

          </div>


          <div class="dak-field">

            <label class="dak-label">
              Téléphone
            </label>

            <input
              id="payCustomerPhone"
              class="dak-input"
              type="tel"
              placeholder="+229 90 00 00 00"
            >

          </div>


          <div class="dak-help">

            <strong style="color:#d4af37;">
              Remises dropshipping &amp; étapes :
            </strong>

            <br><br>

            • Dès <strong>10 articles</strong> : <strong>3 %</strong> de réduction (paliers jusqu'à <strong>50</strong> et <strong>100 articles</strong> = <strong>10 %</strong>).<br>
            • Commande multi-articles ou adresse complète : <strong>5 %</strong> de réduction supplémentaire.<br>
            • Cliquez sur « Payer maintenant », validez votre moyen choisi, puis attendez la confirmation serveur.

          </div>

        </div>


        <!-- LIVRAISON & ARTICLES DU PANIER -->

        <div class="dak-box">

          <div class="dak-box-title">
            📍 Livraison
          </div>


          <div class="dak-field">

            <label class="dak-label">
              Nom du destinataire
            </label>

            <input
              id="shippingName"
              class="dak-input"
              type="text"
            >

          </div>


          <div class="dak-field">

            <label class="dak-label">
              Téléphone
            </label>

            <input
              id="shippingPhone"
              class="dak-input"
              type="tel"
            >

          </div>


          <div class="dak-field">

            <label class="dak-label">
              Adresse exacte
            </label>

            <input
              id="shippingAddress"
              class="dak-input"
              type="text"
              placeholder="Quartier, rue, maison..."
            >

          </div>


          <div style="
            display:flex;
            gap:10px;
          ">

            <div
              class="dak-field"
              style="flex:1;"
            >

              <label class="dak-label">
                Ville
              </label>

              <input
                id="shippingCity"
                class="dak-input"
                type="text"
                placeholder="Cotonou"
              >

            </div>


            <div
              class="dak-field"
              style="flex:1;"
            >

              <label class="dak-label">
                Pays
              </label>

              <input
                id="shippingCountry"
                class="dak-input"
                type="text"
                value="Bénin"
              >

            </div>

          </div>


          <div class="dak-box-title"
            style="margin-top:20px;"
          >
            🛒 Récapitulatif de votre commande (articles du panier)
          </div>


          <div
            id="cartItemsContainer"
            class="dak-cart"
          >
            Chargement du panier...
          </div>


          <div class="dak-summary">
            <span>Quantité totale d'articles</span>
            <strong id="checkoutItemsCount">0</strong>
          </div>

          <div class="dak-summary">
            <span>Prix normal (articles)</span>
            <strong id="checkoutNormalAmount">0 FCFA</strong>
          </div>

          <div class="dak-summary">
            <span>Prix du transport</span>
            <strong id="checkoutShippingAmount">0 FCFA</strong>
          </div>

          <div class="dak-summary">
            <span>Prix des douanes</span>
            <strong id="checkoutCustomsAmount">0 FCFA</strong>
          </div>

          <div class="dak-summary">
            <span>Total dropshipping brut</span>
            <strong id="checkoutDropshipGross">0 FCFA</strong>
          </div>

          <div class="dak-discount-line" id="checkoutVolumeDiscountRow">
            <span id="checkoutVolumeDiscountLabel">Réduction volume (0 %)</span>
            <strong id="checkoutVolumeDiscountAmount">-0 FCFA</strong>
          </div>

          <div class="dak-discount-line" id="checkoutExtraDiscountRow">
            <span id="checkoutExtraDiscountLabel">Réduction multi-articles / adresse (0 %)</span>
            <strong id="checkoutExtraDiscountAmount">-0 FCFA</strong>
          </div>


          <div class="dak-total">

            <span>
              Total
            </span>

            <span id="checkoutTotalAmount">
              0 FCFA
            </span>

          </div>


          <button
            id="btnExecutePayment"
            class="dak-pay-button"
          >
            ⚡ Payer maintenant
          </button>


          <div
            id="payStatusMessage"
            class="dak-status"
          ></div>

        </div>

      </div>

    </div>

  `;


  /* ==========================================================
     VARIABLES
     ========================================================== */

  let currentCartTotalFCFA = 0;

  let currentNormalTotalFCFA = 0;

  let currentShippingTotalFCFA = 0;

  let currentCustomsTotalFCFA = 0;

  let currentDropshipGrossFCFA = 0;

  let currentVolumeDiscountFCFA = 0;

  let currentExtraDiscountFCFA = 0;

  let currentCartItems = {};

  let currentCartCount = 0;

  let selectedPaymentChannel =
    FEDAPAY_PAYMENT_CHANNELS[0];

  let paymentInProgress = false;


  /* ==========================================================
     DOM
     ========================================================== */

  const customerName =
    document.getElementById(
      "payCustomerName"
    );

  const customerEmail =
    document.getElementById(
      "payCustomerEmail"
    );

  const customerPhone =
    document.getElementById(
      "payCustomerPhone"
    );

  const shippingName =
    document.getElementById(
      "shippingName"
    );

  const shippingPhone =
    document.getElementById(
      "shippingPhone"
    );

  const shippingAddress =
    document.getElementById(
      "shippingAddress"
    );

  const shippingCity =
    document.getElementById(
      "shippingCity"
    );

  const shippingCountry =
    document.getElementById(
      "shippingCountry"
    );

  const cartItemsContainer =
    document.getElementById(
      "cartItemsContainer"
    );

  const checkoutItemsCount =
    document.getElementById(
      "checkoutItemsCount"
    );

  const checkoutNormalAmount =
    document.getElementById(
      "checkoutNormalAmount"
    );

  const checkoutShippingAmount =
    document.getElementById(
      "checkoutShippingAmount"
    );

  const checkoutCustomsAmount =
    document.getElementById(
      "checkoutCustomsAmount"
    );

  const checkoutDropshipGross =
    document.getElementById(
      "checkoutDropshipGross"
    );

  const checkoutVolumeDiscountLabel =
    document.getElementById(
      "checkoutVolumeDiscountLabel"
    );

  const checkoutVolumeDiscountAmount =
    document.getElementById(
      "checkoutVolumeDiscountAmount"
    );

  const checkoutExtraDiscountLabel =
    document.getElementById(
      "checkoutExtraDiscountLabel"
    );

  const checkoutExtraDiscountAmount =
    document.getElementById(
      "checkoutExtraDiscountAmount"
    );

  const checkoutTotalAmount =
    document.getElementById(
      "checkoutTotalAmount"
    );

  const executePaymentBtn =
    document.getElementById(
      "btnExecutePayment"
    );

  const payStatusMessage =
    document.getElementById(
      "payStatusMessage"
    );

  const fedapayChannelsGrid =
    document.getElementById(
      "fedapayChannelsGrid"
    );

  const selectedChannelInfo =
    document.getElementById(
      "selectedChannelInfo"
    );


  /* ==========================================================
     RENDU DYNAMIQUE DES 10 LOGOS FEDAPAY
     ========================================================== */

  function renderDynamicPaymentLogos(channels = FEDAPAY_PAYMENT_CHANNELS) {
    if (!fedapayChannelsGrid) return;

    fedapayChannelsGrid.innerHTML = channels.map((ch, idx) => {
      const isSelected = selectedPaymentChannel && selectedPaymentChannel.id === ch.id;
      return `
        <div
          class="dak-logo-tile ${isSelected ? "active" : ""}"
          data-channel-id="${escapeHTML(ch.id)}"
          title="${escapeHTML(ch.title)}"
          style="background:${ch.cardBg};border-color:${ch.cardBorder};"
        >
          ${ch.htmlLogo}
        </div>
      `;
    }).join("");

    fedapayChannelsGrid.querySelectorAll(".dak-logo-tile").forEach((tile, idx) => {
      tile.addEventListener("click", () => {
        fedapayChannelsGrid.querySelectorAll(".dak-logo-tile").forEach(t => t.classList.remove("active"));
        tile.classList.add("active");

        const found = channels.find(c => c.id === tile.dataset.channelId) || channels[idx];
        if (found) {
          selectedPaymentChannel = found;
          updateSelectedChannelPreview();
        }
      });
    });

    updateSelectedChannelPreview();
  }

  function updateSelectedChannelPreview() {
    if (!selectedChannelInfo || !selectedPaymentChannel) return;
    selectedChannelInfo.innerHTML =
      `Moyen sélectionné : <strong style="color:#d4af37;">${escapeHTML(selectedPaymentChannel.title)}</strong> (${escapeHTML(selectedPaymentChannel.mode)}). ` +
      `Après validation, l'interface sécurisée s'ouvrira avec le montant réel de votre commande dropshipping.`;
  }

  renderDynamicPaymentLogos(FEDAPAY_PAYMENT_CHANNELS);


  /* ==========================================================
     MESSAGE
     ========================================================== */

  function showStatus(
    message,
    type = "info"
  ) {

    if (!payStatusMessage) return;

    payStatusMessage.style.display =
      "block";


    if (type === "success") {

      payStatusMessage.style.background =
        "rgba(34,197,94,.08)";

      payStatusMessage.style.border =
        "1px solid rgba(34,197,94,.3)";

      payStatusMessage.style.color =
        "#70e090";

    } else if (type === "error") {

      payStatusMessage.style.background =
        "rgba(239,68,68,.08)";

      payStatusMessage.style.border =
        "1px solid rgba(239,68,68,.3)";

      payStatusMessage.style.color =
        "#ff8585";

    } else {

      payStatusMessage.style.background =
        "rgba(212,175,55,.08)";

      payStatusMessage.style.border =
        "1px solid rgba(212,175,55,.25)";

      payStatusMessage.style.color =
        "#d4af37";

    }


    payStatusMessage.textContent =
      message;
  }


  /* ==========================================================
     1 — PROFIL UTILISATEUR
     ========================================================== */

  get(
    ref(
      db,
      `users/${currentUid}`
    )
  )
    .then(
      snapshot => {

        if (!snapshot.exists())
          return;


        const user =
          snapshot.val() || {};


        const fullName =
          user.nom ||
          user.displayName ||
          user.name ||
          "";


        const email =
          user.email ||
          (
            auth &&
            auth.currentUser
              ? auth.currentUser.email
              : ""
          ) ||
          "";


        const phone =
          user.telephone ||
          user.phone ||
          "";


        if (
          customerName &&
          !customerName.value
        )
          customerName.value =
            fullName;


        if (
          customerEmail &&
          !customerEmail.value
        )
          customerEmail.value =
            email;


        if (
          customerPhone &&
          !customerPhone.value
        )
          customerPhone.value =
            phone;


        if (
          shippingName &&
          !shippingName.value
        )
          shippingName.value =
            fullName;


        if (
          shippingPhone &&
          !shippingPhone.value
        )
          shippingPhone.value =
            phone;


        if (
          shippingAddress &&
          user.adresse
        )
          shippingAddress.value =
            user.adresse;


        if (
          shippingCity &&
          user.ville
        )
          shippingCity.value =
            user.ville;


        if (
          shippingCountry &&
          user.pays
        )
          shippingCountry.value =
            user.pays;

        updateCartSummary();

      }
    )
    .catch(
      error =>
        console.warn(
          "Profil non chargé :",
          error
        )
    );


  /* ==========================================================
     2 — PANIER
     
     SOURCE PRINCIPALE :
     users/{uid}/panier

     gs/cart reste accepté pour compatibilité.
     ========================================================== */

  const primaryCartRef =
    ref(
      db,
      `users/${currentUid}/panier`
    );


  onValue(
    primaryCartRef,
    async snapshot => {

      currentCartTotalFCFA = 0;

      currentNormalTotalFCFA = 0;

      currentShippingTotalFCFA = 0;

      currentCustomsTotalFCFA = 0;

      currentDropshipGrossFCFA = 0;

      currentCartItems = {};

      currentCartCount = 0;


      if (!cartItemsContainer)
        return;


      cartItemsContainer.innerHTML =
        "";


      if (!snapshot.exists()) {

        cartItemsContainer.innerHTML = `

          <div style="
            padding:18px;
            text-align:center;
            color:#888;
          ">
            🛒 Votre panier est vide.
          </div>

        `;

        updateCartSummary();

        return;
      }


      const cart =
        snapshot.val() || {};


      const keys =
        Object.keys(cart);


      for (
        const key of keys
      ) {

        const item =
          cart[key] || {};


        const prodId =
          item.id ||
          item.produitId ||
          key;


        let qty =
          parseInt(
            item.quantite ||
            item.qty ||
            1,
            10
          );


        if (
          !Number.isFinite(qty) ||
          qty < 1
        ) {

          qty = 1;

        }


        let realPrice =
          Number(
            item.prixUnitaire ||
            item.prix ||
            item.prixNormal ||
            0
          );


        let publication =
          null;


        /* -------------------------------------------
           PRIX OFFICIEL
           ------------------------------------------- */

        try {

          const pubSnap =
            await get(
              ref(
                db,
                `publications/${prodId}`
              )
            );


          if (pubSnap.exists()) {

            publication =
              pubSnap.val() || {};


            const normal =
              Number(
                publication.prixNormal ||
                publication.prix ||
                0
              );


            const promo =
              Number(
                publication.prixPromo ||
                0
              );


            if (
              promo > 0 &&
              normal > 0 &&
              promo < normal
            ) {

              realPrice =
                promo;

            } else {

              realPrice =
                normal;

            }

          }

        } catch (error) {

          console.warn(
            "Prix publication non disponible :",
            error
          );

        }


        if (
          !Number.isFinite(realPrice) ||
          realPrice < 0
        ) {

          realPrice = 0;

        }


        const unitShipping = Math.max(
          0,
          Math.round(
            Number(
              item.prixTransport ??
              item.transport ??
              publication?.prixTransport ??
              Math.max(500, realPrice * 0.15)
            ) || 0
          )
        );

        const unitCustoms = Math.max(
          0,
          Math.round(
            Number(
              item.prixDouane ??
              item.douane ??
              publication?.prixDouane ??
              Math.max(250, realPrice * 0.08)
            ) || 0
          )
        );

        const normalSubtotal =
          realPrice * qty;

        const shippingSubtotal =
          unitShipping * qty;

        const customsSubtotal =
          unitCustoms * qty;

        const dropshipSubtotal =
          normalSubtotal + shippingSubtotal + customsSubtotal;


        currentNormalTotalFCFA +=
          normalSubtotal;

        currentShippingTotalFCFA +=
          shippingSubtotal;

        currentCustomsTotalFCFA +=
          customsSubtotal;

        currentDropshipGrossFCFA +=
          dropshipSubtotal;


        currentCartCount +=
          qty;


        const categoryName =
          item.categorie ||
          item.category ||
          publication?.categorie ||
          publication?.category ||
          "Offre Officielle";

        const descriptionText =
          item.description ||
          publication?.description ||
          "";

        const rawVariants =
          Array.isArray(item.variantes) ? item.variantes :
          (Array.isArray(publication?.variantes) ? publication.variantes :
          (Array.isArray(publication?.variants) ? publication.variants :
          ["Standard", "Noir", "Blanc", "Or"]));

        const variantOptions = rawVariants.map(v =>
          typeof v === "string" ? v : (v?.nom || v?.name || "Standard")
        );

        const selectedVariant =
          item.variante ||
          item.variant ||
          variantOptions[0] ||
          "Standard";

        if (!variantOptions.includes(selectedVariant)) {
          variantOptions.unshift(selectedVariant);
        }

        const stockLabel =
          item.stock ??
          publication?.stock ??
          "En stock";


        currentCartItems[key] = {

          id:
            prodId,

          nom:
            item.nom ||
            item.title ||
            publication?.nom ||
            publication?.title ||
            "Produit DAKPRO ÉLITE",

          categorie:
            categoryName,

          variante:
            selectedVariant,

          stock:
            stockLabel,

          image:
            item.image ||
            item.imageUrl ||
            publication?.image ||
            publication?.imageUrl ||
            "",

          prixUnitaire:
            realPrice,

          prixTransport:
            unitShipping,

          prixDouane:
            unitCustoms,

          quantite:
            qty,

          total:
            dropshipSubtotal

        };


        const row =
          document.createElement(
            "div"
          );


        row.className =
          "dak-cart-item";


        row.innerHTML = `

          <div class="dak-item-top">
            <div style="display:flex;gap:10px;align-items:center;flex:1;">
              ${currentCartItems[key].image ? `<img src="${escapeHTML(currentCartItems[key].image)}" alt="${escapeHTML(currentCartItems[key].nom)}" class="dak-item-img">` : ""}
              <div>
                <strong>${escapeHTML(currentCartItems[key].nom)}</strong>
                <div class="dak-item-meta">
                  Catégorie : <span style="color:#d4af37;">${escapeHTML(categoryName)}</span> •
                  Variante : <strong style="color:#fff;">${escapeHTML(selectedVariant)}</strong> •
                  Stock : <span style="color:#70e090;">${escapeHTML(stockLabel)}</span>
                </div>
                ${descriptionText ? `<div class="dak-item-desc">${escapeHTML(descriptionText)}</div>` : ""}
              </div>
            </div>
            <strong style="color:#70e090;white-space:nowrap;">
              ${formatCFA(dropshipSubtotal)}
            </strong>
          </div>

          <div class="dak-item-breakdown">
            <div><span style="color:#888;">Qté :</span> <strong>${qty}</strong></div>
            <div><span style="color:#888;">Normal :</span> <strong>${formatCFA(normalSubtotal)}</strong></div>
            <div><span style="color:#888;">Transport :</span> <strong>${formatCFA(shippingSubtotal)}</strong></div>
            <div><span style="color:#888;">Douane :</span> <strong>${formatCFA(customsSubtotal)}</strong></div>
          </div>

          <div class="dak-item-controls">
            <select
              class="dak-input dak-var-select"
              data-cart-key="${escapeHTML(key)}"
              style="width:auto;padding:5px 8px;font-size:11px;"
            >
              ${variantOptions.map(v => `
                <option value="${escapeHTML(v)}" ${v === selectedVariant ? "selected" : ""}>
                  ${escapeHTML(v)}
                </option>
              `).join("")}
            </select>

            <div class="dak-qty-box">
              <button type="button" class="dak-qty-btn dak-qty-dec" data-cart-key="${escapeHTML(key)}">−</button>
              <span style="font-weight:800;min-width:22px;text-align:center;">${qty}</span>
              <button type="button" class="dak-qty-btn dak-qty-inc" data-cart-key="${escapeHTML(key)}">+</button>
            </div>
          </div>

        `;


        cartItemsContainer.appendChild(
          row
        );

      }


      /* Gestion des boutons +/- et changement de variante sans casser Firebase */
      cartItemsContainer.querySelectorAll(".dak-qty-inc").forEach(btn => {
        btn.addEventListener("click", async () => {
          const k = btn.dataset.cartKey;
          const it = currentCartItems[k];
          if (!it) return;
          const nextQ = it.quantite + 1;
          await update(ref(db, `users/${currentUid}/panier/${k}`), {
            quantite: nextQ,
            total: (it.prixUnitaire + it.prixTransport + it.prixDouane) * nextQ
          });
        });
      });

      cartItemsContainer.querySelectorAll(".dak-qty-dec").forEach(btn => {
        btn.addEventListener("click", async () => {
          const k = btn.dataset.cartKey;
          const it = currentCartItems[k];
          if (!it) return;
          if (it.quantite <= 1) {
            await set(ref(db, `users/${currentUid}/panier/${k}`), null);
          } else {
            const nextQ = it.quantite - 1;
            await update(ref(db, `users/${currentUid}/panier/${k}`), {
              quantite: nextQ,
              total: (it.prixUnitaire + it.prixTransport + it.prixDouane) * nextQ
            });
          }
        });
      });

      cartItemsContainer.querySelectorAll(".dak-var-select").forEach(sel => {
        sel.addEventListener("change", async () => {
          const k = sel.dataset.cartKey;
          if (!k) return;
          await update(ref(db, `users/${currentUid}/panier/${k}`), {
            variante: sel.value
          });
        });
      });


      updateCartSummary();

    },
    error => {

      console.error(
        "Erreur panier :",
        error
      );


      showStatus(
        "Impossible de charger votre panier.",
        "error"
      );

    }
  );


  /* ==========================================================
     CALCUL REMISES & TOTAL DROPSHIPPING
     ========================================================== */

  function getVolumeDiscountRate(totalQty) {
    if (totalQty >= 100) return 0.10;
    if (totalQty >= 50) return 0.06;
    if (totalQty >= 10) return 0.03;
    return 0;
  }

  function hasMultiItemOrFullAddressDiscount() {
    const distinctCount = Object.keys(currentCartItems).length;
    const addr = shippingAddress?.value.trim() || "";
    const city = shippingCity?.value.trim() || "";
    const country = shippingCountry?.value.trim() || "";
    const fullAddress = Boolean(addr && city && country);
    return distinctCount >= 2 || fullAddress;
  }

  function updateCartSummary() {

    const volumeRate = getVolumeDiscountRate(currentCartCount);
    const extraRate = currentDropshipGrossFCFA > 0 && hasMultiItemOrFullAddressDiscount() ? 0.05 : 0;

    currentVolumeDiscountFCFA = Math.round(currentDropshipGrossFCFA * volumeRate);
    currentExtraDiscountFCFA = Math.round(currentDropshipGrossFCFA * extraRate);

    currentCartTotalFCFA = Math.max(
      0,
      Math.round(currentDropshipGrossFCFA - currentVolumeDiscountFCFA - currentExtraDiscountFCFA)
    );


    if (checkoutItemsCount) {
      checkoutItemsCount.textContent = currentCartCount;
    }

    if (checkoutNormalAmount) {
      checkoutNormalAmount.textContent = formatCFA(currentNormalTotalFCFA);
    }

    if (checkoutShippingAmount) {
      checkoutShippingAmount.textContent = formatCFA(currentShippingTotalFCFA);
    }

    if (checkoutCustomsAmount) {
      checkoutCustomsAmount.textContent = formatCFA(currentCustomsTotalFCFA);
    }

    if (checkoutDropshipGross) {
      checkoutDropshipGross.textContent = formatCFA(currentDropshipGrossFCFA);
    }

    if (checkoutVolumeDiscountLabel) {
      checkoutVolumeDiscountLabel.textContent = `Réduction volume (${Math.round(volumeRate * 100)} %)`;
    }

    if (checkoutVolumeDiscountAmount) {
      checkoutVolumeDiscountAmount.textContent = `-${formatCFA(currentVolumeDiscountFCFA)}`;
    }

    if (checkoutExtraDiscountLabel) {
      checkoutExtraDiscountLabel.textContent = `Réduction multi-articles / adresse (${Math.round(extraRate * 100)} %)`;
    }

    if (checkoutExtraDiscountAmount) {
      checkoutExtraDiscountAmount.textContent = `-${formatCFA(currentExtraDiscountFCFA)}`;
    }


    if (checkoutTotalAmount) {

      checkoutTotalAmount.textContent =
        formatCFA(
          currentCartTotalFCFA
        );

    }


    if (executePaymentBtn) {

      executePaymentBtn.textContent =
        currentCartTotalFCFA > 0

          ? `⚡ Payer maintenant (${formatCFA(
              currentCartTotalFCFA
            )})`

          : "⚡ Payer maintenant";

    }

  }

  [shippingAddress, shippingCity, shippingCountry].forEach(inp => {
    inp?.addEventListener("input", updateCartSummary);
  });


  /* ==========================================================
     3 — VIDER LE PANIER
     ========================================================== */

  document
    .getElementById(
      "btnClearCart"
    )
    ?.addEventListener(
      "click",
      async () => {

        if (
          !confirm(
            "Voulez-vous vraiment vider votre panier ?"
          )
        )
          return;


        try {

          const updates = {};


          updates[
            `users/${currentUid}/panier`
          ] = null;


          updates[
            `users/${currentUid}/gs/cart`
          ] = null;


          updates[
            `users/${currentUid}/gs/total`
          ] = 0;


          await update(
            ref(db),
            updates
          );


          showStatus(
            "✅ Panier vidé.",
            "success"
          );

        } catch (error) {

          console.error(
            error
          );


          showStatus(
            "❌ Impossible de vider le panier.",
            "error"
          );

        }

      }
    );


  /* ==========================================================
     4 — PAIEMENT
     ========================================================== */

  executePaymentBtn
    ?.addEventListener(
      "click",
      async () => {

        if (paymentInProgress)
          return;


        /* ---------------------------------------------
           PANIER
           --------------------------------------------- */

        if (
          currentCartTotalFCFA <= 0 ||
          Object.keys(
            currentCartItems
          ).length === 0
        ) {

          showStatus(
            "Votre panier est vide.",
            "error"
          );

          return;
        }


        /* ---------------------------------------------
           LIVRAISON
           --------------------------------------------- */

        const shipName =
          shippingName?.value.trim() ||
          "";

        const shipPhone =
          shippingPhone?.value.trim() ||
          "";

        const shipAddress =
          shippingAddress?.value.trim() ||
          "";

        const shipCity =
          shippingCity?.value.trim() ||
          "";

        const shipCountry =
          shippingCountry?.value.trim() ||
          "Bénin";


        if (
          !shipName ||
          !shipPhone ||
          !shipAddress
        ) {

          showStatus(
            "Veuillez renseigner le nom, le téléphone et l'adresse de livraison.",
            "error"
          );

          return;
        }


        /* ---------------------------------------------
           CLIENT
           --------------------------------------------- */

        const clientName =
          customerName?.value.trim() ||
          shipName;

        const clientEmail =
          customerEmail?.value.trim() ||
          "";

        const clientPhone =
          customerPhone?.value.trim() ||
          shipPhone;


        if (!clientEmail) {

          showStatus(
            "Veuillez renseigner une adresse e-mail.",
            "error"
          );

          return;
        }


        if (
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(clientEmail)
        ) {

          showStatus(
            "Adresse e-mail invalide.",
            "error"
          );

          return;
        }


        /* ---------------------------------------------
           VERROUILLAGE
           --------------------------------------------- */

        paymentInProgress =
          true;

        executePaymentBtn.disabled =
          true;


        showStatus(
          "Préparation de votre paiement sécurisé...",
          "info"
        );


        try {

          /* -------------------------------------------
             FEDAPAY
             ------------------------------------------- */

          const FedaPay =
            await loadFedaPayScript();


          const orderId =
            generateOrderId();


          const paymentReference =
            generatePaymentReference(
              orderId
            );


          const amount =
            Math.round(
              currentCartTotalFCFA
            );


          const name =
            splitName(
              clientName
            );


          /* -------------------------------------------
             COMMANDE PENDING
             ------------------------------------------- */

          const orderPayload = {

            commandeId:
              orderId,

            acheteurId:
              currentUid,

            acheteurEmail:
              clientEmail,

            articles:
              currentCartItems,

            dropshipping: {
              quantiteTotale: currentCartCount,
              prixNormalTotal: currentNormalTotalFCFA,
              prixTransportTotal: currentShippingTotalFCFA,
              prixDouaneTotal: currentCustomsTotalFCFA,
              totalDropshippingBrut: currentDropshipGrossFCFA,
              reductionVolume: currentVolumeDiscountFCFA,
              reductionMultiAdresse: currentExtraDiscountFCFA,
              totalFinal: amount,
              canalSelectionne: selectedPaymentChannel?.title || "FedaPay"
            },

            montantTotal:
              amount,

            devise:
              "XOF",

            date:
              Date.now(),

            client: {

              nom:
                clientName,

              email:
                clientEmail,

              telephone:
                clientPhone

            },

            livraison: {

              destinataire:
                shipName,

              telephone:
                shipPhone,

              adresse:
                shipAddress,

              ville:
                shipCity,

              pays:
                shipCountry

            },

            moyenPaiement: {

              fournisseur:
                "FedaPay",

              type:
                "Checkout",

              canalPreselectionne:
                selectedPaymentChannel?.title || "",

              environnement:
                "live",

              reference:
                paymentReference

            },

            paiement: {

              fournisseur:
                "FedaPay",

              statut:
                "pending",

              reference:
                paymentReference,

              transactionId:
                null,

              verification:
                "server",

              creeLe:
                Date.now()

            },

            statut:
              "En attente de paiement",

            statutPaiement:
              "pending",

            statutLivraison:
              "En attente du paiement",

            paiementConfirme:
              false

          };


          await set(
            ref(
              db,
              `commandes/${currentUid}/${orderId}`
            ),
            orderPayload
          );


          /* -------------------------------------------
             FEDAPAY CHECKOUT
             ------------------------------------------- */

          const widget =
            FedaPay.init({

              public_key:
                FEDAPAY_PUBLIC_KEY,

              environment:
                FEDAPAY_ENVIRONMENT,

              locale:
                "fr",

              transaction: {

                amount:
                  amount,

                description:
                  `Commande DAKPRO ÉLITE ${paymentReference}`,

                custom_metadata: {

                  commandeId:
                    orderId,

                  acheteurId:
                    currentUid,

                  reference:
                    paymentReference

                }

              },

              currency: {

                iso:
                  "XOF"

              },

              customer: {

                email:
                  clientEmail,

                firstname:
                  name.firstname,

                lastname:
                  name.lastname,

                phone_number: {

                  number:
                    cleanPhone(
                      clientPhone
                    ),

                  country:
                    "bj"

                }

              },


              /* -----------------------------------------
                 CALLBACK FRONTEND

                 IMPORTANT :
                 CE CALLBACK NE VALIDE PAS LE PAIEMENT.
                 ----------------------------------------- */

              onComplete:
                async response => {

                  console.log(
                    "FedaPay Checkout terminé :",
                    response
                  );


                  const transaction =
                    response?.transaction ||
                    null;


                  const transactionId =
                    transaction?.id ||
                    null;


                  try {

                    await update(
                      ref(
                        db,
                        `commandes/${currentUid}/${orderId}`
                      ),
                      {

                        "paiement/checkoutTermine":
                          true,

                        "paiement/checkoutTermineLe":
                          Date.now(),

                        "paiement/transactionId":
                          transactionId,

                        "paiement/reponseFrontend":
                          response?.reason
                            ? String(
                                response.reason
                              )
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


                  /*
                   * NE PAS VIDER LE PANIER ICI.
                   *
                   * NE PAS mettre :
                   * statut = Payé
                   *
                   * Le webhook/serveur doit confirmer.
                   */

                  paymentInProgress =
                    false;

                  executePaymentBtn.disabled =
                    false;


                  /*
                   * On écoute Firebase pendant quelques secondes
                   * afin d'attendre la confirmation serveur.
                   */

                  waitForServerConfirmation(
                    currentUid,
                    orderId
                  );

                }

            });


          if (
            !widget ||
            typeof widget.open !==
              "function"
          ) {

            throw new Error(
              "FedaPay Checkout ne peut pas être ouvert."
            );

          }


          showStatus(
            `Ouverture de FedaPay — montant réel : ${formatCFA(amount)}`,
            "info"
          );


          widget.open();

        } catch (error) {

          console.error(
            "Erreur paiement :",
            error
          );


          paymentInProgress =
            false;

          executePaymentBtn.disabled =
            false;


          showStatus(
            "❌ Impossible d'ouvrir FedaPay. Vérifiez votre connexion ou la configuration du paiement.",
            "error"
          );

        }

      }
    );


  /* ==========================================================
     ATTENTE CONFIRMATION SERVEUR
     ========================================================== */

  function waitForServerConfirmation(
    uid,
    orderId
  ) {

    const orderRef =
      ref(
        db,
        `commandes/${uid}/${orderId}`
      );


    let finished =
      false;


    const unsubscribe =
      onValue(
        orderRef,
        snapshot => {

          if (
            finished ||
            !snapshot.exists()
          )
            return;


          const order =
            snapshot.val() || {};


          const status =
            String(
              order.paiement?.statut ||
              order.statutPaiement ||
              ""
            )
              .toLowerCase();


          if (
            status === "paid" ||
            status === "approved" ||
            status === "payé" ||
            status === "payee"
          ) {

            finished =
              true;


            unsubscribe();


            showStatus(
              `✅ Paiement confirmé. Commande ${orderId} validée.`,
              "success"
            );


            /*
             * Le serveur doit normalement
             * avoir déjà vidé le panier.
             */

            setTimeout(
              () => {

                if (
                  typeof window.chargerModule ===
                  "function"
                ) {

                  window.chargerModule(
                    "commandes"
                  );

                }

              },
              1500
            );

          }

        }
      );


    /*
     * On arrête l'écoute après 2 minutes.
     */

    setTimeout(
      () => {

        if (!finished) {

          unsubscribe();

          showStatus(
            "⏳ Le paiement est toujours en cours de vérification. Ne repayer pas immédiatement. Consultez votre commande dans quelques instants.",
            "info"
          );

        }

      },
      120000
    );

  }

}
