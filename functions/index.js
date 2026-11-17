
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
const TIME_ZONE = "Europe/Zurich";

// =====================================================
// 1. VERIFICATION DE LA SIGNATURE PETZI
// =====================================================

function verifyPetziSignature(req, secret) {
  const signatureHeader = req.get("Petzi-Signature");

  if (!signatureHeader || !req.rawBody) {
    return false;
  }

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

  const signedPayload =
    `${timestamp}.${req.rawBody.toString("utf8")}`;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest();

  const received = Buffer.from(receivedSignature, "hex");

  if (!crypto.timingSafeEqual(expectedSignature, received)) {
    return false;
  }

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

// =====================================================
// 2. NORMALISATION DES DONNEES PETZI
// =====================================================

function normalizeTicket(payload) {
  const ticket = payload.details?.ticket;
  const buyer = payload.details?.buyer || {};

  if (!ticket || !ticket.number) {
    throw new Error("Ticket ou numéro de billet manquant");
  }

  if (ticket.eventId === undefined || ticket.eventId === null) {
    throw new Error("Identifiant événement manquant");
  }

  const session = ticket.sessions?.[0] || {};
  const location = session.location || {};

  const amount = Number(ticket.price?.amount);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Prix du billet invalide");
  }

  const currency = ticket.price?.currency || null;

  if (!currency) {
    throw new Error("Devise du billet manquante");
  }

  return {
    ticketNumber: String(ticket.number),
    ticketType: ticket.type || null,
    title: ticket.title || null,
    category: ticket.category || null,

    eventId: String(ticket.eventId),
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
      currency,
    },

    buyer: {
      role: buyer.role || null,
      firstName: buyer.firstName || null,
      lastName: buyer.lastName || null,
      postcode: buyer.postcode || null,
    },

    cancellationReason: ticket.cancellationReason || null,
    generatedAt: ticket.generatedAt || null,
  };
}

// =====================================================
// 3. IDENTIFIANT DU DOCUMENT
// =====================================================

function hashTicketNumber(ticketNumber) {
  return crypto
    .createHash("sha256")
    .update(ticketNumber)
    .digest("hex");
}

// =====================================================
// 4. DETERMINATION DES PERIODES STATISTIQUES
// =====================================================

function getSalesPeriods(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  const dateKey =
    `${values.year}-${values.month}-${values.day}`;

  const hour = Number(values.hour);

  const monthKey =
    `${values.year}-${values.month}`;

  return {
    dateKey,
    hour,
    monthKey,
    hourlyKey:
      `${dateKey}_${String(hour).padStart(2, "0")}`,
  };
}

// =====================================================
// 5. TRAITEMENT ET AGRÉGATION DU BILLET
// =====================================================

async function handleTicketCreated(payload) {
  const ticket = normalizeTicket(payload);

  // Identifiant unique du billet
  const documentId = hashTicketNumber(ticket.ticketNumber);

  const ticketRef = db
    .collection("tickets")
    .doc(documentId);

  // Date utilisée pour les statistiques
  // generatedAt est utilisé provisoirement comme date de vente.
  const generatedDate = ticket.generatedAt
    ? new Date(ticket.generatedAt)
    : null;

  const salesDate =
    generatedDate && !Number.isNaN(generatedDate.getTime())
      ? generatedDate
      : new Date();

  const periods = getSalesPeriods(salesDate);

  // Conversion en centimes
  const revenueCents = Math.round(
    ticket.price.amount * 100
  );

  const eventId = ticket.eventId;
  const currency = ticket.price.currency;

  // Référence des statistiques événement
  const eventStatsRef = db
    .collection("eventStats")
    .doc(eventId);

  // Référence des statistiques quotidiennes
  const dailyStatsRef = db
    .collection("eventDailyStats")
    .doc(`${eventId}_${periods.dateKey}`);

  // Référence des statistiques horaires
  const hourlyStatsRef = db
    .collection("eventHourlyStats")
    .doc(`${eventId}_${periods.hourlyKey}`);

  // Référence des statistiques mensuelles
  const monthlyStatsRef = db
    .collection("monthlyStats")
    .doc(`${eventId}_${periods.monthKey}`);

  // =================================================
  // TRANSACTION FIRESTORE
  // =================================================

  const result = await db.runTransaction(async (transaction) => {

    // Lecture du billet pour vérifier le doublon
    const ticketDoc = await transaction.get(ticketRef);

    if (ticketDoc.exists) {
      console.log(
        "Billet déjà enregistré :",
        ticket.ticketNumber
      );

      return { duplicate: true };
    }

    // Lecture des statistiques globales
    const eventStatsDoc = await transaction.get(eventStatsRef);

    if (
      eventStatsDoc.exists &&
      eventStatsDoc.data().currency &&
      eventStatsDoc.data().currency !== currency
    ) {
      throw new Error(
        `Devise différente pour l'événement ${eventId}`
      );
    }

    const previousStats = eventStatsDoc.exists
      ? eventStatsDoc.data()
      : {};

    const totalTickets =
      (previousStats.totalTickets || 0) + 1;

    const totalRevenueCents =
      (previousStats.totalRevenueCents || 0) +
      revenueCents;

    // 1. Enregistrement du billet
    transaction.create(ticketRef, {
      ...ticket,

      salesDate: admin.firestore.Timestamp.fromDate(
        salesDate
      ),

      updatedAt:
        admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2. Statistiques globales par événement
    transaction.set(eventStatsRef, {
      eventId,
      eventName: ticket.eventName,

      totalTickets,
      totalRevenueCents,
      totalRevenue: totalRevenueCents / 100,

      currency,

      updatedAt:
        admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // 3. Statistiques quotidiennes
    transaction.set(dailyStatsRef, {
      eventId,
      date: periods.dateKey,

      totalTickets:
        admin.firestore.FieldValue.increment(1),

      totalRevenueCents:
        admin.firestore.FieldValue.increment(revenueCents),

      currency,

      updatedAt:
        admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // 4. Statistiques horaires
    transaction.set(hourlyStatsRef, {
      eventId,
      date: periods.dateKey,
      hour: periods.hour,

      totalTickets:
        admin.firestore.FieldValue.increment(1),

      totalRevenueCents:
        admin.firestore.FieldValue.increment(revenueCents),

      currency,

      updatedAt:
        admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // 5. Statistiques mensuelles
    transaction.set(monthlyStatsRef, {
      eventId,

      year: Number(periods.monthKey.slice(0, 4)),
      month: Number(periods.monthKey.slice(5, 7)),

      totalTickets:
        admin.firestore.FieldValue.increment(1),

      totalRevenueCents:
        admin.firestore.FieldValue.increment(revenueCents),

      currency,

      updatedAt:
        admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return { duplicate: false };
  });

  if (result.duplicate) {
    return;
  }

  console.log(
    "Billet enregistré et statistiques actualisées :",
    ticket.ticketNumber
  );
}

// =====================================================
// 6. RECEPTION DES WEBHOOKS PETZI
// =====================================================

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
      return res
        .status(415)
        .send("Content-Type must be application/json");
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

      console.log(
        "Événement PETZI reçu :",
        payload.event
      );

      switch (payload.event) {

        case "ticket_created":
          await handleTicketCreated(payload);
          break;

        default:
          console.log(
            "Événement non traité :",
            payload.event
          );

          return res.status(200).send("Event ignored");
      }

      return res.status(200).send("Webhook processed");

    } catch (error) {
      console.error(
        "Erreur traitement webhook :",
        error
      );

      return res.status(500).send("Internal server error");
    }
  }
);
