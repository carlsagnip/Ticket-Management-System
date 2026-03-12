import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  FiUser,
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

function ManageOfficers() {
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newOfficerName, setNewOfficerName] = useState("");
  const [editingOfficer, setEditingOfficer] = useState(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchOfficers();
  }, []);

  const fetchOfficers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("officers")
        .select("*")
        .order("name");

      if (error) throw error;
      setOfficers(data || []);
    } catch (error) {
      console.error("Error fetching officers:", error);
      setError("Failed to load officers");
    } finally {
      setLoading(false);
    }
  };

  const handleAddOfficer = async (e) => {
    e.preventDefault();
    if (!newOfficerName.trim()) return;

    setError("");
    try {
      const { error } = await supabase
        .from("officers")
        .insert([{ name: newOfficerName.trim(), is_active: true }]);

      if (error) {
        if (error.code === "23505") {
          setError("An officer with this name already exists");
        } else {
          throw error;
        }
        return;
      }

      setNewOfficerName("");
      fetchOfficers();
    } catch (error) {
      console.error("Error adding officer:", error);
      setError("Failed to add officer");
    }
  };

  const handleUpdateOfficer = async (id) => {
    if (!editName.trim()) return;

    setError("");
    try {
      const { error } = await supabase
        .from("officers")
        .update({ name: editName.trim() })
        .eq("id", id);

      if (error) {
        if (error.code === "23505") {
          setError("An officer with this name already exists");
        } else {
          throw error;
        }
        return;
      }

      setEditingOfficer(null);
      setEditName("");
      fetchOfficers();
    } catch (error) {
      console.error("Error updating officer:", error);
      setError("Failed to update officer");
    }
  };

  const handleToggleActive = async (officer) => {
    try {
      const { error } = await supabase
        .from("officers")
        .update({ is_active: !officer.is_active })
        .eq("id", officer.id);

      if (error) throw error;
      fetchOfficers();
    } catch (error) {
      console.error("Error toggling officer:", error);
      setError("Failed to update officer status");
    }
  };

  const handleDeleteOfficer = async (id, name) => {
    if (
      !confirm(
        `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase.from("officers").delete().eq("id", id);

      if (error) throw error;
      fetchOfficers();
    } catch (error) {
      console.error("Error deleting officer:", error);
      setError(
        "Failed to delete officer. It may be in use by existing records.",
      );
    }
  };

  const startEdit = (officer) => {
    setEditingOfficer(officer.id);
    setEditName(officer.name);
    setError("");
  };

  const cancelEdit = () => {
    setEditingOfficer(null);
    setEditName("");
    setError("");
  };

  // Calculate statistics
  const stats = {
    total: officers.length,
    active: officers.filter((o) => o.is_active).length,
    inactive: officers.filter((o) => !o.is_active).length,
  };

  // Filter officers based on search
  const filteredOfficers = officers.filter((officer) =>
    officer.name.toLowerCase().includes(searchTerm.toLowerCase()),
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
            <div className="stat-label">Total Officers</div>
            <div className="stat-icon" style={{ background: "#eff6ff" }}>
              <FiUser style={{ color: "#2563eb" }} />
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

      {/* Add New Officer Form */}
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
          Add New Officer
        </h4>
        <form
          onSubmit={handleAddOfficer}
          style={{ display: "flex", gap: "0.75rem" }}
        >
          <input
            type="text"
            className="form-input"
            placeholder="Officer name..."
            value={newOfficerName}
            onChange={(e) => setNewOfficerName(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-success">
            <FiPlus size={18} />
            Add Officer
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
          placeholder="Search officers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ paddingLeft: "2.75rem" }}
        />
      </div>

      {/* Officers Table */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          minHeight: 0,
        }}
      >
        {filteredOfficers.length === 0 ? (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            <FiUser
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
                ? "No officers found matching your search."
                : "No officers created yet. Add one above to get started."}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                <tr>
                  <th>Officer Name</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOfficers.map((officer) => (
                  <tr key={officer.id}>
                    <td>
                      {editingOfficer === officer.id ? (
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
                            color: officer.is_active
                              ? "var(--text-primary)"
                              : "var(--text-muted)",
                            textDecoration: officer.is_active
                              ? "none"
                              : "line-through",
                          }}
                        >
                          {officer.name}
                        </span>
                      )}
                    </td>
                    <td>
                      {editingOfficer === officer.id ? (
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
                          className={`badge ${officer.is_active ? "badge-resolved" : "badge-closed"}`}
                        >
                          {officer.is_active ? (
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
                      {editingOfficer === officer.id ? (
                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            justifyContent: "flex-end",
                          }}
                        >
                          <button
                            className="btn btn-success btn-small"
                            onClick={() => handleUpdateOfficer(officer.id)}
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
                            onClick={() => startEdit(officer)}
                          >
                            <FiEdit2 size={16} />
                            Edit
                          </button>
                          <button
                            className={`btn btn-small ${officer.is_active ? "btn-ghost" : "btn-success"}`}
                            onClick={() => handleToggleActive(officer)}
                          >
                            {officer.is_active ? (
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
                              handleDeleteOfficer(officer.id, officer.name)
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
          <strong>Note:</strong> Only active officers will appear in dropdown
          selections.
        </div>
      </div>
    </div>
  );
}

export default ManageOfficers;
