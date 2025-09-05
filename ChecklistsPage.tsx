// FILE: ChecklistsPage.tsx - Modern React hooks with enhanced functionality
import React, { useState } from "react";
import { useChecklists, useCreateChecklist, useDeleteChecklist, useChecklistItems, useAddChecklistItem, useToggleChecklistItem, useDeleteChecklistItem } from './api-hooks.js';
import { useToast } from "./Toast.js";

// ============================================================================
// TYPES
// ============================================================================
interface ChecklistWithItems {
  checklist_id: number;
  name: string;
  category?: string;
  created_at?: string;
  items?: ChecklistItem[];
}

interface ChecklistItem {
  id: number;
  checklist_id: number;
  text: string;
  done: number;
  position?: number;
}

// ============================================================================
// PROGRESS COMPONENT
// ============================================================================
function ChecklistProgress({ items }: { items: ChecklistItem[] }) {
  const total = items.length;
  const completed = items.filter(item => item.done).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  const getColor = () => {
    if (percentage === 100) return "#22c55e";
    if (percentage >= 75) return "#3b82f6";
    if (percentage >= 50) return "#f59e0b";
    return "#64748b";
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ 
        height: 6, 
        background: "#f1f5f9", 
        borderRadius: 3, 
        overflow: "hidden",
        marginBottom: 4
      }}>
        <div style={{ 
          height: "100%", 
          background: getColor(), 
          width: `${percentage}%`,
          transition: "width 0.3s ease"
        }} />
      </div>
      <div style={{ fontSize: 12, color: "#64748b", display: "flex", justifyContent: "space-between" }}>
        <span>{completed}/{total} completed</span>
        <span>{percentage}%</span>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ChecklistsPage() {
  const addToast = useToast();
  
  // State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [openChecklists, setOpenChecklists] = useState<Set<number>>(new Set());
  
  // API hooks
  const { data: checklists = [], isLoading, error, refetch } = useChecklists();
  const createChecklistMutation = useCreateChecklist();
  const deleteChecklistMutation = useDeleteChecklist();
  
  // Form state
  const [newChecklist, setNewChecklist] = useState({
    name: '',
    category: '',
  });
  
  const [newItemTexts, setNewItemTexts] = useState<Record<number, string>>({});

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  const categories = Array.from(new Set(checklists.map(c => c.category).filter(Boolean)));
  
  const filteredChecklists = checklists.filter(checklist => {
    const matchesSearch = checklist.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || checklist.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const handleCreateChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklist.name.trim()) return;

    try {
      await createChecklistMutation.mutateAsync(newChecklist);
      setNewChecklist({ name: '', category: '' });
      setShowCreateForm(false);
      addToast('Checklist created! 📝', 'success');
    } catch (error: any) {
      addToast(`Failed to create checklist: ${error.message}`, 'error');
    }
  };

  const handleDeleteChecklist = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This will remove all items.`)) return;
    
    try {
      await deleteChecklistMutation.mutateAsync({ id });
      addToast('Checklist deleted', 'info');
    } catch (error: any) {
      addToast(`Failed to delete checklist: ${error.message}`, 'error');
    }
  };

  const toggleChecklist = (id: number) => {
    setOpenChecklists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleDownload = async (checklist: ChecklistWithItems) => {
    try {
      const items = checklist.items || [];
      const content = [
        `# ${checklist.name}`,
        checklist.category ? `Category: ${checklist.category}` : '',
        '',
        ...items.map(item => `- [${item.done ? 'x' : ' '}] ${item.text}`)
      ].filter(Boolean).join('\n');
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${checklist.name.replace(/[^a-z0-9]/gi, '_')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      addToast('Checklist downloaded! 📥', 'success');
    } catch (error: any) {
      addToast(`Download failed: ${error.message}`, 'error');
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="page">
      {/* Header Section */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, color: "#1e293b" }}>📋 Checklists</h2>
            <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
              {filteredChecklists.length} checklists
            </div>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
                Error loading checklists
              </div>
            )}
            <button 
              className="btn primary"
              onClick={() => setShowCreateForm(!showCreateForm)}
              disabled={createChecklistMutation.isPending}
            >
              {showCreateForm ? "Cancel" : "+ New Checklist"}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "end" }}>
          <div>
            <label style={{ fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Search</label>
            <input 
              className="input" 
              placeholder="Search checklists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Category</label>
            <select 
              className="input"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="card" style={{ 
          marginBottom: 16, 
          border: "2px solid #dbeafe",
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)"
        }}>
          <form onSubmit={handleCreateChecklist}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Checklist Name *</label>
                <input 
                  className="input" 
                  placeholder="My awesome checklist..."
                  value={newChecklist.name}
                  onChange={(e) => setNewChecklist(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label style={{ fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Category</label>
                <input 
                  className="input" 
                  placeholder="work, personal, etc."
                  value={newChecklist.category}
                  onChange={(e) => setNewChecklist(prev => ({ ...prev, category: e.target.value }))}
                />
              </div>
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
                disabled={createChecklistMutation.isPending || !newChecklist.name.trim()}
              >
                {createChecklistMutation.isPending ? "Creating..." : "Create Checklist"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Checklists Grid */}
      <div className="card">
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 48, color: "#64748b" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <p>Loading checklists...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: 48, color: "#64748b" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <p>Failed to load checklists</p>
            <button className="btn" onClick={() => refetch()}>Try Again</button>
          </div>
        ) : filteredChecklists.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: "#64748b" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
            <h3 style={{ color: "#374151", marginBottom: 8 }}>
              {searchQuery || selectedCategory !== "all" ? "No matching checklists" : "No checklists yet"}
            </h3>
            <p>{searchQuery || selectedCategory !== "all" ? "Try adjusting your filters" : "Create your first checklist to get started!"}</p>
            {(!searchQuery && selectedCategory === "all") && (
              <button 
                className="btn primary"
                onClick={() => setShowCreateForm(true)}
                style={{ marginTop: 16 }}
              >
                + Create Checklist
              </button>
            )}
          </div>
        ) : (
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", 
            gap: 16 
          }}>
            {filteredChecklists.map(checklist => {
              const isOpen = openChecklists.has(checklist.checklist_id);
              
              return (
                <ChecklistCard 
                  key={checklist.checklist_id}
                  checklist={checklist}
                  isOpen={isOpen}
                  onToggle={() => toggleChecklist(checklist.checklist_id)}
                  onDelete={() => handleDeleteChecklist(checklist.checklist_id, checklist.name)}
                  onDownload={() => handleDownload(checklist)}
                  newItemText={newItemTexts[checklist.checklist_id] || ''}
                  onNewItemTextChange={(text) => setNewItemTexts(prev => ({ ...prev, [checklist.checklist_id]: text }))}
                  addToast={addToast}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CHECKLIST CARD COMPONENT
// ============================================================================
function ChecklistCard({ 
  checklist, 
  isOpen, 
  onToggle, 
  onDelete, 
  onDownload,
  newItemText,
  onNewItemTextChange,
  addToast
}: {
  checklist: ChecklistWithItems;
  isOpen: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onDownload: () => void;
  newItemText: string;
  onNewItemTextChange: (text: string) => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const { data: items = [], refetch: refetchItems } = useChecklistItems(checklist.checklist_id, isOpen);
  const addItemMutation = useAddChecklistItem();
  const toggleItemMutation = useToggleChecklistItem();
  const deleteItemMutation = useDeleteChecklistItem();

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;

    try {
      await addItemMutation.mutateAsync({
        checklist_id: checklist.checklist_id,
        text: newItemText.trim()
      });
      onNewItemTextChange('');
      addToast('Item added! ✅', 'success');
    } catch (error: any) {
      addToast(`Failed to add item: ${error.message}`, 'error');
    }
  };

  const handleToggleItem = async (itemId: number, currentDone: number) => {
    try {
      await toggleItemMutation.mutateAsync({
        checklist_id: checklist.checklist_id,
        item_id: itemId,
        done: currentDone ? 0 : 1
      });
    } catch (error: any) {
      addToast(`Failed to toggle item: ${error.message}`, 'error');
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    try {
      await deleteItemMutation.mutateAsync({
        checklist_id: checklist.checklist_id,
        item_id: itemId
      });
      addToast('Item deleted', 'info');
    } catch (error: any) {
      addToast(`Failed to delete item: ${error.message}`, 'error');
    }
  };

  return (
    <div style={{
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: 12,
      padding: 16,
      transition: "all 0.2s ease",
      boxShadow: isOpen ? "0 4px 6px -1px rgba(0, 0, 0, 0.1)" : "none"
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: 0, color: "#1e293b", fontSize: 16, marginBottom: 4 }}>
            {checklist.name}
          </h4>
          {checklist.category && (
            <span style={{ 
              fontSize: 12, 
              color: "#64748b", 
              background: "#f1f5f9",
              padding: "2px 6px",
              borderRadius: 4
            }}>
              {checklist.category}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button 
            className="btn"
            onClick={onToggle}
            style={{ fontSize: 12, padding: "4px 8px" }}
          >
            {isOpen ? "▼" : "▶"}
          </button>
          <button 
            className="btn"
            onClick={onDownload}
            style={{ fontSize: 12, padding: "4px 8px" }}
            title="Download as text file"
          >
            📥
          </button>
          <button 
            className="btn"
            onClick={onDelete}
            style={{ fontSize: 12, padding: "4px 8px", background: "#fef2f2", color: "#dc2626" }}
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Progress */}
      <ChecklistProgress items={items} />

      {/* Items (when open) */}
      {isOpen && (
        <div style={{ marginTop: 12 }}>
          {/* Add Item Form */}
          <form onSubmit={handleAddItem} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input 
                className="input"
                placeholder="Add new item..."
                value={newItemText}
                onChange={(e) => onNewItemTextChange(e.target.value)}
                style={{ flex: 1, fontSize: 14 }}
              />
              <button 
                type="submit" 
                className="btn primary"
                disabled={addItemMutation.isPending || !newItemText.trim()}
                style={{ fontSize: 12, padding: "6px 12px" }}
              >
                {addItemMutation.isPending ? "..." : "Add"}
              </button>
            </div>
          </form>

          {/* Items List */}
          <div style={{ display: "grid", gap: 8 }}>
            {items.map(item => (
              <div 
                key={item.id}
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 8,
                  padding: 8,
                  background: item.done ? "#f0fdf4" : "#fafafa",
                  borderRadius: 6,
                  border: `1px solid ${item.done ? "#bbf7d0" : "#e5e7eb"}`
                }}
              >
                <input 
                  type="checkbox"
                  checked={!!item.done}
                  onChange={() => handleToggleItem(item.id, item.done)}
                  style={{ margin: 0 }}
                />
                <span style={{ 
                  flex: 1, 
                  fontSize: 14,
                  textDecoration: item.done ? "line-through" : "none",
                  color: item.done ? "#22c55e" : "#374151"
                }}>
                  {item.text}
                </span>
                <button 
                  className="btn"
                  onClick={() => handleDeleteItem(item.id)}
                  style={{ 
                    fontSize: 11, 
                    padding: "2px 6px", 
                    background: "transparent", 
                    color: "#dc2626",
                    border: "none"
                  }}
                  title="Delete item"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}