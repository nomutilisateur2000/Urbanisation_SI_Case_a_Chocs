import { useEffect, useMemo, useState } from "react";

import {
  Ticket,
  ShoppingCart,
  Banknote,
  Users,
  CalendarDays,
  Lightbulb,
  TrendingUp,
  Music,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import { subscribeToEventStats } from "../services/statisticsService";

import "./Dashboard.css";

const formatNumber = (value) =>
  new Intl.NumberFormat("fr-CH").format(value);

const formatCurrency = (value) =>
  new Intl.NumberFormat("fr-CH", {
    style: "currency",
    currency: "CHF",
    maximumFractionDigits: 2,
  }).format(value);

function Dashboard() {
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeToEventStats(
      (data) => {
        setStatistics(data);
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

  // Calcul des indicateurs globaux
  const totals = useMemo(() => {
    const result = statistics.reduce(
      (acc, event) => ({
        tickets: acc.tickets + (Number(event.totalTickets) || 0),
        transactions:
          acc.transactions +
          (Number(event.totalTransactions) || 0),
        revenue:
          acc.revenue + (Number(event.totalRevenue) || 0),
      }),
      {
        tickets: 0,
        transactions: 0,
        revenue: 0,
      }
    );

    return {
      ...result,
      averageBasket:
        result.transactions > 0
          ? result.tickets / result.transactions
          : 0,
    };
  }, [statistics]);

  // Classement des événements
  const topEvents = useMemo(() => {
    return [...statistics]
      .sort(
        (a, b) =>
          (Number(b.totalTickets) || 0) -
          (Number(a.totalTickets) || 0)
      )
      .slice(0, 5);
  }, [statistics]);

  // Données du graphique par événement
  const chartData = useMemo(() => {
    return [...statistics]
      .sort(
        (a, b) =>
          (Number(b.totalTickets) || 0) -
          (Number(a.totalTickets) || 0)
      )
      .slice(0, 8)
      .map((event) => ({
        name: event.eventName || event.eventId,
        billets: Number(event.totalTickets) || 0,
        recettes: Number(event.totalRevenue) || 0,
      }));
  }, [statistics]);

  if (loading) {
    return (
      <div className="dashboard-message">
        Chargement des statistiques...
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-message error">
        Impossible de récupérer les statistiques : {error}
      </div>
    );
  }

  return (
    <div className="dashboard">

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="logo">
          <Music size={30} />
          <h2>CASE À CHOCS</h2>
        </div>

        <nav>
          <a className="nav-link active">
            <TrendingUp size={19} />
            Tableau de bord
          </a>

          <a className="nav-link">
            <CalendarDays size={19} />
            Événements
          </a>

          <a className="nav-link">
            <Ticket size={19} />
            Billetterie
          </a>

          <a className="nav-link">
            <Banknote size={19} />
            Analyses
          </a>
        </nav>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <main className="dashboard-content">

        <header className="dashboard-header">
          <div>
            <h1>Tableau de bord</h1>
            <p>Analyse des ventes de billets</p>
          </div>

          <div className="header-right">
            <span className="live-status">
              <span className="status-dot"></span>
              Données en direct
            </span>
          </div>
        </header>

        {/* INDICATEURS */}
        <section className="stats-grid">

          <StatCard
            icon={<Ticket />}
            title="Billets vendus"
            value={formatNumber(totals.tickets)}
            color="purple"
          />

          <StatCard
            icon={<ShoppingCart />}
            title="Transactions"
            value={formatNumber(totals.transactions)}
            color="green"
          />

          <StatCard
            icon={<Banknote />}
            title="Recettes totales"
            value={formatCurrency(totals.revenue)}
            color="orange"
          />

          <StatCard
            icon={<Users />}
            title="Billets / transaction"
            value={totals.averageBasket.toFixed(2)}
            color="blue"
          />

        </section>

        {/* GRAPHIQUE ET INFORMATIONS */}
        <section className="dashboard-grid">

          <div className="panel chart-panel">
            <div className="panel-header">
              <div>
                <h2>
                  <TrendingUp size={21} />
                  Ventes par événement
                </h2>
                <p>Classement selon le nombre de billets vendus</p>
              </div>
            </div>

            {chartData.length === 0 ? (
              <p className="empty-state">
                Aucune donnée disponible.
              </p>
            ) : (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{
                      top: 15,
                      right: 15,
                      left: 0,
                      bottom: 45,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="name"
                      angle={-25}
                      textAnchor="end"
                      interval={0}
                      tick={{ fontSize: 11 }}
                    />

                    <YAxis />

                    <Tooltip
                      formatter={(value) => [
                        formatNumber(value),
                        "Billets vendus",
                      ]}
                    />

                    <Bar
                      dataKey="billets"
                      fill="#7040d5"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* INSIGHTS */}
          <div className="panel insights-panel">
            <h2>
              <Lightbulb size={21} />
              Indicateurs clés
            </h2>

            <div className="insight-card purple-insight">
              <Ticket size={22} />
              <div>
                <strong>{statistics.length} événements</strong>
                <p>Présents dans les statistiques</p>
              </div>
            </div>

            <div className="insight-card green-insight">
              <TrendingUp size={22} />
              <div>
                <strong>{formatNumber(totals.tickets)} billets</strong>
                <p>Vendus sur l'ensemble des événements</p>
              </div>
            </div>

            <div className="insight-card orange-insight">
              <Banknote size={22} />
              <div>
                <strong>{formatCurrency(totals.revenue)}</strong>
                <p>Recettes cumulées</p>
              </div>
            </div>
          </div>

        </section>

        {/* TOP EVENEMENTS */}
        <section className="panel events-panel">

          <h2>
            <CalendarDays size={21} />
            Top événements
          </h2>

          {topEvents.length === 0 ? (
            <p className="empty-state">
              Aucun événement disponible.
            </p>
          ) : (
            <div className="events-list">

              {topEvents.map((event, index) => {
                const percentage =
                  totals.tickets > 0
                    ? (Number(event.totalTickets || 0) /
                        totals.tickets) *
                      100
                    : 0;

                return (
                  <div className="event-row" key={event.id}>

                    <div className="event-rank">
                      {index + 1}
                    </div>

                    <div className="event-info">
                      <strong>
                        {event.eventName || event.eventId}
                      </strong>
                      <span>
                        {formatNumber(event.totalTransactions || 0)}
                        {" "}transactions
                      </span>
                    </div>

                    <div className="event-progress">
                      <div className="progress-label">
                        {formatNumber(event.totalTickets || 0)}
                        {" "}billets
                      </div>

                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>
                    </div>

                    <strong className="event-percentage">
                      {percentage.toFixed(1)} %
                    </strong>

                  </div>
                );
              })}

            </div>
          )}

        </section>

        <footer className="dashboard-footer">
          Case à Chocs · Tableau de bord des ventes
        </footer>

      </main>
    </div>
  );
}

// Composant réutilisable pour les cartes KPI
function StatCard({ icon, title, value, color }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>
        {icon}
      </div>

      <div className="stat-info">
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export default Dashboard;