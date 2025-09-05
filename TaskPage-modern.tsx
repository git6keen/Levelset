// FILE: TasksPage-modern.tsx - TasksPage with modern hooks
import React, { useState } from "react";
import { useTasks, useCreateTask, useCompleteTask, useDeleteTask, useUpdateTask } from './api-hooks.js';
import { useTaskFilters, useUIStore, useToast } from './ui-store.js';

// Mock completion data - you can replace with real API later
const MOCK_COMPLETIONS = {
  today: { completed: 3, total: 8 },
  week: { completed: 12, total: 28 },
  month: { completed: 47, total: 89 },
  year: { completed: 234, total: 456 }
};

export default function TasksPage() {
  const [viewMode, setViewMode] = useState<"tasks" | "calendar" | "planner">("tasks");
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Modern state management
  const taskFilters = useTaskFilters();
  const setTaskFilters = useUIStore(state => state.setTaskFilters);
  const { showToast } = useToast();
  
  // Modern API hooks with automatic caching
  const { data: tasks = [], isLoading, error, refetch } = useTasks(taskFilters);
  const createTaskMutation = useCreateTask();
  const completeTaskMutation = useCompleteTask();
  const deleteTaskMutation = useDeleteTask();
  const updateTaskMutation = useUpdateTask();

  // Form state
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 2,
    xp: 0,
    coins: 0,
  });

  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 2,
  });

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      await createTaskMutation.mutateAsync(newTask);
      setNewTask({ title: '', description: '', priority: 2, xp: 0, coins: 0 });
      setShowCreateForm(false);
      showToast('Task created successfully! 🎉', 'success');
    } catch (error: any) {
      showToast(`Failed to create task: ${error.message}`, 'error');
    }
  };

  const handleCompleteTask = async (taskId: number) => {
    try {
      await completeTaskMutation.mutateAsync({ id: taskId });
      showToast('Task completed! ✨', 'success');
    } catch (error: any) {
      showToast(`Failed to complete task: ${error.message}`, 'error');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await deleteTaskMutation.mutateAsync(taskId);
      showToast('Task deleted successfully', 'success');
    } catch (error: any) {
      showToast(`Failed to delete task: ${error.message}`, 'error');
    }
  };

  const startEdit = (task: any) => {
    setEditingTask(task.task_id);
    setEditForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
    });
  };

  const cancelEdit = () => {
    setEditingTask(null);
    setEditForm({ title: '', description: '', priority: 2 });
  };

  const saveEdit = async () => {
    if (!editForm.title.trim() || !editingTask) return;

    try {
      await updateTaskMutation.mutateAsync({
        id: editingTask,
        updates: editForm,
      });
      setEditingTask(null);
      showToast('Task updated successfully! 📝', 'success');
    } catch (error: any) {
      showToast(`Failed to update task: ${error.message}`, 'error');
    }
  };

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
            {/* Loading/Error indicators */}
            {isLoading && (
              <div style={{ 
                padding: "6px 12px", 
                borderRadius: 8, 
                background: "#fef3c7",
                color: "#92400e",
                border: "1px solid #fbbf24",
                fontSize: 14
              }}>
                Loading...
              </div>
            )}
            {error && (
              <div style={{ 
                padding: "6px 12px", 
                borderRadius: 8, 
                background: "#fef2f2",
                color: "#dc2626",
                border: "1px solid #fecaca",
                fontSize: 14
              }}>
                Error loading tasks
              </div>
            )}
            <button 
              className="btn primary"
              onClick={() => setShowCreateForm(!showCreateForm)}
              style={{ 
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                border: "none"
              }}
              disabled={createTaskMutation.isPending}
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
                    required
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Priority</label>
                  <select 
                    className="input"
                    value={newTask.priority}
                    onChange={e => setNewTask({...newTask, priority: Number(e.target.value)})}
                  >
                    <option value={1}>🟢 Low</option>
                    <option value={2}>🟡 Normal</option>
                    <option value={3}>🟠 High</option>
                    <option value={4}>🔴 Critical</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>XP</label>
                  <input 
                    className="input" 
                    type="number" 
                    min="0" 
                    max="1000"
                    value={newTask.xp}
                    onChange={e => setNewTask({...newTask, xp: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Coins</label>
                  <input 
                    className="input" 
                    type="number" 
                    min="0" 
                    max="1000"
                    value={newTask.coins}
                    onChange={e => setNewTask({...newTask, coins: Number(e.target.value)})}
                  />
                </div>
              </div>
              
              <div>
                <label style={{ fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Description</label>
                <textarea 
                  className="textarea" 
                  placeholder="Optional details..."
                  value={newTask.description}
                  onChange={e => setNewTask({...newTask, description: e.target.value})}
                />
              </div>
              
              <div style={{ display: "flex", gap: 8 }}>
                <button 
                  type="submit" 
                  className="btn primary"
                  disabled={createTaskMutation.isPending}
                >
                  {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                </button>
                <button 
                  type="button" 
                  className="btn"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 12, alignItems: "center" }}>
          <input 
            className="input" 
            placeholder="Search tasks..."
            value={taskFilters.search}
            onChange={e => setTaskFilters({ search: e.target.value })}
          />
          <select 
            className="input"
            value={taskFilters.priority || ''}
            onChange={e => setTaskFilters({ priority: e.target.value ? Number(e.target.value) : undefined })}
          >
            <option value="">All Priorities</option>
            <option value={1}>🟢 Low</option>
            <option value={2}>🟡 Normal</option>
            <option value={3}>🟠 High</option>
            <option value={4}>🔴 Critical</option>
          </select>
          <select 
            className="input"
            value={taskFilters.sort}
            onChange={e => setTaskFilters({ sort: e.target.value as any })}
          >
            <option value="priority">Sort by Priority</option>
            <option value="title">Sort by Title</option>
            <option value="created_at">Sort by Date</option>
          </select>
          <button 
            className="btn"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Tasks List */}
      <div className="card">
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 48, color: "#64748b" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <p>Loading tasks...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: 48, color: "#64748b" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <p>Failed to load tasks</p>
            <button className="btn" onClick={() => refetch()}>Try Again</button>
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: "#64748b" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
            <h3 style={{ color: "#374151", marginBottom: 8 }}>No tasks yet</h3>
            <p>Create your first task to get started!</p>
            <button 
              className="btn primary"
              onClick={() => setShowCreateForm(true)}
              style={{ marginTop: 16 }}
            >
              + Create Task
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {tasks.map(task => {
              const priority = {
                1: { bg: "#dcfce7", text: "#166534", accent: "#bbf7d0", label: "🟢 Low" },
                2: { bg: "#fef3c7", text: "#92400e", accent: "#fde68a", label: "🟡 Normal" },
                3: { bg: "#fed7aa", text: "#9a3412", accent: "#fdba74", label: "🟠 High" },
                4: { bg: "#fecaca", text: "#991b1b", accent: "#fca5a5", label: "🔴 Critical" }
              }[task.priority] || { bg: "#f3f4f6", text: "#374151", accent: "#e5e7eb", label: "❓ Unknown" };

              const isCompleting = completeTaskMutation.isPending;
              const isDeleting = deleteTaskMutation.isPending;
              const isUpdating = updateTaskMutation.isPending;

              return (
                <div 
                  key={task.task_id}
                  style={{
                    background: priority.bg,
                    border: `1px solid ${priority.accent}`,
                    borderRadius: 12,
                    padding: 16,
                    transition: "all 0.2s ease"
                  }}
                >
                  {editingTask === task.task_id ? (
                    // Edit Mode
                    <div style={{ display: "grid", gap: 12 }}>
                      <input 
                        className="input"
                        value={editForm.title}
                        onChange={e => setEditForm({...editForm, title: e.target.value})}
                        style={{ background: "white" }}
                      />
                      <textarea 
                        className="textarea"
                        value={editForm.description}
                        onChange={e => setEditForm({...editForm, description: e.target.value})}
                        style={{ background: "white", minHeight: 60 }}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={saveEdit}
                          className="btn primary"
                          disabled={isUpdating}
                          style={{ fontSize: 11, padding: "6px 12px" }}
                        >
                          {isUpdating ? "Saving..." : "Save"}
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
                          color: priority.text,
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                          minWidth: 16,
                          textAlign: "center"
                        }}>
                          P{task.priority}
                        </span>
                      </div>

                      {task.description && (
                        <p style={{ 
                          margin: "0 0 8px 0", 
                          fontSize: 12, 
                          color: "#64748b",
                          lineHeight: 1.4
                        }}>
                          {task.description}
                        </p>
                      )}

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {task.xp > 0 && (
                            <span style={{ 
                              background: "#dbeafe", 
                              color: "#1d4ed8", 
                              padding: "2px 6px", 
                              borderRadius: 8, 
                              fontSize: 10, 
                              fontWeight: 600 
                            }}>
                              +{task.xp} XP
                            </span>
                          )}
                          {task.coins > 0 && (
                            <span style={{ 
                              background: "#fef3c7", 
                              color: "#d97706", 
                              padding: "2px 6px", 
                              borderRadius: 8, 
                              fontSize: 10, 
                              fontWeight: 600 
                            }}>
                              +{task.coins} 🪙
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
                            {isCompleting ? "⏳" : "✅ Done"}
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
                              cursor: "pointer",
                              opacity: isDeleting ? 0.7 : 1
                            }}
                          >
                            {isDeleting ? "⏳" : "🗑️"}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}