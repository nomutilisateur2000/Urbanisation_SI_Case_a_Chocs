
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("crypto");

// Initialisation Firebase
admin.initializeApp();

const db = admin.firestore();

// Secret partagé avec le simulateur Python
const petziSecret = defineSecret("PETZI_WEBHOOK_SECRET");

// Configuration
const REGION = "europe-west6";
const SIGNATURE_TOLERANCE_SECONDS = 30;

// Vérification de la signature PETZI
function verifyPetziSignature(req, secret) {
  const signatureHeader = req.get("Petzi-Signature");

  if (!signatureHeader || !req.rawBody) {
    return false;
  }

  // Étape 1 : extraction des paramètres
  const signatureParts = {};

  for (const part of signatureHeader.split(",")) {
    const separator = part.indexOf("=");

    if (separator === -1) return false;

    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();

    signatureParts[key] = value;
  }

  const timestamp = signatureParts.t;
  const receivedSignature = signatureParts.v1;

  if (
    !timestamp ||
    !/^\d+$/.test(timestamp) ||
    !receivedSignature ||
    !/^[a-f0-9]{64}$/i.test(receivedSignature)
  ) {
    return false;
  }

  // Étape 2 : préparation du message signé
  const signedPayload =
    `${timestamp}.${req.rawBody.toString("utf8")}`;

  // Étape 3 : calcul HMAC SHA-256
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest();

  const received = Buffer.from(receivedSignature, "hex");

  // Étape 4 : comparaison sécurisée
  if (!crypto.timingSafeEqual(expectedSignature, received)) {
    return false;
  }

  // Étape 5 : vérification du timestamp
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const requestTimestamp = Number(timestamp);

  if (
    !Number.isSafeInteger(requestTimestamp) ||
    Math.abs(currentTimestamp - requestTimestamp) >
      SIGNATURE_TOLERANCE_SECONDS
  ) {
    return false;
  }

  return true;
}

// Normalisation des données PETZI
function normalizeTicket(payload) {
  const ticket = payload.details?.ticket;
  const buyer = payload.details?.buyer || {};

  if (!ticket || !ticket.number) {
    throw new Error("Ticket ou numéro de billet manquant");
  }

  const session = ticket.sessions?.[0] || {};
  const location = session.location || {};

  const amount = Number(ticket.price?.amount);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Prix du billet invalide");
  }

  return {
    ticketNumber: ticket.number,
    ticketType: ticket.type || null,
    title: ticket.title || null,
    category: ticket.category || null,

    eventId: ticket.eventId ?? null,
    eventName: ticket.event || null,
    promoter: ticket.promoter || null,

    session: {
      name: session.name || null,
      date: session.date || null,
      time: session.time || null,
      doors: session.doors || null,
    },

    location: {
      name: location.name || null,
      street: location.street || null,
      city: location.city || null,
      postcode: location.postcode || null,
    },

    price: {
      amount,
      currency: ticket.price?.currency || null,
    },

    buyer: {
      role: buyer.role || null,
      firstName: buyer.firstName || null,
      lastName: buyer.lastName || null,
      postcode: buyer.postcode || null,
    },

    cancellationReason: ticket.cancellationReason || null,
    generatedAt: ticket.generatedAt || null,

    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

// Enregistrement du billet
async function handleTicketCreated(payload) {
  const ticket = normalizeTicket(payload);

  const documentId = crypto
    .createHash("sha256")
    .update(ticket.ticketNumber)
    .digest("hex");

  const ticketRef = db.collection("tickets").doc(documentId);

  // Création ou mise à jour du document
  await ticketRef.set(ticket, { merge: true });

  console.log("Billet enregistré :", ticket.ticketNumber);
}

// Réception des webhooks PETZI
exports.petziWebhook = onRequest(
  {
    region: REGION,
    secrets: [petziSecret],
    maxInstances: 10,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).send("Method not allowed");
    }

    if (!req.is("application/json")) {
      return res.status(415).send("Content-Type must be application/json");
    }

    try {
      // Vérification de la signature
      if (!verifyPetziSignature(req, petziSecret.value())) {
        console.warn("Signature PETZI invalide");
        return res.status(401).send("Invalid signature");
      }

      const payload = req.body;

      if (!payload || !payload.event || !payload.details) {
        return res.status(400).send("Invalid webhook payload");
      }

      console.log("Événement PETZI reçu :", payload.event);

      switch (payload.event) {
        case "ticket_created":
          await handleTicketCreated(payload);
          break;

        default:
          console.log("Événement non traité :", payload.event);
          return res.status(200).send("Event ignored");
      }

      return res.status(200).send("Webhook processed");

    } catch (error) {
      console.error("Erreur traitement webhook :", error);
      return res.status(500).send("Internal server error");
    }
  }
);
