import React, { useEffect, useMemo, useState } from "react";
import { fetchTasks, createTask, completeTask, deleteTask, updateTask, type TaskRow, fetchTaskCategories, type TaskCategory } from "./api";

// Blue/white color scheme for priorities
const PRIORITY_COLORS = {
  1: { bg: "#dbeafe", border: "#bfdbfe", accent: "#2563eb", text: "#1e40af" },
  2: { bg: "#e0f2fe", border: "#bae6fd", accent: "#0284c7", text: "#0369a1" },  
  3: { bg: "#f0f9ff", border: "#e0f2fe", accent: "#0ea5e9", text: "#0284c7" },
  4: { bg: "#f8fafc", border: "#e2e8f0", accent: "#64748b", text: "#475569" },
  5: { bg: "#f1f5f9", border: "#cbd5e1", accent: "#94a3b8", text: "#64748b" },
};

// Default categories with intuitive organization
const DEFAULT_CATEGORIES = [
  { name: "Work", icon: "💼", color: "#2563eb" },
  { name: "Personal", icon: "🏠", color: "#059669" },
  { name: "Health", icon: "💪", color: "#dc2626" },
  { name: "Finance", icon: "💰", color: "#ca8a04" },
  { name: "Social", icon: "👥", color: "#7c3aed" },
  { name: "Learning", icon: "📚", color: "#0284c7" },
  { name: "Home", icon: "🏡", color: "#65a30d" },
  { name: "Shopping", icon: "🛍️", color: "#ea580c" },
  { name: "Travel", icon: "✈️", color: "#0891b2" },
  { name: "Creative", icon: "🎨", color: "#c2410c" }
];

// Time slots for organization
const TIME_SLOTS = [
  { id: "daily", label: "Daily Tasks", icon: "🔄", isDaily: true },
  { id: "morning", label: "Morning (6 AM - 12 PM)", icon: "🌅", start: 6, end: 12 },
  { id: "afternoon", label: "Afternoon (12 PM - 6 PM)", icon: "☀️", start: 12, end: 18 },
  { id: "evening", label: "Evening (6 PM - 11 PM)", icon: "🌆", start: 18, end: 23 },
  { id: "specific", label: "Specific Times", icon: "⏰", isSpecific: true }
];

// Mock completion data (in real app, would fetch from API)
const MOCK_COMPLETIONS = {
  today: { completed: 8, total: 12 },
  week: { completed: 23, total: 45 },
  month: { completed: 89, total: 124 },
  year: { completed: 387, total: 520 }
};

type ViewMode = "tasks" | "calendar" | "planner";

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [cats, setCats] = useState<TaskCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("tasks");
  
  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "", description: "", priority: 3, category_id: null as number | null, 
    xp: 10, coins: 0, due_date: "", due_time: "", is_daily: false
  });
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  
  // Edit states
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<TaskRow>>({});
  
  // Animation states
  const [completingTasks, setCompletingTasks] = useState<Set<number>>(new Set());
  const [deletingTasks, setDeletingTasks] = useState<Set<number>>(new Set());

  // Load data and initialize default categories
  async function loadTasks() {
    setLoading(true);
    try {
      const [taskData, categoryData] = await Promise.all([
        fetchTasks({ sort: "created_at" }),
        fetchTaskCategories()
      ]);
      setTasks(taskData);
      
      // Initialize with default categories if none exist
      if (categoryData.length === 0) {
        const defaultCats = DEFAULT_CATEGORIES.map((cat, i) => ({
          id: cat.name.toLowerCase(),
          category_id: i + 1,
          name: cat.name,
          color: cat.color,
          icon: cat.icon
        }));
        setCats(defaultCats);
      } else {
        setCats(categoryData);
      }
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTasks(); }, []);

  // Group tasks by time slots and categories
  const organizedTasks = useMemo(() => {
    const result: Record<string, Record<string, TaskRow[]>> = {};
    
    TIME_SLOTS.forEach(slot => {
      result[slot.id] = {};
      result[slot.id]["uncategorized"] = [];
      cats.forEach(cat => {
        result[slot.id][cat.name.toLowerCase()] = [];
      });
    });

    tasks.forEach(task => {
      let timeSlot = "daily";
      
      if (task.due_time) {
        const hour = parseInt(task.due_time.split(':')[0]);
        if (hour >= 6 && hour < 12) timeSlot = "morning";
        else if (hour >= 12 && hour < 18) timeSlot = "afternoon";
        else if (hour >= 18 && hour < 23) timeSlot = "evening";
        else timeSlot = "specific";
      } else if (task.due_date && !task.due_time) {
        timeSlot = "daily";
      }

      const category = cats.find(c => c.category_id === task.category_id);
      const categoryKey = category ? category.name.toLowerCase() : "uncategorized";
      
      if (result[timeSlot] && result[timeSlot][categoryKey]) {
        result[timeSlot][categoryKey].push(task);
      }
    });

    Object.keys(result).forEach(timeSlot => {
      Object.keys(result[timeSlot]).forEach(category => {
        if (result[timeSlot][category].length === 0) {
          delete result[timeSlot][category];
        }
      });
    });

    return result;
  }, [tasks, cats]);

  // Task actions
  async function handleCompleteTask(taskId: number) {
    setCompletingTasks(prev => new Set([...prev, taskId]));
    try {
      await completeTask(taskId);
      setStatus("Task completed! 🎉 +10 XP");
      
      setTimeout(async () => {
        await loadTasks();
        setCompletingTasks(prev => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
      }, 1200);
      
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
      setCompletingTasks(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  }

  async function handleDeleteTask(taskId: number) {
    setDeletingTasks(prev => new Set([...prev, taskId]));
    try {
      await deleteTask(taskId);
      setStatus("Task deleted");
      
      setTimeout(async () => {
        await loadTasks();
        setDeletingTasks(prev => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
      }, 400);
      
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
      setDeletingTasks(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  }

  async function handleUpdateTask() {
    if (!editingTask) return;
    
    try {
      await updateTask(editingTask, editForm);
      setStatus("Task updated! ✨");
      setEditingTask(null);
      setEditForm({});
      await loadTasks();
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    }
  }

  function startEdit(task: TaskRow) {
    setEditingTask(task.task_id);
    setEditForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      category_id: task.category_id,
      due_date: task.due_date,
      due_time: task.due_time,
      xp_reward: task.xp,
      coin_reward: task.coins
    });
  }

  function cancelEdit() {
    setEditingTask(null);
    setEditForm({});
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    
    try {
      await createTask({
        ...newTask,
        due_date: newTask.due_date || undefined,
        due_time: newTask.due_time || undefined
      });
      setNewTask({ title: "", description: "", priority: 3, category_id: null, xp: 10, coins: 0, due_date: "", due_time: "", is_daily: false });
      setShowCreateForm(false);
      setStatus("Task created! ✨");
      await loadTasks();
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    }
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    
    const newCat = {
      id: newCategoryName.toLowerCase().replace(/\s+/g, ''),
      category_id: Math.max(...cats.map(c => c.category_id), 0) + 1,
      name: newCategoryName.trim(),
      color: "#2563eb",
      icon: "📁"
    };
    setCats(prev => [...prev, newCat]);
    setNewCategoryName("");
    setShowCategoryInput(false);
    setStatus(`Category "${newCat.name}" created! 📁`);
  }

  function formatTime(timeStr: string) {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  function ProgressBar({ completed, total, label, color }: { completed: number; total: number; label: string; color: string }) {
    const percentage = Math.round((completed / total) * 100);
    
    return (
      <div style={{ minWidth: 120 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{label}</span>
          <span style={{ fontSize: 11, color: "#64748b" }}>{completed}/{total}</span>
        </div>
        <div style={{ 
          height: 6, 
          background: "#f1f5f9", 
          borderRadius: 3, 
          overflow: "hidden",
          border: "1px solid #e2e8f0"
        }}>
          <div style={{ 
            height: "100%", 
            width: `${percentage}%`, 
            background: `linear-gradient(90deg, ${color}, ${color}dd)`,
            borderRadius: 3,
            transition: "width 0.6s ease"
          }} />
        </div>
        <div style={{ fontSize: 10, color: "#64748b", marginTop: 2, textAlign: "center" }}>
          {percentage}%
        </div>
      </div>
    );
  }

  const totalTasks = tasks.length;

  // Calendar placeholder view
  if (viewMode === "calendar") {
    return (
      <div className="container main">
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <div className="tabs" style={{ background: "none", border: "none", boxShadow: "none", padding: 0 }}>
              <button 
                onClick={() => setViewMode("tasks")}
                className="tab"
                style={{ background: "#f8fafc", color: "#64748b" }}
              >
                📋 Tasks
              </button>
              <button 
                onClick={() => setViewMode("calendar")}
                className="tab active"
              >
                📅 Calendar
              </button>
              <button 
                onClick={() => setViewMode("planner")}
                className="tab"
                style={{ background: "#f8fafc", color: "#64748b" }}
              >
                🗓️ Daily Planner
              </button>
            </div>
          </div>
          
          <div style={{ textAlign: "center", padding: 48, color: "#64748b" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
            <h3 style={{ color: "#374151", marginBottom: 8 }}>Calendar View</h3>
            <p>Feature-rich calendar with drag & drop scheduling coming soon!</p>
          </div>
        </div>
      </div>
    );
  }

  // Daily Planner placeholder view  
  if (viewMode === "planner") {
    return (
      <div className="container main">
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <div className="tabs" style={{ background: "none", border: "none", boxShadow: "none", padding: 0 }}>
              <button 
                onClick={() => setViewMode("tasks")}
                className="tab"
                style={{ background: "#f8fafc", color: "#64748b" }}
              >
                📋 Tasks
              </button>
              <button 
                onClick={() => setViewMode("calendar")}
                className="tab"
                style={{ background: "#f8fafc", color: "#64748b" }}
              >
                📅 Calendar
              </button>
              <button 
                onClick={() => setViewMode("planner")}
                className="tab active"
              >
                🗓️ Daily Planner
              </button>
            </div>
          </div>
          
          <div style={{ textAlign: "center", padding: 48, color: "#64748b" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🗓️</div>
            <h3 style={{ color: "#374151", marginBottom: 8 }}>Daily Planner</h3>
            <p>Time blocking, routines, and daily goals planning interface coming soon!</p>
          </div>
        </div>
      </div>
    );
  }

  // Main Tasks view
  return (
    <div className="container main">
      {/* Header with Analytics */}
      <div className="card" style={{ marginBottom: 16, background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, color: "#1e293b" }}>📋 Tasks</h2>
            <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
              {totalTasks} active tasks
            </div>
          </div>
          
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            {status && (
              <div style={{ 
                padding: "6px 12px", 
                borderRadius: 8, 
                background: status.includes("Error") ? "#fef2f2" : "#f0fdf4",
                color: status.includes("Error") ? "#dc2626" : "#16a34a",
                border: `1px solid ${status.includes("Error") ? "#fecaca" : "#bbf7d0"}`,
                fontSize: 14
              }}>
                {status}
              </div>
            )}
            <button 
              className="btn primary"
              onClick={() => setShowCreateForm(!showCreateForm)}
              style={{ 
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                border: "none"
              }}
            >
              {showCreateForm ? "Cancel" : "+ New Task"}
            </button>
          </div>
        </div>

        {/* Completion Analytics */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", 
          gap: 16,
          padding: 16,
          background: "rgba(255, 255, 255, 0.6)",
          borderRadius: 12,
          border: "1px solid rgba(226, 232, 240, 0.8)"
        }}>
          <ProgressBar 
            completed={MOCK_COMPLETIONS.today.completed} 
            total={MOCK_COMPLETIONS.today.total} 
            label="Today" 
            color="#059669" 
          />
          <ProgressBar 
            completed={MOCK_COMPLETIONS.week.completed} 
            total={MOCK_COMPLETIONS.week.total} 
            label="This Week" 
            color="#2563eb" 
          />
          <ProgressBar 
            completed={MOCK_COMPLETIONS.month.completed} 
            total={MOCK_COMPLETIONS.month.total} 
            label="This Month" 
            color="#7c3aed" 
          />
          <ProgressBar 
            completed={MOCK_COMPLETIONS.year.completed} 
            total={MOCK_COMPLETIONS.year.total} 
            label="This Year" 
            color="#dc2626" 
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <div className="tabs" style={{ background: "none", border: "none", boxShadow: "none", padding: 0 }}>
          <button 
            onClick={() => setViewMode("tasks")}
            className="tab active"
          >
            📋 Tasks
          </button>
          <button 
            onClick={() => setViewMode("calendar")}
            className="tab"
            style={{ background: "#f8fafc", color: "#64748b" }}
          >
            📅 Calendar
          </button>
          <button 
            onClick={() => setViewMode("planner")}
            className="tab"
            style={{ background: "#f8fafc", color: "#64748b" }}
          >
            🗓️ Daily Planner
          </button>
        </div>
      </div>

      {/* Create Task Form */}
      {showCreateForm && (
        <div className="card" style={{ 
          marginBottom: 16, 
          border: "2px solid #dbeafe",
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)"
        }}>
          <form onSubmit={handleCreateTask}>
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 120px 100px", gap: 12, alignItems: "end" }}>
                <div>
                  <label style={{ fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Task *</label>
                  <input 
                    className="input" 
                    placeholder="What needs to be done?"
                    value={newTask.title}
                    onChange={e => setNewTask({...newTask, title: e.target.value})}
                  />
                </div>
                
                <div>
                  <label style={{ fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Category</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    <select 
                      className="input" 
                      value={newTask.category_id || ""} 
                      onChange={e => setNewTask({...newTask, category_id: e.target.value ? Number(e.target.value) : null})}
                      style={{ flex: 1 }}
                    >
                      <option value="">None</option>
                      {cats.map(c => (
                        <option key={c.category_id} value={c.category_id}>
                          {c.icon} {c.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowCategoryInput(!showCategoryInput)}
                      className="btn"
                      style={{ minWidth: 36, padding: "0 8px", background: "#f1f5f9", border: "1px solid #cbd5e1" }}
                    >
                      +
                    </button>
                  </div>
                </div>
                
                <div>
                  <label style={{ fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Priority</label>
                  <select 
                    className="input"
                    value={newTask.priority}
                    onChange={e => setNewTask({...newTask, priority: Number(e.target.value)})}
                    style={{ 
                      background: PRIORITY_COLORS[newTask.priority as keyof typeof PRIORITY_COLORS].bg,
                      borderColor: PRIORITY_COLORS[newTask.priority as keyof typeof PRIORITY_COLORS].border,
                      color: PRIORITY_COLORS[newTask.priority as keyof typeof PRIORITY_COLORS].text
                    }}
                  >
                    <option value={1}>🔥 P1</option>
                    <option value={2}>⚡ P2</option>
                    <option value={3}>📋 P3</option>
                    <option value={4}>📝 P4</option>
                    <option value={5}>💤 P5</option>
                  </select>
                </div>
                
                <button 
                  type="submit" 
                  className="btn primary"
                  disabled={!newTask.title.trim()}
                  style={{ 
                    background: newTask.title.trim() ? "linear-gradient(135deg, #059669 0%, #047857 100%)" : "#cbd5e1",
                    border: "none"
                  }}
                >
                  Create
                </button>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Description</label>
                  <input 
                    className="input" 
                    placeholder="Optional details..."
                    value={newTask.description}
                    onChange={e => setNewTask({...newTask, description: e.target.value})}
                  />
                </div>
                
                <div>
                  <label style={{ fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Due Date</label>
                  <input 
                    className="input" 
                    type="date"
                    value={newTask.due_date}
                    onChange={e => setNewTask({...newTask, due_date: e.target.value})}
                  />
                </div>
                
                <div>
                  <label style={{ fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Time</label>
                  <input 
                    className="input" 
                    type="time"
                    value={newTask.due_time}
                    onChange={e => setNewTask({...newTask, due_time: e.target.value})}
                    disabled={!newTask.due_date}
                  />
                </div>
              </div>
            </div>
          </form>

          {showCategoryInput && (
            <form onSubmit={handleCreateCategory} style={{ marginTop: 16, padding: 16, background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>New Category</label>
                  <input 
                    className="input"
                    placeholder="Category name..."
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn primary" disabled={!newCategoryName.trim()}>Add</button>
                <button type="button" className="btn" onClick={() => setShowCategoryInput(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Tasks organized by time slots */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#64748b" }}>
            <div className="spin" />
            Loading tasks...
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {TIME_SLOTS.map(timeSlot => {
            const slotTasks = organizedTasks[timeSlot.id];
            const hasAnyTasks = Object.values(slotTasks || {}).some(tasks => tasks.length > 0);
            
            if (!hasAnyTasks) return null;

            return (
              <div key={timeSlot.id} className="card" style={{ background: "#ffffff" }}>
                <h3 style={{ 
                  margin: "0 0 16px 0", 
                  color: "#1e293b", 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 8,
                  borderBottom: "2px solid #f1f5f9",
                  paddingBottom: 8
                }}>
                  {timeSlot.icon} {timeSlot.label}
                  <span style={{ 
                    background: "#dbeafe", 
                    color: "#1e40af", 
                    padding: "2px 8px", 
                    borderRadius: 12, 
                    fontSize: 12, 
                    fontWeight: 600 
                  }}>
                    {Object.values(slotTasks).reduce((sum, tasks) => sum + tasks.length, 0)} tasks
                  </span>
                </h3>

                <div style={{ display: "grid", gap: 16 }}>
                  {Object.entries(slotTasks).map(([categoryKey, categoryTasks]) => {
                    if (categoryTasks.length === 0) return null;
                    
                    const categoryInfo = categoryKey === "uncategorized" 
                      ? { name: "Uncategorized", icon: "📋", color: "#64748b" }
                      : cats.find(c => c.name.toLowerCase() === categoryKey) || { name: categoryKey, icon: "📁", color: "#64748b" };

                    return (
                      <div key={categoryKey}>
                        <h4 style={{ 
                          margin: "0 0 8px 0", 
                          color: categoryInfo.color, 
                          fontSize: 14, 
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: 6
                        }}>
                          {categoryInfo.icon} {categoryInfo.name} ({categoryTasks.length})
                        </h4>
                        
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                          gap: 8
                        }}>
                          {categoryTasks.map(task => {
                            const priority = PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS];
                            const isCompleting = completingTasks.has(task.task_id);
                            const isDeleting = deletingTasks.has(task.task_id);
                            const isEditing = editingTask === task.task_id;

                            return (
                              <div
                                key={task.task_id}
                                style={{
                                  background: priority.bg,
                                  border: `1px solid ${priority.border}`,
                                  borderLeft: `3px solid ${priority.accent}`,
                                  borderRadius: 8,
                                  padding: 12,
                                  position: "relative",
                                  transition: "all 0.2s ease",
                                  transform: isCompleting ? "scale(0.98)" : isDeleting ? "scale(0.95)" : "scale(1)",
                                  opacity: isCompleting || isDeleting ? 0.7 : 1
                                }}
                                onMouseEnter={e => {
                                  if (!isCompleting && !isDeleting && !isEditing) {
                                    e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(37, 99, 235, 0.15)";
                                  }
                                }}
                                onMouseLeave={e => {
                                  if (!isCompleting && !isDeleting && !isEditing) {
                                    e.currentTarget.style.transform = "scale(1)";
                                    e.currentTarget.style.boxShadow = "none";
                                  }
                                }}
                              >
                                {/* Edit Form */}
                                {isEditing ? (
                                  <div style={{ display: "grid", gap: 8 }}>
                                    <input
                                      className="input"
                                      value={editForm.title || ""}
                                      onChange={e => setEditForm({...editForm, title: e.target.value})}
                                      style={{ fontSize: 14, padding: 8 }}
                                    />
                                    <input
                                      className="input"
                                      placeholder="Description..."
                                      value={editForm.description || ""}
                                      onChange={e => setEditForm({...editForm, description: e.target.value})}
                                      style={{ fontSize: 12, padding: 6 }}
                                    />
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                                      <select
                                        className="input"
                                        value={editForm.priority || 3}
                                        onChange={e => setEditForm({...editForm, priority: Number(e.target.value)})}
                                        style={{ fontSize: 12, padding: 6 }}
                                      >
                                        <option value={1}>🔥 P1</option>
                                        <option value={2}>⚡ P2</option>
                                        <option value={3}>📋 P3</option>
                                        <option value={4}>📝 P4</option>
                                        <option value={5}>💤 P5</option>
                                      </select>
                                      <input
                                        className="input"
                                        type="date"
                                        value={editForm.due_date || ""}
                                        onChange={e => setEditForm({...editForm, due_date: e.target.value})}
                                        style={{ fontSize: 11, padding: 6 }}
                                      />
                                      <input
                                        className="input"
                                        type="time"
                                        value={editForm.due_time || ""}
                                        onChange={e => setEditForm({...editForm, due_time: e.target.value})}
                                        style={{ fontSize: 11, padding: 6 }}
                                      />
                                    </div>
                                    <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                                      <button
                                        onClick={handleUpdateTask}
                                        className="btn primary"
                                        style={{
                                          background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                                          border: "none",
                                          fontSize: 11,
                                          padding: "6px 12px"
                                        }}
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={cancelEdit}
                                        className="btn"
                                        style={{
                                          background: "#f8fafc",
                                          borderColor: "#cbd5e1",
                                          fontSize: 11,
                                          padding: "6px 12px"
                                        }}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  // Normal Task Display
                                  <>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                                      <h5 style={{ 
                                        margin: 0, 
                                        color: priority.text, 
                                        fontSize: 14, 
                                        fontWeight: 600,
                                        lineHeight: 1.3,
                                        flex: 1,
                                        paddingRight: 8
                                      }}>
                                        {task.title}
                                      </h5>
                                      <span style={{
                                        background: priority.accent,
                                        color: "white",
                                        borderRadius: 4,
                                        padding: "2px 6px",
                                        fontSize: 10,
                                        fontWeight: 700
                                      }}>
                                        P{task.priority}
                                      </span>
                                    </div>

                                    {task.description && (
                                      <p style={{ 
                                        margin: "0 0 8px 0", 
                                        color: "#64748b", 
                                        fontSize: 12, 
                                        lineHeight: 1.4 
                                      }}>
                                        {task.description}
                                      </p>
                                    )}

                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#64748b" }}>
                                        {task.due_time && (
                                          <span>⏰ {formatTime(task.due_time)}</span>
                                        )}
                                        {task.xp > 0 && (
                                          <span>⭐ {task.xp}XP</span>
                                        )}
                                      </div>
                                      
                                      <div style={{ display: "flex", gap: 4 }}>
                                        <button
                                          onClick={() => startEdit(task)}
                                          disabled={isCompleting || isDeleting}
                                          style={{
                                            background: "#f0f9ff",
                                            border: "1px solid #bae6fd",
                                            color: "#0369a1",
                                            borderRadius: 4,
                                            padding: "4px 6px",
                                            fontSize: 10,
                                            cursor: "pointer"
                                          }}
                                        >
                                          ✏️
                                        </button>
                                        
                                        <button
                                          onClick={() => handleCompleteTask(task.task_id)}
                                          disabled={isCompleting || isDeleting}
                                          style={{
                                            background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                                            border: "none",
                                            color: "white",
                                            borderRadius: 4,
                                            padding: "4px 8px",
                                            fontSize: 11,
                                            fontWeight: 600,
                                            cursor: "pointer",
                                            opacity: isCompleting ? 0.7 : 1
                                          }}
                                        >
                                          {isCompleting ? "✓" : "Done"}
                                        </button>
                                        
                                        <button
                                          onClick={() => handleDeleteTask(task.task_id)}
                                          disabled={isCompleting || isDeleting}
                                          style={{
                                            background: "#fef2f2",
                                            border: "1px solid #fecaca",
                                            color: "#dc2626",
                                            borderRadius: 4,
                                            padding: "4px 6px",
                                            fontSize: 10,
                                            cursor: "pointer"
                                          }}
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    </div>
                                  </>
                                )}

                                {isCompleting && (
                                  <div style={{
                                    position: "absolute",
                                    inset: 0,
                                    background: "rgba(5, 150, 105, 0.95)",
                                    borderRadius: 8,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "white",
                                    fontSize: 14,
                                    fontWeight: 600,
                                    animation: "pulse 1.2s ease-in-out"
                                  }}>
                                    ✓ Processing...
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          
          {totalTasks === 0 && (
            <div style={{ 
              textAlign: "center", 
              padding: 48, 
              color: "#64748b",
              background: "#f8fafc",
              borderRadius: 16,
              border: "2px dashed #cbd5e1"
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
              <h3 style={{ margin: "0 0 8px 0", color: "#374151" }}>No tasks yet</h3>
              <p style={{ margin: 0 }}>Create your first task to get started!</p>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}