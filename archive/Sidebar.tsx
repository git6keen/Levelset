import React from "react";
import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">🏆 Proto3</div>
      <nav className="nav">
        <NavLink to="/" end className={({isActive}) => isActive ? "active" : ""}>Dashboard</NavLink>
        <NavLink to="/tasks" className={({isActive}) => isActive ? "active" : ""}>Tasks</NavLink>
        <NavLink to="/checklists" className={({isActive}) => isActive ? "active" : ""}>Checklists</NavLink>
        <NavLink to="/journal" className={({isActive}) => isActive ? "active" : ""}>Journal</NavLink>
        <NavLink to="/rewards" className={({isActive}) => isActive ? "active" : ""}>Rewards</NavLink>
      </nav>
    </aside>
  );
}
