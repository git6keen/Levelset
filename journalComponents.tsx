// FILE: JournalComponents.tsx - Comprehensive journal UI components
import React, { useState } from 'react';
import type { JournalEntry, JournalTemplate, JournalAnalytics, JournalPreferences } from './useJournalLogic.js';

// ============================================================================
// JOURNAL HEADER COMPONENT
// ============================================================================
export function JournalHeader({ data, state, setters, handlers }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, color: "#1f2937", fontSize: 24, display: "flex", alignItems: "center", gap: 8 }}>
            📔 Journal
            {data.analytics.currentStreak > 0 && (
              <span style={{ 
                fontSize: 12, 
                background: "#fbbf24", 
                color: "#92400e",
                padding: "4px 8px",
                borderRadius: 12,
                fontWeight: 600
              }}>
                🔥 {data.analytics.currentStreak} day streak
              </span>
            )}
          </h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 14 }}>
            Reflect, grow, and track your journey through daily journaling
          </p>
        </div>
        
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button 
            className="btn"
            onClick={() => setters.setShowAnalytics(!state.showAnalytics)}
            style={{ fontSize: 11, padding: "6px 10px" }}
          >
            📊 Analytics
          </button>
          
          <button 
            className="btn"
            onClick={() => setters.setShowTemplates(!state.showTemplates)}
            style={{ fontSize: 11, padding: "6px 10px" }}
          >
            📝 Templates
          </button>
          
          <button 
            className="btn"
            onClick={() => setters.setShowHistory(!state.showHistory)}
            style={{ fontSize: 11, padding: "6px 10px" }}
          >
            📚 History
          </button>
          
          <button 
            className="btn"
            onClick={() => {
              const exportData = data.allEntries.map(entry => ({
                date: entry.created_at,
                text: entry.text,
                mood: entry.mood,
                energy: entry.energy,
                stress: entry.stress,
                tags: entry.tags
              }));
              
              const dataStr = JSON.stringify(exportData, null, 2);
              const dataBlob = new Blob([dataStr], { type: 'application/json' });
              const url = URL.createObjectURL(dataBlob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `journal-entries-${new Date().toISOString().split('T')[0]}.json`;
              link.click();
              URL.revokeObjectURL(url);
            }}
            style={{ fontSize: 11, padding: "6px 10px" }}
          >
            📤 Export
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", 
        gap: 16,
        marginBottom: 16
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#1f2937" }}>
            {data.analytics.totalEntries}
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Total Entries</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#3b82f6" }}>
            {data.analytics.entriesThisWeek}
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>This Week</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#10b981" }}>
            {data.analytics.averageMood.toFixed(1)}
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Avg Mood</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#f59e0b" }}>
            {data.analytics.averageEnergy.toFixed(1)}
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Avg Energy</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#ef4444" }}>
            {data.analytics.averageStress.toFixed(1)}
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Avg Stress</div>
        </div>
      </div>

      {/* Mood Tracker */}
      <MoodTracker 
        preferences={state.preferences}
        updatePreferences={handlers.updatePreferences}
      />
    </div>
  );
}

// ============================================================================
// MOOD TRACKER COMPONENT
// ============================================================================
export function MoodTracker({ preferences, updatePreferences }) {
  const getMoodEmoji = (value) => {
    if (value <= 2) return '😢';
    if (value <= 4) return '😕';
    if (value <= 6) return '😐';
    if (value <= 8) return '🙂';
    return '😊';
  };

  const getEnergyEmoji = (value) => {
    if (value <= 2) return '😴';
    if (value <= 4) return '😑';
    if (value <= 6) return '😐';
    if (value <= 8) return '😊';
    return '⚡';
  };

  const getStressEmoji = (value) => {
    if (value <= 2) return '😌';
    if (value <= 4) return '😐';
    if (value <= 6) return '😰';
    if (value <= 8) return '😫';
    return '🤯';
  };

  return (
    <div style={{ 
      background: "#f8fafc", 
      border: "1px solid #e2e8f0",
      borderRadius: 8,
      padding: 16
    }}>
      <h4 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#374151" }}>
        Current State
      </h4>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
        {/* Mood */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>{getMoodEmoji(preferences.mood)}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>
              Mood: {preferences.mood}/10
            </span>
          </div>
          <input 
            type="range"
            min="1"
            max="10"
            value={preferences.mood}
            onChange={(e) => updatePreferences({ mood: parseInt(e.target.value) })}
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9ca3af", marginTop: 2 }}>
            <span>Awful</span>
            <span>Amazing</span>
          </div>
        </div>

        {/* Energy */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>{getEnergyEmoji(preferences.energy)}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>
              Energy: {preferences.energy}/10
            </span>
          </div>
          <input 
            type="range"
            min="1"
            max="10"
            value={preferences.energy}
            onChange={(e) => updatePreferences({ energy: parseInt(e.target.value) })}
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9ca3af", marginTop: 2 }}>
            <span>Drained</span>
            <span>Energized</span>
          </div>
        </div>

        {/* Stress */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>{getStressEmoji(preferences.stress)}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>
              Stress: {preferences.stress}/10
            </span>
          </div>
          <input 
            type="range"
            min="1"
            max="10"
            value={preferences.stress}
            onChange={(e) => updatePreferences({ stress: parseInt(e.target.value) })}
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9ca3af", marginTop: 2 }}>
            <span>Relaxed</span>
            <span>Overwhelmed</span>
          </div>
        </div>
      </div>

      {/* Tags Input */}
      <div style={{ marginTop: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: "#374151", display: "block", marginBottom: 4 }}>
          Tags (mood keywords)
        </label>
        <input 
          className="input"
          placeholder="happy, productive, anxious, grateful..."
          value={preferences.tags}
          onChange={(e) => updatePreferences({ tags: e.target.value })}
          style={{ fontSize: 12 }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// ANALYTICS PANEL
// ============================================================================
export function AnalyticsPanel({ data, state, setters }) {
  if (!state.showAnalytics) return null;

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'up': return '#10b981';
      case 'down': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="card" style={{ marginBottom: 16, background: "#f0f9ff", border: "2px solid #bae6fd" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: "#1f2937" }}>📊 Journal Analytics</h3>
        <button 
          onClick={() => setters.setShowAnalytics(false)}
          style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer" }}
        >
          ×
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {/* Trends Card */}
        <div style={{ background: "white", padding: 16, borderRadius: 8, border: "1px solid #e2e8f0" }}>
          <h4 style={{ margin: "0 0 12px", color: "#1f2937", fontSize: 14 }}>Weekly Trends</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>Mood:</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 16 }}>{getTrendIcon(data.analytics.moodTrend)}</span>
                <span style={{ 
                  fontSize: 13, 
                  fontWeight: 600,
                  color: getTrendColor(data.analytics.moodTrend)
                }}>
                  {data.analytics.moodTrend}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>Energy:</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 16 }}>{getTrendIcon(data.analytics.energyTrend)}</span>
                <span style={{ 
                  fontSize: 13, 
                  fontWeight: 600,
                  color: getTrendColor(data.analytics.energyTrend)
                }}>
                  {data.analytics.energyTrend}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>Stress:</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 16 }}>{getTrendIcon(data.analytics.stressTrend)}</span>
                <span style={{ 
                  fontSize: 13, 
                  fontWeight: 600,
                  color: getTrendColor(data.analytics.stressTrend)
                }}>
                  {data.analytics.stressTrend}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Streaks Card */}
        <div style={{ background: "white", padding: 16, borderRadius: 8, border: "1px solid #e2e8f0" }}>
          <h4 style={{ margin: "0 0 12px", color: "#1f2937", fontSize: 14 }}>Consistency</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>Current Streak:</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b" }}>
                🔥 {data.analytics.currentStreak} days
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>Longest Streak:</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#10b981" }}>
                🏆 {data.analytics.longestStreak} days
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>This Week:</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {data.analytics.entriesThisWeek}/7 days
              </span>
            </div>
          </div>
        </div>

        {/* Common Tags Card */}
        <div style={{ background: "white", padding: 16, borderRadius: 8, border: "1px solid #e2e8f0" }}>
          <h4 style={{ margin: "0 0 12px", color: "#1f2937", fontSize: 14 }}>Common Themes</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.analytics.commonTags.slice(0, 5).map((tag, idx) => (
              <div key={tag.tag} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#64748b" }}>#{tag.tag}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ 
                    width: 40, 
                    height: 4, 
                    background: "#f1f5f9", 
                    borderRadius: 2,
                    overflow: "hidden"
                  }}>
                    <div style={{ 
                      width: `${(tag.count / Math.max(...data.analytics.commonTags.map(t => t.count))) * 100}%`,
                      height: "100%",
                      background: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"][idx],
                      borderRadius: 2
                    }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, minWidth: 16 }}>{tag.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TEMPLATE LIBRARY
// ============================================================================
export function TemplateLibrary({ data, state, setters, handlers }) {
  if (!state.showTemplates) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.5)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20
    }}>
      <div style={{
        background: "white",
        borderRadius: 12,
        maxWidth: "90vw",
        maxHeight: "90vh",
        width: 800,
        overflow: "hidden",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
      }}>
        {/* Header */}
        <div style={{ 
          padding: "20px 24px", 
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <h2 style={{ margin: 0, color: "#1f2937", fontSize: 20 }}>📝 Journal Templates</h2>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 14 }}>
              Guided prompts to help you reflect and write meaningfully
            </p>
          </div>
          <button 
            onClick={() => setters.setShowTemplates(false)}
            style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer" }}
          >
            ×
          </button>
        </div>

        {/* Templates Grid */}
        <div style={{ 
          padding: 24, 
          maxHeight: "70vh", 
          overflowY: "auto"
        }}>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
            gap: 16 
          }}>
            {data.templates.map(template => (
              <TemplateCard 
                key={template.id}
                template={template}
                onSelect={() => handlers.handleUseTemplate(template)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TEMPLATE CARD COMPONENT
// ============================================================================
export function TemplateCard({ template, onSelect }: { 
  template: JournalTemplate; 
  onSelect: () => void; 
}) {
  return (
    <div style={{
      background: "white",
      border: "1px solid #e2e8f0",
      borderRadius: 8,
      padding: 16,
      cursor: "pointer",
      transition: "all 0.2s ease"
    }}
    onClick={onSelect}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = "#3b82f6";
      e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = "#e2e8f0";
      e.currentTarget.style.boxShadow = "none";
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 40,
          height: 40,
          background: "#f3f4f6",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18
        }}>
          {template.icon}
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: 0, color: "#1f2937", fontSize: 14, fontWeight: 600 }}>
            {template.name}
          </h4>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            {template.prompts.length} prompts
          </div>
        </div>
      </div>

      {/* Description */}
      <p style={{ 
        margin: "0 0 12px", 
        color: "#64748b", 
        fontSize: 12, 
        lineHeight: 1.4 
      }}>
        {template.description}
      </p>

      {/* Sample Prompts Preview */}
      <div style={{ fontSize: 11, color: "#9ca3af" }}>
        <div style={{ fontWeight: 500, marginBottom: 4 }}>Sample prompts:</div>
        {template.prompts.slice(0, 2).map((prompt, idx) => (
          <div key={idx} style={{ marginBottom: 2 }}>
            • {prompt.label}
          </div>
        ))}
        {template.prompts.length > 2 && (
          <div style={{ fontStyle: "italic" }}>
            +{template.prompts.length - 2} more...
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TEMPLATE FORM COMPONENT
// ============================================================================
export function TemplateForm({ data, state, setters, handlers }) {
  if (!state.selectedTemplate) return null;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>{state.selectedTemplate.icon}</span>
          <div>
            <h3 style={{ margin: 0, color: "#1f2937" }}>{state.selectedTemplate.name}</h3>
            <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: 13 }}>
              {state.selectedTemplate.description}
            </p>
          </div>
        </div>
        <button 
          onClick={() => setters.setSelectedTemplate(null)}
          style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}
        >
          ×
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {state.selectedTemplate.prompts.map((prompt, idx) => (
          <div key={idx}>
            <label style={{ 
              fontWeight: 600, 
              color: "#374151", 
              display: "block", 
              marginBottom: 4 
            }}>
              {prompt.label}
              {prompt.required && <span style={{ color: "#ef4444" }}> *</span>}
            </label>
            {prompt.type === 'textarea' ? (
              <textarea 
                className="input"
                placeholder={prompt.placeholder}
                rows={3}
                value={state.templateResponses[prompt.label] || ''}
                onChange={(e) => setters.setTemplateResponses(prev => ({
                  ...prev,
                  [prompt.label]: e.target.value
                }))}
                required={prompt.required}
              />
            ) : prompt.type === 'scale' ? (
              <div>
                <input 
                  type="range"
                  min="1"
                  max="10"
                  value={state.templateResponses[prompt.label] || '5'}
                  onChange={(e) => setters.setTemplateResponses(prev => ({
                    ...prev,
                    [prompt.label]: e.target.value
                  }))}
                  style={{ width: "100%" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9ca3af" }}>
                  <span>1</span>
                  <span>Current: {state.templateResponses[prompt.label] || '5'}</span>
                  <span>10</span>
                </div>
              </div>
            ) : (
              <input 
                className="input"
                placeholder={prompt.placeholder}
                value={state.templateResponses[prompt.label] || ''}
                onChange={(e) => setters.setTemplateResponses(prev => ({
                  ...prev,
                  [prompt.label]: e.target.value
                }))}
                required={prompt.required}
              />
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
        <button 
          className="btn"
          onClick={() => setters.setSelectedTemplate(null)}
        >
          Cancel
        </button>
        <button 
          className="btn primary"
          onClick={handlers.handleTemplateSubmit}
          disabled={state.selectedTemplate.prompts.some(p => 
            p.required && !state.templateResponses[p.label]?.trim()
          )}
        >
          Save Entry
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// QUICK WRITE COMPONENT
// ============================================================================
export function QuickWrite({ data, state, setters, handlers, mutations, promptText, setPromptText }) {
  const [quickText, setQuickText] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update text when prompt is selected
  React.useEffect(() => {
    if (promptText && promptText !== quickText) {
      setQuickText(promptText);
      setPromptText(''); // Clear the prompt text after using it
    }
  }, [promptText, setPromptText, quickText]);

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    if (!quickText.trim()) return;

    handlers.handleCreateEntry(quickText.trim());
    setQuickText('');
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: "#1f2937", fontSize: 16 }}>✍️ Quick Journal</h3>
        <button 
          className="btn"
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{ fontSize: 11, padding: "4px 8px" }}
        >
          {showAdvanced ? "Simple" : "Advanced"}
        </button>
      </div>

      <form onSubmit={handleQuickSubmit}>
        <textarea 
          className="input"
          placeholder="What's on your mind? Reflect on your day, capture a moment, or share a thought..."
          rows={showAdvanced ? 6 : 4}
          value={quickText}
          onChange={(e) => setQuickText(e.target.value)}
          style={{ marginBottom: 12 }}
        />

        {showAdvanced && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
              {data.suggestedTags.length > 0 && (
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: "#374151", display: "block", marginBottom: 4 }}>
                    Suggested Tags
                  </label>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {data.suggestedTags.map(tag => (
                      <button 
                        key={tag}
                        type="button"
                        onClick={() => {
                          const currentTags = state.preferences.tags.split(',').map(t => t.trim()).filter(Boolean);
                          if (!currentTags.includes(tag)) {
                            const newTags = [...currentTags, tag].join(', ');
                            setters.setPreferences({ tags: newTags });
                          }
                        }}
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          background: "#f3f4f6",
                          border: "1px solid #d1d5db",
                          borderRadius: 4,
                          cursor: "pointer"
                        }}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button 
            type="button"
            className="btn"
            onClick={() => setters.setShowTemplates(true)}
          >
            📝 Use Template
          </button>
          <button 
            type="submit"
            className="btn primary"
            disabled={!quickText.trim() || mutations.createEntryMutation.isPending}
          >
            {mutations.createEntryMutation.isPending ? "Saving..." : "Save Entry"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// JOURNAL HISTORY COMPONENT
// ============================================================================
export function JournalHistory({ data, state, setters }) {
  if (!state.showHistory) return null;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: "#1f2937" }}>📚 Journal History</h3>
        <button 
          onClick={() => setters.setShowHistory(false)}
          style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer" }}
        >
          ×
        </button>
      </div>

      {/* Search and Filters */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, marginBottom: 16 }}>
        <input 
          className="input"
          placeholder="Search journal entries..."
          value={state.searchQuery}
          onChange={e => setters.setSearchQuery(e.target.value)}
        />
        <input 
          className="input"
          type="date"
          value={state.dateRange.from || ''}
          onChange={e => setters.setDateRange(prev => ({ ...prev, from: e.target.value }))}
          placeholder="From date"
        />
        <input 
          className="input"
          type="date"
          value={state.dateRange.to || ''}
          onChange={e => setters.setDateRange(prev => ({ ...prev, to: e.target.value }))}
          placeholder="To date"
        />
      </div>

      {/* Tag Filter */}
      {data.analytics.commonTags.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: "#374151", display: "block", marginBottom: 4 }}>
            Filter by tags:
          </label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {data.analytics.commonTags.slice(0, 10).map(({ tag }) => (
              <button 
                key={tag}
                onClick={() => {
                  setters.setFilterTags(prev => 
                    prev.includes(tag) 
                      ? prev.filter(t => t !== tag)
                      : [...prev, tag]
                  );
                }}
                style={{
                  fontSize: 11,
                  padding: "4px 8px",
                  background: state.filterTags.includes(tag) ? "#3b82f6" : "#f3f4f6",
                  color: state.filterTags.includes(tag) ? "white" : "#374151",
                  border: "1px solid " + (state.filterTags.includes(tag) ? "#3b82f6" : "#d1d5db"),
                  borderRadius: 4,
                  cursor: "pointer"
                }}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Entries List */}
      <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
        {data.entries.length === 0 ? (
          <div style={{ textAlign: "center", padding: 32, color: "#64748b" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📖</div>
            <p>No entries found matching your filters</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data.entries.map(entry => (
              <JournalEntryCard key={entry.entry_id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// JOURNAL ENTRY CARD COMPONENT
// ============================================================================
export function JournalEntryCard({ entry }: { entry: JournalEntry }) {
  const [expanded, setExpanded] = useState(false);
  
  const date = new Date(entry.created_at);
  const isToday = date.toDateString() === new Date().toDateString();
  const isYesterday = date.toDateString() === new Date(Date.now() - 24*60*60*1000).toDateString();
  
  const getDateLabel = () => {
    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";
    return date.toLocaleDateString();
  };

  const getMoodColor = (mood) => {
    if (mood <= 3) return "#ef4444";
    if (mood <= 5) return "#f59e0b";
    if (mood <= 7) return "#3b82f6";
    return "#10b981";
  };

  const tags = entry.tags ? entry.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  const preview = entry.text.length > 150 ? entry.text.substring(0, 150) + "..." : entry.text;

  return (
    <div style={{
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: 8,
      padding: 16,
      transition: "all 0.2s ease"
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 600, color: "#374151", fontSize: 14 }}>
              {getDateLabel()}
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>
              {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          
          {/* Mood/Energy/Stress indicators */}
          <div style={{ display: "flex", gap: 8 }}>
            {entry.mood !== null && entry.mood !== undefined && (
              <div style={{ 
                fontSize: 10, 
                padding: "2px 6px", 
                background: getMoodColor(entry.mood),
                color: "white",
                borderRadius: 3,
                fontWeight: 500
              }}>
                😊 {entry.mood}
              </div>
            )}
            {entry.energy !== null && entry.energy !== undefined && (
              <div style={{ 
                fontSize: 10, 
                padding: "2px 6px", 
                background: "#f59e0b",
                color: "white",
                borderRadius: 3,
                fontWeight: 500
              }}>
                ⚡ {entry.energy}
              </div>
            )}
            {entry.stress !== null && entry.stress !== undefined && (
              <div style={{ 
                fontSize: 10, 
                padding: "2px 6px", 
                background: "#ef4444",
                color: "white",
                borderRadius: 3,
                fontWeight: 500
              }}>
                😰 {entry.stress}
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={() => setExpanded(!expanded)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 11,
            color: "#64748b"
          }}
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {/* Content */}
      <div style={{ marginBottom: 8 }}>
        <p style={{ 
          margin: 0, 
          color: "#374151", 
          fontSize: 13, 
          lineHeight: 1.5,
          whiteSpace: "pre-wrap"
        }}>
          {expanded ? entry.text : preview}
        </p>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
          {tags.map((tag, idx) => (
            <span 
              key={idx}
              style={{
                fontSize: 10,
                color: "#64748b",
                background: "#e5e7eb",
                padding: "2px 6px",
                borderRadius: 3,
                fontWeight: 500
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Additional fields if expanded */}
      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
          {entry.gratitude && (
            <div style={{ marginBottom: 8 }}>
              <strong style={{ fontSize: 12, color: "#374151" }}>Gratitude:</strong>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
                {entry.gratitude}
              </p>
            </div>
          )}
          
          {entry.goals && (
            <div style={{ marginBottom: 8 }}>
              <strong style={{ fontSize: 12, color: "#374151" }}>Goals:</strong>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
                {entry.goals}
              </p>
            </div>
          )}
          
          {entry.reflection && (
            <div style={{ marginBottom: 8 }}>
              <strong style={{ fontSize: 12, color: "#374151" }}>Reflection:</strong>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
                {entry.reflection}
              </p>
            </div>
          )}

          {entry.weather && (
            <div style={{ fontSize: 11, color: "#9ca3af" }}>
              🌤️ Weather: {entry.weather}
            </div>
          )}
          
          {entry.location && (
            <div style={{ fontSize: 11, color: "#9ca3af" }}>
              📍 Location: {entry.location}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// WRITING PROMPTS COMPONENT
// ============================================================================
export function WritingPrompts({ onSelectPrompt }) {
  const [currentPrompt, setCurrentPrompt] = useState(0);
  
  const prompts = [
    "What made you smile today?",
    "Describe a challenge you overcame recently.",
    "What are you most grateful for right now?",
    "What would you tell your past self from a year ago?",
    "What's something new you learned this week?",
    "Describe your ideal day in detail.",
    "What's a goal you're excited to work towards?",
    "How did you help someone today?",
    "What's something you'd like to change about your routine?",
    "Describe a moment when you felt truly peaceful.",
    "What's a skill you'd like to develop?",
    "How do you define success in your life?",
    "What's your favorite way to recharge?",
    "Describe a place that makes you feel inspired.",
    "What's something you're looking forward to?",
    "How have you grown in the past month?",
    "What's a risk you'd like to take?",
    "Describe your support system.",
    "What patterns do you notice in your daily life?",
    "How do you practice self-compassion?"
  ];

  const nextPrompt = () => {
    setCurrentPrompt((prev) => (prev + 1) % prompts.length);
  };

  return (
    <div className="card" style={{ marginBottom: 16, background: "#fefbf3", border: "1px solid #fbbf24" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h4 style={{ margin: 0, color: "#92400e", fontSize: 14, fontWeight: 600 }}>
          💡 Writing Prompt
        </h4>
        <button 
          onClick={nextPrompt}
          className="btn"
          style={{ fontSize: 11, padding: "4px 8px" }}
        >
          Next Prompt
        </button>
      </div>
      
      <p style={{ 
        margin: "0 0 12px", 
        color: "#451a03", 
        fontSize: 13, 
        fontStyle: "italic",
        lineHeight: 1.5
      }}>
        "{prompts[currentPrompt]}"
      </p>
      
      <button 
        onClick={() => onSelectPrompt(prompts[currentPrompt])}
        className="btn primary"
        style={{ fontSize: 11, padding: "6px 12px" }}
      >
        Write About This
      </button>
    </div>
  );
}

// ============================================================================
// PREFERENCES PANEL
// ============================================================================
export function PreferencesPanel({ state, setters }) {
  const [showPrefs, setShowPrefs] = useState(false);

  if (!showPrefs) {
    return (
      <button 
        onClick={() => setShowPrefs(true)}
        className="btn"
        style={{ fontSize: 11, padding: "6px 10px", marginBottom: 16 }}
      >
        ⚙️ Preferences
      </button>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 16, background: "#f9fafb", border: "1px solid #d1d5db" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h4 style={{ margin: 0, color: "#374151", fontSize: 14, fontWeight: 600 }}>
          ⚙️ Journal Preferences
        </h4>
        <button 
          onClick={() => setShowPrefs(false)}
          style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer" }}
        >
          ×
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Save Location */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: "#374151", display: "block", marginBottom: 4 }}>
            Save entries to:
          </label>
          <select 
            className="input"
            value={state.preferences.saveTo}
            onChange={e => setters.setPreferences({ saveTo: e.target.value as any })}
            style={{ fontSize: 12 }}
          >
            <option value="local">Local Storage Only</option>
            <option value="db">Database Only</option>
            <option value="vector">Vector Storage Only</option>
            <option value="both">Database + Local Backup</option>
          </select>
        </div>

        {/* Auto-suggest Tags */}
        <div>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input 
              type="checkbox"
              checked={state.preferences.autoSuggestTags}
              onChange={e => setters.setPreferences({ autoSuggestTags: e.target.checked })}
            />
            <span style={{ fontSize: 12, color: "#374151" }}>Auto-suggest tags</span>
          </label>
        </div>

        {/* Private Mode */}
        <div>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input 
              type="checkbox"
              checked={state.preferences.privateMode}
              onChange={e => setters.setPreferences({ privateMode: e.target.checked })}
            />
            <span style={{ fontSize: 12, color: "#374151" }}>Private mode (entries not shared with AI)</span>
          </label>
        </div>

        {/* Include Weather */}
        <div>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input 
              type="checkbox"
              checked={state.preferences.includeWeather}
              onChange={e => setters.setPreferences({ includeWeather: e.target.checked })}
            />
            <span style={{ fontSize: 12, color: "#374151" }}>Include weather data</span>
          </label>
        </div>

        {/* Include Location */}
        <div>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input 
              type="checkbox"
              checked={state.preferences.includeLocation}
              onChange={e => setters.setPreferences({ includeLocation: e.target.checked })}
            />
            <span style={{ fontSize: 12, color: "#374151" }}>Include location data</span>
          </label>
        </div>

        {/* Daily Reminder */}
        <div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <input 
              type="checkbox"
              checked={state.preferences.reminderEnabled}
              onChange={e => setters.setPreferences({ reminderEnabled: e.target.checked })}
            />
            <span style={{ fontSize: 12, color: "#374151" }}>Daily reminder</span>
          </label>
          {state.preferences.reminderEnabled && (
            <input 
              type="time"
              className="input"
              value={state.preferences.reminderTime || '20:00'}
              onChange={e => setters.setPreferences({ reminderTime: e.target.value })}
              style={{ fontSize: 12, width: 120 }}
            />
          )}
        </div>
      </div>
    </div>
  );
}