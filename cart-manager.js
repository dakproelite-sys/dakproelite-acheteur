import { getDatabase, ref, get, set, update, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

/**
 * Récupère les données réelles d'un produit depuis 'publications/{productId}'
 */
export async function getProductData(db, productId) {
  try {
    const snap = await get(ref(db, `publications/${productId}`));
    if (snap.exists()) {
      return { id: productId, ...snap.val() };
    }
    return null;
  } catch (error) {
    console.error("Erreur lors de la récupération du produit :", error);
    return null;
  }
}

/**
 * Ajoute un produit au panier dans 'users/{uid}/panier/{productId}'
 */
export async function addToCart(db, uid, productId, quantity = 1) {
  if (!uid || !productId) return false;

  const product = await getProductData(db, productId);
  if (!product) return false;

  const qty = parseInt(quantity) || 1;
  const unitPrice = parseFloat(product.prixPromo || product.prixNormal || 0);

  // Vérification si le produit existe déjà dans le panier
  const itemRef = ref(db, `users/${uid}/panier/${productId}`);
  const existingSnap = await get(itemRef);

  let newQty = qty;
  if (existingSnap.exists()) {
    newQty += parseInt(existingSnap.val().quantite || 0);
  }

  await set(itemRef, {
    produitId: productId,
    nom: product.nom || "Produit",
    prixUnitaire: unitPrice,
    quantite: newQty,
    total: (unitPrice * newQty),
    image: product.image || "https://via.placeholder.com/150",
    updatedAt: Date.now()
  });

  return true;
}

/**
 * Calcule le total général d'un panier à partir des prix mis à jour dans 'publications'
 */
export async function calculateCartTotal(db, uid) {
  if (!uid) return { totalAmount: 0, totalItems: 0, items: {} };

  const cartSnap = await get(ref(db, `users/${uid}/panier`));
  if (!cartSnap.exists()) return { totalAmount: 0, totalItems: 0, items: {} };

  const cartData = cartSnap.val();
  let totalAmount = 0;
  let totalItems = 0;

  for (const productId of Object.keys(cartData)) {
    const item = cartData[productId];
    const qty = parseInt(item.quantite) || 1;

    // Récupération dynamique du prix à jour
    const product = await getProductData(db, productId);
    const price = product ? parseFloat(product.prixPromo || product.prixNormal || item.prixUnitaire) : parseFloat(item.prixUnitaire || 0);

    totalAmount += price * qty;
    totalItems += qty;
  }

  return {
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    totalItems,
    items: cartData
  };
}
