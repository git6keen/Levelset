// FILE: TasksPage.tsx - Main component that connects logic and UI
import React from 'react';
import { useTasksLogic } from './useTasksLogic.js';
import {
  TasksHeader,
  BulkActionsBar,
  TaskForm,
  TasksFilters,
  TasksList,
  QuickStats
} from './TasksPageComponents.js';

export default function TasksPage() {
  // Get all logic, state, and handlers from custom hook
  const {
    data,
    state,
    handlers,
    setters,
    mutations,
    utils
  } = useTasksLogic();

  return (
    <div style={{ padding: 16, maxWidth: 1400, margin: "0 auto" }}>
      {/* Header with Progress Overview and Controls */}
      <TasksHeader 
        data={data}
        state={state}
        setters={setters}
      />

      {/* Bulk Actions Bar (only shows when bulk mode active) */}
      <BulkActionsBar
        data={data}
        state={state}
        setters={setters}
        handlers={handlers}
      />

      {/* Create/Edit Task Form (only shows when form active) */}
      <TaskForm
        data={data}
        state={state}
        setters={setters}
        handlers={handlers}
        mutations={mutations}
      />

      {/* Search and Filters */}
      <TasksFilters
        data={data}
        state={state}
        setters={setters}
        handlers={handlers}
      />

      {/* Tasks List with Loading/Error States */}
      <TasksList
        data={data}
        state={state}
        setters={setters}
        handlers={handlers}
        mutations={mutations}
        utils={utils}
      />

      {/* Quick Stats Footer */}
      <QuickStats data={data} />
    </div>
  );
}