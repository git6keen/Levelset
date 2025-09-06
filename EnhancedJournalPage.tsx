// FILE: EnhancedJournalPage.tsx - Complete enhanced journal system
import React, { useState } from 'react';
import { useJournalLogic } from './useJournalLogic.js';
import {
  JournalHeader,
  AnalyticsPanel,
  TemplateLibrary,
  TemplateForm,
  QuickWrite,
  JournalHistory,
  WritingPrompts,
  PreferencesPanel
} from './JournalComponents.js';

export default function EnhancedJournalPage() {
  // Get all logic, state, and handlers from custom hook
  const {
    data,
    state,
    setters,
    handlers,
    mutations,
    utils
  } = useJournalLogic();

  // Local state for writing prompts
  const [promptText, setPromptText] = useState('');

  const handlePromptSelect = (prompt: string) => {
    setPromptText(prompt + '\n\n');
    // Focus on the quick write textarea
    setTimeout(() => {
      const textarea = document.querySelector('textarea[placeholder*="What\'s on your mind"]') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    }, 100);
  };

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      {/* Header with Stats and Controls */}
      <JournalHeader 
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

      {/* Template Library Modal */}
      <TemplateLibrary
        data={data}
        state={state}
        setters={setters}
        handlers={handlers}
      />

      {/* Template Form (when template selected) */}
      <TemplateForm
        data={data}
        state={state}
        setters={setters}
        handlers={handlers}
      />

      {/* Main Content Area */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        {/* Left Column - Writing Area */}
        <div>
          {/* Writing Prompts */}
          <WritingPrompts onSelectPrompt={handlePromptSelect} />

          {/* Quick Write Component */}
          <QuickWrite
            data={data}
            state={state}
            setters={setters}
            handlers={handlers}
            mutations={mutations}
            promptText={promptText}
            setPromptText={setPromptText}
          />

          {/* Journal History (when expanded) */}
          <JournalHistory
            data={data}
            state={state}
            setters={setters}
          />
        </div>

        {/* Right Column - Sidebar */}
        <div>
          {/* Preferences Panel */}
          <PreferencesPanel
            state={state}
            setters={setters}
          />

          {/* Recent Entries Preview */}
          <RecentEntriesPreview
            entries={data.allEntries.slice(0, 3)}
            onShowMore={() => setters.setShowHistory(true)}
          />

          {/* Inspiration & Tips */}
          <InspirationPanel />

          {/* Progress Widget */}
          <ProgressWidget analytics={data.analytics} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// RECENT ENTRIES PREVIEW
// ============================================================================
function RecentEntriesPreview({ entries, onShowMore }) {
  if (entries.length === 0) {
    return (
      <div className="card" style={{ marginBottom: 16 }}>
        <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#374151" }}>
          📖 Recent Entries
        </h4>
        <div style={{ textAlign: "center", padding: 24, color: "#64748b" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>✨</div>
          <p style={{ fontSize: 12, margin: 0 }}>Start journaling to see your recent entries here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#374151" }}>
          📖 Recent Entries
        </h4>
        <button 
          onClick={onShowMore}
          className="btn"
          style={{ fontSize: 10, padding: "4px 6px" }}
        >
          View All
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {entries.map(entry => {
          const date = new Date(entry.created_at);
          const isToday = date.toDateString() === new Date().toDateString();
          const preview = entry.text.length > 80 ? entry.text.substring(0, 80) + "..." : entry.text;

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
                <span style={{ fontSize: 11, fontWeight: 500, color: "#374151" }}>
                  {isToday ? 'Today' : date.toLocaleDateString()}
                </span>
                {entry.mood && (
                  <span style={{ fontSize: 10, color: "#64748b" }}>
                    😊 {entry.mood}
                  </span>
                )}
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
    </div>
  );
}

// ============================================================================
// INSPIRATION PANEL
// ============================================================================
function InspirationPanel() {
  const tips = [
    {
      title: "Write without editing",
      description: "Let your thoughts flow freely. You can always refine later.",
      icon: "✍️"
    },
    {
      title: "Be specific",
      description: "Instead of 'good day,' try 'felt energized after morning walk.'",
      icon: "🎯"
    },
    {
      title: "Include emotions",
      description: "How did events make you feel? Emotions add depth to memories.",
      icon: "💭"
    },
    {
      title: "Use your senses",
      description: "What did you see, hear, smell, taste, or touch?",
      icon: "👁️"
    },
    {
      title: "Ask 'why'",
      description: "Dig deeper into your experiences and reactions.",
      icon: "🤔"
    },
    {
      title: "Celebrate small wins",
      description: "Document progress, no matter how minor it seems.",
      icon: "🎉"
    }
  ];

  const [currentTip, setCurrentTip] = useState(0);

  const nextTip = () => {
    setCurrentTip((prev) => (prev + 1) % tips.length);
  };

  return (
    <div className="card" style={{ marginBottom: 16, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#166534" }}>
          💡 Writing Tips
        </h4>
        <button 
          onClick={nextTip}
          className="btn"
          style={{ fontSize: 10, padding: "4px 6px" }}
        >
          Next Tip
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <span style={{ fontSize: 16 }}>{tips[currentTip].icon}</span>
        <div>
          <h5 style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: "#166534" }}>
            {tips[currentTip].title}
          </h5>
          <p style={{ margin: 0, fontSize: 11, color: "#22c55e", lineHeight: 1.4 }}>
            {tips[currentTip].description}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PROGRESS WIDGET
// ============================================================================
function ProgressWidget({ analytics }) {
  const weeklyGoal = 7; // 7 entries per week
  const weeklyProgress = (analytics.entriesThisWeek / weeklyGoal) * 100;
  
  const getStreakMessage = () => {
    if (analytics.currentStreak === 0) return "Start your journey today! 🌱";
    if (analytics.currentStreak < 3) return "Building momentum! 💪";
    if (analytics.currentStreak < 7) return "Great consistency! 🔥";
    if (analytics.currentStreak < 30) return "Amazing dedication! 🌟";
    return "Journal master! 👑";
  };

  return (
    <div className="card" style={{ marginBottom: 16, background: "#fefbf3", border: "1px solid #fbbf24" }}>
      <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#92400e" }}>
        📈 Your Progress
      </h4>

      {/* Weekly Goal Progress */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: "#92400e" }}>Weekly Goal</span>
          <span style={{ fontSize: 11, color: "#92400e" }}>
            {analytics.entriesThisWeek}/{weeklyGoal}
          </span>
        </div>
        <div style={{ 
          width: "100%", 
          height: 6, 
          background: "#fef3c7", 
          borderRadius: 3,
          overflow: "hidden"
        }}>
          <div 
            style={{ 
              width: `${Math.min(weeklyProgress, 100)}%`, 
              height: "100%", 
              background: "#f59e0b",
              transition: "width 0.3s ease",
              borderRadius: 3
            }} 
          />
        </div>
      </div>

      {/* Streak Information */}
      <div style={{ textAlign: "center", padding: "12px 0" }}>
        <div style={{ fontSize: 20, marginBottom: 4 }}>🔥</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#92400e", marginBottom: 2 }}>
          {analytics.currentStreak} Day Streak
        </div>
        <div style={{ fontSize: 10, color: "#b45309" }}>
          {getStreakMessage()}
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "1fr 1fr", 
        gap: 8,
        paddingTop: 8,
        borderTop: "1px solid #fbbf24"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#92400e" }}>
            {analytics.totalEntries}
          </div>
          <div style={{ fontSize: 9, color: "#b45309" }}>Total</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#92400e" }}>
            {analytics.longestStreak}
          </div>
          <div style={{ fontSize: 9, color: "#b45309" }}>Best Streak</div>
        </div>
      </div>
    </div>
  );
}