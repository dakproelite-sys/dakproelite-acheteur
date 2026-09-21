/* ============================================================
   DAKPRO ÉLITE — paiement.js
   ============================================================

   SYSTÈME DE PAIEMENT :
   FedaPay Checkout — LIVE

   CLÉ PUBLIQUE :
   pk_live_DUGntocyIWTtfHBOvFpPtq54

   FIREBASE :
   - users/{uid}/gs/cart
   - users/{uid}/gs/total
   - users/{uid}/panier
   - publications/{publicationId}
   - commandes/{uid}/{orderId}

   IMPORTANT :
   - AUCUNE clé secrète FedaPay ici.
   - AUCUN PIN Mobile Money ici.
   - AUCUN USSD Moov ici.
   - AUCUN CVC/CVV enregistré.
   ============================================================ */

import {
  ref,
  onValue,
  get,
  set,
  update
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";


/* ============================================================
   CONFIGURATION FEDAPAY
   ============================================================ */

const FEDAPAY_PUBLIC_KEY =
  "pk_live_DUGntocyIWTtfHBOvFpPtq54";

const FEDAPAY_ENVIRONMENT = "live";

const FEDAPAY_SCRIPT_URL =
  "https://cdn.fedapay.com/checkout.js?v=1.1.7";


/* ============================================================
   OUTILS
   ============================================================ */

function escapeHTML(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/**
 * Formateur FCFA
 */
export function formatCFA(amount) {
  return (
    new Intl.NumberFormat("fr-FR").format(
      Math.round(Number(amount) || 0)
    ) + " FCFA"
  );
}


/**
 * Charge Checkout.js de FedaPay une seule fois.
 */
function loadFedaPayScript() {
  return new Promise((resolve, reject) => {

    if (window.FedaPay) {
      resolve(window.FedaPay);
      return;
    }

    const existingScript = document.querySelector(
      'script[data-dakpro-fedapay="true"]'
    );

    if (existingScript) {

      const checkLoaded = setInterval(() => {

        if (window.FedaPay) {
          clearInterval(checkLoaded);
          resolve(window.FedaPay);
        }

      }, 100);

      setTimeout(() => {
        clearInterval(checkLoaded);

        if (!window.FedaPay) {
          reject(
            new Error(
              "FedaPay Checkout n'a pas pu être chargé."
            )
          );
        }
      }, 15000);

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
            "FedaPay est chargé mais l'objet FedaPay est introuvable."
          )
        );
      }

    };

    script.onerror = () => {
      reject(
        new Error(
          "Impossible de charger le formulaire FedaPay."
        )
      );
    };

    document.head.appendChild(script);
  });
}


/**
 * Génère un identifiant de commande unique.
 */
function generateOrderId() {

  const random =
    Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

  return `ORD-${Date.now()}-${random}`;
}


/**
 * Génère une référence lisible pour FedaPay.
 */
function generatePaymentReference(orderId) {

  return String(orderId)
    .replace(/[^A-Za-z0-9]/g, "")
    .substring(0, 25);
}


/**
 * Récupère prénom/nom de manière raisonnable
 * à partir du nom complet.
 */
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


/**
 * Nettoyage téléphone pour FedaPay.
 */
function cleanPhone(phone) {

  return String(phone || "")
    .trim()
    .replace(/[^\d+]/g, "");
}


/**
 * Vérifie qu'un retour FedaPay correspond
 * à une transaction approuvée.
 */
function isFedaPayApproved(transaction) {

  if (!transaction) return false;

  const status = String(
    transaction.status || ""
  ).toLowerCase();

  return (
    status === "approved" ||
    status === "approuvé" ||
    status === "approved_paid"
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

  if (!container || !db) return;

  const currentUid =
    userId ||
    (
      auth &&
      auth.currentUser
        ? auth.currentUser.uid
        : null
    );


  /* ==========================================================
     UTILISATEUR NON CONNECTÉ
     ========================================================== */

  if (!currentUid) {

    container.innerHTML = `
      <div style="
        text-align:center;
        padding:50px 20px;
        color:#ff8585;
        font-family:Poppins,sans-serif;
        background:#0a0d14;
        border-radius:15px;
      ">

        <div style="
          font-size:45px;
          margin-bottom:15px;
        ">
          🔐
        </div>

        <h3 style="
          color:#d4af37;
          margin-bottom:10px;
        ">
          Connexion nécessaire
        </h3>

        <p style="
          color:#bbb;
          font-size:14px;
        ">
          Veuillez vous connecter pour accéder
          au panier et effectuer votre paiement
          sur DAKPRO ÉLITE.
        </p>

      </div>
    `;

    return;
  }


  /* ==========================================================
     INTERFACE
     ========================================================== */

  container.innerHTML = `

    <style>

      .dak-pay-wrapper {
        width:100%;
        font-family:'Poppins',Arial,sans-serif;
        color:#fff;
      }

      .pay-title {
        color:#d4af37;
        font-size:20px;
        font-weight:700;
        margin-bottom:20px;
        border-bottom:1px solid #2a2a32;
        padding-bottom:12px;

        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:15px;
        flex-wrap:wrap;
      }

      .pay-subtitle {
        color:#d4af37;
        font-size:16px;
        font-weight:700;
        margin-bottom:15px;
        border-bottom:1px solid #222;
        padding-bottom:9px;
      }

      .pay-grid {
        display:grid;
        grid-template-columns:
          minmax(280px,0.85fr)
          minmax(320px,1.15fr);
        gap:20px;
      }

      .pay-box {
        background:#0a0d14;
        border:1px solid #222;
        border-radius:14px;
        padding:20px;
        box-shadow:
          0 8px 25px rgba(0,0,0,.15);
      }

      .payment-provider {
        background:
          linear-gradient(
            135deg,
            #11151e,
            #080a0f
          );

        border:1px solid #333;
        border-radius:12px;
        padding:18px;
        margin-bottom:18px;
      }

      .fedapay-logo-text {
        font-size:22px;
        font-weight:800;
        color:#fff;
        letter-spacing:.5px;
      }

      .fedapay-logo-text span {
        color:#d4af37;
      }

      .fedapay-description {
        color:#aaa;
        font-size:12px;
        line-height:1.6;
        margin-top:8px;
      }

      .secure-line {
        margin-top:14px;
        padding:10px;
        background:rgba(34,197,94,.08);
        border:1px solid rgba(34,197,94,.25);
        color:#70e090;
        border-radius:8px;
        font-size:12px;
      }

      .form-group {
        margin-bottom:13px;
      }

      .form-group label {
        display:block;
        font-size:12px;
        color:#aaa;
        margin-bottom:6px;
      }

      .form-input {
        width:100%;
        box-sizing:border-box;
        padding:11px;
        background:#12161f;
        border:1px solid #333;
        border-radius:8px;
        color:#fff;
        outline:none;
        font-size:13px;
      }

      .form-input:focus {
        border-color:#d4af37;
      }

      .cart-list {
        max-height:230px;
        overflow-y:auto;
        margin-bottom:15px;
      }

      .cart-item-row {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;

        background:#12161f;
        padding:10px 12px;
        border-radius:7px;
        margin-bottom:8px;
        font-size:13px;
      }

      .summary-row {
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:10px;
        font-size:14px;
        color:#ccc;
      }

      .summary-row.total {
        border-top:1px dashed #333;
        padding-top:14px;
        margin-top:12px;

        color:#d4af37;
        font-size:19px;
        font-weight:800;
      }

      .btn-pay-now {
        background:#d4af37;
        color:#000;
        font-weight:800;
        padding:15px;
        border:none;
        border-radius:9px;
        cursor:pointer;
        width:100%;
        font-size:16px;
        margin-top:17px;
        transition:.25s;
      }

      .btn-pay-now:hover {
        background:#f3e5ab;
        transform:translateY(-1px);
      }

      .btn-pay-now:disabled {
        opacity:.6;
        cursor:not-allowed;
        transform:none;
      }

      .btn-clear-cart {
        background:transparent;
        color:#ef4444;
        border:1px solid #ef4444;
        font-weight:600;
        padding:8px 12px;
        border-radius:6px;
        cursor:pointer;
        font-size:12px;
      }

      .info-card {
        background:#12161f;
        border:1px solid #292d37;
        border-radius:10px;
        padding:13px;
        margin-bottom:12px;
      }

      .info-card strong {
        color:#d4af37;
      }

      .payment-status {
        display:none;
        margin-top:14px;
        padding:12px;
        border-radius:8px;
        font-size:13px;
        text-align:center;
      }

      .fedapay-modal {
        position:fixed;
        inset:0;
        z-index:999999;

        display:flex;
        align-items:center;
        justify-content:center;

        padding:18px;

        background:
          rgba(0,0,0,.78);

        backdrop-filter:blur(5px);
      }

      .fedapay-modal-box {
        width:min(520px,100%);
        max-height:90vh;
        overflow:auto;

        background:#080b11;
        border:1px solid #333;
        border-radius:16px;
        padding:20px;

        box-shadow:
          0 20px 60px rgba(0,0,0,.55);
      }

      .fedapay-modal-header {
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:15px;

        border-bottom:1px solid #252832;
        padding-bottom:12px;
        margin-bottom:15px;
      }

      .fedapay-close {
        background:#222;
        color:#fff;
        border:0;
        width:34px;
        height:34px;
        border-radius:50%;
        cursor:pointer;
        font-size:18px;
      }

      @media(max-width:850px) {

        .pay-grid {
          grid-template-columns:1fr;
        }

        .pay-title {
          font-size:17px;
        }

      }

    </style>


    <div class="dak-pay-wrapper">

      <div class="pay-title">

        <span>
          💳 DAKPRO ÉLITE — Paiement
        </span>

        <button
          class="btn-clear-cart"
          id="btnClearCart"
        >
          🗑️ Vider le panier
        </button>

      </div>


      <div class="pay-grid">


        <!-- =================================================
             INFORMATIONS CLIENT / FEDAPAY
             ================================================= -->

        <div class="pay-box">

          <div class="pay-subtitle">
            👤 Informations du client
          </div>


          <div class="payment-provider">

            <div class="fedapay-logo-text">
              Feda<span>Pay</span>
            </div>

            <div class="fedapay-description">

              Le paiement de votre commande sera effectué
              directement avec le formulaire sécurisé
              FedaPay.

              <br><br>

              FedaPay vous permettra de choisir le moyen
              de paiement disponible pour votre transaction.

            </div>

            <div class="secure-line">
              🔒 Paiement traité par FedaPay
            </div>

          </div>


          <div class="form-group">

            <label>
              Nom complet
            </label>

            <input
              type="text"
              id="payCustomerName"
              class="form-input"
              placeholder="Ex : Jean Dupont"
            >

          </div>


          <div class="form-group">

            <label>
              Adresse e-mail
            </label>

            <input
              type="email"
              id="payCustomerEmail"
              class="form-input"
              placeholder="Ex : client@email.com"
            >

          </div>


          <div class="form-group">

            <label>
              Téléphone
            </label>

            <input
              type="tel"
              id="payCustomerPhone"
              class="form-input"
              placeholder="+229 90 00 00 00"
            >

          </div>


          <div class="info-card">

            <strong>ℹ️ Comment ça fonctionne ?</strong>

            <p style="
              color:#aaa;
              font-size:12px;
              line-height:1.6;
              margin:8px 0 0;
            ">

              1. Vérifiez votre commande.<br>
              2. Cliquez sur « Payer maintenant ».<br>
              3. Le formulaire FedaPay s'ouvre.<br>
              4. Choisissez votre moyen de paiement.<br>
              5. Suivez les instructions de FedaPay.<br>
              6. Une fois le paiement validé,
                 votre commande est enregistrée.

            </p>

          </div>

        </div>


        <!-- =================================================
             LIVRAISON + PANIER
             ================================================= -->

        <div class="pay-box">

          <div class="pay-subtitle">
            📍 Informations de livraison
          </div>


          <div class="form-group">

            <label>
              Nom complet du destinataire
            </label>

            <input
              type="text"
              id="shippingName"
              class="form-input"
              placeholder="Ex : Jean Dupont"
            >

          </div>


          <div class="form-group">

            <label>
              Téléphone de joignabilité
            </label>

            <input
              type="tel"
              id="shippingPhone"
              class="form-input"
              placeholder="+229 97 00 00 00"
            >

          </div>


          <div class="form-group">

            <label>
              Adresse exacte de livraison
            </label>

            <input
              type="text"
              id="shippingAddress"
              class="form-input"
              placeholder="Quartier, rue, maison..."
            >

          </div>


          <div style="
            display:flex;
            gap:10px;
          ">

            <div
              class="form-group"
              style="flex:1;"
            >

              <label>
                Ville
              </label>

              <input
                type="text"
                id="shippingCity"
                class="form-input"
                placeholder="Cotonou"
              >

            </div>


            <div
              class="form-group"
              style="flex:1;"
            >

              <label>
                Pays
              </label>

              <input
                type="text"
                id="shippingCountry"
                class="form-input"
                placeholder="Bénin"
              >

            </div>

          </div>


          <div class="pay-subtitle" style="
            margin-top:20px;
          ">
            🛒 Votre panier
          </div>


          <div
            id="cartItemsContainer"
            class="cart-list"
          >

            <div style="
              color:#888;
              font-size:12px;
            ">
              Chargement du panier...
            </div>

          </div>


          <div class="summary-row">

            <span>
              Nombre d'articles :
            </span>

            <span id="checkoutItemsCount">
              0
            </span>

          </div>


          <div class="summary-row total">

            <span>
              Total à payer :
            </span>

            <span id="checkoutTotalAmount">
              0 FCFA
            </span>

          </div>


          <button
            class="btn-pay-now"
            id="btnExecutePayment"
          >
            ⚡ Payer maintenant (0 FCFA)
          </button>


          <div
            id="payStatusMessage"
            class="payment-status"
          ></div>

        </div>

      </div>

    </div>
  `;


  /* ==========================================================
     VARIABLES
     ========================================================== */

  let currentCartTotalFCFA = 0;

  let currentCartItems = {};

  let currentCartCount = 0;

  let paymentInProgress = false;

  let lastCreatedOrderId = null;


  /* ==========================================================
     RÉFÉRENCES DOM
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


  /* ==========================================================
     1. CHARGEMENT DU PROFIL
     ========================================================== */

  get(
    ref(db, `users/${currentUid}`)
  )
    .then((snapshot) => {

      if (!snapshot.exists()) return;

      const u = snapshot.val() || {};


      const fullName =
        u.nom ||
        u.displayName ||
        u.name ||
        "";


      const email =
        u.email ||
        (
          auth &&
          auth.currentUser
            ? auth.currentUser.email
            : ""
        ) ||
        "";


      const phone =
        u.telephone ||
        u.phone ||
        "";


      if (
        customerName &&
        !customerName.value
      ) {
        customerName.value = fullName;
      }


      if (
        customerEmail &&
        !customerEmail.value
      ) {
        customerEmail.value = email;
      }


      if (
        customerPhone &&
        !customerPhone.value
      ) {
        customerPhone.value = phone;
      }


      if (
        shippingName &&
        !shippingName.value
      ) {
        shippingName.value = fullName;
      }


      if (
        shippingPhone &&
        !shippingPhone.value
      ) {
        shippingPhone.value = phone;
      }


      if (
        shippingAddress &&
        u.adresse
      ) {
        shippingAddress.value =
          u.adresse;
      }


      if (
        shippingCity &&
        u.ville
      ) {
        shippingCity.value =
          u.ville;
      }


      if (
        shippingCountry &&
        u.pays
      ) {
        shippingCountry.value =
          u.pays;
      }

    })
    .catch((error) => {

      console.warn(
        "Impossible de charger le profil :",
        error
      );

    });


  /* ==========================================================
     2. SURVEILLANCE DU PANIER
     ========================================================== */

  const cartRef =
    ref(
      db,
      `users/${currentUid}/gs/cart`
    );


  onValue(
    cartRef,
    async (snapshot) => {

      currentCartTotalFCFA = 0;

      currentCartItems = {};

      currentCartCount = 0;


      if (!cartItemsContainer) return;


      cartItemsContainer.innerHTML = "";


      if (!snapshot.exists()) {

        cartItemsContainer.innerHTML = `
          <div style="
            color:#888;
            font-size:12px;
            text-align:center;
            padding:15px;
          ">
            🛒 Votre panier est vide.
          </div>
        `;

        updateCartSummary();

        return;
      }


      const cartData =
        snapshot.val() || {};


      const keys =
        Object.keys(cartData);


      for (const key of keys) {

        const item =
          cartData[key] || {};


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
          parseFloat(
            item.prixUnitaire ||
            item.prix ||
            item.prixNormal ||
            0
          );


        /* ---------------------------------------------
           Vérification du prix officiel
           dans publications
           --------------------------------------------- */

        try {

          const pubSnap =
            await get(
              ref(
                db,
                `publications/${prodId}`
              )
            );


          if (pubSnap.exists()) {

            const pubData =
              pubSnap.val() || {};


            const pNormal =
              parseFloat(
                pubData.prixNormal ||
                pubData.prix ||
                0
              );


            const pPromo =
              parseFloat(
                pubData.prixPromo ||
                0
              );


            if (
              pPromo > 0 &&
              pNormal > 0 &&
              pPromo < pNormal
            ) {

              realPrice = pPromo;

            } else {

              realPrice = pNormal;

            }

          }

        } catch (error) {

          console.warn(
            "Erreur vérification prix :",
            error
          );

        }


        if (
          !Number.isFinite(realPrice) ||
          realPrice < 0
        ) {
          realPrice = 0;
        }


        const subtotal =
          realPrice * qty;


        currentCartTotalFCFA +=
          subtotal;


        currentCartCount +=
          qty;


        currentCartItems[key] = {

          id: prodId,

          nom:
            item.nom ||
            item.title ||
            "Produit DAKPRO ÉLITE",

          prixUnitaire:
            realPrice,

          quantite:
            qty,

          total:
            subtotal

        };


        /* ---------------------------------------------
           Affichage
           --------------------------------------------- */

        const row =
          document.createElement(
            "div"
          );


        row.className =
          "cart-item-row";


        row.innerHTML = `

          <div style="flex:1;">

            <strong>
              ${escapeHTML(
                item.nom ||
                item.title ||
                "Produit"
              )}
            </strong>

            <br>

            <span style="
              color:#d4af37;
              font-size:11px;
            ">
              ${formatCFA(realPrice)}
              × ${qty}
            </span>

          </div>

          <div style="
            font-weight:bold;
            color:#70e090;
            white-space:nowrap;
          ">
            ${formatCFA(subtotal)}
          </div>

        `;


        cartItemsContainer.appendChild(
          row
        );

      }


      if (
        keys.length === 0
      ) {

        cartItemsContainer.innerHTML = `
          <div style="
            color:#888;
            font-size:12px;
            text-align:center;
            padding:15px;
          ">
            🛒 Votre panier est vide.
          </div>
        `;

      }


      updateCartSummary();

    }
  );


  /* ==========================================================
     MISE À JOUR DU TOTAL
     ========================================================== */

  function updateCartSummary() {

    if (checkoutItemsCount) {

      checkoutItemsCount.textContent =
        currentCartCount;

    }


    if (checkoutTotalAmount) {

      checkoutTotalAmount.textContent =
        formatCFA(
          currentCartTotalFCFA
        );

    }


    if (executePaymentBtn) {

      executePaymentBtn.textContent =
        `⚡ Payer maintenant (${formatCFA(
          currentCartTotalFCFA
        )})`;

    }

  }


  /* ==========================================================
     3. VIDER LE PANIER
     ========================================================== */

  document
    .getElementById("btnClearCart")
    ?.addEventListener(
      "click",
      async () => {

        const confirmation =
          confirm(
            "Voulez-vous vraiment vider tout votre panier ?"
          );


        if (!confirmation) return;


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


          alert(
            "✅ Votre panier a été vidé avec succès."
          );


        } catch (error) {

          console.error(
            "Erreur vidage panier :",
            error
          );


          alert(
            "❌ Impossible de vider le panier."
          );

        }

      }
    );


  /* ==========================================================
     4. OUVERTURE DU FORMULAIRE FEDAPAY
     ========================================================== */

  executePaymentBtn
    ?.addEventListener(
      "click",
      async () => {

        if (paymentInProgress) {
          return;
        }


        /* ---------------------------------------------
           Vérification panier
           --------------------------------------------- */

        if (
          currentCartTotalFCFA <= 0 ||
          Object.keys(
            currentCartItems
          ).length === 0
        ) {

          alert(
            "Votre panier DAKPRO ÉLITE est vide."
          );

          return;
        }


        /* ---------------------------------------------
           Vérification livraison
           --------------------------------------------- */

        const shipName =
          shippingName
            ? shippingName.value.trim()
            : "";


        const shipPhone =
          shippingPhone
            ? shippingPhone.value.trim()
            : "";


        const shipAddress =
          shippingAddress
            ? shippingAddress.value.trim()
            : "";


        const shipCity =
          shippingCity
            ? shippingCity.value.trim()
            : "";


        const shipCountry =
          shippingCountry
            ? shippingCountry.value.trim()
            : "";


        if (
          !shipName ||
          !shipPhone ||
          !shipAddress
        ) {

          alert(
            "Veuillez remplir le nom, le téléphone et l'adresse de livraison."
          );

          return;
        }


        /* ---------------------------------------------
           Informations client FedaPay
           --------------------------------------------- */

        const clientName =
          customerName
            ? customerName.value.trim()
            : shipName;


        const clientEmail =
          customerEmail
            ? customerEmail.value.trim()
            : "";


        const clientPhone =
          customerPhone
            ? customerPhone.value.trim()
            : shipPhone;


        if (!clientName) {

          alert(
            "Veuillez renseigner le nom du client."
          );

          return;
        }


        if (!clientEmail) {

          alert(
            "Veuillez renseigner l'adresse e-mail du client."
          );

          return;
        }


        /* ---------------------------------------------
           Vérification e-mail
           --------------------------------------------- */

        const emailValid =
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(clientEmail);


        if (!emailValid) {

          alert(
            "Veuillez saisir une adresse e-mail valide."
          );

          return;
        }


        /* ---------------------------------------------
           Verrouillage bouton
           --------------------------------------------- */

        paymentInProgress = true;


        executePaymentBtn.disabled =
          true;


        if (payStatusMessage) {

          payStatusMessage.style.display =
            "block";

          payStatusMessage.style.background =
            "rgba(212,175,55,.08)";

          payStatusMessage.style.border =
            "1px solid rgba(212,175,55,.25)";

          payStatusMessage.style.color =
            "#d4af37";

          payStatusMessage.textContent =
            "Préparation sécurisée de votre paiement FedaPay...";

        }


        try {

          /* -------------------------------------------
             Charger FedaPay Checkout
             ------------------------------------------- */

          const FedaPay =
            await loadFedaPayScript();


          /* -------------------------------------------
             Préparation commande
             ------------------------------------------- */

          const orderId =
            generateOrderId();


          lastCreatedOrderId =
            orderId;


          const paymentReference =
            generatePaymentReference(
              orderId
            );


          const nameParts =
            splitName(
              clientName
            );


          const amount =
            Math.round(
              currentCartTotalFCFA
            );


          /* -------------------------------------------
             Création commande EN ATTENTE
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

            montantTotal:
              amount,

            devise:
              "XOF",

            moyenPaiement: {

              fournisseur:
                "FedaPay",

              type:
                "FedaPay Checkout",

              environnement:
                "live",

              reference:
                paymentReference

            },

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

            statut:
              "En attente de paiement",

            statutPaiement:
              "en_attente",

            statutLivraison:
              "En attente du paiement",

            paiementFedaPay: {

              fournisseur:
                "FedaPay",

              environnement:
                "live",

              reference:
                paymentReference,

              transactionId:
                null,

              statut:
                "pending"

            },

            date:
              Date.now()

          };


          await set(
            ref(
              db,
              `commandes/${currentUid}/${orderId}`
            ),
            orderPayload
          );


          /* -------------------------------------------
             Préparation du widget FedaPay
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

              customer: {

                email:
                  clientEmail,

                firstname:
                  nameParts.firstname,

                lastname:
                  nameParts.lastname,

                phone_number: {

                  number:
                    cleanPhone(
                      clientPhone
                    ),

                  country:
                    "bj"

                }

              },


              onComplete:
                async (response) => {

                  console.log(
                    "Réponse FedaPay :",
                    response
                  );


                  const transaction =
                    response
                      ? response.transaction
                      : null;


                  const approved =
                    isFedaPayApproved(
                      transaction
                    );


                  /* ===================================
                     PAIEMENT APPROUVÉ
                     =================================== */

                  if (approved) {

                    try {

                      const transactionId =
                        transaction &&
                        transaction.id
                          ? transaction.id
                          : null;


                      await update(
                        ref(
                          db,
                          `commandes/${currentUid}/${orderId}`
                        ),
                        {

                          statut:
                            "Payé",

                          statutPaiement:
                            "payé",

                          statutLivraison:
                            "En cours de traitement",

                          paiementFedaPay: {

                            fournisseur:
                              "FedaPay",

                            environnement:
                              "live",

                            reference:
                              paymentReference,

                            transactionId:
                              transactionId,

                            statut:
                              "approved",

                            confirmeLe:
                              Date.now()

                          },

                          paiementConfirmeLe:
                            Date.now()

                        }
                      );


                      /* ---------------------------------
                         Panier vidé UNIQUEMENT
                         après paiement approuvé
                         --------------------------------- */

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


                      if (payStatusMessage) {

                        payStatusMessage.style.display =
                          "block";

                        payStatusMessage.style.background =
                          "rgba(34,197,94,.08)";

                        payStatusMessage.style.border =
                          "1px solid rgba(34,197,94,.3)";

                        payStatusMessage.style.color =
                          "#70e090";

                        payStatusMessage.textContent =
                          `✅ Paiement confirmé. Commande ${orderId} validée.`;

                      }


                      paymentInProgress =
                        false;


                      executePaymentBtn.disabled =
                        false;


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


                    } catch (error) {

                      console.error(
                        "Erreur confirmation commande :",
                        error
                      );


                      paymentInProgress =
                        false;

                      executePaymentBtn.disabled =
                        false;


                      if (payStatusMessage) {

                        payStatusMessage.style.display =
                          "block";

                        payStatusMessage.style.color =
                          "#ff8585";

                        payStatusMessage.textContent =
                          "Le paiement a été signalé par FedaPay, mais l'enregistrement de la commande a rencontré un problème. Contactez l'administration avec la référence " +
                          paymentReference;

                      }

                    }


                    return;
                  }


                  /* ===================================
                     PAIEMENT NON CONFIRMÉ
                     =================================== */

                  try {

                    await update(
                      ref(
                        db,
                        `commandes/${currentUid}/${orderId}`
                      ),
                      {

                        statutPaiement:
                          "non_confirmé",

                        "paiementFedaPay/statut":
                          "non_confirmé",

                        "paiementFedaPay/motif":
                          response &&
                          response.reason
                            ? String(
                                response.reason
                              )
                            : "Paiement non finalisé",

                        "paiementFedaPay/miseAJour":
                          Date.now()

                      }
                    );

                  } catch (error) {

                    console.warn(
                      "Impossible de mettre à jour le statut :",
                      error
                    );

                  }


                  paymentInProgress =
                    false;


                  executePaymentBtn.disabled =
                    false;


                  if (payStatusMessage) {

                    payStatusMessage.style.display =
                      "block";

                    payStatusMessage.style.background =
                      "rgba(239,68,68,.08)";

                    payStatusMessage.style.border =
                      "1px solid rgba(239,68,68,.25)";

                    payStatusMessage.style.color =
                      "#ff8585";

                    payStatusMessage.textContent =
                      `Paiement non finalisé. Votre commande ${orderId} reste enregistrée. Vous pouvez réessayer.`;

                  }

                }

            });


          /* -------------------------------------------
             Ouverture du formulaire FedaPay
             ------------------------------------------- */

          if (
            !widget ||
            typeof widget.open !==
              "function"
          ) {

            throw new Error(
              "Impossible d'ouvrir FedaPay Checkout."
            );

          }


          if (payStatusMessage) {

            payStatusMessage.style.color =
              "#d4af37";

            payStatusMessage.textContent =
              `Ouverture du formulaire FedaPay pour ${formatCFA(amount)}...`;

          }


          widget.open();


        } catch (error) {

          console.error(
            "Erreur FedaPay :",
            error
          );


          paymentInProgress =
            false;


          executePaymentBtn.disabled =
            false;


          if (payStatusMessage) {

            payStatusMessage.style.display =
              "block";

            payStatusMessage.style.background =
              "rgba(239,68,68,.08)";

            payStatusMessage.style.border =
              "1px solid rgba(239,68,68,.25)";

            payStatusMessage.style.color =
              "#ff8585";

            payStatusMessage.textContent =
              "❌ Impossible d'ouvrir le paiement FedaPay. Vérifiez votre connexion et la configuration FedaPay.";

          }


          alert(
            "Impossible d'ouvrir le formulaire de paiement FedaPay."
          );

        }

      }
    );


  /* ==========================================================
     FIN INIT
     ========================================================== */

}