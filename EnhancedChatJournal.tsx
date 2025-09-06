// FILE: EnhancedChatJournal.tsx - Enhanced journal panel for Chat page
import React, { useState } from 'react';
import { useJournalLogic } from './useJournalLogic.js';
import { 
  MoodTracker, 
  TemplateLibrary, 
  WritingPrompts,
  RecentEntriesPreview 
} from './JournalComponents.js';

export default function EnhancedChatJournal({ 
  onJournalEntry, 
  isJournalMode 
}: { 
  onJournalEntry: (text: string) => void;
  isJournalMode: boolean;
}) {
  const {
    data,
    state,
    setters,
    handlers,
    mutations,
    utils
  } = useJournalLogic();

  const [activeTab, setActiveTab] = useState<'write' | 'mood' | 'history' | 'templates'>('write');
  const [journalText, setJournalText] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalText.trim()) return;

    // Save via the journal logic
    handlers.handleCreateEntry(journalText.trim());
    
    // Also pass to chat if needed
    onJournalEntry(journalText.trim());
    
    setJournalText('');
  };

  const handlePromptSelect = (prompt: string) => {
    setJournalText(prompt + '\n\n');
    setActiveTab('write');
  };

  if (!isJournalMode) {
    return (
      <div className="card" style={{ padding: 12 }}>
        <div style={{ textAlign: "center", color: "#64748b" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📔</div>
          <p style={{ margin: 0, fontSize: 13 }}>
            Switch to Journal mode to start writing
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Header with Tabs */}
      <div style={{ 
        borderBottom: "1px solid #e5e7eb",
        background: "#f8fafc"
      }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#374151" }}>
              📔 Journal
            </h3>
            {data.analytics.currentStreak > 0 && (
              <span style={{
                fontSize: 10,
                background: "#fbbf24",
                color: "#92400e",
                padding: "2px 6px",
                borderRadius: 8,
                fontWeight: 500
              }}>
                🔥 {data.analytics.currentStreak} days
              </span>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: "flex", padding: "0 16px" }}>
          {[
            { id: 'write', label: '✍️ Write', title: 'Quick journaling' },
            { id: 'mood', label: '😊 Mood', title: 'Track your state' },
            { id: 'history', label: '📚 History', title: 'Recent entries' },
            { id: 'templates', label: '📝 Templates', title: 'Guided prompts' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              title={tab.title}
              style={{
                padding: "8px 12px",
                border: "none",
                background: activeTab === tab.id ? "white" : "transparent",
                color: activeTab === tab.id ? "#374151" : "#64748b",
                fontSize: 11,
                fontWeight: activeTab === tab.id ? 600 : 400,
                cursor: "pointer",
                borderBottom: activeTab === tab.id ? "2px solid #3b82f6" : "2px solid transparent",
                borderRadius: "4px 4px 0 0"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ padding: 16, maxHeight: "70vh", overflowY: "auto" }}>
        {activeTab === 'write' && (
          <div>
            <form onSubmit={handleSubmit}>
              <textarea
                className="input"
                placeholder="What's on your mind? Reflect on your day, capture thoughts, or explore your feelings..."
                rows={6}
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
                style={{ marginBottom: 12, fontSize: 13 }}
              />

              {/* Quick Actions */}
              <div style={{ marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowQuickActions(!showQuickActions)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#3b82f6",
                    fontSize: 11,
                    cursor: "pointer",
                    textDecoration: "underline"
                  }}
                >
                  {showQuickActions ? "Hide" : "Show"} quick actions
                </button>
                
                {showQuickActions && (
                  <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {[
                      "Today I'm grateful for...",
                      "I felt proud when...",
                      "Something that challenged me was...",
                      "I learned that...",
                      "Tomorrow I want to focus on..."
                    ].map(starter => (
                      <button
                        key={starter}
                        type="button"
                        onClick={() => setJournalText(prev => prev + (prev ? '\n\n' : '') + starter + ' ')}
                        style={{
                          fontSize: 10,
                          padding: "4px 8px",
                          background: "#f3f4f6",
                          border: "1px solid #d1d5db",
                          borderRadius: 4,
                          cursor: "pointer"
                        }}
                      >
                        + {starter}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('templates')}
                  className="btn"
                  style={{ fontSize: 11, padding: "6px 10px" }}
                >
                  📝 Templates
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={!journalText.trim() || mutations.createEntryMutation.isPending}
                  style={{ fontSize: 11, padding: "6px 10px" }}
                >
                  {mutations.createEntryMutation.isPending ? "Saving..." : "Save Entry"}
                </button>
              </div>
            </form>

            {/* Today's Stats */}
            <div style={{ 
              marginTop: 16, 
              padding: 12, 
              background: "#f8fafc", 
              borderRadius: 6,
              border: "1px solid #e5e7eb"
            }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
                Today's Progress
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#3b82f6" }}>
                    {data.allEntries.filter(e => 
                      new Date(e.created_at).toDateString() === new Date().toDateString()
                    ).length}
                  </div>
                  <div style={{ fontSize: 9, color: "#64748b" }}>Entries</div>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#10b981" }}>
                    {state.preferences.mood}/10
                  </div>
                  <div style={{ fontSize: 9, color: "#64748b" }}>Mood</div>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#f59e0b" }}>
                    {state.preferences.energy}/10
                  </div>
                  <div style={{ fontSize: 9, color: "#64748b" }}>Energy</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'mood' && (
          <div>
            <MoodTracker 
              preferences={state.preferences}
              updatePreferences={handlers.updatePreferences}
            />
            
            {/* Mood History */}
            <div style={{ marginTop: 16 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "#374151" }}>
                Recent Mood Trend
              </h4>
              <div style={{ display: "flex", gap: 4 }}>
                {data.allEntries.slice(0, 7).reverse().map((entry, idx) => {
                  if (!entry.mood) return null;
                  const moodColor = entry.mood <= 3 ? "#ef4444" : 
                                   entry.mood <= 5 ? "#f59e0b" : 
                                   entry.mood <= 7 ? "#3b82f6" : "#10b981";
                  return (
                    <div
                      key={entry.entry_id}
                      style={{
                        width: 20,
                        height: 20,
                        background: moodColor,
                        borderRadius: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 9,
                        color: "white",
                        fontWeight: 600
                      }}
                      title={`${new Date(entry.created_at).toLocaleDateString()}: ${entry.mood}/10`}
                    >
                      {entry.mood}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <input
                className="input"
                placeholder="Search entries..."
                value={state.searchQuery}
                onChange={e => setters.setSearchQuery(e.target.value)}
                style={{ fontSize: 12 }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.entries.slice(0, 10).map(entry => {
                const date = new Date(entry.created_at);
                const isToday = date.toDateString() === new Date().toDateString();
                const preview = entry.text.length > 100 ? entry.text.substring(0, 100) + "..." : entry.text;

                return (
                  <div
                    key={entry.entry_id}
                    style={{
                      padding: 8,
                      background: "#f8fafc",
                      borderRadius: 6,
                      border: "1px solid #e5e7eb"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 500, color: "#374151" }}>
                        {isToday ? 'Today' : date.toLocaleDateString()}
                      </span>
                      <div style={{ display: "flex", gap: 4 }}>
                        {entry.mood && (
                          <span style={{ fontSize: 9, color: "#64748b" }}>😊 {entry.mood}</span>
                        )}
                        {entry.energy && (
                          <span style={{ fontSize: 9, color: "#64748b" }}>⚡ {entry.energy}</span>
                        )}
                      </div>
                    </div>
                    <p style={{ 
                      margin: 0, 
                      fontSize: 11, 
                      color: "#64748b", 
                      lineHeight: 1.4 
                    }}>
                      {preview}
                    </p>
                  </div>
                );
              })}
            </div>

            {data.allEntries.length > 10 && (
              <div style={{ textAlign: "center", marginTop: 12 }}>
                <button
                  onClick={() => {
                    // Could open full journal page or expand view
                    window.open('/chat?mode=journal', '_blank');
                  }}
                  className="btn"
                  style={{ fontSize: 11, padding: "6px 10px" }}
                >
                  View All Entries
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'templates' && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "#374151" }}>
                Quick Prompts
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {data.templates.slice(0, 4).map(template => (
                  <button
                    key={template.id}
                    onClick={() => handlePromptSelect(template.prompts[0].label)}
                    style={{
                      padding: 8,
                      background: "#f8fafc",
                      border: "1px solid #e5e7eb",
                      borderRadius: 6,
                      cursor: "pointer",
                      textAlign: "left",
                      fontSize: 11
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14 }}>{template.icon}</span>
                      <div>
                        <div style={{ fontWeight: 500, color: "#374151" }}>{template.name}</div>
                        <div style={{ fontSize: 10, color: "#64748b" }}>{template.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <WritingPrompts onSelectPrompt={handlePromptSelect} />
          </div>
        )}
      </div>
    </div>
  );
}