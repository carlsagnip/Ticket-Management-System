import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  FiTag,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiX,
  FiToggleLeft,
  FiToggleRight,
  FiAlertCircle,
  FiInfo,
  FiSearch,
} from "react-icons/fi";

function ManageCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setError("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setError("");
    try {
      const { error } = await supabase
        .from("categories")
        .insert([{ name: newCategoryName.trim(), is_active: true }]);

      if (error) {
        if (error.code === "23505") {
          setError("A category with this name already exists");
        } else {
          throw error;
        }
        return;
      }

      setNewCategoryName("");
      fetchCategories();
    } catch (error) {
      console.error("Error adding category:", error);
      setError("Failed to add category");
    }
  };

  const handleUpdateCategory = async (id) => {
    if (!editName.trim()) return;

    setError("");
    try {
      const { error } = await supabase
        .from("categories")
        .update({ name: editName.trim() })
        .eq("id", id);

      if (error) {
        if (error.code === "23505") {
          setError("A category with this name already exists");
        } else {
          throw error;
        }
        return;
      }

      setEditingCategory(null);
      setEditName("");
      fetchCategories();
    } catch (error) {
      console.error("Error updating category:", error);
      setError("Failed to update category");
    }
  };

  const handleToggleActive = async (category) => {
    try {
      const { error } = await supabase
        .from("categories")
        .update({ is_active: !category.is_active })
        .eq("id", category.id);

      if (error) throw error;
      fetchCategories();
    } catch (error) {
      console.error("Error toggling category:", error);
      setError("Failed to update category status");
    }
  };

  const handleDeleteCategory = async (id, name) => {
    if (
      !confirm(
        `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);

      if (error) throw error;
      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      setError(
        "Failed to delete category. It may be in use by existing tickets.",
      );
    }
  };

  const startEdit = (category) => {
    setEditingCategory(category.id);
    setEditName(category.name);
    setError("");
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setEditName("");
    setError("");
  };

  // Calculate statistics
  const stats = {
    total: categories.length,
    active: categories.filter((c) => c.is_active).length,
    inactive: categories.filter((c) => !c.is_active).length,
  };

  // Filter categories based on search
  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      {/* Statistics Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
          flexShrink: 0,
        }}
      >
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-label">Total Categories</div>
            <div className="stat-icon" style={{ background: "#eff6ff" }}>
              <FiTag style={{ color: "#2563eb" }} />
            </div>
          </div>
          <div className="stat-value" style={{ color: "#2563eb" }}>
            {stats.total}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-label">Active</div>
            <div className="stat-icon" style={{ background: "#d1fae5" }}>
              <FiToggleRight style={{ color: "#065f46" }} />
            </div>
          </div>
          <div className="stat-value" style={{ color: "#065f46" }}>
            {stats.active}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-label">Inactive</div>
            <div className="stat-icon" style={{ background: "#e2e8f0" }}>
              <FiToggleLeft style={{ color: "#475569" }} />
            </div>
          </div>
          <div className="stat-value" style={{ color: "#475569" }}>
            {stats.inactive}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          className="alert alert-error"
          style={{ marginBottom: "1rem", flexShrink: 0 }}
        >
          <FiAlertCircle />
          {error}
        </div>
      )}

      {/* Add New Category Form */}
      <div className="card" style={{ marginBottom: "1rem", flexShrink: 0 }}>
        <h4
          style={{
            marginBottom: "1rem",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <FiPlus size={20} />
          Add New Category
        </h4>
        <form
          onSubmit={handleAddCategory}
          style={{ display: "flex", gap: "0.75rem" }}
        >
          <input
            type="text"
            className="form-input"
            placeholder="Category name..."
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-success">
            <FiPlus size={18} />
            Add Category
          </button>
        </form>
      </div>

      {/* Search */}
      <div
        style={{ marginBottom: "1rem", flexShrink: 0, position: "relative" }}
      >
        <FiSearch
          style={{
            position: "absolute",
            left: "1rem",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-muted)",
            width: "18px",
            height: "18px",
          }}
        />
        <input
          type="text"
          className="form-input"
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ paddingLeft: "2.75rem" }}
        />
      </div>

      {/* Categories Table */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          minHeight: 0,
        }}
      >
        {filteredCategories.length === 0 ? (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            <FiTag
              style={{
                width: "64px",
                height: "64px",
                margin: "0 auto 1rem",
                color: "var(--text-muted)",
                opacity: 0.5,
              }}
            />
            <p style={{ fontSize: "1.125rem", fontWeight: "600" }}>
              {searchTerm
                ? "No categories found matching your search."
                : "No categories created yet. Add one above to get started."}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                <tr>
                  <th>Category Name</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((category) => (
                  <tr key={category.id}>
                    <td>
                      {editingCategory === category.id ? (
                        <input
                          type="text"
                          className="form-input"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          autoFocus
                          style={{ margin: 0 }}
                        />
                      ) : (
                        <span
                          style={{
                            fontWeight: "600",
                            color: category.is_active
                              ? "var(--text-primary)"
                              : "var(--text-muted)",
                            textDecoration: category.is_active
                              ? "none"
                              : "line-through",
                          }}
                        >
                          {category.name}
                        </span>
                      )}
                    </td>
                    <td>
                      {editingCategory === category.id ? (
                        <span
                          style={{
                            fontSize: "0.875rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          Editing...
                        </span>
                      ) : (
                        <span
                          className={`badge ${category.is_active ? "badge-resolved" : "badge-closed"}`}
                        >
                          {category.is_active ? (
                            <>
                              <FiToggleRight />
                              Active
                            </>
                          ) : (
                            <>
                              <FiToggleLeft />
                              Inactive
                            </>
                          )}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {editingCategory === category.id ? (
                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            justifyContent: "flex-end",
                          }}
                        >
                          <button
                            className="btn btn-success btn-small"
                            onClick={() => handleUpdateCategory(category.id)}
                          >
                            <FiCheck size={16} />
                            Save
                          </button>
                          <button
                            className="btn btn-ghost btn-small"
                            onClick={cancelEdit}
                          >
                            <FiX size={16} />
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            justifyContent: "flex-end",
                          }}
                        >
                          <button
                            className="btn btn-small btn-secondary"
                            onClick={() => startEdit(category)}
                          >
                            <FiEdit2 size={16} />
                            Edit
                          </button>
                          <button
                            className={`btn btn-small ${category.is_active ? "btn-ghost" : "btn-success"}`}
                            onClick={() => handleToggleActive(category)}
                          >
                            {category.is_active ? (
                              <>
                                <FiToggleLeft size={16} />
                                Disable
                              </>
                            ) : (
                              <>
                                <FiToggleRight size={16} />
                                Enable
                              </>
                            )}
                          </button>
                          <button
                            className="btn btn-small btn-danger"
                            onClick={() =>
                              handleDeleteCategory(category.id, category.name)
                            }
                          >
                            <FiTrash2 size={16} />
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Note */}
      <div
        className="alert alert-info"
        style={{ marginTop: "1rem", flexShrink: 0 }}
      >
        <FiInfo />
        <div>
          <strong>Note:</strong> Only active categories will appear in the
          ticket submission form dropdown.
        </div>
      </div>
    </div>
  );
}

export default ManageCategories;
