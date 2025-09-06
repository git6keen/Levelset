// FILE: TasksPageComponents.tsx - UI Components that accept props from useTasksLogic
import React from 'react';

// ============================================================================
// PROGRESS BAR COMPONENT
// ============================================================================
export function ProgressBar({ completed, total, label, color }: { 
  completed: number; 
  total: number; 
  label: string; 
  color: string; 
}) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>{label}</span>
        <span style={{ fontSize: 11, color: "#64748b" }}>
          {completed}/{total} ({percentage}%)
        </span>
      </div>
      <div style={{ 
        width: "100%", 
        height: 6, 
        background: "#f1f5f9", 
        borderRadius: 3,
        overflow: "hidden"
      }}>
        <div 
          style={{ 
            width: `${percentage}%`, 
            height: "100%", 
            background: color,
            transition: "width 0.3s ease",
            borderRadius: 3
          }} 
        />
      </div>
    </div>
  );
}

// ============================================================================
// HEADER COMPONENT
// ============================================================================
export function TasksHeader({ data, state, setters }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, color: "#1f2937", fontSize: 24 }}>Tasks</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 14 }}>
            Manage your tasks and track progress
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button 
            className="btn"
            onClick={() => setters.setShowKeyboardShortcuts(!state.showKeyboardShortcuts)}
            style={{ fontSize: 11, padding: "6px 10px" }}
          >
            ⌨️ Shortcuts
          </button>
          <button 
            className="btn"
            onClick={() => setters.setBulkActionMode(!state.bulkActionMode)}
            style={{ 
              fontSize: 11, 
              padding: "6px 10px",
              background: state.bulkActionMode ? "#dc2626" : "#6b7280",
              color: "white"
            }}
          >
            {state.bulkActionMode ? "Exit Bulk" : "Bulk Actions"}
          </button>
          <button 
            className="btn primary"
            onClick={() => setters.setShowCreateForm(true)}
          >
            + Create Task
          </button>
        </div>
      </div>

      {/* Progress Overview */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
        gap: 16 
      }}>
        <ProgressBar 
          completed={data.MOCK_COMPLETIONS.today.completed} 
          total={data.MOCK_COMPLETIONS.today.total}
          label="Today"
          color="#059669"
        />
        <ProgressBar 
          completed={data.MOCK_COMPLETIONS.week.completed} 
          total={data.MOCK_COMPLETIONS.week.total}
          label="This Week"
          color="#2563eb"
        />
        <ProgressBar 
          completed={data.MOCK_COMPLETIONS.month.completed} 
          total={data.MOCK_COMPLETIONS.month.total}
          label="This Month"
          color="#7c3aed"
        />
        <ProgressBar 
          completed={data.MOCK_COMPLETIONS.year.completed} 
          total={data.MOCK_COMPLETIONS.year.total}
          label="This Year"
          color="#dc2626"
        />
      </div>

      {/* Keyboard Shortcuts Helper */}
      {state.showKeyboardShortcuts && (
        <div style={{ 
          marginTop: 16, 
          padding: 12, 
          background: "#f8fafc", 
          borderRadius: 8,
          border: "1px solid #e2e8f0"
        }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "#374151" }}>
            Keyboard Shortcuts
          </h4>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
            gap: 8,
            fontSize: 11,
            color: "#64748b"
          }}>
            <div><kbd>Ctrl+N</kbd> Create new task</div>
            <div><kbd>Ctrl+F</kbd> Focus search</div>
            <div><kbd>Ctrl+B</kbd> Toggle bulk mode</div>
            <div><kbd>Ctrl+A</kbd> Select all (bulk mode)</div>
            <div><kbd>Esc</kbd> Close dialogs/exit modes</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// BULK ACTIONS BAR
// ============================================================================
export function BulkActionsBar({ data, state, setters, handlers }) {
  if (!state.bulkActionMode) return null;

  return (
    <div className="card" style={{ 
      marginBottom: 16, 
      background: "#fef3c7", 
      border: "1px solid #fbbf24" 
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: "#92400e" }}>
            Bulk Actions Mode - {state.selectedTasks.size} tasks selected
          </span>
          <button 
            className="btn"
            onClick={handlers.handleSelectAll}
            style={{ fontSize: 11, padding: "4px 8px" }}
          >
            {state.selectedTasks.size === data.filteredTasks.length ? "Deselect All" : "Select All"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button 
            className="btn"
            onClick={handlers.handleBulkComplete}
            disabled={state.selectedTasks.size === 0}
            style={{ 
              fontSize: 11, 
              padding: "4px 8px",
              background: "#059669",
              color: "white"
            }}
          >
            ✓ Complete Selected
          </button>
          <button 
            className="btn"
            onClick={handlers.handleBulkDelete}
            disabled={state.selectedTasks.size === 0}
            style={{ 
              fontSize: 11, 
              padding: "4px 8px",
              background: "#dc2626",
              color: "white"
            }}
          >
            🗑️ Delete Selected
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CREATE/EDIT TASK FORM
// ============================================================================
export function TaskForm({ data, state, setters, handlers, mutations }) {
  if (!state.showCreateForm) return null;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <form onSubmit={state.editingTask ? handlers.handleUpdateTask : handlers.handleCreateTask}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: "#1f2937" }}>
            {state.editingTask ? "Edit Task" : "Create New Task"}
          </h3>
          <button 
            type="button" 
            onClick={handlers.resetForm}
            style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}
          >
            ×
          </button>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Title *</label>
            <input 
              className="input"
              placeholder="Task title..."
              value={state.newTask.title}
              onChange={(e) => setters.setNewTask(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>
          
          <div>
            <label style={{ fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Category</label>
            <select 
              className="input"
              value={state.newTask.category_id || ''}
              onChange={(e) => setters.setNewTask(prev => ({ 
                ...prev, 
                category_id: e.target.value ? parseInt(e.target.value) : null 
              }))}
            >
              <option value="">No category</option>
              {Object.entries(data.categories).map(([id, cat]) => (
                <option key={id} value={id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Priority</label>
            <select 
              className="input"
              value={state.newTask.priority}
              onChange={(e) => setters.setNewTask(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
            >
              <option value={1}>🟢 Low</option>
              <option value={2}>🟡 Normal</option>
              <option value={3}>🟠 High</option>
              <option value={4}>🔴 Critical</option>
            </select>
          </div>
          
          <div>
            <label style={{ fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>XP Reward</label>
            <input 
              className="input"
              type="number"
              min="0"
              value={state.newTask.xp}
              onChange={(e) => setters.setNewTask(prev => ({ ...prev, xp: parseInt(e.target.value) || 0 }))}
            />
          </div>
          
          <div>
            <label style={{ fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Coin Reward</label>
            <input 
              className="input"
              type="number"
              min="0"
              value={state.newTask.coins}
              onChange={(e) => setters.setNewTask(prev => ({ ...prev, coins: parseInt(e.target.value) || 0 }))}
            />
          </div>

          <div>
            <label style={{ fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Est. Hours</label>
            <input 
              className="input"
              type="number"
              min="0"
              step="0.5"
              value={state.newTask.estimated_hours}
              onChange={(e) => setters.setNewTask(prev => ({ ...prev, estimated_hours: parseFloat(e.target.value) || 0 }))}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Due Date</label>
            <input 
              className="input"
              type="date"
              value={state.newTask.due_date}
              onChange={(e) => setters.setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
            />
          </div>
          
          <div>
            <label style={{ fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Due Time</label>
            <input 
              className="input"
              type="time"
              value={state.newTask.due_time}
              onChange={(e) => setters.setNewTask(prev => ({ ...prev, due_time: e.target.value }))}
            />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Tags</label>
          <input 
            className="input"
            placeholder="work, urgent, meeting (comma separated)"
            value={state.newTask.tags}
            onChange={(e) => setters.setNewTask(prev => ({ ...prev, tags: e.target.value }))}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Description</label>
          <textarea 
            className="input"
            placeholder="Additional details..."
            rows={2}
            value={state.newTask.description}
            onChange={(e) => setters.setNewTask(prev => ({ ...prev, description: e.target.value }))}
          />
        </div>
        
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button 
            type="button" 
            className="btn"
            onClick={handlers.resetForm}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn primary"
            disabled={mutations.createTaskMutation.isPending || mutations.updateTaskMutation.isPending || !state.newTask.title.trim()}
          >
            {state.editingTask 
              ? (mutations.updateTaskMutation.isPending ? "Updating..." : "Update Task")
              : (mutations.createTaskMutation.isPending ? "Creating..." : "Create Task")
            }
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// FILTERS COMPONENT
// ============================================================================
export function TasksFilters({ data, state, setters, handlers }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: "grid", gap: 12 }}>
        {/* Primary Filter Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 12, alignItems: "center" }}>
          <input 
            className="input" 
            placeholder="Search tasks, descriptions, tags..."
            value={state.taskFilters.search || ''}
            onChange={e => setters.setTaskFilters({ search: e.target.value })}
          />
          <select 
            className="input"
            value={state.taskFilters.priority || ''}
            onChange={e => setters.setTaskFilters({ priority: e.target.value ? parseInt(e.target.value) : null })}
          >
            <option value="">All Priorities</option>
            <option value={1}>🟢 Low</option>
            <option value={2}>🟡 Normal</option>
            <option value={3}>🟠 High</option>
            <option value={4}>🔴 Critical</option>
          </select>
          <select 
            className="input"
            value={state.taskFilters.category || ''}
            onChange={e => setters.setTaskFilters({ category: e.target.value ? parseInt(e.target.value) : null })}
          >
            <option value="">All Categories</option>
            {Object.entries(data.categories).map(([id, cat]) => (
              <option key={id} value={id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
          <button 
            className="btn"
            onClick={handlers.refetch}
            disabled={data.isLoading}
            style={{ fontSize: 11, padding: "8px 12px" }}
          >
            🔄 Refresh
          </button>
          <button 
            className="btn"
            onClick={() => setters.setTaskFilters({})}
            style={{ fontSize: 11, padding: "8px 12px" }}
          >
            Clear
          </button>
        </div>

        {/* Filter Summary */}
        {(state.taskFilters.search || state.taskFilters.priority || state.taskFilters.category) && (
          <div style={{ fontSize: 12, color: "#64748b" }}>
            Showing {data.filteredTasks.length} of {data.tasks.length} tasks
            {state.taskFilters.search && ` matching "${state.taskFilters.search}"`}
            {state.taskFilters.priority && ` with priority ${state.taskFilters.priority}`}
            {state.taskFilters.category && ` in category ${data.categories[state.taskFilters.category]?.name}`}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TASK CARD COMPONENT
// ============================================================================
export function TaskCard({ 
  task, 
  data, 
  state, 
  setters, 
  handlers, 
  mutations,
  utils
}) {
  const priority = {
    1: { bg: "#dcfce7", text: "#166534", accent: "#bbf7d0", label: "🟢 Low" },
    2: { bg: "#fef3c7", text: "#92400e", accent: "#fde68a", label: "🟡 Normal" },
    3: { bg: "#fed7aa", text: "#9a3412", accent: "#fdba74", label: "🟠 High" },
    4: { bg: "#fecaca", text: "#991b1b", accent: "#fca5a5", label: "🔴 Critical" }
  }[task.priority] || { bg: "#f3f4f6", text: "#374151", accent: "#e5e7eb", label: "❓ Unknown" };

  const isSelected = state.selectedTasks.has(task.task_id);
  const category = task.category_id ? data.categories[task.category_id] : null;

  // Due date status
  const now = new Date();
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isOverdue = dueDate && dueDate < now;
  const isDueToday = dueDate && dueDate.toDateString() === now.toDateString();
  const isDueSoon = dueDate && dueDate > now && dueDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const handleTaskSelection = () => {
    const newSelected = new Set(state.selectedTasks);
    if (newSelected.has(task.task_id)) {
      newSelected.delete(task.task_id);
    } else {
      newSelected.add(task.task_id);
    }
    setters.setSelectedTasks(newSelected);
  };

  return (
    <div 
      className="card"
      style={{ 
        background: priority.bg,
        border: `2px solid ${priority.accent}`,
        borderLeft: `6px solid ${priority.text}`,
        position: "relative",
        cursor: state.bulkActionMode ? "pointer" : "default"
      }}
      onClick={state.bulkActionMode ? handleTaskSelection : undefined}
    >
      {/* Bulk Selection Checkbox */}
      {state.bulkActionMode && (
        <div style={{ position: "absolute", top: 8, right: 8, zIndex: 10 }}>
          <input 
            type="checkbox"
            checked={isSelected}
            onChange={() => {}} // Handled by card click
            style={{ transform: "scale(1.2)" }}
          />
        </div>
      )}

      {/* Category Badge */}
      {category && (
        <div style={{ 
          position: "absolute", 
          top: 8, 
          left: 8, 
          background: category.color,
          color: "white",
          padding: "2px 6px",
          borderRadius: 4,
          fontSize: 9,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 2
        }}>
          <span>{category.icon}</span>
          <span>{category.name}</span>
        </div>
      )}

      {/* Due Date Warning */}
      {(isOverdue || isDueToday || isDueSoon) && (
        <div style={{ 
          position: "absolute", 
          top: category ? 32 : 8, 
          left: 8,
          background: isOverdue ? "#dc2626" : isDueToday ? "#f59e0b" : "#2563eb",
          color: "white",
          padding: "2px 6px",
          borderRadius: 4,
          fontSize: 9,
          fontWeight: 600
        }}>
          {isOverdue ? "⚠️ OVERDUE" : isDueToday ? "📅 DUE TODAY" : "⏰ DUE SOON"}
        </div>
      )}

      <div style={{ marginTop: category || isOverdue || isDueToday || isDueSoon ? 24 : 0 }}>
        {/* Task Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ 
              margin: 0, 
              color: priority.text, 
              fontSize: 16, 
              fontWeight: 600,
              lineHeight: 1.2
            }}>
              {task.title}
            </h4>
            <div style={{ 
              fontSize: 10, 
              color: priority.text, 
              opacity: 0.8, 
              marginTop: 2,
              fontWeight: 500
            }}>
              {priority.label} • {task.xp || 0} XP • {task.coins || 0} coins
            </div>
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <p style={{ 
            margin: "8px 0", 
            color: priority.text, 
            fontSize: 13, 
            lineHeight: 1.4,
            opacity: 0.9
          }}>
            {task.description}
          </p>
        )}

        {/* Task Metadata */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8, fontSize: 11, color: priority.text, opacity: 0.7 }}>
          {task.due_date && (
            <span>📅 {new Date(task.due_date).toLocaleDateString()}{task.due_time && ` at ${task.due_time}`}</span>
          )}
          <span>🆔 #{task.task_id}</span>
          {task.created_at && (
            <span>📅 Created {new Date(task.created_at).toLocaleDateString()}</span>
          )}
        </div>
        
        {/* Action Buttons */}
        {!state.bulkActionMode && (
          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            <button 
              onClick={() => handlers.handleCompleteTask(task.task_id)}
              disabled={mutations.completeTaskMutation.isPending}
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
              onClick={() => handlers.handleEditTask(task)}
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
                setters.setNewTask({
                  title: `${task.title} (Copy)`,
                  description: task.description || '',
                  priority: task.priority,
                  xp: task.xp || 0,
                  coins: task.coins || 0,
                  due_date: '',
                  due_time: '',
                  estimated_hours: 0,
                  tags: '',
                  category_id: task.category_id || null,
                  notes: ''
                });
                setters.setShowCreateForm(true);
                utils.showToast('Task copied to form', 'info');
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
              onClick={() => handlers.handleDeleteTask(task.task_id)}
              disabled={mutations.deleteTaskMutation.isPending}
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
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TASKS LIST COMPONENT
// ============================================================================
export function TasksList({ data, state, setters, handlers, mutations, utils }) {
  if (data.isLoading) {
    return (
      <div style={{ textAlign: "center", padding: 48, color: "#64748b" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <p>Loading tasks...</p>
      </div>
    );
  }

  if (data.error) {
    return (
      <div style={{ textAlign: "center", padding: 48, color: "#64748b" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
        <p>Failed to load tasks</p>
        <button className="btn" onClick={handlers.refetch}>Try Again</button>
      </div>
    );
  }

  if (data.filteredTasks.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 48, color: "#64748b" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
        <h3 style={{ color: "#374151", marginBottom: 8 }}>
          {data.tasks.length === 0 ? "No tasks yet" : "No tasks match your filters"}
        </h3>
        <p>
          {data.tasks.length === 0 
            ? "Create your first task to get started!" 
            : "Try adjusting your search or filters"
          }
        </p>
        {data.tasks.length === 0 && (
          <button 
            className="btn primary"
            onClick={() => setters.setShowCreateForm(true)}
            style={{ marginTop: 16 }}
          >
            + Create Task
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ 
      display: "grid", 
      gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", 
      gap: 16 
    }}>
      {data.filteredTasks.map(task => (
        <TaskCard 
          key={task.task_id}
          task={task}
          data={data}
          state={state}
          setters={setters}
          handlers={handlers}
          mutations={mutations}
          utils={utils}
        />
      ))}
    </div>
  );
}

// ============================================================================
// QUICK STATS FOOTER
// ============================================================================
export function QuickStats({ data }) {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", 
        gap: 16,
        textAlign: "center"
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#1f2937" }}>{data.tasks.length}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Total Tasks</div>
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#059669" }}>
            {data.tasks.filter(t => t.completed_at).length}
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Completed</div>
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#dc2626" }}>
            {data.tasks.filter(t => {
              const dueDate = t.due_date ? new Date(t.due_date) : null;
              return dueDate && dueDate < new Date() && !t.completed_at;
            }).length}
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Overdue</div>
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#2563eb" }}>
            {data.tasks.filter(t => t.priority >= 3 && !t.completed_at).length}
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>High Priority</div>
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#7c3aed" }}>
            {data.tasks.reduce((sum, t) => sum + (t.xp || 0), 0)}
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Total XP Available</div>
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#f59e0b" }}>
            {data.tasks.reduce((sum, t) => sum + (t.coins || 0), 0)}
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Total Coins Available</div>
        </div>
      </div>
    </div>
  );
}