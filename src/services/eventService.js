
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firestore/config";

export function getEvents(callback) {
  try {
    const eventsRef = collection(db, "events");

    const unsubscribe = onSnapshot(
      eventsRef,
      (snapshot) => {
        const events = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        callback(events);
      },
      (error) => {
        console.error(
          "Erreur lors de la récupération des événements :",
          error
        );
      }
    );

    return unsubscribe;

  } catch (error) {
    console.error("Erreur lors de la récupération des événements :", error);
    throw error;
  }
}
