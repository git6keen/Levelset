import React from "react";
import { NavLink, Outlet } from "react-router-dom";

export default function TasksLayout() {
  const tab = ({ isActive }: { isActive: boolean }) => "tab" + (isActive ? " active" : "");
  return (
    <>
      <div className="topbar" style={{ position: "sticky", top: 0, zIndex: 5 }}>
        <div className="topbar-inner" style={{ borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ fontWeight: 700 }}>Tasks</div>
          <nav className="tabs" style={{ marginLeft: 12 }}>
            <NavLink end to="/tasks" className={tab}>List</NavLink>
            <NavLink to="/tasks/goals" className={tab}>Goals</NavLink>
          </nav>
        </div>
      </div>
      <Outlet />
    </>
  );
}
