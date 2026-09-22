// ============================================================
// DAKPRO ÉLITE
// acheteur-commandes.js
//
// COMMANDES ACHETEUR
//
// - Firebase Authentication
// - Firebase Realtime Database
// - Vérification du paiement Firebase
// - Reçu disponible uniquement après paiement confirmé
// - Images réelles des produits
// - Confirmation de livraison
// - Commande retirée de l'affichage acheteur après livraison
// ============================================================

import {
    ref,
    onValue,
    update,
    get
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


function formatCFA(amount) {

    return new Intl.NumberFormat("fr-FR")
        .format(Math.round(Number(amount) || 0))
        + " FCFA";

}


function formatDate(value) {

    if (!value) {
        return "Date non spécifiée";
    }

    let date;

    if (
        typeof value === "number" ||
        /^\d+$/.test(String(value))
    ) {

        date = new Date(Number(value));

    } else {

        date = new Date(value);

    }

    if (isNaN(date.getTime())) {
        return "Date non spécifiée";
    }

    return date.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });

}


// ============================================================
// IMAGE DE SECOURS
// ============================================================

const fallbackImage =
    "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg"
             width="100"
             height="100"
             viewBox="0 0 100 100">

            <rect width="100"
                  height="100"
                  fill="#12161f"/>

            <text x="50"
                  y="50"
                  text-anchor="middle"
                  dominant-baseline="middle"
                  fill="#d4af37"
                  font-size="12">
                DAKPRO
            </text>

        </svg>
    `);


// ============================================================
// CHARGEMENT QR CODE
// ============================================================

function loadQRCodeLibrary() {

    return new Promise(resolve => {

        if (window.QRCode) {
            resolve(true);
            return;
        }

        const old =
            document.getElementById("script-qrcode");

        if (old) {

            old.addEventListener(
                "load",
                () => resolve(true)
            );

            old.addEventListener(
                "error",
                () => resolve(false)
            );

            return;
        }

        const script =
            document.createElement("script");

        script.id =
            "script-qrcode";

        script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";

        script.onload =
            () => resolve(true);

        script.onerror =
            () => resolve(false);

        document.head.appendChild(script);

    });

}


// ============================================================
// DÉTERMINER SI LE PAIEMENT EST RÉELLEMENT CONFIRMÉ
// ============================================================
//
// IMPORTANT :
// Le reçu ne dépend PAS uniquement de la présence d'une
// commande.
//
// Il dépend du statut de paiement enregistré dans Firebase.
//
// Valeurs acceptées :
// - Payé
// - Payée
// - paid
// - approved
// - success
// - succeeded
// - confirmed
// - confirmé
// ============================================================

function paiementConfirme(order) {

    const valeurs = [

        order?.paiement?.statut,

        order?.paiement?.status,

        order?.paiement?.etat,

        order?.paiementStatut,

        order?.statutPaiement,

        order?.paymentStatus,

        order?.payment?.status,

        order?.statut

    ];


    return valeurs.some(value => {

        if (!value) {
            return false;
        }

        const status =
            String(value)
                .trim()
                .toLowerCase();


        return (

            status === "payé" ||
            status === "payee" ||
            status === "paye" ||
            status === "paid" ||
            status === "approved" ||
            status === "success" ||
            status === "succeeded" ||
            status === "confirmed" ||
            status === "confirmé" ||
            status === "confirme"

        );

    });

}


// ============================================================
// DÉTERMINER SI LA LIVRAISON EST TERMINÉE
// ============================================================

function livraisonConfirmee(order) {

    const valeurs = [

        order?.statutLivraison,

        order?.livraison?.statut,

        order?.statut

    ];


    return valeurs.some(value => {

        if (!value) {
            return false;
        }

        const status =
            String(value)
                .trim()
                .toLowerCase();


        return (

            status.includes("livré") ||
            status.includes("livree") ||
            status.includes("livree") ||
            status.includes("delivered")

        );

    });

}


// ============================================================
// RÉCUPÉRATION IMAGE RÉELLE DU PRODUIT
// ============================================================

async function recupererImageProduit(
    db,
    item
) {

    /*
     * 1. On utilise d'abord l'image enregistrée
     *    directement dans la commande.
     */

    let image =

        item?.image ||

        item?.imageUrl ||

        item?.photo ||

        item?.photoUrl ||

        null;


    if (image) {
        return image;
    }


    /*
     * 2. Si aucune image n'est dans la commande,
     *    on recherche la publication réelle.
     */

    const productId =

        item?.id ||

        item?.produitId ||

        item?.productId ||

        item?.publicationId;


    if (!productId) {
        return fallbackImage;
    }


    try {

        const snapshot =
            await get(
                ref(
                    db,
                    `publications/${productId}`
                )
            );


        if (!snapshot.exists()) {
            return fallbackImage;
        }


        const product =
            snapshot.val();


        image =

            product?.image ||

            product?.imageUrl ||

            product?.photo ||

            product?.photoUrl ||

            (
                Array.isArray(product?.images)
                    ? product.images[0]
                    : null
            );


        return image || fallbackImage;

    } catch (error) {

        console.warn(
            "Impossible de récupérer l'image du produit :",
            productId,
            error
        );

        return fallbackImage;

    }

}


// ============================================================
// RÉCUPÉRATION DES ARTICLES RÉELS
// ============================================================

async function preparerArticles(
    db,
    order
) {

    const rawArticles =

        order?.articles ||

        order?.items ||

        order?.produits ||

        {};


    const articles =

        Array.isArray(rawArticles)

            ? rawArticles

            : Object.values(rawArticles);


    const result = [];


    for (const item of articles) {

        if (
            !item ||
            typeof item !== "object"
        ) {
            continue;
        }


        const id =

            item.id ||

            item.produitId ||

            item.productId ||

            item.publicationId ||

            "N/A";


        const quantity =

            Math.max(
                1,
                parseInt(
                    item.quantite ??
                    item.quantity ??
                    item.qty ??
                    1,
                    10
                )
            );


        const name =

            item.nom ||

            item.name ||

            item.title ||

            item.libelle ||

            "Produit DAKPRO ÉLITE";


        const price =

            Number(
                item.prixUnitaire ??
                item.prix ??
                item.price ??
                0
            );


        const image =
            await recupererImageProduit(
                db,
                item
            );


        const subtotal =
            quantity * price;


        result.push({

            id,

            nom: name,

            prixUnitaire: price,

            quantite: quantity,

            total: subtotal,

            image

        });

    }


    return result;

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
                text-align:center;
                padding:40px;
                color:#ff8585;
                font-family:Poppins,sans-serif;
            ">

                🔐 Veuillez vous connecter
                pour consulter vos commandes.

            </div>

        `;

        return;
    }


    loadQRCodeLibrary();


    container.innerHTML = `

        <style>

            .orders-title {
                color:#d4af37;
                font-size:20px;
                font-weight:bold;
                margin-bottom:20px;
                border-bottom:1px solid #2a2a32;
                padding-bottom:10px;
            }

            .order-card {
                background:#0a0d14;
                border:1px solid #222;
                border-radius:12px;
                padding:18px;
                margin-bottom:18px;
            }

            .order-header {
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:10px;
                flex-wrap:wrap;
                border-bottom:1px solid #1c1c21;
                padding-bottom:10px;
                margin-bottom:12px;
            }

            .status-badge {
                padding:5px 12px;
                border-radius:20px;
                font-size:12px;
                font-weight:bold;
                display:inline-block;
            }

            .status-paid {
                background:rgba(34,197,94,.12);
                color:#22c55e;
                border:1px solid #22c55e;
            }

            .status-pending {
                background:rgba(234,179,8,.12);
                color:#eab308;
                border:1px solid #eab308;
            }

            .status-processing {
                background:rgba(59,130,246,.12);
                color:#3b82f6;
                border:1px solid #3b82f6;
            }

            .status-shipped {
                background:rgba(168,85,247,.12);
                color:#a855f7;
                border:1px solid #a855f7;
            }

            .status-delivered {
                background:rgba(34,197,94,.12);
                color:#22c55e;
                border:1px solid #22c55e;
            }

            .order-item-row {
                display:flex;
                align-items:center;
                gap:12px;
                background:#12161f;
                padding:10px;
                border-radius:8px;
                margin-bottom:8px;
            }

            .order-item-img {
                width:60px;
                height:60px;
                border-radius:7px;
                object-fit:cover;
                border:1px solid #333;
                background:#0a0d14;
                flex-shrink:0;
            }

            .payment-box {
                background:#101820;
                border:1px solid #26313e;
                border-radius:9px;
                padding:12px;
                margin-top:12px;
            }

            .btn-receipt {
                background:#12161f;
                color:#d4af37;
                border:1px solid #d4af37;
                padding:9px 14px;
                border-radius:6px;
                font-weight:bold;
                cursor:pointer;
            }

            .btn-receipt:hover {
                background:#d4af37;
                color:#000;
            }

            .btn-receipt:disabled {
                opacity:.45;
                cursor:not-allowed;
            }

            .btn-confirm-delivery {
                background:#22c55e;
                color:#000;
                border:none;
                padding:9px 14px;
                border-radius:6px;
                font-weight:bold;
                cursor:pointer;
            }

            .btn-confirm-delivery:hover {
                background:#16a34a;
                color:#fff;
            }

            .order-actions {
                display:flex;
                gap:10px;
                align-items:center;
                justify-content:flex-end;
                flex-wrap:wrap;
            }

            @media(max-width:600px) {

                .order-actions {
                    justify-content:stretch;
                }

                .order-actions button {
                    width:100%;
                }

            }

        </style>


        <div class="orders-title">
            📦 Historique & Suivi des Commandes - DAKPROELITE
        </div>


        <div id="ordersListContainer">

            <div style="
                color:#888;
                text-align:center;
                padding:40px;
            ">

                Chargement sécurisé de vos commandes...

            </div>

        </div>

    `;


    const ordersRef =
        ref(
            db,
            `commandes/${currentUid}`
        );


    onValue(

        ordersRef,

        async snapshot => {

            const list =
                document.getElementById(
                    "ordersListContainer"
                );


            if (!list) {
                return;
            }


            if (!snapshot.exists()) {

                list.innerHTML = `

                    <div style="
                        color:#888;
                        text-align:center;
                        padding:40px;
                        background:#0a0d14;
                        border-radius:12px;
                        border:1px solid #222;
                    ">

                        Vous n'avez aucune commande
                        enregistrée pour le moment.

                    </div>

                `;

                return;
            }


            const ordersData =
                snapshot.val();


            const orderEntries =
                Object.entries(
                    ordersData
                ).reverse();


            list.innerHTML = "";


            for (
                const [orderId, order]
                of orderEntries
            ) {

                /*
                 * Une commande déjà confirmée comme livrée
                 * ne doit plus apparaître dans l'espace acheteur.
                 *
                 * Elle reste néanmoins dans Firebase
                 * pour l'administration.
                 */

                if (
                    livraisonConfirmee(order)
                ) {

                    continue;

                }


                const paymentConfirmed =
                    paiementConfirme(order);


                const processedItems =
                    await preparerArticles(
                        db,
                        order
                    );


                let calculatedTotal = 0;


                processedItems.forEach(
                    item => {

                        calculatedTotal +=
                            item.total;

                    }
                );


                const finalTotal =

                    Number(
                        order.montantTotal ??
                        order.total ??
                        calculatedTotal
                    );


                const rawDate =

                    order.date ||

                    order.createdAt ||

                    order.timestamp ||

                    order.dateCommande;


                const dateFormatted =
                    formatDate(rawDate);


                const commandeId =

                    order.commandeId ||

                    orderId;


                // ====================================================
                // STATUT PAIEMENT
                // ====================================================

                let paymentBadge = "";

                if (paymentConfirmed) {

                    paymentBadge = `

                        <span class="status-badge status-paid">

                            ✅ Paiement confirmé

                        </span>

                    `;

                } else {

                    paymentBadge = `

                        <span class="status-badge status-pending">

                            ⏳ Paiement en attente

                        </span>

                    `;

                }


                // ====================================================
                // STATUT LIVRAISON
                // ====================================================

                const livraisonStatus =
                    String(
                        order.statutLivraison ||
                        "En attente"
                    );


                let deliveryBadge = `

                    <span class="status-badge status-processing">

                        📦 ${escapeHTML(
                            livraisonStatus
                        )}

                    </span>

                `;


                if (
                    livraisonStatus
                        .toLowerCase()
                        .includes("expédi")
                ) {

                    deliveryBadge = `

                        <span class="status-badge status-shipped">

                            🚚 Commande expédiée

                        </span>

                    `;

                }


                // ====================================================
                // ARTICLES
                // ====================================================

                let itemsHTML = "";


                processedItems.forEach(
                    item => {

                        itemsHTML += `

                            <div class="order-item-row">

                                <img
                                    src="${escapeHTML(item.image)}"
                                    alt="${escapeHTML(item.nom)}"
                                    class="order-item-img"
                                    onerror="
                                        this.onerror=null;
                                        this.src='${fallbackImage}';
                                    "
                                >


                                <div style="flex:1;min-width:0;">

                                    <div style="
                                        color:#f5f5f7;
                                        font-weight:bold;
                                        font-size:13px;
                                    ">

                                        ${escapeHTML(
                                            item.nom
                                        )}

                                    </div>


                                    <div style="
                                        color:#aaa;
                                        font-size:12px;
                                    ">

                                        Qté :
                                        ${item.quantite}

                                        ×

                                        ${formatCFA(
                                            item.prixUnitaire
                                        )}

                                    </div>

                                </div>


                                <div style="
                                    font-weight:bold;
                                    color:#70e090;
                                    font-size:13px;
                                ">

                                    ${formatCFA(
                                        item.total
                                    )}

                                </div>

                            </div>

                        `;

                    }
                );


                if (!itemsHTML) {

                    itemsHTML = `

                        <div style="
                            color:#888;
                            padding:15px;
                        ">

                            Détails des articles
                            non disponibles.

                        </div>

                    `;

                }


                // ====================================================
                // BOUTON REÇU
                // ====================================================
                //
                // IL N'EST PAS DISPONIBLE SI LE PAIEMENT
                // N'EST PAS CONFIRMÉ.
                //

                const receiptButton =

                    paymentConfirmed

                        ? `

                            <button
                                class="btn-receipt"
                                id="btn-receipt-${escapeHTML(orderId)}">

                                📄 Télécharger le reçu

                            </button>

                        `

                        : `

                            <button
                                class="btn-receipt"
                                disabled
                                title="Le reçu sera disponible après confirmation du paiement">

                                🔒 Reçu après paiement

                            </button>

                        `;


                // ====================================================
                // BOUTON LIVRAISON
                // ====================================================

                const deliveryButton =

                    `

                    <button
                        class="btn-confirm-delivery"
                        id="btn-confirm-${escapeHTML(orderId)}">

                        ✅ Confirmer la réception

                    </button>

                    `;


                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "order-card";


                card.innerHTML = `

                    <div class="order-header">

                        <div>

                            <div style="
                                font-weight:bold;
                                color:#fff;
                                font-size:15px;
                            ">

                                N° de commande :
                                ${escapeHTML(
                                    commandeId
                                )}

                            </div>


                            <div style="
                                font-size:12px;
                                color:#888;
                                margin-top:3px;
                            ">

                                Effectuée le :
                                ${escapeHTML(
                                    dateFormatted
                                )}

                            </div>

                        </div>


                        <div style="
                            display:flex;
                            gap:7px;
                            flex-wrap:wrap;
                        ">

                            ${paymentBadge}

                            ${deliveryBadge}

                        </div>

                    </div>


                    <div class="items-list">

                        ${itemsHTML}

                    </div>


                    <div class="payment-box">

                        <div style="
                            color:#aaa;
                            font-size:12px;
                            margin-bottom:5px;
                        ">

                            Statut du paiement

                        </div>


                        <div style="
                            color:${paymentConfirmed
                                ? "#22c55e"
                                : "#eab308"};
                            font-weight:bold;
                        ">

                            ${paymentConfirmed
                                ? "🟢 Paiement reçu et confirmé"
                                : "🟡 Paiement non encore confirmé"}

                        </div>


                        ${
                            paymentConfirmed
                            ? `
                                <div style="
                                    color:#777;
                                    font-size:11px;
                                    margin-top:5px;
                                ">

                                    Référence :
                                    ${escapeHTML(
                                        order.paiement?.reference ||
                                        order.paiement?.transactionId ||
                                        order.transactionId ||
                                        "Confirmée"
                                    )}

                                </div>
                            `
                            : `
                                <div style="
                                    color:#777;
                                    font-size:11px;
                                    margin-top:5px;
                                ">

                                    Le reçu officiel sera disponible
                                    dès confirmation réelle du paiement.

                                </div>
                            `
                        }

                    </div>


                    <div style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        border-top:1px solid #1c1c21;
                        padding-top:12px;
                        margin-top:12px;
                        flex-wrap:wrap;
                        gap:12px;
                    ">


                        <div style="
                            font-size:16px;
                            font-weight:bold;
                            color:#d4af37;
                        ">

                            Total :

                            ${formatCFA(
                                finalTotal
                            )}

                        </div>


                        <div class="order-actions">

                            ${receiptButton}

                            ${deliveryButton}

                        </div>


                    </div>

                `;


                list.appendChild(card);


                // ====================================================
                // REÇU
                // ====================================================

                if (paymentConfirmed) {

                    const btnReceipt =
                        card.querySelector(
                            `#btn-receipt-${CSS.escape(orderId)}`
                        );


                    if (btnReceipt) {

                        btnReceipt.addEventListener(
                            "click",
                            async () => {

                                await ouvrirRecuPaiement(

                                    order,

                                    commandeId,

                                    processedItems,

                                    finalTotal,

                                    currentUid,

                                    auth,

                                    db

                                );

                            }
                        );

                    }

                }


                // ====================================================
                // CONFIRMATION LIVRAISON
                // ====================================================

                const btnConfirm =
                    card.querySelector(
                        `#btn-confirm-${CSS.escape(orderId)}`
                    );


                if (btnConfirm) {

                    btnConfirm.addEventListener(
                        "click",
                        async () => {

                            await confirmerLivraison(

                                orderId,

                                currentUid,

                                db

                            );

                        }
                    );

                }

            }


            /*
             * Toutes les commandes sont livrées.
             */

            if (
                list.innerHTML.trim() === ""
            ) {

                list.innerHTML = `

                    <div style="
                        color:#888;
                        text-align:center;
                        padding:40px;
                        background:#0a0d14;
                        border-radius:12px;
                        border:1px solid #222;
                    ">

                        📦 Aucune commande en cours.

                        <br><br>

                        Vos commandes livrées restent
                        conservées dans le système.

                    </div>

                `;

            }

        },

        error => {

            console.error(
                "Erreur lecture commandes :",
                error
            );


            const list =
                document.getElementById(
                    "ordersListContainer"
                );


            if (list) {

                list.innerHTML = `

                    <div style="
                        color:#ff7777;
                        text-align:center;
                        padding:40px;
                    ">

                        ❌ Impossible de charger vos commandes.

                        <br><br>

                        ${escapeHTML(
                            error.message ||
                            "Erreur Firebase"
                        )}

                    </div>

                `;

            }

        }

    );

}


// ============================================================
// OUVRIR LE REÇU
// ============================================================

async function ouvrirRecuPaiement(

    order,

    commandeId,

    processedItems,

    total,

    currentUserId,

    auth,

    db

) {

    /*
     * SÉCURITÉ :
     * On vérifie encore une fois le statut Firebase
     * avant d'autoriser le reçu.
     */

    if (!paiementConfirme(order)) {

        alert(
            "Le reçu n'est pas encore disponible.\n\n" +
            "Le paiement n'est pas confirmé dans Firebase."
        );

        return;
    }


    await loadQRCodeLibrary();


    // ==========================================================
    // PROFIL UTILISATEUR
    // ==========================================================

    let userData = {};


    try {

        const userSnapshot =
            await get(
                ref(
                    db,
                    `users/${currentUserId}`
                )
            );


        if (
            userSnapshot.exists()
        ) {

            userData =
                userSnapshot.val();

        }

    } catch (error) {

        console.warn(
            "Profil utilisateur indisponible :",
            error
        );

    }


    const firebaseUser =
        auth?.currentUser;


    const email =

        firebaseUser?.email ||

        userData.email ||

        "Non renseigné";


    const nom =

        order?.livraison?.destinataire ||

        userData.nom ||

        userData.displayName ||

        "Client DAKPRO ÉLITE";


    const telephone =

        order?.livraison?.telephone ||

        userData.telephone ||

        userData.phone ||

        "Non renseigné";


    const adresse =

        order?.livraison?.adresse ||

        userData.adresse ||

        "Non renseignée";


    const ville =

        order?.livraison?.ville ||

        userData.ville ||

        "";


    const pays =

        order?.livraison?.pays ||

        userData.pays ||

        "";


    const paymentReference =

        order?.paiement?.reference ||

        order?.paiement?.transactionId ||

        order?.transactionId ||

        order?.referencePaiement ||

        "Paiement confirmé";


    const paymentDate =

        order?.paiement?.dateConfirmation ||

        order?.paiement?.paidAt ||

        order?.datePaiement ||

        order?.updatedAt ||

        Date.now();


    const securityCode =

        `DAK-${commandeId}-${currentUserId
            .slice(0, 6)
            .toUpperCase()}`;


    // ==========================================================
    // ARTICLES DU REÇU
    // ==========================================================

    let rows = "";


    processedItems.forEach(
        item => {

            rows += `

                <tr>

                    <td class="product-cell">

                        <img
                            src="${escapeHTML(item.image)}"
                            alt="${escapeHTML(item.nom)}"
                            onerror="
                                this.onerror=null;
                                this.src='${fallbackImage}';
                            "
                        >

                        <span>
                            ${escapeHTML(item.nom)}
                        </span>

                    </td>


                    <td>
                        ${item.quantite}
                    </td>


                    <td>
                        ${formatCFA(
                            item.prixUnitaire
                        )}
                    </td>


                    <td class="strong">
                        ${formatCFA(
                            item.total
                        )}
                    </td>

                </tr>

            `;

        }
    );


    // ==========================================================
    // FENÊTRE REÇU
    // ==========================================================

    const printWin =
        window.open(
            "",
            "_blank",
            "width=900,height=1000"
        );


    if (!printWin) {

        alert(
            "Veuillez autoriser les fenêtres surgissantes " +
            "(pop-up) pour afficher votre reçu."
        );

        return;
    }


    printWin.document.write(`

        <!DOCTYPE html>

        <html lang="fr">

        <head>

            <meta charset="UTF-8">

            <meta
                name="viewport"
                content="width=device-width,initial-scale=1.0"
            >

            <title>
                Reçu de paiement - ${escapeHTML(commandeId)}
            </title>


            <style>

                * {
                    box-sizing:border-box;
                }

                body {
                    margin:0;
                    padding:30px;
                    background:#f1f1f1;
                    color:#222;
                    font-family:Arial,Helvetica,sans-serif;
                }

                .receipt {
                    max-width:850px;
                    margin:auto;
                    background:white;
                    border:2px solid #d4af37;
                    border-radius:12px;
                    padding:30px;
                }

                .top {
                    display:flex;
                    justify-content:space-between;
                    gap:20px;
                    border-bottom:2px solid #d4af37;
                    padding-bottom:20px;
                    margin-bottom:20px;
                }

                .brand {
                    font-size:28px;
                    font-weight:900;
                    color:#050505;
                }

                .gold {
                    color:#d4af37;
                }

                .subtitle {
                    color:#777;
                    font-size:12px;
                    margin-top:5px;
                }

                .receipt-title {
                    text-align:right;
                }

                .receipt-title h1 {
                    margin:0;
                    font-size:20px;
                }

                .receipt-title p {
                    margin:5px 0;
                    color:#666;
                    font-size:12px;
                }

                .info {
                    display:grid;
                    grid-template-columns:1fr 1fr;
                    gap:15px;
                    margin-bottom:25px;
                }

                .box {
                    background:#f8f8f8;
                    border-left:4px solid #d4af37;
                    border-radius:5px;
                    padding:15px;
                    font-size:13px;
                    line-height:1.7;
                }

                .box-title {
                    font-weight:800;
                    margin-bottom:5px;
                    color:#111;
                }

                table {
                    width:100%;
                    border-collapse:collapse;
                    margin-top:15px;
                }

                th {
                    background:#0a0d14;
                    color:#d4af37;
                    padding:10px;
                    text-align:left;
                    font-size:12px;
                }

                td {
                    padding:10px;
                    border-bottom:1px solid #ddd;
                    font-size:12px;
                }

                .product-cell {
                    display:flex;
                    align-items:center;
                    gap:10px;
                }

                .product-cell img {
                    width:55px;
                    height:55px;
                    object-fit:cover;
                    border-radius:6px;
                    border:1px solid #ddd;
                    background:#eee;
                }

                .strong {
                    font-weight:800;
                }

                .total {
                    text-align:right;
                    margin-top:20px;
                    font-size:20px;
                    font-weight:900;
                }

                .payment-confirmed {
                    background:#eaf8ef;
                    border:1px solid #22c55e;
                    color:#147a38;
                    padding:12px;
                    border-radius:7px;
                    margin-top:20px;
                    font-weight:bold;
                }

                .qr-area {
                    margin-top:25px;
                    padding-top:20px;
                    border-top:2px dashed #ddd;
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    gap:20px;
                }

                .qr-text {
                    color:#777;
                    font-size:11px;
                    line-height:1.6;
                }

                #qrcode {
                    width:90px;
                    min-width:90px;
                }

                .buttons {
                    text-align:center;
                    margin-top:25px;
                }

                .buttons button {
                    border:none;
                    padding:12px 20px;
                    border-radius:7px;
                    background:#050505;
                    color:#d4af37;
                    font-weight:bold;
                    cursor:pointer;
                    margin:4px;
                }

                @media(max-width:650px) {

                    body {
                        padding:10px;
                    }

                    .receipt {
                        padding:15px;
                    }

                    .top {
                        flex-direction:column;
                    }

                    .receipt-title {
                        text-align:left;
                    }

                    .info {
                        grid-template-columns:1fr;
                    }

                    table {
                        font-size:10px;
                    }

                    .product-cell img {
                        width:40px;
                        height:40px;
                    }

                }

                @media print {

                    body {
                        background:white;
                        padding:0;
                    }

                    .receipt {
                        border:none;
                        max-width:none;
                    }

                    .buttons {
                        display:none;
                    }

                }

            </style>

        </head>


        <body>


            <div class="receipt">


                <div class="top">

                    <div>

                        <div class="brand">

                            DAK<span class="gold">
                                PRO ÉLITE
                            </span>

                        </div>

                        <div class="subtitle">

                            Marché international de
                            e-commerce

                        </div>

                    </div>


                    <div class="receipt-title">

                        <h1>
                            REÇU DE PAIEMENT
                        </h1>

                        <p>
                            Commande :
                            <strong>
                                ${escapeHTML(commandeId)}
                            </strong>
                        </p>

                        <p>
                            Date :
                            ${escapeHTML(
                                formatDate(paymentDate)
                            )}
                        </p>

                    </div>

                </div>


                <div class="info">


                    <div class="box">

                        <div class="box-title">
                            CLIENT
                        </div>

                        👤 ${escapeHTML(nom)}
                        <br>

                        ✉️ ${escapeHTML(email)}
                        <br>

                        📞 ${escapeHTML(telephone)}
                        <br>

                        📍 ${escapeHTML(adresse)}

                        ${
                            ville
                                ? `, ${escapeHTML(ville)}`
                                : ""
                        }

                        ${
                            pays
                                ? ` — ${escapeHTML(pays)}`
                                : ""
                        }

                    </div>


                    <div class="box">

                        <div class="box-title">
                            PAIEMENT
                        </div>

                        💳 FedaPay
                        <br>

                        🟢 Paiement confirmé
                        <br>

                        🔐 Référence :
                        ${escapeHTML(
                            paymentReference
                        )}

                    </div>


                </div>


                <div class="payment-confirmed">

                    ✅ PAIEMENT REÇU ET CONFIRMÉ

                    <br>

                    <span style="
                        font-weight:normal;
                        font-size:12px;
                    ">

                        Ce reçu est généré à partir
                        des informations enregistrées
                        dans Firebase.

                    </span>

                </div>


                <table>

                    <thead>

                        <tr>

                            <th>
                                Produit
                            </th>

                            <th>
                                Qté
                            </th>

                            <th>
                                Prix unitaire
                            </th>

                            <th>
                                Sous-total
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        ${rows}

                    </tbody>

                </table>


                <div class="total">

                    Total réglé :

                    <span class="gold">

                        ${formatCFA(total)}

                    </span>

                </div>


                <div class="qr-area">

                    <div class="qr-text">

                        <strong>
                            DAKPRO ÉLITE
                        </strong>

                        <br>

                        Preuve électronique de paiement.

                        <br>

                        Référence :
                        ${escapeHTML(paymentReference)}

                        <br>

                        Code de vérification :
                        ${escapeHTML(securityCode)}

                    </div>


                    <div id="qrcode"></div>

                </div>


                <div class="buttons">

                    <button
                        onclick="window.print()">

                        📄 Télécharger / Enregistrer en PDF

                    </button>


                    <button
                        onclick="window.close()">

                        ✕ Fermer

                    </button>

                </div>


            </div>


            <script src="
                https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js
            "><\/script>


            <script>

                window.addEventListener(
                    "load",
                    function() {

                        if (window.QRCode) {

                            new QRCode(
                                document.getElementById(
                                    "qrcode"
                                ),
                                {

                                    text:
                                        "${securityCode}",

                                    width:90,

                                    height:90,

                                    colorDark:"#0a0d14",

                                    colorLight:"#ffffff"

                                }
                            );

                        }

                    }
                );

            <\/script>


        </body>

        </html>

    `);


    printWin.document.close();

}


// ============================================================
// CONFIRMATION DE LIVRAISON
// ============================================================

async function confirmerLivraison(

    orderId,

    userId,

    db

) {

    const confirmation =
        confirm(

            "Confirmez-vous avoir réellement reçu " +
            "cette commande ?\n\n" +

            "Après confirmation, elle disparaîtra " +
            "de votre liste de commandes en cours."

        );


    if (!confirmation) {
        return;
    }


    try {

        /*
         * On écrit le statut de livraison.
         *
         * On NE SUPPRIME PAS la commande de Firebase.
         *
         * Elle reste disponible pour :
         * - administration
         * - vendeur
         * - livreur
         * - historique
         */

        await update(

            ref(
                db,
                `commandes/${userId}/${orderId}`
            ),

            {

                statut:
                    "Livrée",

                statutLivraison:
                    "Livrée",

                dateLivraison:
                    Date.now(),

                receptionConfirmeeParAcheteur:
                    true,

                receptionConfirmeeAt:
                    Date.now()

            }

        );


        /*
         * onValue() recharge automatiquement
         * la liste et, puisque la commande est
         * maintenant "Livrée", elle disparaît
         * de l'affichage acheteur.
         */

        alert(
            "✅ Réception confirmée avec succès."
        );


    } catch (error) {

        console.error(
            "Erreur confirmation livraison :",
            error
        );


        alert(

            "❌ Impossible de confirmer la livraison.\n\n" +

            (
                error.message ||
                "Erreur Firebase"
            )

        );

    }

}