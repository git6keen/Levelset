{/* Keyboard Shortcuts Helper - Enhanced */}
        <div style={{ 
          fontSize: 11, 
          color: "#64748b", 
          textAlign: "center", 
          marginTop: 8,
          padding: "4px 8px",// FILE: TasksPage.tsx - Complete modern TasksPage with all original functionality
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
      await deleteTaskMutation.mutateAsync({ id: taskId });
      showToast('Task deleted', 'info');
    } catch (error: any) {
      showToast(`Failed to delete task: ${error.message}`, 'error');
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
      showToast('Task updated! 📝', 'success');
    } catch (error: any) {
      showToast(`Failed to update task: ${error.message}`, 'error');
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
    <div className="container main">
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

      {/* Enhanced Search and Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gap: 12 }}>
          {/* Primary Filter Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 12, alignItems: "center" }}>
            <input 
              className="input" 
              placeholder="Search tasks, descriptions, tags..."
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
              <option value="created_at">Sort by Created</option>
              <option value="due_date">Sort by Due Date</option>
            </select>
            {tasks.length > 0 && (
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, whiteSpace: "nowrap" }}>
                <input 
                  type="checkbox" 
                  checked={selectedTasks.size === tasks.length}
                  onChange={handleSelectAll}
                />
                Select All
              </label>
            )}
            <button 
              className="btn"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              🔄 Refresh
            </button>
          </div>

          {/* Secondary Filter Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, paddingTop: 8, borderTop: "1px solid #e5e7eb" }}>
            <select 
              className="input"
              onChange={e => setTaskFilters({ category_id: e.target.value || undefined })}
              defaultValue=""
            >
              <option value="">All Categories</option>
              <option value="work">💼 Work</option>
              <option value="personal">👤 Personal</option>
              <option value="health">🏃 Health</option>
              <option value="learning">📚 Learning</option>
              <option value="habits">🔄 Habits</option>
            </select>
            
            <select 
              className="input"
              onChange={e => {
                const value = e.target.value;
                if (value === 'overdue') {
                  // Filter for overdue tasks
                } else if (value === 'due_today') {
                  // Filter for due today
                } else if (value === 'due_week') {
                  // Filter for due this week
                }
              }}
              defaultValue=""
            >
              <option value="">All Due Dates</option>
              <option value="overdue">⚠️ Overdue</option>
              <option value="due_today">📅 Due Today</option>
              <option value="due_week">🗓️ Due This Week</option>
              <option value="no_due_date">➖ No Due Date</option>
            </select>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>XP Range:</span>
              <input 
                type="number" 
                className="input" 
                placeholder="Min" 
                style={{ width: 70 }}
                onChange={e => {
                  // Add XP range filtering logic
                }}
              />
              <span style={{ color: "#64748b" }}>-</span>
              <input 
                type="number" 
                className="input" 
                placeholder="Max" 
                style={{ width: 70 }}
                onChange={e => {
                  // Add XP range filtering logic
                }}
              />
            </div>

            <button 
              className="btn"
              onClick={() => {
                setTaskFilters({ 
                  search: '', 
                  priority: undefined, 
                  sort: 'priority',
                  category_id: undefined 
                });
                showToast('Filters cleared', 'info');
              }}
              style={{ fontSize: 12 }}
            >
              🧹 Clear Filters
            </button>
          </div>
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
              const isSelected = selectedTasks.has(task.task_id);

              // Due date status
              const now = new Date();
              const dueDate = task.due_date ? new Date(task.due_date) : null;
              const isOverdue = dueDate && dueDate < now;
              const isDueToday = dueDate && dueDate.toDateString() === now.toDateString();
              const isDueSoon = dueDate && dueDate > now && dueDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

              // Category info
              const categories = {
                1: { name: "Work", icon: "💼", color: "#3b82f6" },
                2: { name: "Personal", icon: "👤", color: "#22c55e" },
                3: { name: "Health", icon: "🏃", color: "#f59e0b" },
                4: { name: "Learning", icon: "📚", color: "#8b5cf6" },
                5: { name: "Habits", icon: "🔄", color: "#ef4444" }
              };
              const category = task.category_id ? categories[task.category_id] : null;

              // Parse tags
              const tags = task.tags ? task.tags.split(',').map(t => t.trim()).filter(t => t) : [];

              return (
                <div 
                  key={task.task_id}
                  style={{
                    background: priority.bg,
                    border: `2px solid ${isSelected ? '#2563eb' : priority.accent}`,
                    borderRadius: 12,
                    padding: 16,
                    transition: "all 0.2s ease",
                    position: "relative",
                    boxShadow: isSelected ? "0 4px 12px rgba(37, 99, 235, 0.15)" : "0 1px 3px rgba(0, 0, 0, 0.1)"
                  }}
                >
                  {/* Selection Checkbox */}
                  <div style={{ position: "absolute", top: 8, left: 8 }}>
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectTask(task.task_id)}
                      style={{ transform: "scale(1.2)" }}
                    />
                  </div>

                  {editingTask === task.task_id ? (
                    /* Enhanced Edit Form */
                    <form onSubmit={handleUpdateTask} style={{ display: "grid", gap: 12, paddingLeft: 24 }}>
                      <input 
                        className="input" 
                        value={editForm.title}
                        onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                        required
                        style={{ fontSize: 14 }}
                      />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <select 
                          className="input" 
                          value={editForm.priority}
                          onChange={e => setEditForm(prev => ({ ...prev, priority: Number(e.target.value) }))}
                          style={{ fontSize: 12 }}
                        >
                          <option value={1}>🟢 Low</option>
                          <option value={2}>🟡 Normal</option>
                          <option value={3}>🟠 High</option>
                          <option value={4}>🔴 Critical</option>
                        </select>
                        <select 
                          className="input"
                          value={editForm.category_id || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, category_id: e.target.value ? Number(e.target.value) : null }))}
                          style={{ fontSize: 12 }}
                        >
                          <option value="">No Category</option>
                          <option value={1}>💼 Work</option>
                          <option value={2}>👤 Personal</option>
                          <option value={3}>🏃 Health</option>
                          <option value={4}>📚 Learning</option>
                          <option value={5}>🔄 Habits</option>
                        </select>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 8 }}>
                        <input 
                          className="input" 
                          type="date"
                          value={editForm.due_date}
                          onChange={e => setEditForm(prev => ({ ...prev, due_date: e.target.value }))}
                          style={{ fontSize: 12 }}
                        />
                        <input 
                          className="input" 
                          type="time"
                          value={editForm.due_time}
                          onChange={e => setEditForm(prev => ({ ...prev, due_time: e.target.value }))}
                          style={{ fontSize: 12 }}
                        />
                      </div>
                      <textarea 
                        className="input" 
                        value={editForm.description}
                        onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Description..."
                        style={{ fontSize: 12, minHeight: 50, resize: "vertical" }}
                      />
                      <input 
                        className="input" 
                        value={editForm.tags}
                        onChange={e => setEditForm(prev => ({ ...prev, tags: e.target.value }))}
                        placeholder="Tags (comma separated)..."
                        style={{ fontSize: 12 }}
                      />
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="submit" className="btn primary" style={{ fontSize: 11, padding: "4px 8px" }}>
                          Save
                        </button>
                        <button type="button" className="btn" onClick={() => setEditingTask(null)} style={{ fontSize: 11, padding: "4px 8px" }}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Enhanced Task Display */
                    <div style={{ paddingLeft: 24 }}>
                      {/* Header Row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ 
                            fontSize: 11, 
                            fontWeight: 600, 
                            color: priority.text,
                            padding: "2px 6px",
                            background: priority.accent,
                            borderRadius: 4
                          }}>
                            {priority.label}
                          </span>
                          {category && (
                            <span style={{ 
                              fontSize: 10, 
                              color: "white",
                              background: category.color,
                              padding: "2px 6px",
                              borderRadius: 4,
                              fontWeight: 500
                            }}>
                              {category.icon} {category.name}
                            </span>
                          )}
                          {isOverdue && (
                            <span style={{ 
                              fontSize: 10, 
                              color: "#dc2626",
                              background: "#fef2f2",
                              border: "1px solid #fecaca",
                              padding: "2px 6px",
                              borderRadius: 4,
                              fontWeight: 600
                            }}>
                              ⚠️ OVERDUE
                            </span>
                          )}
                          {isDueToday && (
                            <span style={{ 
                              fontSize: 10, 
                              color: "#f59e0b",
                              background: "#fef3c7",
                              border: "1px solid #fde68a",
                              padding: "2px 6px",
                              borderRadius: 4,
                              fontWeight: 600
                            }}>
                              📅 DUE TODAY
                            </span>
                          )}
                          {isDueSoon && (
                            <span style={{ 
                              fontSize: 10, 
                              color: "#2563eb",
                              background: "#eff6ff",
                              border: "1px solid #bfdbfe",
                              padding: "2px 6px",
                              borderRadius: 4,
                              fontWeight: 500
                            }}>
                              🗓️ DUE SOON
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          {(task.xp || task.xp_reward) && (
                            <span style={{ fontSize: 10, color: priority.text, background: priority.accent, padding: "1px 4px", borderRadius: 3 }}>
                              +{task.xp || task.xp_reward} XP
                            </span>
                          )}
                          {(task.coins || task.coin_reward) && (
                            <span style={{ fontSize: 10, color: priority.text, background: priority.accent, padding: "1px 4px", borderRadius: 3 }}>
                              +{task.coins || task.coin_reward} 🪙
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Task Title */}
                      <h4 style={{ margin: "0 0 6px 0", fontSize: 16, fontWeight: 600, color: priority.text, lineHeight: 1.3 }}>
                        {task.title}
                      </h4>
                      
                      {/* Description */}
                      {task.description && (
                        <p style={{ margin: "0 0 8px 0", fontSize: 12, color: priority.text, opacity: 0.8, lineHeight: 1.4 }}>
                          {task.description}
                        </p>
                      )}

                      {/* Task Meta Info */}
                      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8, fontSize: 11, color: priority.text, opacity: 0.7 }}>
                        {task.due_date && (
                          <span>📅 {new Date(task.due_date).toLocaleDateString()}{task.due_time && ` at ${task.due_time}`}</span>
                        )}
                        {task.estimated_hours > 0 && (
                          <span>⏱️ {task.estimated_hours}h</span>
                        )}
                      </div>

                      {/* Tags */}
                      {tags.length > 0 && (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                          {tags.map((tag, idx) => (
                            <span 
                              key={idx}
                              style={{ 
                                fontSize: 9, 
                                color: priority.text,
                                background: "rgba(255, 255, 255, 0.6)",
                                border: `1px solid ${priority.accent}`,
                                padding: "1px 4px",
                                borderRadius: 3,
                                fontWeight: 500
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                        <button 
                          onClick={() => handleCompleteTask(task.task_id)}
                          disabled={isCompleting}
                          className="btn"
                          style={{ 
                            fontSize: 11, 
                            padding: "4px 8px", 
                            background: "#059669", 
                            color: "white",
                            border: "none"
                          }}
                        >
                          ✓ Complete
                        </button>
                        <button 
                          onClick={() => handleEditTask(task)}
                          className="btn"
                          style={{ 
                            fontSize: 11, 
                            padding: "4px 8px",
                            background: "#2563eb",
                            color: "white",
                            border: "none"
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={() => {
                            // Duplicate task functionality
                            setNewTask({
                              title: `${task.title} (Copy)`,
                              description: task.description || '',
                              priority: task.priority,
                              xp: task.xp || task.xp_reward || 0,
                              coins: task.coins || task.coin_reward || 0,
                              due_date: '',
                              due_time: '',
                              estimated_hours: task.estimated_hours || 0,
                              tags: task.tags || '',
                              category_id: task.category_id || null,
                              notes: ''
                            });
                            setShowCreateForm(true);
                            showToast('Task copied to form', 'info');
                          }}
                          className="btn"
                          style={{ 
                            fontSize: 11, 
                            padding: "4px 8px",
                            background: "#8b5cf6",
                            color: "white",
                            border: "none"
                          }}
                        >
                          📋 Copy
                        </button>
                        <button 
                          onClick={() => handleDeleteTask(task.task_id)}
                          disabled={isDeleting}
                          className="btn"
                          style={{ 
                            fontSize: 11, 
                            padding: "4px 8px",
                            background: "#dc2626",
                            color: "white",
                            border: "none"
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
                        onChange={e => setEditForm(prev => ({ ...prev, priority: Number(e.target.value) }))}
                        style={{ fontSize: 12 }}
                      >
                        <option value={1}>🟢 Low</option>
                        <option value={2}>🟡 Normal</option>
                        <option value={3}>🟠 High</option>
                        <option value={4}>🔴 Critical</option>
                      </select>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="submit" className="btn primary" style={{ fontSize: 11, padding: "4px 8px" }}>
                          Save
                        </button>
                        <button type="button" className="btn" onClick={cancelEdit} style={{ fontSize: 11, padding: "4px 8px" }}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Task Display */
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <span style={{ 
                          fontSize: 11, 
                          fontWeight: 600, 
                          color: priority.text,
                          padding: "2px 6px",
                          background: priority.accent,
                          borderRadius: 4
                        }}>
                          {priority.label}
                        </span>
                        <div style={{ display: "flex", gap: 4 }}>
                          {(task.xp || task.xp_reward) && (
                            <span style={{ 
                              fontSize: 10, 
                              color: priority.text, 
                              background: priority.accent, 
                              padding: "1px 4px", 
                              borderRadius: 3 
                            }}>
                              +{task.xp || task.xp_reward} XP
                            </span>
                          )}
                          {(task.coins || task.coin_reward) && (
                            <span style={{ 
                              fontSize: 10, 
                              color: priority.text, 
                              background: priority.accent, 
                              padding: "1px 4px", 
                              borderRadius: 3 
                            }}>
                              +{task.coins || task.coin_reward} 🪙
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <h4 style={{ margin: "0 0 6px 0", fontSize: 16, fontWeight: 600, color: priority.text, lineHeight: 1.3 }}>
                        {task.title}
                      </h4>
                      
                      {task.description && (
                        <p style={{ margin: "0 0 12px 0", fontSize: 12, color: priority.text, opacity: 0.8, lineHeight: 1.4 }}>
                          {task.description}
                        </p>
                      )}
                      
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                          onClick={() => handleEditTask(task)}
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