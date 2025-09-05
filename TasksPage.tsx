// FILE: TasksPage.tsx - Modern React hooks with Tanstack Query
import React, { useState } from "react";
import { useTasks, useCreateTask, useCompleteTask, useDeleteTask, useUpdateTask } from './api-hooks.js';
import { useTaskFilters, useUIStore, useToast } from './ui-store.js';

// Mock completion data - replace with real API later
const MOCK_COMPLETIONS = {
  today: { completed: 3, total: 8 },
  week: { completed: 12, total: 28 },
  month: { completed: 47, total: 89 },
  year: { completed: 234, total: 456 }
};

// ============================================================================
// PROGRESS BAR COMPONENT
// ============================================================================
function ProgressBar({ completed, total, label, color }: { 
  completed: number; 
  total: number; 
  label: string; 
  color: string; 
}) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ 
        height: 8, 
        background: "#f1f5f9", 
        borderRadius: 4, 
        overflow: "hidden",
        marginBottom: 8
      }}>
        <div style={{ 
          height: "100%", 
          background: color, 
          width: `${percentage}%`,
          transition: "width 0.3s ease"
        }} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: "#64748b" }}>
        {completed}/{total} ({percentage}%)
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function TasksPage() {
  const [viewMode, setViewMode] = useState<"tasks" | "calendar" | "planner">("tasks");
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Modern state management
  const taskFilters = useTaskFilters();
  const setTaskFilters = useUIStore(state => state.setTaskFilters);
  const addToast = useToast();
  
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

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      await createTaskMutation.mutateAsync(newTask);
      setNewTask({ title: '', description: '', priority: 2, xp: 0, coins: 0 });
      setShowCreateForm(false);
      addToast('Task created successfully! 🎉', 'success');
    } catch (error: any) {
      addToast(`Failed to create task: ${error.message}`, 'error');
    }
  };

  const handleCompleteTask = async (taskId: number) => {
    try {
      await completeTaskMutation.mutateAsync({ id: taskId });
      addToast('Task completed! ✨', 'success');
    } catch (error: any) {
      addToast(`Failed to complete task: ${error.message}`, 'error');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await deleteTaskMutation.mutateAsync({ id: taskId });
      addToast('Task deleted', 'info');
    } catch (error: any) {
      addToast(`Failed to delete task: ${error.message}`, 'error');
    }
  };

  const handleEditTask = (task: any) => {
    setEditingTask(task.task_id);
    setEditForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
    });
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editForm.title.trim()) return;

    try {
      await updateTaskMutation.mutateAsync({
        id: editingTask,
        ...editForm
      });
      setEditingTask(null);
      addToast('Task updated! 📝', 'success');
    } catch (error: any) {
      addToast(`Failed to update task: ${error.message}`, 'error');
    }
  };

  const cancelEdit = () => {
    setEditingTask(null);
    setEditForm({ title: '', description: '', priority: 2 });
  };

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  const totalTasks = tasks.length;

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="page">
      {/* Header Section */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", marginBottom: 16 }}>
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
            className={`tab ${viewMode === "tasks" ? "active" : ""}`}
          >
            📋 Tasks
          </button>
          <button 
            onClick={() => setViewMode("calendar")}
            className={`tab ${viewMode === "calendar" ? "active" : ""}`}
            style={{ background: viewMode === "calendar" ? undefined : "#f8fafc", color: viewMode === "calendar" ? undefined : "#64748b" }}
          >
            📅 Calendar
          </button>
          <button 
            onClick={() => setViewMode("planner")}
            className={`tab ${viewMode === "planner" ? "active" : ""}`}
            style={{ background: viewMode === "planner" ? undefined : "#f8fafc", color: viewMode === "planner" ? undefined : "#64748b" }}
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
                    onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Priority</label>
                  <select 
                    className="input"
                    value={newTask.priority}
                    onChange={(e) => setNewTask(prev => ({ ...prev, priority: Number(e.target.value) }))}
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
                    placeholder="50"
                    value={newTask.xp || ''}
                    onChange={(e) => setNewTask(prev => ({ ...prev, xp: Number(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Coins</label>
                  <input 
                    className="input" 
                    type="number"
                    min="0"
                    max="1000"
                    placeholder="10"
                    value={newTask.coins || ''}
                    onChange={(e) => setNewTask(prev => ({ ...prev, coins: Number(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Description</label>
                <textarea 
                  className="input"
                  placeholder="Additional details..."
                  rows={2}
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button 
                  type="button" 
                  className="btn"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn primary"
                  disabled={createTaskMutation.isPending || !newTask.title.trim()}
                >
                  {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

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
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", 
            gap: 16 
          }}>
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
                    // Edit Form
                    <form onSubmit={handleUpdateTask}>
                      <div style={{ display: "grid", gap: 12 }}>
                        <input 
                          className="input"
                          value={editForm.title}
                          onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                          required
                          style={{ fontSize: 14 }}
                        />
                        <select 
                          className="input"
                          value={editForm.priority}
                          onChange={(e) => setEditForm(prev => ({ ...prev, priority: Number(e.target.value) }))}
                          style={{ fontSize: 14 }}
                        >
                          <option value={1}>🟢 Low</option>
                          <option value={2}>🟡 Normal</option>
                          <option value={3}>🟠 High</option>
                          <option value={4}>🔴 Critical</option>
                        </select>
                        <textarea 
                          className="input"
                          value={editForm.description}
                          onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                          rows={2}
                          style={{ fontSize: 14 }}
                          placeholder="Description..."
                        />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button 
                            type="button" 
                            className="btn"
                            onClick={cancelEdit}
                            style={{ fontSize: 12, padding: "4px 8px" }}
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit" 
                            className="btn primary"
                            disabled={isUpdating}
                            style={{ fontSize: 12, padding: "4px 8px" }}
                          >
                            {isUpdating ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    // View Mode
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <h4 style={{ margin: 0, color: priority.text, fontSize: 16 }}>
                          {task.title}
                        </h4>
                        <span style={{ 
                          fontSize: 12, 
                          color: priority.text, 
                          background: priority.accent,
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontWeight: 600
                        }}>
                          {priority.label}
                        </span>
                      </div>
                      
                      {task.description && (
                        <p style={{ margin: "8px 0", color: priority.text, fontSize: 14, opacity: 0.8 }}>
                          {task.description}
                        </p>
                      )}
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                        <div style={{ display: "flex", gap: 8, fontSize: 12, color: priority.text }}>
                          {task.xp > 0 && <span>⭐ {task.xp} XP</span>}
                          {task.coins > 0 && <span>🪙 {task.coins}</span>}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button 
                            className="btn"
                            onClick={() => handleEditTask(task)}
                            style={{ fontSize: 12, padding: "4px 8px" }}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn primary"
                            onClick={() => handleCompleteTask(task.task_id)}
                            style={{ fontSize: 12, padding: "4px 8px" }}
                            disabled={isCompleting}
                          >
                            {isCompleting ? "..." : "Complete"}
                          </button>
                          <button 
                            className="btn"
                            onClick={() => handleDeleteTask(task.task_id)}
                            style={{ fontSize: 12, padding: "4px 8px", background: "#fef2f2", color: "#dc2626" }}
                            disabled={isDeleting}
                          >
                            {isDeleting ? "..." : "Delete"}
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