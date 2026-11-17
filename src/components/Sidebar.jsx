
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Ticket,
  ChartNoAxesCombined,
} from "lucide-react";

import "./Sidebar.css";

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h2>Case à Chocs</h2>
        <span>Administration</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className="nav-link">
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/events" className="nav-link">
          <CalendarDays size={20} />
          <span>Événements</span>
        </NavLink>

        <NavLink to="/tickets" className="nav-link">
          <Ticket size={20} />
          <span>Billetterie</span>
        </NavLink>

        <NavLink to="/analytics" className="nav-link">
          <ChartNoAxesCombined size={20} />
          <span>Analyses</span>
        </NavLink>
      </nav>
    </aside>
  );
}

export default Sidebar;
