
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firestore/config";

export function getTickets(callback) {
  try {
    const ticketsRef = collection(db, "tickets");

    //onSnapshot permet de s'abonner au changement de FireStore
    const unsubscribe = onSnapshot(
      ticketsRef,
      (snapshot) => {
        const tickets = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        callback(tickets);
      },
      (error) => {
        console.error(
          "Erreur lors de la récupération des tickets :",
          error
        );
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error("Erreur lors de la récupération des tickets :", error);
    throw error;
  }
}
