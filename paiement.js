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
          minmax(280px,0.9fr)
          minmax(320px,1.1fr);

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
        padding:17px;
        margin-bottom:18px;
      }

      .dak-provider-name {
        font-size:24px;
        font-weight:900;
      }

      .dak-provider-name span {
        color:#d4af37;
      }

      .dak-provider-text {
        color:#aaa;
        font-size:12px;
        line-height:1.6;
        margin-top:8px;
      }

      .dak-secure {
        margin-top:13px;
        padding:10px;

        background:rgba(34,197,94,.08);
        border:1px solid rgba(34,197,94,.25);

        border-radius:8px;

        color:#70e090;
        font-size:12px;
      }

      .dak-cart {
        max-height:300px;
        overflow-y:auto;
        margin-bottom:15px;
      }

      .dak-cart-item {
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;

        background:#12161f;
        border-radius:8px;

        padding:11px;
        margin-bottom:8px;

        font-size:13px;
      }

      .dak-summary {
        display:flex;
        justify-content:space-between;

        color:#ccc;
        margin-bottom:10px;
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

      @media(max-width:850px) {

        .dak-payment-grid {
          grid-template-columns:1fr;
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
            👤 Informations du client
          </div>


          <div class="dak-provider">

            <div class="dak-provider-name">
              Feda<span>Pay</span>
            </div>

            <div class="dak-provider-text">

              Après validation de cette page,
              FedaPay ouvrira son interface sécurisée.

              Vous pourrez alors choisir le moyen de
              paiement disponible pour votre transaction.

              <br><br>

              Le montant affiché dans FedaPay correspondra
              au montant réel de la commande.

            </div>

            <div class="dak-secure">
              🔒 Paiement traité par FedaPay
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
              Comment ça fonctionne ?
            </strong>

            <br><br>

            1️⃣ Vérifiez vos informations.<br>
            2️⃣ Vérifiez le montant total.<br>
            3️⃣ Cliquez sur « Payer maintenant ».<br>
            4️⃣ FedaPay s'ouvre.<br>
            5️⃣ Choisissez votre moyen de paiement.<br>
            6️⃣ Effectuez le paiement.<br>
            7️⃣ FedaPay confirme la transaction.<br>
            8️⃣ DAKPRO ÉLITE met ensuite la commande à jour.

          </div>

        </div>


        <!-- LIVRAISON -->

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
            🛒 Récapitulatif
          </div>


          <div
            id="cartItemsContainer"
            class="dak-cart"
          >
            Chargement du panier...
          </div>


          <div class="dak-summary">

            <span>
              Nombre d'articles
            </span>

            <strong id="checkoutItemsCount">
              0
            </strong>

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

  let currentCartItems = {};

  let currentCartCount = 0;

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


        const subtotal =
          realPrice * qty;


        currentCartTotalFCFA +=
          subtotal;


        currentCartCount +=
          qty;


        currentCartItems[key] = {

          id:
            prodId,

          nom:
            item.nom ||
            item.title ||
            publication?.nom ||
            publication?.title ||
            "Produit DAKPRO ÉLITE",

          image:
            item.image ||
            item.imageUrl ||
            publication?.image ||
            publication?.imageUrl ||
            "",

          prixUnitaire:
            realPrice,

          quantite:
            qty,

          total:
            subtotal

        };


        const row =
          document.createElement(
            "div"
          );


        row.className =
          "dak-cart-item";


        row.innerHTML = `

          <div style="
            flex:1;
          ">

            <strong>
              ${escapeHTML(
                currentCartItems[key].nom
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


          <strong style="
            color:#70e090;
            white-space:nowrap;
          ">
            ${formatCFA(subtotal)}
          </strong>

        `;


        cartItemsContainer.appendChild(
          row
        );

      }


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
     TOTAL
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
        currentCartTotalFCFA > 0

          ? `⚡ Payer maintenant (${formatCFA(
              currentCartTotalFCFA
            )})`

          : "⚡ Payer maintenant";

    }

  }


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