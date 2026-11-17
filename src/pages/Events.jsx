
import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";

import {
  Search,
  CalendarDays,
  Ticket,
  Banknote,
  ArrowUpDown,
  Music,
  ArrowLeft,
  ReceiptText,
  TrendingUp,
} from "lucide-react";

import { subscribeToEventStats } from "../services/statisticsService";

import "./Events.css";

const formatNumber = (value) =>
  new Intl.NumberFormat("fr-CH").format(value);

const formatCurrency = (value) =>
  new Intl.NumberFormat("fr-CH", {
    style: "currency",
    currency: "CHF",
    maximumFractionDigits: 2,
  }).format(value);

function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("tickets");

  // Événement actuellement sélectionné
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Récupération des statistiques depuis Firestore
  useEffect(() => {
    const unsubscribe = subscribeToEventStats(
      (data) => {
        setEvents(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Statistiques globales
  const totals = useMemo(() => {
    return events.reduce(
      (acc, event) => ({
        tickets:
          acc.tickets + (Number(event.totalTickets) || 0),

        revenue:
          acc.revenue + (Number(event.totalRevenue) || 0),
      }),
      {
        tickets: 0,
        revenue: 0,
      }
    );
  }, [events]);

  // Recherche et tri des événements
  const filteredEvents = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    return events
      .filter((event) => {
        const name = (
          event.eventName ||
          event.eventId ||
          ""
        ).toLowerCase();

        return name.includes(normalizedSearch);
      })
      .sort((a, b) => {
        if (sortBy === "tickets") {
          return (
            (Number(b.totalTickets) || 0) -
            (Number(a.totalTickets) || 0)
          );
        }

        if (sortBy === "revenue") {
          return (
            (Number(b.totalRevenue) || 0) -
            (Number(a.totalRevenue) || 0)
          );
        }

        return (
          (a.eventName || a.eventId || "").localeCompare(
            b.eventName || b.eventId || "",
            "fr"
          )
        );
      });
  }, [events, search, sortBy]);

  // Chargement
  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <div className="events-message">
            Chargement des événements...
          </div>
        </main>
      </div>
    );
  }

  // Gestion des erreurs
  if (error) {
    return (
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <div className="events-message error">
            Erreur lors du chargement : {error}
          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // PAGE DÉTAILS D'UN ÉVÉNEMENT
  // ==========================================

  if (selectedEvent) {
    const event = selectedEvent;

    const tickets = Number(event.totalTickets) || 0;
    const revenue = Number(event.totalRevenue) || 0;
    const transactions = Number(event.totalTransactions) || 0;

    const averageBasket =
      transactions > 0 ? revenue / transactions : 0;

    return (
      <div className="app-layout">
        <Sidebar />

        <main className="main-content">
          <div className="event-details">

            {/* Retour */}
            <button
              className="back-button"
              onClick={() => setSelectedEvent(null)}
            >
              <ArrowLeft size={18} />
              Retour aux événements
            </button>

            {/* En-tête */}
            <header className="details-header">
              <div className="details-header-icon">
                <Music size={26} />
              </div>

              <div>
                <span className="details-label">
                  ANALYSE ÉVÉNEMENT
                </span>

                <h1>
                  {event.eventName || event.eventId}
                </h1>

                <p>
                  ID : {event.eventId || event.id}
                </p>
              </div>
            </header>

            {/* Indicateurs */}
            <section className="details-stats">

              <div className="details-stat-card">
                <div className="detail-stat-icon purple">
                  <Ticket size={22} />
                </div>

                <span>Billets vendus</span>

                <strong>
                  {formatNumber(tickets)}
                </strong>
              </div>

              <div className="details-stat-card">
                <div className="detail-stat-icon green">
                  <Banknote size={22} />
                </div>

                <span>Recettes générées</span>

                <strong>
                  {formatCurrency(revenue)}
                </strong>
              </div>

              <div className="details-stat-card">
                <div className="detail-stat-icon orange">
                  <TrendingUp size={22} />
                </div>

                <span>Panier moyen</span>

                <strong>
                  {formatCurrency(averageBasket)}
                </strong>
              </div>

              <div className="details-stat-card">
                <div className="detail-stat-icon blue">
                  <ReceiptText size={22} />
                </div>

                <span>Transactions</span>

                <strong>
                  {formatNumber(transactions)}
                </strong>
              </div>

            </section>

            {/* Analyse */}
            <section className="details-panel">
              <div className="details-panel-header">
                <div>
                  <h2>Analyse des performances</h2>
                  <p>
                    Vue détaillée des ventes de cet événement
                  </p>
                </div>
              </div>

              <div className="details-placeholder">
                <TrendingUp size={38} />

                <h3>Analyse des ventes</h3>

                <p>
                  Les graphiques d'évolution des billets vendus
                  et des recettes seront intégrés dans cet espace.
                </p>
              </div>
            </section>

          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // PAGE PRINCIPALE DES ÉVÉNEMENTS
  // ==========================================

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <div className="events-content">

          {/* EN-TÊTE */}
          <header className="events-header">
            <div>
              <h1>Événements</h1>

              <p>
                Consultez les performances de vos événements
              </p>
            </div>

            <div className="events-count">
              <CalendarDays size={18} />
              {events.length} événements
            </div>
          </header>

          {/* INDICATEURS GLOBAUX */}
          <section className="events-summary">

            <div className="events-summary-card">
              <div className="summary-icon purple">
                <Ticket />
              </div>

              <div>
                <span>Total des billets vendus</span>

                <strong>
                  {formatNumber(totals.tickets)}
                </strong>
              </div>
            </div>

            <div className="events-summary-card">
              <div className="summary-icon green">
                <Banknote />
              </div>

              <div>
                <span>Recettes totales</span>

                <strong>
                  {formatCurrency(totals.revenue)}
                </strong>
              </div>
            </div>

            <div className="events-summary-card">
              <div className="summary-icon orange">
                <CalendarDays />
              </div>

              <div>
                <span>Nombre d'événements</span>

                <strong>
                  {formatNumber(events.length)}
                </strong>
              </div>
            </div>

          </section>

          {/* RECHERCHE ET TRI */}
          <section className="events-toolbar">

            <div className="events-search">
              <Search size={19} />

              <input
                type="text"
                placeholder="Rechercher un événement..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="events-sort">
              <ArrowUpDown size={18} />

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="tickets">
                  Trier par billets vendus
                </option>

                <option value="revenue">
                  Trier par recettes
                </option>

                <option value="name">
                  Trier par nom
                </option>
              </select>
            </div>

          </section>

          {/* TABLEAU DES ÉVÉNEMENTS */}
          <section className="events-table-panel">

            <div className="events-table-header">
              <div>
                <h2>Performances des événements</h2>

                <p>
                  Résultats agrégés issus de Firestore
                </p>
              </div>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="events-empty">
                <CalendarDays size={35} />

                <strong>Aucun événement trouvé</strong>

                <p>
                  Essayez une autre recherche.
                </p>
              </div>
            ) : (

              <div className="events-table-wrapper">
                <table className="events-table">

                  <thead>
                    <tr>
                      <th>Événement</th>
                      <th>Billets vendus</th>
                      <th>Recettes</th>
                      <th>Panier moyen</th>
                      <th>Part des recettes</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredEvents.map((event) => {
                      const tickets =
                        Number(event.totalTickets) || 0;

                      const transactions =
                        Number(event.totalTransactions) || 0;

                      const revenue =
                        Number(event.totalRevenue) || 0;

                      const averageBasket =
                        transactions > 0
                          ? revenue / transactions
                          : 0;

                      const revenuePercentage =
                        totals.revenue > 0
                          ? (revenue / totals.revenue) * 100
                          : 0;

                      return (
                        <tr
                          key={event.id || event.eventId}
                          className="event-row"
                          onClick={() => setSelectedEvent(event)}
                          tabIndex={0}
                          role="button"
                          aria-label={`Voir les détails de ${
                            event.eventName || event.eventId
                          }`}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" ||
                              e.key === " "
                            ) {
                              e.preventDefault();
                              setSelectedEvent(event);
                            }
                          }}
                        >

                          <td>
                            <div className="event-name-cell">
                              <div className="event-avatar">
                                <Music size={19} />
                              </div>

                              <div>
                                <strong>
                                  {event.eventName || event.eventId}
                                </strong>

                                <span>
                                  ID : {event.eventId || event.id}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <strong>
                              {formatNumber(tickets)}
                            </strong>
                          </td>

                          <td>
                            <strong className="revenue-value">
                              {formatCurrency(revenue)}
                            </strong>
                          </td>

                          <td>
                            {formatCurrency(averageBasket)}
                          </td>

                          <td>
                            <div className="revenue-share">
                              <strong>
                                {revenuePercentage.toFixed(1)} %
                              </strong>

                              <div className="share-track">
                                <div
                                  className="share-fill"
                                  style={{
                                    width: `${revenuePercentage}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="event-open">
                              Voir détails →
                            </span>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>

                </table>
              </div>
            )}

            <div className="events-table-footer">
              {filteredEvents.length} événement(s) affiché(s)
            </div>

          </section>

        </div>
      </main>
    </div>
  );
}

export default Events;
