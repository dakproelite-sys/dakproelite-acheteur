// ============================================================
// DAKPRO ÉLITE — paiement.js
// PANIER + PAIEMENT MOBILE MONEY
//
// Architecture compatible avec :
// Firebase Realtime Database
// init(container, db, auth, userId)
//
// CONFIGURATION ADMIN ACTUELLE :
// paiement/moov
//
// Champs utilisés :
// actif
// code_ussd
// nom_marchand
// numero_marchand
// updatedAt
//
// IMPORTANT :
// Le PIN Mobile Money n'est JAMAIS enregistré dans Firebase.
// Le PIN est saisi uniquement dans l'écran sécurisé de Moov.
// ============================================================

import {
  ref,
  onValue,
  get,
  set,
  push,
  update
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";


// ============================================================
// OUTILS
// ============================================================

function escapeHTML(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


export function formatCFA(amount) {
  return (
    new Intl.NumberFormat("fr-FR").format(
      Math.round(Number(amount) || 0)
    ) +
    " FCFA"
  );
}


// ============================================================
// NORMALISATION OPERATEUR
// ============================================================

function normalizeOperator(operator) {

  const value = String(operator || "")
    .trim()
    .toLowerCase();

  if (value === "moov money") return "moov";
  if (value === "flooz") return "moov";
  if (value === "moov") return "moov";

  if (value === "mtn mobile money") return "mtn";
  if (value === "mtn") return "mtn";

  if (value === "wave") return "wave";

  if (value === "orange money") return "orange";
  if (value === "orange") return "orange";

  if (value === "celtiis cash") return "celtiis";
  if (value === "celtiis") return "celtiis";

  if (value === "airtel money") return "airtel";
  if (value === "airtel") return "airtel";

  return value || "moov";
}


// ============================================================
// CONSTRUCTION DU CODE USSD
//
// Compatible avec votre base actuelle.
//
// Si la base contient par exemple :
// *855*4*1*342612*2020#
//
// Le système remplace automatiquement 2020 par le montant.
//
// Si la base contient :
// *855*4*1*342612*{MONTANT}*{REFERENCE}#
//
// Les deux variables sont également remplacées.
//
// Pour Moov Bénin, la référence est ajoutée lorsque nécessaire.
// ============================================================

function buildUSSDCode({
  template,
  merchantNumber,
  amount,
  reference,
  operator
}) {

  let ussd = String(template || "").trim();

  const montant = String(
    Math.round(Number(amount) || 0)
  );

  const refPaiement = String(
    reference || ""
  ).trim();

  // ----------------------------------------------------------
  // Variables explicites
  // ----------------------------------------------------------

  ussd = ussd.replace(
    /\{MONTANT\}/gi,
    montant
  );

  ussd = ussd.replace(
    /\{AMOUNT\}/gi,
    montant
  );

  ussd = ussd.replace(
    /\{REFERENCE\}/gi,
    refPaiement
  );

  ussd = ussd.replace(
    /\{REF\}/gi,
    refPaiement
  );

  ussd = ussd.replace(
    /\{NUMERO_MARCHAND\}/gi,
    String(merchantNumber || "")
  );

  ussd = ussd.replace(
    /\{MARCHAND\}/gi,
    String(merchantNumber || "")
  );

  // ----------------------------------------------------------
  // CAS MOOV
  // ----------------------------------------------------------

  if (
    normalizeOperator(operator) === "moov"
  ) {

    // Si le code contient déjà les variables
    // et qu'elles ont été remplacées, on le conserve.

    if (
      ussd.includes(refPaiement) &&
      ussd.includes(montant)
    ) {

      return ussd;
    }

    // --------------------------------------------------------
    // Si le code actuel de Firebase ressemble à :
    //
    // *855*4*1*342612*2020#
    //
    // on reconstruit le format marchand proprement :
    //
    // *855*4*1*342612*MONTANT*REFERENCE#
    // --------------------------------------------------------

    const cleanTemplate =
      ussd
        .replace(/^tel:/i, "")
        .trim();

    const match = cleanTemplate.match(
      /^\*855\*4\*1\*(\d+)\*(\d+)(?:\*(.*?))?#?$/
    );

    if (match) {

      const merchant =
        match[1] || merchantNumber;

      return (
        "*855*4*1*" +
        merchant +
        "*" +
        montant +
        "*" +
        refPaiement +
        "#"
      );
    }

    // --------------------------------------------------------
    // Si aucun modèle exploitable :
    // construction depuis numero_marchand
    // --------------------------------------------------------

    if (merchantNumber) {

      return (
        "*855*4*1*" +
        merchantNumber +
        "*" +
        montant +
        "*" +
        refPaiement +
        "#"
      );
    }
  }

  // ----------------------------------------------------------
  // AUTRES OPERATEURS
  //
  // Pour ceux-ci, la configuration admin doit fournir
  // le modèle exact dans code_ussd.
  // ----------------------------------------------------------

  return ussd
    .replace(/\{MONTANT\}/gi, montant)
    .replace(/\{AMOUNT\}/gi, montant)
    .replace(/\{REFERENCE\}/gi, refPaiement)
    .replace(/\{REF\}/gi, refPaiement)
    .trim();
}


// ============================================================
// CREATION DE L'URL TELEPHONE
// ============================================================

function makeTelURL(ussdCode) {

  const clean = String(ussdCode || "")
    .replace(/^tel:/i, "")
    .trim();

  return (
    "tel:" +
    encodeURIComponent(clean)
  );
}


// ============================================================
// INIT
// ============================================================

export function init(
  container,
  db,
  auth,
  userId
) {

  if (!container || !db) {
    console.error(
      "paiement.js : container ou db manquant."
    );
    return;
  }


  // ==========================================================
  // UTILISATEUR CONNECTÉ
  // ==========================================================

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
        text-align:center;
        padding:40px;
        color:#ff8585;
        font-family:Poppins,sans-serif;
      ">
        Veuillez vous connecter pour accéder
        au panier et au paiement DAKPROELITE.
      </div>
    `;

    return;
  }


  // ==========================================================
  // INTERFACE
  // ==========================================================

  container.innerHTML = `

    <style>

      .pay-title {
        color:#d4af37;
        font-size:20px;
        font-weight:bold;
        margin-bottom:20px;
        border-bottom:1px solid #2a2a32;
        padding-bottom:10px;
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px;
        flex-wrap:wrap;
      }

      .pay-grid {
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:20px;
      }

      .pay-box {
        background:#0a0d14;
        border:1px solid #222;
        border-radius:12px;
        padding:20px;
      }

      .sub-title {
        color:#d4af37;
        font-size:16px;
        font-weight:bold;
        margin-bottom:15px;
        border-bottom:1px solid #222;
        padding-bottom:8px;
      }

      .form-group {
        margin-bottom:12px;
      }

      .form-group label {
        display:block;
        font-size:12px;
        color:#aaa;
        margin-bottom:5px;
      }

      .form-input,
      .form-select {
        width:100%;
        box-sizing:border-box;
        padding:10px;
        background:#12161f;
        border:1px solid #333;
        border-radius:8px;
        color:#fff;
        outline:none;
        font-size:13px;
      }

      .form-input:focus,
      .form-select:focus {
        border-color:#d4af37;
      }

      .btn-action {
        background:#d4af37;
        color:#000;
        font-weight:bold;
        padding:12px;
        border:none;
        border-radius:8px;
        cursor:pointer;
        width:100%;
        margin-top:10px;
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

      .btn-pay-now {
        background:#22c55e;
        color:#000;
        font-weight:bold;
        padding:14px;
        border:none;
        border-radius:8px;
        cursor:pointer;
        width:100%;
        font-size:16px;
        margin-top:15px;
      }

      .btn-pay-now:disabled {
        opacity:.55;
        cursor:not-allowed;
      }

      .saved-method-item {
        background:#12161f;
        border:1px solid #2a2a32;
        padding:12px;
        border-radius:8px;
        margin-bottom:10px;
        display:flex;
        align-items:center;
        gap:10px;
        cursor:pointer;
      }

      .saved-method-item.selected {
        border-color:#22c55e;
        background:#102417;
      }

      .cart-item-row {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        background:#12161f;
        padding:8px 12px;
        border-radius:6px;
        margin-bottom:8px;
        font-size:13px;
      }

      .summary-row {
        display:flex;
        justify-content:space-between;
        margin-bottom:10px;
        font-size:14px;
        color:#ccc;
      }

      .summary-row.total {
        border-top:1px dashed #333;
        padding-top:12px;
        color:#d4af37;
        font-size:18px;
        font-weight:bold;
      }

      .payment-security-note {
        background:#101820;
        border:1px solid #263544;
        color:#aebbc7;
        padding:10px;
        border-radius:8px;
        font-size:11px;
        line-height:1.5;
        margin-top:12px;
      }

      @media (max-width:850px) {

        .pay-grid {
          grid-template-columns:1fr;
        }

      }

    </style>


    <div class="pay-title">

      <span>
        💳 DAKPROELITE - Panier & Paiement
      </span>

      <button
        class="btn-clear-cart"
        id="btnClearCart"
      >
        🗑️ Vider le panier
      </button>

    </div>


    <div class="pay-grid">


      <!-- =====================================================
           MOYEN DE PAIEMENT
      ====================================================== -->

      <div class="pay-box">

        <div class="sub-title">
          ⚙️ Enregistrer un compte de paiement
        </div>


        <div class="form-group">

          <label>
            Type de paiement
          </label>

          <select
            id="payType"
            class="form-select"
          >

            <option value="momo">
              Mobile Money
              (Moov / MTN / Wave / Orange /
              Celtiis / Airtel)
            </option>

            <option value="card">
              Carte Bancaire
            </option>

          </select>

        </div>


        <div class="form-group">

          <label>
            Nom & Prénom du titulaire
          </label>

          <input
            type="text"
            id="payHolder"
            class="form-input"
            placeholder="Ex : Jean Dupont"
            autocomplete="name"
          >

        </div>


        <!-- MOBILE MONEY -->

        <div id="momoFields">

          <div class="form-group">

            <label>
              Numéro Mobile Money
            </label>

            <input
              type="tel"
              id="momoNumber"
              class="form-input"
              placeholder="+229 90000000"
              autocomplete="tel"
            >

          </div>


          <div class="form-group">

            <label>
              Opérateur Mobile Money
            </label>

            <select
              id="momoOperator"
              class="form-select"
            >

              <option value="MOOV">
                Moov Money (Flooz)
              </option>

              <option value="MTN">
                MTN Mobile Money
              </option>

              <option value="WAVE">
                Wave
              </option>

              <option value="ORANGE">
                Orange Money
              </option>

              <option value="CELTIIS">
                Celtiis Cash
              </option>

              <option value="AIRTEL">
                Airtel Money
              </option>

            </select>

          </div>

        </div>


        <!-- CARTE -->

        <div
          id="cardFields"
          style="display:none;"
        >

          <div class="form-group">

            <label>
              Numéro de carte
            </label>

            <input
              type="text"
              id="cardNumber"
              class="form-input"
              placeholder="4532 **** **** 8899"
              autocomplete="cc-number"
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
                Expiration
              </label>

              <input
                type="text"
                id="cardExpiry"
                class="form-input"
                placeholder="MM/YY"
                autocomplete="cc-exp"
              >

            </div>


            <div
              class="form-group"
              style="flex:1;"
            >

              <label>
                CVC / CVV
              </label>

              <input
                type="password"
                id="cardCvc"
                class="form-input"
                placeholder="123"
                autocomplete="cc-csc"
              >

            </div>

          </div>

        </div>


        <button
          class="btn-action"
          id="btnSavePaymentMethod"
        >
          💾 Enregistrer cette méthode
        </button>


        <div class="payment-security-note">

          🔐 Votre code secret Mobile Money
          ne doit jamais être enregistré dans
          DAKPROELITE.

          Lors du paiement, il sera demandé
          directement par l'opérateur.

        </div>


        <div style="
          margin-top:25px;
        ">

          <div class="sub-title">
            📱 Mes comptes enregistrés
          </div>

          <div id="savedMethodsList">

            <div style="
              color:#888;
              font-size:12px;
            ">
              Chargement de vos méthodes...
            </div>

          </div>

        </div>

      </div>


      <!-- =====================================================
           LIVRAISON + PANIER
      ====================================================== -->

      <div class="pay-box">

        <div class="sub-title">
          📍 Informations de Livraison
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
            autocomplete="name"
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
            placeholder="+229 97000000"
            autocomplete="tel"
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
            placeholder="Quartier, Rue, Maison..."
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
              placeholder="Ex : Cotonou"
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
              placeholder="Ex : Bénin"
            >

          </div>

        </div>


        <div
          class="sub-title"
          style="margin-top:20px;"
        >
          🛒 Articles du Panier
        </div>


        <div
          id="cartItemsContainer"
          style="
            max-height:180px;
            overflow-y:auto;
            margin-bottom:15px;
          "
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
            Articles à régler :
          </span>

          <span id="checkoutItemsCount">
            0
          </span>

        </div>


        <div class="summary-row total">

          <span>
            Montant total :
          </span>

          <span id="checkoutTotalAmount">
            0 FCFA
          </span>

        </div>


        <div style="margin-top:15px;">

          <label style="
            font-size:12px;
            color:#aaa;
            display:block;
            margin-bottom:8px;
          ">
            Sélectionnez la méthode de paiement :
          </label>


          <div id="checkoutMethodsSelect">

            <div style="
              color:#888;
              font-size:12px;
            ">
              Aucun moyen enregistré.
            </div>

          </div>

        </div>


        <button
          class="btn-pay-now"
          id="btnExecutePayment"
        >
          ⚡ Payer maintenant (0 FCFA)
        </button>


        <div
          id="payStatusMessage"
          style="
            margin-top:15px;
            font-size:13px;
            text-align:center;
            display:none;
          "
        ></div>

      </div>

    </div>
  `;


  // ==========================================================
  // VARIABLES
  // ==========================================================

  let selectedMethodKey = null;

  let currentCartTotalFCFA = 0;

  let currentCartItems = {};

  let paymentInProgress = false;


  // ==========================================================
  // CHARGER PROFIL UTILISATEUR
  // ==========================================================

  get(
    ref(db, `users/${currentUid}`)
  )
    .then((snapshot) => {

      if (!snapshot.exists()) return;

      const u = snapshot.val() || {};

      const shipName =
        document.getElementById(
          "shippingName"
        );

      const shipPhone =
        document.getElementById(
          "shippingPhone"
        );

      const shipAddress =
        document.getElementById(
          "shippingAddress"
        );

      const shipCity =
        document.getElementById(
          "shippingCity"
        );

      const shipCountry =
        document.getElementById(
          "shippingCountry"
        );


      if (
        shipName &&
        (u.nom || u.displayName)
      ) {

        shipName.value =
          u.nom ||
          u.displayName ||
          "";

      }


      if (
        shipPhone &&
        (u.telephone || u.phone)
      ) {

        shipPhone.value =
          u.telephone ||
          u.phone ||
          "";

      }


      if (
        shipAddress &&
        u.adresse
      ) {

        shipAddress.value =
          u.adresse;

      }


      if (
        shipCity &&
        u.ville
      ) {

        shipCity.value =
          u.ville;

      }


      if (
        shipCountry &&
        u.pays
      ) {

        shipCountry.value =
          u.pays;

      }

    })
    .catch((error) => {

      console.warn(
        "Impossible de charger le profil :",
        error
      );

    });


  // ==========================================================
  // TYPE DE PAIEMENT
  // ==========================================================

  const payTypeSelect =
    document.getElementById(
      "payType"
    );


  payTypeSelect?.addEventListener(
    "change",
    () => {

      const type =
        payTypeSelect.value;

      const momoFields =
        document.getElementById(
          "momoFields"
        );

      const cardFields =
        document.getElementById(
          "cardFields"
        );


      if (momoFields) {

        momoFields.style.display =
          type === "momo"
            ? "block"
            : "none";

      }


      if (cardFields) {

        cardFields.style.display =
          type === "card"
            ? "block"
            : "none";

      }

    }
  );


  // ==========================================================
  // MOYENS DE PAIEMENT ENREGISTRÉS
  // ==========================================================

  const methodsRef =
    ref(
      db,
      `users/${currentUid}/moyensPaiement`
    );


  onValue(
    methodsRef,
    (snapshot) => {

      const listContainer =
        document.getElementById(
          "savedMethodsList"
        );

      const selectContainer =
        document.getElementById(
          "checkoutMethodsSelect"
        );


      if (
        !listContainer ||
        !selectContainer
      ) {

        return;

      }


      if (!snapshot.exists()) {

        selectedMethodKey = null;

        listContainer.innerHTML = `
          <div style="
            color:#888;
            font-size:12px;
          ">
            Aucun moyen enregistré.
          </div>
        `;

        selectContainer.innerHTML = `
          <div style="
            color:#888;
            font-size:12px;
          ">
            Veuillez enregistrer un moyen
            de paiement.
          </div>
        `;

        return;
      }


      const methods =
        snapshot.val() || {};

      const keys =
        Object.keys(methods);


      // --------------------------------------------------------
      // Si la méthode sélectionnée n'existe plus
      // --------------------------------------------------------

      if (
        selectedMethodKey &&
        !methods[selectedMethodKey]
      ) {

        selectedMethodKey = null;

      }


      // --------------------------------------------------------
      // Sélection automatique de la première
      // --------------------------------------------------------

      if (
        !selectedMethodKey &&
        keys.length > 0
      ) {

        selectedMethodKey =
          keys[0];

      }


      listContainer.innerHTML = "";

      selectContainer.innerHTML = "";


      keys.forEach(
        (key) => {

          const m =
            methods[key] || {};


          const isMomo =
            String(m.type || "momo")
              .toLowerCase() ===
            "momo";


          const icon =
            isMomo
              ? "📱"
              : "💳";


          let label = "";


          if (isMomo) {

            label =
              `${m.operator || "Mobile"} (${m.number || ""})`;

          } else {

            const last4 =
              String(
                m.number || ""
              ).slice(-4);

            label =
              `Carte **** ${last4}`;

          }


          // ----------------------------------------------------
          // LISTE GAUCHE
          // ----------------------------------------------------

          const leftItem =
            document.createElement(
              "div"
            );

          leftItem.className =
            "saved-method-item";


          leftItem.innerHTML = `

            <span>
              ${icon}
            </span>

            <div style="
              flex:1;
              font-size:13px;
            ">

              <strong>
                ${escapeHTML(
                  m.holder ||
                  "Titulaire"
                )}
              </strong>

              <br>

              <span style="
                color:#aaa;
                font-size:11px;
              ">
                ${escapeHTML(label)}
              </span>

            </div>

          `;


          listContainer.appendChild(
            leftItem
          );


          // ----------------------------------------------------
          // SÉLECTION DROITE
          // ----------------------------------------------------

          const rightItem =
            document.createElement(
              "div"
            );


          const isSelected =
            selectedMethodKey === key;


          rightItem.className =
            "saved-method-item" +
            (
              isSelected
                ? " selected"
                : ""
            );


          rightItem.innerHTML = `

            <input
              type="radio"
              name="payRadio"
              ${isSelected ? "checked" : ""}
            >

            <span>
              ${icon}
            </span>

            <div style="
              font-size:13px;
            ">

              <strong>
                ${escapeHTML(
                  m.holder ||
                  "Titulaire"
                )}
              </strong>

              -

              ${escapeHTML(label)}

            </div>

          `;


          rightItem.addEventListener(
            "click",
            () => {

              selectedMethodKey =
                key;


              document
                .querySelectorAll(
                  "#checkoutMethodsSelect .saved-method-item"
                )
                .forEach(
                  (el) => {

                    el.classList.remove(
                      "selected"
                    );

                  }
                );


              document
                .querySelectorAll(
                  "input[name='payRadio']"
                )
                .forEach(
                  (radio) => {

                    radio.checked =
                      false;

                  }
                );


              rightItem.classList.add(
                "selected"
              );


              const radio =
                rightItem.querySelector(
                  "input[type='radio']"
                );


              if (radio) {

                radio.checked =
                  true;

              }

            }
          );


          selectContainer.appendChild(
            rightItem
          );

        }
      );

    },
    (error) => {

      console.error(
        "Erreur moyens de paiement :",
        error
      );

    }
  );


  // ==========================================================
  // CHARGEMENT DU PANIER
  // ==========================================================

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

      let count = 0;


      const itemsContainer =
        document.getElementById(
          "cartItemsContainer"
        );


      if (itemsContainer) {

        itemsContainer.innerHTML = "";

      }


      if (snapshot.exists()) {

        const cartData =
          snapshot.val() || {};

        const keys =
          Object.keys(cartData);


        for (
          const key of keys
        ) {

          const item =
            cartData[key] || {};


          const prodId =
            item.id ||
            item.produitId ||
            key;


          const qty =
            Math.max(
              1,
              parseInt(
                item.quantite ||
                item.qty ||
                1,
                10
              )
            );


          let realPrice =
            parseFloat(
              item.prixUnitaire ||
              item.prix ||
              item.prixNormal ||
              0
            );


          // ----------------------------------------------------
          // Vérification du prix actuel du produit
          // ----------------------------------------------------

          try {

            const pubSnap =
              await get(
                ref(
                  db,
                  `publications/${prodId}`
                )
              );


            if (
              pubSnap.exists()
            ) {

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
                pPromo < pNormal
              ) {

                realPrice =
                  pPromo;

              } else {

                realPrice =
                  pNormal;

              }

            }

          } catch (error) {

            console.warn(
              "Erreur vérification prix :",
              error
            );

          }


          realPrice =
            Math.max(
              0,
              Number(realPrice) || 0
            );


          const subtotal =
            realPrice * qty;


          currentCartTotalFCFA +=
            subtotal;


          count += qty;


          currentCartItems[key] = {

            id:
              prodId,

            nom:
              item.nom ||
              item.title ||
              "Produit DAKPROELITE",

            prixUnitaire:
              realPrice,

            quantite:
              qty,

            total:
              subtotal

          };


          if (itemsContainer) {

            const row =
              document.createElement(
                "div"
              );


            row.className =
              "cart-item-row";


            row.innerHTML = `

              <div>

                <strong>
                  ${escapeHTML(
                    item.nom ||
                    "Produit"
                  )}
                </strong>

                <br>

                <span style="
                  color:#d4af37;
                ">
                  ${formatCFA(
                    realPrice
                  )}
                </span>

                × ${qty}

              </div>

              <div style="
                font-weight:bold;
                color:#70e090;
              ">

                ${formatCFA(
                  subtotal
                )}

              </div>

            `;


            itemsContainer.appendChild(
              row
            );

          }

        }

      }


      if (
        Object.keys(
          currentCartItems
        ).length === 0
      ) {

        if (itemsContainer) {

          itemsContainer.innerHTML = `
            <div style="
              color:#888;
              font-size:12px;
            ">
              Votre panier est vide.
            </div>
          `;

        }

      }


      const countEl =
        document.getElementById(
          "checkoutItemsCount"
        );


      const totalEl =
        document.getElementById(
          "checkoutTotalAmount"
        );


      const btnPay =
        document.getElementById(
          "btnExecutePayment"
        );


      if (countEl) {

        countEl.textContent =
          String(count);

      }


      if (totalEl) {

        totalEl.textContent =
          formatCFA(
            currentCartTotalFCFA
          );

      }


      if (btnPay) {

        btnPay.textContent =
          `⚡ Payer maintenant (${formatCFA(
            currentCartTotalFCFA
          )})`;

      }

    },
    (error) => {

      console.error(
        "Erreur chargement panier :",
        error
      );

    }
  );


  // ==========================================================
  // VIDER LE PANIER MANUELLEMENT
  // ==========================================================

  document
    .getElementById("btnClearCart")
    ?.addEventListener(
      "click",
      async () => {

        if (
          !confirm(
            "Voulez-vous vraiment vider tout votre panier ?"
          )
        ) {

          return;

        }


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
            "Votre panier a été vidé avec succès."
          );


        } catch (error) {

          console.error(
            "Erreur vidage panier :",
            error
          );


          alert(
            "Une erreur est survenue lors du vidage du panier."
          );

        }

      }
    );


  // ==========================================================
  // ENREGISTRER UN MOYEN DE PAIEMENT
  // ==========================================================

  document
    .getElementById(
      "btnSavePaymentMethod"
    )
    ?.addEventListener(
      "click",
      async () => {

        const type =
          payTypeSelect.value;


        const holder =
          document
            .getElementById(
              "payHolder"
            )
            ?.value
            .trim();


        if (!holder) {

          alert(
            "Veuillez saisir le nom du titulaire."
          );

          return;

        }


        // ------------------------------------------------------
        // MOBILE MONEY
        // ------------------------------------------------------

        if (type === "momo") {

          const number =
            document
              .getElementById(
                "momoNumber"
              )
              ?.value
              .trim();


          const operator =
            document
              .getElementById(
                "momoOperator"
              )
              ?.value;


          if (!number) {

            alert(
              "Veuillez saisir le numéro Mobile Money."
            );

            return;

          }


          try {

            const newMethodRef =
              push(
                ref(
                  db,
                  `users/${currentUid}/moyensPaiement`
                )
              );


            await set(
              newMethodRef,
              {

                type:
                  "momo",

                holder:
                  holder,

                number:
                  number,

                operator:
                  operator,

                createdAt:
                  Date.now()

              }
            );


            selectedMethodKey =
              newMethodRef.key;


            alert(
              "✅ Compte Mobile Money enregistré avec succès."
            );


            document
              .getElementById(
                "payHolder"
              )
              .value = "";


            document
              .getElementById(
                "momoNumber"
              )
              .value = "";


          } catch (error) {

            console.error(
              "Erreur enregistrement Mobile Money :",
              error
            );


            alert(
              "Erreur lors de l'enregistrement du compte Mobile Money."
            );

          }


          return;
        }


        // ------------------------------------------------------
        // CARTE
        //
        // IMPORTANT :
        // Nous ne stockons PAS le CVC/CVV dans Firebase.
        // ------------------------------------------------------

        if (type === "card") {

          alert(
            "Pour les cartes bancaires, DAKPROELITE doit utiliser une passerelle bancaire/tokenisation. Le numéro complet et le CVC ne doivent pas être enregistrés directement dans Firebase."
          );

          return;
        }

      }
    );


  // ==========================================================
  // EXECUTION DU PAIEMENT
  // ==========================================================

  document
    .getElementById(
      "btnExecutePayment"
    )
    ?.addEventListener(
      "click",
      async () => {

        if (paymentInProgress) {

          return;

        }


        const msgEl =
          document.getElementById(
            "payStatusMessage"
          );


        const btnPay =
          document.getElementById(
            "btnExecutePayment"
          );


        // ------------------------------------------------------
        // VALIDATION PANIER
        // ------------------------------------------------------

        if (
          currentCartTotalFCFA <= 0 ||
          Object.keys(
            currentCartItems
          ).length === 0
        ) {

          alert(
            "Votre panier DAKPROELITE est vide."
          );

          return;

        }


        // ------------------------------------------------------
        // VALIDATION MOYEN PAIEMENT
        // ------------------------------------------------------

        if (!selectedMethodKey) {

          alert(
            "Veuillez sélectionner un moyen de paiement enregistré."
          );

          return;

        }


        // ------------------------------------------------------
        // LIVRAISON
        // ------------------------------------------------------

        const shipName =
          document
            .getElementById(
              "shippingName"
            )
            ?.value
            .trim() || "";


        const shipPhone =
          document
            .getElementById(
              "shippingPhone"
            )
            ?.value
            .trim() || "";


        const shipAddress =
          document
            .getElementById(
              "shippingAddress"
            )
            ?.value
            .trim() || "";


        const shipCity =
          document
            .getElementById(
              "shippingCity"
            )
            ?.value
            .trim() || "";


        const shipCountry =
          document
            .getElementById(
              "shippingCountry"
            )
            ?.value
            .trim() || "";


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


        // ------------------------------------------------------
        // DÉBUT PAIEMENT
        // ------------------------------------------------------

        paymentInProgress =
          true;


        if (btnPay) {

          btnPay.disabled =
            true;

          btnPay.textContent =
            "⏳ Préparation du paiement...";

        }


        try {

          if (msgEl) {

            msgEl.style.display =
              "block";

            msgEl.style.color =
              "#d4af37";

            msgEl.textContent =
              "Préparation du paiement Mobile Money...";

          }


          // ----------------------------------------------------
          // RÉCUPÉRER LE MOYEN DE PAIEMENT
          // ----------------------------------------------------

          const methodSnap =
            await get(
              ref(
                db,
                `users/${currentUid}/moyensPaiement/${selectedMethodKey}`
              )
            );


          if (!methodSnap.exists()) {

            throw new Error(
              "Le moyen de paiement sélectionné n'existe plus."
            );

          }


          const methodDetails =
            methodSnap.val() || {};


          const operatorName =
            normalizeOperator(
              methodDetails.operator ||
              "moov"
            );


          // ----------------------------------------------------
          // POUR L'INSTANT : PAIEMENT MOOV
          // ----------------------------------------------------

          if (
            operatorName !== "moov"
          ) {

            throw new Error(
              `Le paiement automatique par USSD n'est pas encore configuré pour ${operatorName.toUpperCase()}. Sélectionnez Moov Money.`
            );

          }


          // ----------------------------------------------------
          // CONFIGURATION MARCHAND
          //
          // CHEMIN EXACT DE VOTRE BASE :
          //
          // paiement/moov
          // ----------------------------------------------------

          const adminPayRef =
            ref(
              db,
              "paiement/moov"
            );


          const adminPaySnap =
            await get(
              adminPayRef
            );


          if (
            !adminPaySnap.exists()
          ) {

            throw new Error(
              "La configuration du paiement Moov est introuvable dans paiement/moov."
            );

          }


          const adminPayData =
            adminPaySnap.val() || {};


          // ----------------------------------------------------
          // VÉRIFICATION ACTIVATION
          // ----------------------------------------------------

          if (
            adminPayData.actif !== true
          ) {

            throw new Error(
              "Le paiement Moov est actuellement désactivé par l'administration."
            );

          }


          // ----------------------------------------------------
          // NUMÉRO MARCHAND
          // ----------------------------------------------------

          const merchantNumber =
            String(
              adminPayData.numero_marchand ||
              ""
            ).trim();


          if (!merchantNumber) {

            throw new Error(
              "Le numéro marchand Moov n'est pas configuré."
            );

          }


          // ----------------------------------------------------
          // NOM MARCHAND
          // ----------------------------------------------------

          const merchantName =
            String(
              adminPayData.nom_marchand ||
              "JUBILE LALO"
            );


          // ----------------------------------------------------
          // MONTANT
          // ----------------------------------------------------

          const montant =
            Math.round(
              Number(
                currentCartTotalFCFA
              )
            );


          if (
            !Number.isFinite(montant) ||
            montant <= 0
          ) {

            throw new Error(
              "Le montant du paiement est invalide."
            );

          }


          // ----------------------------------------------------
          // RÉFÉRENCE UNIQUE
          // ----------------------------------------------------

          const timestamp =
            Date.now();


          const randomPart =
            Math.random()
              .toString(36)
              .substring(2, 7)
              .toUpperCase();


          const orderId =
            "ORD-" +
            timestamp +
            "-" +
            randomPart;


          const paymentReference =
            "DP" +
            timestamp;


          // ----------------------------------------------------
          // CODE USSD
          // ----------------------------------------------------

          const codeUSSD =
            buildUSSDCode({

              template:
                adminPayData.code_ussd,

              merchantNumber:
                merchantNumber,

              amount:
                montant,

              reference:
                paymentReference,

              operator:
                operatorName

            });


          if (!codeUSSD) {

            throw new Error(
              "Impossible de construire le code USSD."
            );

          }


          console.log(
            "DAKPROELITE — Code USSD paiement :",
            codeUSSD
          );


          // ----------------------------------------------------
          // COPIE DES ARTICLES
          // ----------------------------------------------------

          const articles = {};


          Object.entries(
            currentCartItems
          ).forEach(
            ([key, article]) => {

              articles[key] = {

                id:
                  article.id,

                nom:
                  article.nom,

                prixUnitaire:
                  Number(
                    article.prixUnitaire || 0
                  ),

                quantite:
                  Number(
                    article.quantite || 1
                  ),

                total:
                  Number(
                    article.total || 0
                  )

              };

            }
          );


          // ----------------------------------------------------
          // COMMANDE
          //
          // IMPORTANT :
          // Le panier n'est PAS supprimé ici.
          // ----------------------------------------------------

          const orderPayload = {

            commandeId:
              orderId,

            referencePaiement:
              paymentReference,

            acheteurId:
              currentUid,

            acheteurEmail:
              (
                auth &&
                auth.currentUser &&
                auth.currentUser.email
              )
                ? auth.currentUser.email
                : "",


            articles:
              articles,


            montantTotal:
              montant,

            devise:
              "FCFA",


            moyenPaiement: {

              key:
                selectedMethodKey,

              type:
                methodDetails.type ||
                "momo",

              operator:
                "MOOV",

              holder:
                methodDetails.holder ||
                shipName,

              numeroUtilise:
                methodDetails.number ||
                shipPhone

            },


            paiement: {

              operateur:
                "moov",

              nomMarchand:
                merchantName,

              numeroMarchand:
                merchantNumber,

              montant:
                montant,

              reference:
                paymentReference,

              codeUSSD:
                codeUSSD,

              statut:
                "En attente de paiement",

              transactionId:
                null,

              dateCreation:
                Date.now(),

              dateConfirmation:
                null

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


            statutLivraison:
              "En attente du paiement",


            date:
              Date.now()

          };


          // ----------------------------------------------------
          // ENREGISTRER COMMANDE
          // ----------------------------------------------------

          await set(
            ref(
              db,
              `commandes/${currentUid}/${orderId}`
            ),
            orderPayload
          );


          // ----------------------------------------------------
          // RÉSUMÉ ARTICLES
          // ----------------------------------------------------

          let articlesHTML =
            "";


          Object.values(
            currentCartItems
          ).forEach(
            (art) => {

              articlesHTML += `

                <div style="
                  display:flex;
                  justify-content:space-between;
                  gap:10px;
                  font-size:12px;
                  margin-bottom:6px;
                  color:#ccc;
                ">

                  <span>
                    • ${escapeHTML(
                      art.nom
                    )}
                    ×${Number(
                      art.quantite || 1
                    )}
                  </span>

                  <span>
                    ${formatCFA(
                      art.total
                    )}
                  </span>

                </div>

              `;

            }
          );


          // ----------------------------------------------------
          // URL POUR LANCER USSD
          // ----------------------------------------------------

          const telUrl =
            makeTelURL(
              codeUSSD
            );


          // ----------------------------------------------------
          // MODALE
          // ----------------------------------------------------

          const promptContainer =
            document.createElement(
              "div"
            );


          promptContainer.id =
            "dakproPaymentModal";


          promptContainer.style.cssText = `
            position:fixed;
            inset:0;
            width:100%;
            height:100%;
            background:rgba(0,0,0,.90);
            display:flex;
            align-items:center;
            justify-content:center;
            z-index:999999;
            padding:20px;
            box-sizing:border-box;
          `;


          promptContainer.innerHTML = `

            <div style="
              background:#12161f;
              border:2px solid #d4af37;
              border-radius:16px;
              padding:20px;
              max-width:440px;
              width:100%;
              max-height:90vh;
              overflow-y:auto;
              color:#fff;
              font-family:Arial,sans-serif;
              box-shadow:0 15px 50px rgba(0,0,0,.7);
            ">


              <h3 style="
                color:#d4af37;
                margin:0 0 15px;
                text-align:center;
              ">
                🛒 Confirmation de commande
              </h3>


              <p style="
                font-size:13px;
                color:#aaa;
                line-height:1.5;
              ">

                Paiement auprès de :

                <strong style="
                  color:#fff;
                ">
                  ${escapeHTML(
                    merchantName
                  )}
                </strong>

              </p>


              <div style="
                background:#0a0d14;
                padding:12px;
                border-radius:9px;
                border:1px solid #252a33;
                margin-bottom:14px;
                max-height:120px;
                overflow-y:auto;
              ">

                ${articlesHTML}

              </div>


              <div style="
                display:flex;
                justify-content:space-between;
                font-weight:bold;
                font-size:16px;
                color:#22c55e;
                margin-bottom:15px;
                border-top:1px dashed #333;
                padding-top:10px;
              ">

                <span>
                  Total :
                </span>

                <span>
                  ${formatCFA(
                    montant
                  )}
                </span>

              </div>


              <div style="
                background:#102417;
                border:1px solid #22c55e;
                padding:12px;
                border-radius:9px;
                margin-bottom:15px;
              ">

                <p style="
                  font-size:12px;
                  color:#70e090;
                  margin:0 0 8px;
                  line-height:1.5;
                ">

                  📲 <strong>
                    Paiement Moov Money
                  </strong>

                </p>


                <p style="
                  font-size:11px;
                  color:#bbb;
                  margin:0;
                  line-height:1.6;
                ">

                  Appuyez sur
                  <strong>
                    « Payer maintenant »
                  </strong>.

                  Votre téléphone ouvrira
                  l'écran Moov Money.

                  Vous devrez confirmer
                  l'opération avec votre
                  code secret Moov.

                </p>

              </div>


              <div style="
                background:#000;
                padding:10px;
                border-radius:7px;
                margin-bottom:12px;
                text-align:center;
              ">

                <div style="
                  color:#777;
                  font-size:10px;
                  margin-bottom:5px;
                ">
                  CODE DE PAIEMENT
                </div>

                <div style="
                  color:#d4af37;
                  font-family:monospace;
                  font-size:13px;
                  word-break:break-all;
                ">
                  ${escapeHTML(
                    codeUSSD
                  )}
                </div>

              </div>


              <a
                href="${telUrl}"
                id="btnTriggerUSSD"
                style="
                  display:block;
                  text-align:center;
                  background:#22c55e;
                  color:#000;
                  font-weight:bold;
                  padding:14px;
                  border-radius:9px;
                  text-decoration:none;
                  margin-bottom:9px;
                  font-size:16px;
                "
              >
                📞 Payer maintenant
              </a>


              <button
                id="btnCopyUSSD"
                style="
                  width:100%;
                  background:#1f2937;
                  border:1px solid #374151;
                  color:#fff;
                  padding:10px;
                  border-radius:7px;
                  cursor:pointer;
                  font-size:12px;
                  margin-bottom:9px;
                "
              >
                📋 Copier le code USSD
              </button>


              <button
                id="btnCheckPayment"
                style="
                  width:100%;
                  background:#d4af37;
                  border:none;
                  color:#000;
                  padding:11px;
                  border-radius:7px;
                  cursor:pointer;
                  font-weight:bold;
                  font-size:12px;
                  margin-bottom:9px;
                "
              >
                🔄 J'ai terminé le paiement
              </button>


              <button
                id="closePayModal"
                style="
                  width:100%;
                  background:transparent;
                  border:1px solid #555;
                  color:#aaa;
                  padding:9px;
                  border-radius:7px;
                  cursor:pointer;
                  font-size:12px;
                "
              >
                Fermer
              </button>


              <p style="
                text-align:center;
                font-size:10px;
                color:#666;
                margin:12px 0 0;
              ">

                Commande :
                ${escapeHTML(
                  orderId
                )}

              </p>


            </div>

          `;


          document.body.appendChild(
            promptContainer
          );


          // ----------------------------------------------------
          // COPIER
          // ----------------------------------------------------

          document
            .getElementById(
              "btnCopyUSSD"
            )
            ?.addEventListener(
              "click",
              async () => {

                try {

                  if (
                    navigator.clipboard &&
                    navigator.clipboard.writeText
                  ) {

                    await navigator.clipboard.writeText(
                      codeUSSD
                    );


                    alert(
                      "✅ Code de paiement copié."
                    );

                  } else {

                    alert(
                      "Code de paiement :\n" +
                      codeUSSD
                    );

                  }

                } catch (error) {

                  console.error(
                    "Erreur copie :",
                    error
                  );

                  alert(
                    "Code de paiement :\n" +
                    codeUSSD
                  );

                }

              }
            );


          // ----------------------------------------------------
          // BOUTON PAIEMENT
          //
          // Le clic ouvre le composeur USSD.
          // Moov demande ensuite les confirmations/PIN.
          // ----------------------------------------------------

          document
            .getElementById(
              "btnTriggerUSSD"
            )
            ?.addEventListener(
              "click",
              () => {

                if (msgEl) {

                  msgEl.style.display =
                    "block";

                  msgEl.style.color =
                    "#70e090";

                  msgEl.textContent =
                    "📲 Ouverture de Moov Money... Validez le paiement sur votre téléphone.";

                }

              }
            );


          // ----------------------------------------------------
          // VÉRIFICATION
          //
          // Cette fonction ne déclare PAS un paiement réussi
          // simplement parce que le client clique.
          //
          // Elle regarde si un backend/webhook/admin a modifié
          // la commande.
          // ----------------------------------------------------

          document
            .getElementById(
              "btnCheckPayment"
            )
            ?.addEventListener(
              "click",
              async () => {

                try {

                  const checkSnap =
                    await get(
                      ref(
                        db,
                        `commandes/${currentUid}/${orderId}`
                      )
                    );


                  if (
                    !checkSnap.exists()
                  ) {

                    alert(
                      "Commande introuvable."
                    );

                    return;

                  }


                  const checkData =
                    checkSnap.val() ||
                    {};


                  const paymentStatus =
                    checkData?.paiement?.statut ||
                    checkData?.statut ||
                    "";


                  if (
                    paymentStatus ===
                      "Paiement confirmé" ||
                    paymentStatus ===
                      "Payée" ||
                    paymentStatus ===
                      "Payé"
                  ) {

                    alert(
                      "✅ Paiement confirmé."
                    );


                    promptContainer.remove();


                    if (
                      typeof window.chargerModule ===
                      "function"
                    ) {

                      window.chargerModule(
                        "commandes"
                      );

                    } else {

                      window.location.reload();

                    }


                    return;

                  }


                  alert(
                    "⏳ Le paiement n'est pas encore confirmé dans le système.\n\nSi vous venez de valider le paiement dans Moov Money, attendez la confirmation puis réessayez."
                  );


                } catch (error) {

                  console.error(
                    "Erreur vérification paiement :",
                    error
                  );


                  alert(
                    "Impossible de vérifier le statut du paiement."
                  );

                }

              }
            );


          // ----------------------------------------------------
          // FERMER
          // ----------------------------------------------------

          document
            .getElementById(
              "closePayModal"
            )
            ?.addEventListener(
              "click",
              () => {

                promptContainer.remove();


                if (
                  typeof window.chargerModule ===
                  "function"
                ) {

                  window.chargerModule(
                    "commandes"
                  );

                }

              }
            );


          // ----------------------------------------------------
          // MESSAGE
          // ----------------------------------------------------

          if (msgEl) {

            msgEl.style.display =
              "block";

            msgEl.style.color =
              "#70e090";

            msgEl.textContent =
              `Commande ${orderId} créée. En attente du paiement Moov...`;

          }


          // ----------------------------------------------------
          // LANCEMENT AUTOMATIQUE
          //
          // Petit délai pour permettre à la modale de s'afficher.
          // ----------------------------------------------------

          setTimeout(
            () => {

              const trigger =
                document.getElementById(
                  "btnTriggerUSSD"
                );


              if (trigger) {

                trigger.click();

              }

            },
            500
          );


        } catch (error) {

          console.error(
            "Erreur exécution paiement :",
            error
          );


          if (msgEl) {

            msgEl.style.display =
              "block";

            msgEl.style.color =
              "#ff8585";

            msgEl.textContent =
              "❌ " +
              (
                error?.message ||
                "Échec de la procédure de paiement."
              );

          }


          alert(
            error?.message ||
            "Une erreur est survenue pendant la préparation du paiement."
          );


        } finally {

          paymentInProgress =
            false;


          if (btnPay) {

            btnPay.disabled =
              false;

            btnPay.textContent =
              `⚡ Payer maintenant (${formatCFA(
                currentCartTotalFCFA
              )})`;

          }

        }

      }
    );

}