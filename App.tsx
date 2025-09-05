// FILE: App.tsx - Modern React app with Tanstack Query
import React from "react";
import { Routes, Route, Navigate, NavLink, Outlet } from "react-router-dom";
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './query-client.js';

import TopNav from "./TopNav";
import Dashboard from "./Dashboard";
import TasksPage from "./TasksPage";
import GoalsPage from "./GoalsPage";
import ChecklistsPage from "./ChecklistsPage";
import JournalPage from "./JournalPage";
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
            <Route path="goals" element={<GoalsPage />} />
          </Route>

          <Route path="/checklists" element={<ChecklistsPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/rewards" element={<RewardsPage />} />
          <Route path="/quests" element={<QuestsPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/settings" element={<SettingsPage />} />
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

/** Local sub-layout for the Tasks area with a small tab bar */
function TasksLayout() {
  const link = ({ isActive }: { isActive: boolean }) => "tab" + (isActive ? " active" : "");
  return (
    <div>
      <div className="topbar sub">
        <div className="topbar-inner" style={{ gap: 8 }}>
          <nav className="tabs">
            <NavLink to="/tasks/list" className={link}>Tasks</NavLink>
            <NavLink to="/tasks/goals" className={link}>Goals</NavLink>
          </nav>
        </div>
      </div>
      <Outlet />
    </div>
  );
}