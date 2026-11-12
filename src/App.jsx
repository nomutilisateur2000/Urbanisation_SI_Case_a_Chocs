
import { useState } from "react";
import { db } from "../firebase/config";
import { collection, getDocs } from "firebase/firestore";

function App() {
  const [events, setEvents] = useState([]);

  async function testFirestore() {
    try {
      const snapshot = await getDocs(collection(db, "events"));

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setEvents(data);
      console.log("Événements récupérés :", data);

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

      <pre>{JSON.stringify(events, null, 2)}</pre>
    </div>
  );
}

export default App;
