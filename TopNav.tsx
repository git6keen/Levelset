// TopNav.tsx
import React from "react";
import { NavLink } from "react-router-dom";
import { useConnections, stateColor } from "./useConnections";

export default function TopNav() {
  const { conns } = useConnections(60000);

  return (
    <div className="topbar">
      <div className="topbar-inner">
        <div className="brand">Proto3</div>
        <nav className="tabs">
          <NavLink to="/" end className={({ isActive }) => `tab${isActive ? " active" : ""}`}>Dashboard</NavLink>
          <NavLink to="/tasks" className={({ isActive }) => `tab${isActive ? " active" : ""}`}>Tasks</NavLink>
          <NavLink to="/checklists" className={({ isActive }) => `tab${isActive ? " active" : ""}`}>Checklists</NavLink>
          <NavLink to="/journal" className={({ isActive }) => `tab${isActive ? " active" : ""}`}>Journal</NavLink>
          <NavLink to="/rewards" className={({ isActive }) => `tab${isActive ? " active" : ""}`}>Rewards</NavLink>
          <NavLink to="/chat" className={({ isActive }) => `tab${isActive ? " active" : ""}`}>Chat</NavLink>
          <NavLink to="/settings" className={({ isActive }) => `tab${isActive ? " active" : ""}`}>Settings</NavLink>
        </nav>

        {/* Status dots */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <div className="schema-pill"><span className="badge">Schema v3</span></div>
          <div style={{ display: "flex", gap: 6 }}>
            {conns.map((c) => (
              <span
                key={c.name}
                title={`${c.name}   ${c.detail || c.state}`}
                aria-label={`${c.name} ${c.state}`}
                style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: stateColor(c.state),
                  display: "inline-block",
                  boxShadow: "0 0 0 1px rgba(0,0,0,.08)",
                  cursor: "default"
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
