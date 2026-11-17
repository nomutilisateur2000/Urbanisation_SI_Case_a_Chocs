
import { useState } from "react";
import { getEvents } from "./services/eventService";
import { getTickets } from "./services/ticketService";

function App() {
  const [events, setEvents] = useState([]);
  const [tickets, setTickets] = useState([]);

  async function testFirestore() {
    try {
      const eventsData = await getEvents();
      const ticketsData = await getTickets();

      setEvents(eventsData);
      setTickets(ticketsData);

      console.log("Événements récupérés :", eventsData);
      console.log("Tickets récupérés :", ticketsData);

    } catch (error) {
      console.error("Erreur Firestore :", error);
    }
  }

  return (
    <div>
      <h1>Case à Chocs</h1>

      <button onClick={testFirestore}>
        Tester Firestore
      </button>

      <h2>Événements</h2>
      <pre>{JSON.stringify(events, null, 2)}</pre>

      <h2>Tickets</h2>
      <pre>{JSON.stringify(tickets, null, 2)}</pre>
    </div>
  );
}

export default App;
