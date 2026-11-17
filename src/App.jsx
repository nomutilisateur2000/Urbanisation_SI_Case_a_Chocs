
import { useState, useEffect } from "react";
import { getTickets } from "./services/ticketService";
import { firebaseConfig } from "./firestore/config";

function App() {
  const [tickets, setTickets] = useState([]);
  console.log("Projet Firebase :", firebaseConfig.projectId);

  useEffect(() => {
    // Écoute des tickets
    const unsubscribeTickets = getTickets((ticketsData) => {
      setTickets(ticketsData);
      console.log("Tickets mis à jour :", ticketsData);
    });

    // Arrêt des écouteurs lorsque l'application est démontée
    return () => {
      unsubscribeTickets();
    };
  }, []);

  return (
    <div>
      <h1>Case à Chocs</h1>
      
      <h2>Tickets</h2>
      <pre>{JSON.stringify(tickets, null, 2)}</pre>
    </div>
  );
}

export default App;
