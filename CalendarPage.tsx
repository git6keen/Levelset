// FILE: CalendarPage.tsx - Calendar view for tasks
import React from "react";

export default function CalendarPage() {
  return (
    <div className="container main">
      <div className="card">
        <div style={{ textAlign: "center", padding: 48, color: "#64748b" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
          <h3 style={{ color: "#374151", marginBottom: 8 }}>Calendar View</h3>
          <p>Feature-rich calendar with drag & drop scheduling coming soon!</p>
          <div style={{ marginTop: 24, fontSize: 14, color: "#9ca3af" }}>
            <p>Planned features:</p>
            <ul style={{ listStyle: "none", padding: 0, marginTop: 8 }}>
              <li>📋 Drag tasks to schedule dates</li>
              <li>🕒 Time blocking and scheduling</li>
              <li>📊 Task density visualization</li>
              <li>⚡ Quick task creation from calendar</li>
              <li>🔄 Recurring task templates</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}