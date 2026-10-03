// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Webhook FedaPay / Dounia
 * Traite les notifications de paiement de manière robuste (Succès, Annulation, Échec)
 */
exports.fedapayWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const event = req.body;
    
    // Extraction sécurisée des métadonnées
    const entity = event.entity || {};
    const commandeId = entity.custom_metadata ? entity.custom_metadata.commande_id : null;
    const transactionId = entity.id || `TXN_${Date.now()}`;
    const montant = entity.amount || 0;
    const statut = entity.status;

    if (!commandeId) {
      console.warn("Reçu un événement sans commande_id");
      return res.status(400).send({ status: "error", message: "ID de commande manquant" });
    }

    const db = admin.database();
    const dateNow = new Date().toISOString();

    // 1. CAS DU PAIEMENT RÉELLEMENT CONFIRMÉ (SUCCÈS)
    if (event.name === 'transaction.approved' || statut === 'approved') {

      // Mettre à jour le statut dans 'commandes'
      await db.ref(`commandes/${commandeId}`).update({
        statut: "PAYE",
        idTransaction: transactionId,
        datePaiement: dateNow
      });

      // Enregistrer dans 'paiement' et 'paiements'
      const paiementPayload = {
        commandeId: commandeId,
        transactionId: transactionId,
        montant: montant,
        statut: "RECU",
        moyenPaiement: entity.mode || "Mobile Money",
        date: dateNow
      };
      await db.ref(`paiement/${commandeId}`).set(paiementPayload);
      await db.ref(`paiements/${commandeId}`).set(paiementPayload);

      // Enregistrer dans 'transactions'
      await db.ref(`transactions/${transactionId}`).set({
        commandeId: commandeId,
        montant: montant,
        statut: "REUSSIE",
        description: `Paiement réussi pour la commande ${commandeId}`,
        date: dateNow
      });

    } 
    // 2. CAS OÙ LE PAIEMENT A ÉCHOUÉ OU A ÉTÉ ANNULÉ
    else if (
      event.name === 'transaction.canceled' || 
      event.name === 'transaction.declined' || 
      statut === 'declined' || 
      statut === 'canceled'
    ) {

      // Marquer la commande comme échouée
      await db.ref(`commandes/${commandeId}`).update({
        statut: "ECHEC_PAIEMENT",
        idTransaction: transactionId,
        dateEchec: dateNow
      });

      // Enregistrer l'échec dans 'transactions'
      await db.ref(`transactions/${transactionId}`).set({
        commandeId: commandeId,
        montant: montant,
        statut: "ECHOUEE",
        description: `Échec ou annulation du paiement pour la commande ${commandeId}`,
        date: dateNow
      });
    }

    return res.status(200).send({ status: "success" });

  } catch (error) {
    console.error("Erreur critique Webhook :", error);
    return res.status(500).send({ status: "error", message: error.message });
  }
});
