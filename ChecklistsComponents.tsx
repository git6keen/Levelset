// FILE: ChecklistsPage.tsx - Enhanced main component with all features
import React from 'react';
import { useChecklistsLogic } from './useChecklistsLogic.js';
import {
  ChecklistsHeader,
  AnalyticsPanel,
  BulkActionsBar,
  TemplateLibrary,
  CreateChecklistForm,
  ChecklistsFilters,
  ChecklistsList
} from './ChecklistsComponents.js';

export default function ChecklistsPage() {
  // Get all logic, state, and handlers from custom hook
  const {
    data,
    state,
    setters,
    handlers,
    mutations,
    utils
  } = useChecklistsLogic();

  return (
    <div style={{ padding: 16, maxWidth: 1400, margin: "0 auto" }}>
      {/* Header with Quick Stats and Controls */}
      <ChecklistsHeader 
        data={data}
        state={state}
        setters={setters}
        handlers={handlers}
      />

      {/* Analytics Dashboard (toggleable) */}
      <AnalyticsPanel
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

      {/* Template Library Modal */}
      <TemplateLibrary
        data={data}
        state={state}
        setters={setters}
        handlers={handlers}
      />

      {/* Create/Edit Checklist Form (only shows when form active) */}
      <CreateChecklistForm
        data={data}
        state={state}
        setters={setters}
        handlers={handlers}
        mutations={mutations}
      />

      {/* Search, Filters, and View Controls */}
      <ChecklistsFilters
        data={data}
        state={state}
        setters={setters}
        handlers={handlers}
      />

      {/* Checklists Grid/List with All Enhanced Features */}
      <ChecklistsList
        data={data}
        state={state}
        setters={setters}
        handlers={handlers}
        mutations={mutations}
        utils={utils}
      />
    </div>
  );
}