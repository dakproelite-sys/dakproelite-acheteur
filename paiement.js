import { 
  ref, 
  onValue, 
  get, 
  set, 
  push, 
  update 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

function escapeHTML(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatCFA(amount) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount || 0)) + " FCFA";
}

export function init(container, db, auth, userId) {
  if (!container || !db) return;

  const currentUid = userId || (auth && auth.currentUser ? auth.currentUser.uid : null);

  if (!currentUid) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #ff8585; font-family: 'Poppins', sans-serif;">
        Veuillez vous connecter pour accéder au panier et à l'espace de paiement DAKPROELITE.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <style>
      .pay-title {
        color: #d4af37;
        font-size: 20px;
        font-weight: bold;
        margin-bottom: 20px;
        border-bottom: 1px solid #2a2a32;
        padding-bottom: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .pay-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
      .pay-box {
        background: #0a0d14;
        border: 1px solid #222;
        border-radius: 12px;
        padding: 20px;
      }
      .sub-title {
        color: #d4af37;
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 15px;
        border-bottom: 1px solid #222;
        padding-bottom: 8px;
      }
      .form-group {
        margin-bottom: 12px;
      }
      .form-group label {
        display: block;
        font-size: 12px;
        color: #aaa;
        margin-bottom: 5px;
      }
      .form-input, .form-select {
        width: 100%;
        padding: 10px;
        background: #12161f;
        border: 1px solid #333;
        border-radius: 8px;
        color: #fff;
        outline: none;
        font-size: 13px;
      }
      .btn-action {
        background: #d4af37;
        color: #000;
        font-weight: bold;
        padding: 12px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        width: 100%;
        margin-top: 10px;
        transition: 0.3s;
      }
      .btn-clear-cart {
        background: transparent;
        color: #ef4444;
        border: 1px solid #ef4444;
        font-weight: 600;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
      }
      .btn-pay-now {
        background: #22c55e;
        color: #000;
        font-weight: bold;
        padding: 14px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        width: 100%;
        font-size: 16px;
        margin-top: 15px;
        transition: 0.3s;
      }
      .saved-method-item {
        background: #12161f;
        border: 1px solid #2a2a32;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
      }
      .saved-method-item.selected {
        border-color: #22c55e;
        background: #102417;
      }
      .cart-item-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #12161f;
        padding: 8px 12px;
        border-radius: 6px;
        margin-bottom: 8px;
        font-size: 13px;
      }
      .summary-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
        font-size: 14px;
        color: #ccc;
      }
      .summary-row.total {
        border-top: 1px dashed #333;
        padding-top: 12px;
        color: #d4af37;
        font-size: 18px;
        font-weight: bold;
      }
      @media (max-width: 850px) {
        .pay-grid { grid-template-columns: 1fr; }
      }
    </style>

    <div class="pay-title">
      <span>💳 DAKPROELITE - Panier & Paiement Sécurisé</span>
      <button class="btn-clear-cart" id="btnClearCart">🗑️ Vider le panier</button>
    </div>

    <div class="pay-grid">
      <div class="pay-box">
        <div class="sub-title">⚙️ Enregistrer un compte de paiement</div>
        
        <div class="form-group">
          <label>Type de paiement</label>
          <select id="payType" class="form-select">
            <option value="momo">Mobile Money Afrique (Moov / MTN / Wave / Orange / Celtiis / Airtel)</option>
            <option value="card">Carte Bancaire (Visa / Mastercard)</option>
          </select>
        </div>

        <div class="form-group">
          <label>Nom & Prénom du titulaire</label>
          <input type="text" id="payHolder" class="form-input" placeholder="Ex: Jean Dupont">
        </div>

        <div id="momoFields">
          <div class="form-group">
            <label>Numéro Mobile Money (avec indicatif)</label>
            <input type="tel" id="momoNumber" class="form-input" placeholder="+229 90000000">
          </div>
          <div class="form-group">
            <label>Opérateur Mobile Money</label>
            <select id="momoOperator" class="form-select">
              <option value="MOOV">Moov Money (Flooz)</option>
              <option value="MTN">MTN Mobile Money</option>
              <option value="WAVE">Wave</option>
              <option value="ORANGE">Orange Money</option>
              <option value="CELTIIS">Celtiis Cash</option>
              <option value="AIRTEL">Airtel Money</option>
            </select>
          </div>
        </div>

        <div id="cardFields" style="display: none;">
          <div class="form-group">
            <label>Numéro de Carte Bancaire</label>
            <input type="text" id="cardNumber" class="form-input" placeholder="4532 **** **** 8899" maxlength="19">
          </div>
          <div style="display: flex; gap: 10px;">
            <div class="form-group" style="flex: 1;">
              <label>Expiration</label>
              <input type="text" id="cardExpiry" class="form-input" placeholder="MM/YY">
            </div>
            <div class="form-group" style="flex: 1;">
              <label>CVC / CVV</label>
              <input type="password" id="cardCvc" class="form-input" placeholder="123" maxlength="4">
            </div>
          </div>
        </div>

        <button class="btn-action" id="btnSavePaymentMethod">💾 Enregistrer cette méthode</button>

        <div style="margin-top: 25px;">
          <div class="sub-title">📱 Mes comptes enregistrés</div>
          <div id="savedMethodsList">
            <div style="color:#888; font-size:12px;">Chargement de vos méthodes...</div>
          </div>
        </div>
      </div>

      <div class="pay-box">
        <div class="sub-title">📍 Informations de Livraison</div>

        <div class="form-group">
          <label>Nom complet du destinataire</label>
          <input type="text" id="shippingName" class="form-input" placeholder="Ex: Jean Dupont">
        </div>
        <div class="form-group">
          <label>Téléphone de joignabilité</label>
          <input type="tel" id="shippingPhone" class="form-input" placeholder="+229 97000000">
        </div>
        <div class="form-group">
          <label>Adresse exacte de livraison</label>
          <input type="text" id="shippingAddress" class="form-input" placeholder="Quartier, Rue, Maison...">
        </div>
        <div style="display: flex; gap: 10px;">
          <div class="form-group" style="flex: 1;">
            <label>Ville</label>
            <input type="text" id="shippingCity" class="form-input" placeholder="Ex: Cotonou">
          </div>
          <div class="form-group" style="flex: 1;">
            <label>Pays</label>
            <input type="text" id="shippingCountry" class="form-input" placeholder="Ex: Bénin">
          </div>
        </div>

        <div class="sub-title" style="margin-top: 20px;">🛒 Articles du Panier</div>
        <div id="cartItemsContainer" style="max-height: 180px; overflow-y: auto; margin-bottom: 15px;">
          <div style="color: #888; font-size: 12px;">Chargement du panier...</div>
        </div>

        <div class="summary-row">
          <span>Articles à régler :</span>
          <span id="checkoutItemsCount">0</span>
        </div>
        <div class="summary-row total">
          <span>Montant total :</span>
          <span id="checkoutTotalAmount">0 FCFA</span>
        </div>

        <div style="margin-top: 15px;">
          <label style="font-size: 12px; color: #aaa; display: block; margin-bottom: 8px;">
            Sélectionnez la méthode pour le débit :
          </label>
          <div id="checkoutMethodsSelect">
            <div style="color: #888; font-size: 12px;">Aucun moyen enregistré. Veuillez en ajouter un à gauche.</div>
          </div>
        </div>

        <button class="btn-pay-now" id="btnExecutePayment">⚡ Payer maintenant (0 FCFA)</button>
        <div id="payStatusMessage" style="margin-top: 15px; font-size: 13px; text-align: center; display: none;"></div>
      </div>
    </div>
  `;

  let selectedMethodKey = null;
  let currentCartTotalFCFA = 0;
  let currentCartItems = {};

  get(ref(db, `users/${currentUid}`)).then((snapshot) => {
    if (snapshot.exists()) {
      const u = snapshot.val();
      const shipName = document.getElementById("shippingName");
      const shipPhone = document.getElementById("shippingPhone");
      const shipAddress = document.getElementById("shippingAddress");
      const shipCity = document.getElementById("shippingCity");
      const shipCountry = document.getElementById("shippingCountry");

      if (shipName && (u.nom || u.displayName)) shipName.value = u.nom || u.displayName;
      if (shipPhone && (u.telephone || u.phone)) shipPhone.value = u.telephone || u.phone;
      if (shipAddress && u.adresse) shipAddress.value = u.adresse;
      if (shipCity && u.ville) shipCity.value = u.ville;
      if (shipCountry && u.pays) shipCountry.value = u.pays;
    }
  });

  const payTypeSelect = document.getElementById("payType");
  payTypeSelect.addEventListener("change", () => {
    const type = payTypeSelect.value;
    document.getElementById("momoFields").style.display = (type === "momo") ? "block" : "none";
    document.getElementById("cardFields").style.display = (type === "card") ? "block" : "none";
  });

  const methodsRef = ref(db, `users/${currentUid}/moyensPaiement`);
  onValue(methodsRef, (snapshot) => {
    const listContainer = document.getElementById("savedMethodsList");
    const selectContainer = document.getElementById("checkoutMethodsSelect");

    if (!listContainer || !selectContainer) return;

    if (snapshot.exists()) {
      const methods = snapshot.val();
      const keys = Object.keys(methods);

      listContainer.innerHTML = "";
      selectContainer.innerHTML = "";

      keys.forEach((key, index) => {
        const m = methods[key];
        const isMomo = m.type === "momo";
        const icon = isMomo ? "📱" : "💳";
        const label = isMomo ? `${m.operator || 'Mobile'} (${m.number})` : `Carte **** ${String(m.number).slice(-4)}`;

        if (index === 0 && !selectedMethodKey) {
          selectedMethodKey = key;
        }

        const isSelected = (selectedMethodKey === key);

        const leftItem = document.createElement("div");
        leftItem.className = "saved-method-item";
        leftItem.innerHTML = `
          <span>${icon}</span>
          <div style="flex: 1; font-size: 13px;">
            <strong>${escapeHTML(m.holder || 'Titulaire')}</strong><br>
            <span style="color:#aaa; font-size:11px;">${escapeHTML(label)}</span>
          </div>
        `;
        listContainer.appendChild(leftItem);

        const rightItem = document.createElement("div");
        rightItem.className = `saved-method-item ${isSelected ? 'selected' : ''}`;
        rightItem.innerHTML = `
          <input type="radio" name="payRadio" ${isSelected ? 'checked' : ''}>
          <span>${icon}</span>
          <div style="font-size: 13px;">
            <strong>${escapeHTML(m.holder || 'Titulaire')}</strong> - ${escapeHTML(label)}
          </div>
        `;

        rightItem.addEventListener("click", () => {
          selectedMethodKey = key;
          document.querySelectorAll("#checkoutMethodsSelect .saved-method-item").forEach(el => el.classList.remove("selected"));
          document.querySelectorAll("input[name='payRadio']").forEach(r => r.checked = false);
          rightItem.classList.add("selected");
          const radio = rightItem.querySelector("input[type='radio']");
          if (radio) radio.checked = true;
        });

        selectContainer.appendChild(rightItem);
      });
    } else {
      listContainer.innerHTML = `<div style="color:#888; font-size:12px;">Aucun moyen enregistré.</div>`;
      selectContainer.innerHTML = `<div style="color:#888; font-size:12px;">Veuillez enregistrer une passerelle de paiement.</div>`;
    }
  });

  const cartRef = ref(db, `users/${currentUid}/gs/cart`);
  onValue(cartRef, async (snapshot) => {
    currentCartTotalFCFA = 0;
    let count = 0;
    currentCartItems = {};

    const itemsContainer = document.getElementById("cartItemsContainer");

    if (snapshot.exists()) {
      const cartData = snapshot.val();
      const keys = Object.keys(cartData);

      if (itemsContainer) itemsContainer.innerHTML = "";

      for (const key of keys) {
        const item = cartData[key];
        const prodId = item.id || item.produitId || key;
        const qty = parseInt(item.quantite || item.qty || 1, 10);

        let realPrice = parseFloat(item.prixUnitaire || item.prix || item.prixNormal || 0);

        try {
          const pubSnap = await get(ref(db, `publications/${prodId}`));
          if (pubSnap.exists()) {
            const pubData = pubSnap.val();
            const pNormal = parseFloat(pubData.prixNormal || pubData.prix || 0);
            const pPromo = parseFloat(pubData.prixPromo || 0);
            realPrice = (pPromo > 0 && pPromo < pNormal) ? pPromo : pNormal;
          }
        } catch (e) {
          console.warn("Erreur de vérification du prix :", e);
        }

        const subtotal = realPrice * qty;
        currentCartTotalFCFA += subtotal;
        count += qty;

        currentCartItems[key] = {
          id: prodId,
          nom: item.nom || item.title || "Produit DAKPROELITE",
          prixUnitaire: realPrice,
          quantite: qty,
          total: subtotal
        };

        if (itemsContainer) {
          const row = document.createElement("div");
          row.className = "cart-item-row";
          row.innerHTML = `
            <div>
              <strong>${escapeHTML(item.nom || 'Produit')}</strong><br>
              <span style="color:#d4af37;">${formatCFA(realPrice)}</span> x ${qty}
            </div>
            <div style="font-weight:bold; color:#70e090;">${formatCFA(subtotal)}</div>
          `;
          itemsContainer.appendChild(row);
        }
      }
    } else {
      if (itemsContainer) {
        itemsContainer.innerHTML = `<div style="color: #888; font-size: 12px;">Votre panier est vide.</div>`;
      }
    }

    const countEl = document.getElementById("checkoutItemsCount");
    const totalEl = document.getElementById("checkoutTotalAmount");
    const btnPay = document.getElementById("btnExecutePayment");

    if (countEl) countEl.textContent = count;
    if (totalEl) totalEl.textContent = formatCFA(currentCartTotalFCFA);
    if (btnPay) btnPay.textContent = `⚡ Payer maintenant (${formatCFA(currentCartTotalFCFA)})`;
  });

  const clearCartBtn = document.getElementById("btnClearCart");
  if (clearCartBtn) {
    clearCartBtn.addEventListener("click", async () => {
      if (confirm("Voulez-vous vraiment vider tout votre panier ?")) {
        try {
          const updates = {};
          updates[`users/${currentUid}/panier`] = null;
          updates[`users/${currentUid}/gs/cart`] = null;
          updates[`users/${currentUid}/gs/total`] = 0;

          await update(ref(db), updates);
          alert("Votre panier a été vidé avec succès.");
        } catch (err) {
          console.error("Erreur vidage panier :", err);
          alert("Une erreur est survenue lors du vidage du panier.");
        }
      }
    });
  }

  document.getElementById("btnSavePaymentMethod")?.addEventListener("click", async () => {
    const type = payTypeSelect.value;
    const holder = document.getElementById("payHolder").value.trim();

    if (!holder) {
      alert("Veuillez saisir le nom du titulaire.");
      return;
    }

    let paymentData = {
      type,
      holder,
      createdAt: Date.now()
    };

    if (type === "momo") {
      const number = document.getElementById("momoNumber").value.trim();
      const operator = document.getElementById("momoOperator").value;

      if (!number) {
        alert("Veuillez saisir le numéro Mobile Money.");
        return;
      }

      paymentData.number = number;
      paymentData.operator = operator;
    } else {
      const number = document.getElementById("cardNumber").value.trim();
      const expiry = document.getElementById("cardExpiry").value.trim();
      const cvc = document.getElementById("cardCvc").value.trim();

      if (!number || !expiry || !cvc) {
        alert("Veuillez renseigner tous les champs de la carte bancaire.");
        return;
      }

      paymentData.number = number;
      paymentData.expiry = expiry;
      paymentData.cvc = cvc;
    }

    try {
      const newMethodRef = push(ref(db, `users/${currentUid}/moyensPaiement`));
      await set(newMethodRef, paymentData);
      alert("✅ Moyen de paiement enregistré avec succès !");

      document.getElementById("payHolder").value = "";
      document.getElementById("momoNumber").value = "";
      document.getElementById("cardNumber").value = "";
      document.getElementById("cardExpiry").value = "";
      document.getElementById("cardCvc").value = "";
    } catch (error) {
      console.error("Erreur enregistrement passerelle :", error);
      alert("Erreur lors de l'enregistrement dans la base de données.");
    }
  });

  // EXECUTION DU PAIEMENT
  document.getElementById("btnExecutePayment")?.addEventListener("click", async () => {
    const msgEl = document.getElementById("payStatusMessage");

    if (currentCartTotalFCFA <= 0 || Object.keys(currentCartItems).length === 0) {
      alert("Votre panier DAKPROELITE est vide.");
      return;
    }

    if (!selectedMethodKey) {
      alert("Veuillez sélectionner un moyen de paiement enregistré.");
      return;
    }

    const shipName = document.getElementById("shippingName").value.trim();
    const shipPhone = document.getElementById("shippingPhone").value.trim();
    const shipAddress = document.getElementById("shippingAddress").value.trim();
    const shipCity = document.getElementById("shippingCity").value.trim();
    const shipCountry = document.getElementById("shippingCountry").value.trim();

    if (!shipName || !shipPhone || !shipAddress) {
      alert("Veuillez remplir le nom, le téléphone et l'adresse de livraison.");
      return;
    }

    try {
      if (msgEl) {
        msgEl.style.display = "block";
        msgEl.style.color = "#d4af37";
        msgEl.textContent = "Initialisation du règlement...";
      }

      const methodSnap = await get(ref(db, `users/${currentUid}/moyensPaiement/${selectedMethodKey}`));
      const methodDetails = methodSnap.exists() ? methodSnap.val() : {};
      const operatorName = (methodDetails.operator || 'moov').toLowerCase();

      const adminPaySnap = await get(ref(db, `paiements/${operatorName}`));
      
      let codeUSSDFormate = null;
      let nomMarchandAdmin = "DAKPROELITE";

      if (adminPaySnap.exists()) {
        const adminPayData = adminPaySnap.val();
        if (adminPayData.actif && adminPayData.code_ussd) {
          nomMarchandAdmin = adminPayData.nom_marchand || nomMarchandAdmin;
          codeUSSDFormate = adminPayData.code_ussd.replace('{MONTANT}', Math.round(currentCartTotalFCFA));
        }
      }

      const orderId = "ORD-" + Date.now();

      const orderPayload = {
        commandeId: orderId,
        acheteurId: currentUid,
        acheteurEmail: (auth.currentUser && auth.currentUser.email) ? auth.currentUser.email : "",
        articles: currentCartItems,
        montantTotal: currentCartTotalFCFA,
        devise: "FCFA",
        moyenPaiement: {
          key: selectedMethodKey,
          type: methodDetails.type || "momo",
          operator: methodDetails.operator || "MOOV",
          holder: methodDetails.holder || shipName,
          numeroUtilise: methodDetails.number || shipPhone
        },
        livraison: {
          destinataire: shipName,
          telephone: shipPhone,
          adresse: shipAddress,
          ville: shipCity,
          pays: shipCountry
        },
        statut: "En attente de règlement",
        statutLivraison: "En cours de traitement",
        date: Date.now()
      };

      await set(ref(db, `commandes/${currentUid}/${orderId}`), orderPayload);

      const updates = {};
      updates[`users/${currentUid}/panier`] = null;
      updates[`users/${currentUid}/gs/cart`] = null;
      updates[`users/${currentUid}/gs/total`] = 0;
      await update(ref(db), updates);

      if (codeUSSDFormate) {
        if (msgEl) {
          msgEl.style.color = "#70e090";
          msgEl.textContent = `✅ Commande ${orderId} créée ! En attente de validation.`;
        }

        // Construction du résumé des articles pour la boîte de dialogue
        let articlesHTML = "";
        Object.values(currentCartItems).forEach(art => {
          articlesHTML += `
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:5px; color:#ccc;">
              <span>• ${escapeHTML(art.nom)} (x${art.quantite})</span>
              <span>${formatCFA(art.total)}</span>
            </div>
          `;
        });

        // Conversion correcte du caractère # pour URL tel:
        const telUrl = `tel:${codeUSSDFormate.replace(/#/g, '%23')}`;

        // Modale d'instructions claire et personnalisée
        const promptContainer = document.createElement('div');
        promptContainer.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index:9999; padding:20px;";
        promptContainer.innerHTML = `
          <div style="background:#12161f; border:2px solid #d4af37; border-radius:12px; padding:20px; text-align:left; max-width:420px; width:100%; color:#fff; font-family:sans-serif;">
            <h3 style="color:#d4af37; margin-top:0; text-align:center;">🛒 Confirmation de commande</h3>
            <p style="font-size:13px; color:#aaa; margin-bottom:10px;">
              Vous êtes sur le point d'acheter les articles suivants sur <strong>${escapeHTML(nomMarchandAdmin)}</strong> :
            </p>
            <div style="background:#0a0d14; padding:10px; border-radius:8px; border:1px solid #222; margin-bottom:15px; max-height:120px; overflow-y:auto;">
              ${articlesHTML}
            </div>
            <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:14px; color:#22c55e; margin-bottom:15px; border-top:1px dashed #333; padding-top:8px;">
              <span>Total à régler :</span>
              <span>${formatCFA(currentCartTotalFCFA)}</span>
            </div>
            <div style="background:#102417; border:1px solid #22c55e; padding:10px; border-radius:8px; margin-bottom:15px;">
              <p style="font-size:12px; color:#70e090; margin:0;">
                📲 <strong>Procédure Mobile Money :</strong> Composez le code ci-dessous et <strong>saisissez votre code secret (PIN) Mobile Money</strong> pour finaliser votre paiement.
              </p>
            </div>
            <a href="${telUrl}" id="btnTriggerUSSD" style="display:block; text-align:center; background:#22c55e; color:#000; font-weight:bold; padding:12px; border-radius:8px; text-decoration:none; margin-bottom:10px; font-size:15px;">
              📞 Valider et composer (${codeUSSDFormate})
            </a>
            <button id="closePayModal" style="width:100%; background:transparent; border:1px solid #666; color:#aaa; padding:8px; border-radius:6px; cursor:pointer; font-size:12px;">Fermer</button>
          </div>
        `;
        document.body.appendChild(promptContainer);

        // Lancement de l'appel direct après court délai
        setTimeout(() => {
          window.location.href = telUrl;
        }, 500);

        document.getElementById("closePayModal")?.addEventListener("click", () => {
          promptContainer.remove();
          if (typeof window.chargerModule === 'function') {
            window.chargerModule('commandes');
          } else {
            window.location.reload();
          }
        });

      } else {
        if (msgEl) {
          msgEl.style.color = "#70e090";
          msgEl.textContent = `✅ Commande ${orderId} enregistrée ! Redirection...`;
        }

        setTimeout(() => {
          if (typeof window.chargerModule === 'function') {
            window.chargerModule('commandes');
          } else {
            window.location.reload();
          }
        }, 1500);
      }

    } catch (error) {
      console.error("Erreur exécution paiement :", error);
      if (msgEl) {
        msgEl.style.color = "#ff8585";
        msgEl.textContent = "❌ Échec de la procédure de paiement. Veuillez réessayer.";
      }
    }
  });
}
