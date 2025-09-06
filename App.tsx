// FILE: App.tsx - Updated without Journal route
import React from "react";
import { Routes, Route, Navigate, NavLink, Outlet } from "react-router-dom";
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './query-client.js';

import TopNav from "./TopNav";
import Dashboard from "./Dashboard";
import TasksPage from "./TasksPage";
import CalendarPage from "./CalendarPage";
import DailyPlannerPage from "./DailyPlannerPage";
import GoalsPage from "./GoalsPage";
import ChecklistsPage from "./ChecklistsPage";
import RewardsPage from "./RewardsPage";
import QuestsPage from "./QuestsPage";
import ChatPage from "./ChatPage";
import SettingsPage from "./SettingsPage";
import Toast from "./Toast";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="app">
        <TopNav />
        <Routes>
          <Route path="/" element={<Dashboard />} />

          {/* Tasks section with nested routes */}
          <Route path="/tasks" element={<TasksLayout />}>
            <Route index element={<Navigate to="list" replace />} />
            <Route path="list" element={<TasksPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="planner" element={<DailyPlannerPage />} />
            <Route path="goals" element={<GoalsPage />} />
          </Route>

          <Route path="/checklists" element={<ChecklistsPage />} />
          <Route path="/rewards" element={<RewardsPage />} />
          <Route path="/quests" element={<QuestsPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          
          {/* Redirect old journal route to chat */}
          <Route path="/journal" element={<Navigate to="/chat" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Global Toast Component */}
        <Toast />
      </div>

      {/* React Query Devtools - only shows in development */}
      <ReactQueryDevtools 
        initialIsOpen={false} 
        buttonPosition="bottom-left"
      />
    </QueryClientProvider>
  );
}

/** TasksLayout with Calendar and Planner tabs */
function TasksLayout() {
  const link = ({ isActive }: { isActive: boolean }) => "tab" + (isActive ? " active" : "");

  return (
    <div>
      {/* Sub-navigation for Tasks section */}
      <div style={{ 
        borderBottom: "1px solid #e2e8f0", 
        padding: "0 16px", 
        background: "#f8fafc" 
      }}>
        <nav style={{ display: "flex", gap: 24 }}>
          <NavLink to="/tasks/list" className={link}>📋 List</NavLink>
          <NavLink to="/tasks/calendar" className={link}>📅 Calendar</NavLink>
          <NavLink to="/tasks/planner" className={link}>📝 Planner</NavLink>
          <NavLink to="/tasks/goals" className={link}>🎯 Goals</NavLink>
        </nav>
      </div>
      
      {/* Render the current tab's content */}
      <Outlet />
    </div>
  );
}