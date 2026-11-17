import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firestore/config";

export function subscribeToEventStats(callback, onError) {
  const statsRef = collection(db, "eventStats");

  return onSnapshot(
    statsRef,
    (snapshot) => {
      const statistics = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      callback(statistics);
    },
    (error) => {
      console.error("Erreur récupération statistiques :", error);

      if (onError) {
        onError(error);
      }
    }
  );
}