// ============================================================
// DAKPRO ÉLITE
// panier.js
// ============================================================

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {
  ref,
  onValue,
  update,
  remove
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

import {
  auth,
  db
} from "./firebase-config.js";


let currentUser = null;
let currentCart = null;


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
// FORMAT PRIX
// ============================================================

function formatPrice(number, currency = "FCFA") {

  return new Intl.NumberFormat("fr-FR")
    .format(Number(number) || 0)
    + " "
    + currency;

}


// ============================================================
// PROTECTION HTML
// ============================================================

function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


// ============================================================
// AUTHENTIFICATION
// ============================================================

onAuthStateChanged(auth, user => {

  if (!user) {

    currentUser = null;

    cartSummary.style.display = "none";

    cartList.innerHTML = `

      <div class="empty-state">

        <h3>
          Vous n'êtes pas connecté
        </h3>

        <p>
          Veuillez vous connecter pour voir votre panier.
        </p>

        <a
          href="profil-acheteur.html"
          class="btn-home">

          Se connecter

        </a>

      </div>

    `;

    return;
  }


  currentUser = user;

  ecouterPanier(user.uid);

});


// ============================================================
// ÉCOUTE DU PANIER FIREBASE
// ============================================================

function ecouterPanier(uid) {

  const cartRef =
    ref(
      db,
      `users/${uid}/panier`
    );


  onValue(

    cartRef,

    snapshot => {

      const data =
        snapshot.val();


      currentCart =
        data || {};


      if (
        !data ||
        typeof data !== "object" ||
        Object.keys(data).length === 0
      ) {

        afficherPanierVide();

        return;
      }


      afficherPanier(data);

    },

    error => {

      console.error(
        "Erreur Firebase panier :",
        error
      );


      cartSummary.style.display =
        "none";


      cartList.innerHTML = `

        <div class="error-state">

          <h3>
            Impossible de charger le panier
          </h3>

          <p>
            ${escapeHtml(
              error.message ||
              "Erreur Firebase"
            )}
          </p>

        </div>

      `;

    }

  );

}


// ============================================================
// PANIER VIDE
// ============================================================

function afficherPanierVide() {

  cartList.innerHTML = `

    <div class="empty-state">

      <h3>
        Votre panier est vide 🛒
      </h3>

      <p>
        Découvrez nos offres sur la boutique !
      </p>

      <a
        href="index.html"
        class="btn-home">

        Explorer la boutique

      </a>

    </div>

  `;


  cartSummary.style.display =
    "none";

}


// ============================================================
// AFFICHAGE
// ============================================================

function afficherPanier(data) {

  let html = "";

  let totalArticles = 0;

  let grandTotal = 0;

  let mainCurrency = "FCFA";


  Object.entries(data).forEach(
    ([productId, item]) => {

      if (!item) {
        return;
      }


      const qty =
        Math.max(
          1,
          parseInt(
            item.quantite ??
            item.quantity ??
            1,
            10
          )
        );


      const price =
        Number(
          item.prixUnitaire ??
          item.price ??
          item.prix ??
          0
        );


      const currency =
        item.devise ||
        "FCFA";


      const itemTotal =
        qty * price;


      totalArticles +=
        qty;


      grandTotal +=
        itemTotal;


      mainCurrency =
        currency;


      const img =
        item.image ||
        item.imageUrl ||
        "https://via.placeholder.com/70";


      const name =
        item.nom ||
        item.name ||
        item.title ||
        "Produit";


      html += `

        <div
          class="cart-item"
          data-id="${escapeHtml(productId)}">

          <img
            src="${escapeHtml(img)}"
            alt="${escapeHtml(name)}"
            class="cart-item-img"
            onerror="
              this.src='https://via.placeholder.com/70';
            "
          >


          <div class="cart-item-info">

            <div class="cart-item-title">

              ${escapeHtml(name)}

            </div>


            <div class="cart-item-price">

              ${formatPrice(price, currency)}

            </div>


            <div class="qty-controls">

              <button
                type="button"
                class="btn-qty btn-minus"
                data-id="${escapeHtml(productId)}">

                −

              </button>


              <span class="qty-val">

                ${qty}

              </span>


              <button
                type="button"
                class="btn-qty btn-plus"
                data-id="${escapeHtml(productId)}">

                +

              </button>

            </div>

          </div>


          <button
            type="button"
            class="btn-remove"
            data-id="${escapeHtml(productId)}"
            title="Supprimer">

            🗑️

          </button>

        </div>

      `;

    }
  );


  cartList.innerHTML =
    html;


  totalItemsCount.textContent =
    totalArticles;


  grandTotal.textContent =
    formatPrice(
      grandTotal,
      mainCurrency
    );


  cartSummary.style.display =
    "block";


  attacherEvenements();

}


// ============================================================
// BOUTONS + / - / SUPPRIMER
// ============================================================

function attacherEvenements() {


  document
    .querySelectorAll(".btn-plus")
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const id =
            button.dataset.id;


          const item =
            currentCart[id];


          if (!item) {
            return;
          }


          const oldQty =
            Number(
              item.quantite ??
              item.quantity ??
              1
            );


          const newQty =
            oldQty + 1;


          const price =
            Number(
              item.prixUnitaire ??
              item.price ??
              item.prix ??
              0
            );


          try {

            await update(

              ref(
                db,
                `users/${currentUser.uid}/panier/${id}`
              ),

              {
                quantite: newQty,

                total:
                  Number(
                    (
                      newQty * price
                    ).toFixed(2)
                  ),

                updatedAt:
                  Date.now()
              }

            );

          } catch (error) {

            console.error(error);

            alert(
              "Impossible de modifier le panier."
            );

          }

        }
      );

    });


  document
    .querySelectorAll(".btn-minus")
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const id =
            button.dataset.id;


          const item =
            currentCart[id];


          if (!item) {
            return;
          }


          const oldQty =
            Number(
              item.quantite ??
              item.quantity ??
              1
            );


          if (oldQty <= 1) {

            await supprimerArticle(id);

            return;
          }


          const newQty =
            oldQty - 1;


          const price =
            Number(
              item.prixUnitaire ??
              item.price ??
              item.prix ??
              0
            );


          try {

            await update(

              ref(
                db,
                `users/${currentUser.uid}/panier/${id}`
              ),

              {
                quantite: newQty,

                total:
                  Number(
                    (
                      newQty * price
                    ).toFixed(2)
                  ),

                updatedAt:
                  Date.now()
              }

            );

          } catch (error) {

            console.error(error);

            alert(
              "Impossible de modifier le panier."
            );

          }

        }
      );

    });


  document
    .querySelectorAll(".btn-remove")
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          await supprimerArticle(
            button.dataset.id
          );

        }
      );

    });

}


// ============================================================
// SUPPRIMER
// ============================================================

async function supprimerArticle(id) {

  try {

    await remove(
      ref(
        db,
        `users/${currentUser.uid}/panier/${id}`
      )
    );

  } catch (error) {

    console.error(error);

    alert(
      "Impossible de supprimer cet article."
    );

  }

}


// ============================================================
// VIDER LE PANIER
// ============================================================

btnClear.addEventListener(
  "click",
  async () => {

    if (!currentUser) {
      return;
    }


    if (
      !confirm(
        "Voulez-vous vraiment vider l'ensemble du panier ?"
      )
    ) {
      return;
    }


    try {

      await remove(
        ref(
          db,
          `users/${currentUser.uid}/panier`
        )
      );

    } catch (error) {

      console.error(error);

      alert(
        "Impossible de vider le panier."
      );

    }

  }
);


// ============================================================
// ALLER AU PAIEMENT
// ============================================================

btnPayment.addEventListener(
  "click",
  () => {

    if (!currentUser) {

      alert(
        "Veuillez vous connecter avant de continuer."
      );

      return;
    }


    if (
      !currentCart ||
      Object.keys(currentCart).length === 0
    ) {

      alert(
        "Votre panier est vide."
      );

      return;
    }


    /*
      IMPORTANT :
      aucun paiement ici.

      Le panier reste intact.
      paiement.html récupère le même panier
      depuis Firebase.
    */

    window.location.assign(
      "./paiement.html"
    );

  }
);