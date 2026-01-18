import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  FiMapPin,
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

function ManageOffices() {
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newOfficeName, setNewOfficeName] = useState("");
  const [editingOffice, setEditingOffice] = useState(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchOffices();
  }, []);

  const fetchOffices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("offices")
        .select("*")
        .order("name");

      if (error) throw error;
      setOffices(data || []);
    } catch (error) {
      console.error("Error fetching offices:", error);
      setError("Failed to load offices");
    } finally {
      setLoading(false);
    }
  };

  const handleAddOffice = async (e) => {
    e.preventDefault();
    if (!newOfficeName.trim()) return;

    setError("");
    try {
      const { error } = await supabase
        .from("offices")
        .insert([{ name: newOfficeName.trim(), is_active: true }]);

      if (error) {
        if (error.code === "23505") {
          setError("An office with this name already exists");
        } else {
          throw error;
        }
        return;
      }

      setNewOfficeName("");
      fetchOffices();
    } catch (error) {
      console.error("Error adding office:", error);
      setError("Failed to add office");
    }
  };

  const handleUpdateOffice = async (id) => {
    if (!editName.trim()) return;

    setError("");
    try {
      const { error } = await supabase
        .from("offices")
        .update({ name: editName.trim() })
        .eq("id", id);

      if (error) {
        if (error.code === "23505") {
          setError("An office with this name already exists");
        } else {
          throw error;
        }
        return;
      }

      setEditingOffice(null);
      setEditName("");
      fetchOffices();
    } catch (error) {
      console.error("Error updating office:", error);
      setError("Failed to update office");
    }
  };

  const handleToggleActive = async (office) => {
    try {
      const { error } = await supabase
        .from("offices")
        .update({ is_active: !office.is_active })
        .eq("id", office.id);

      if (error) throw error;
      fetchOffices();
    } catch (error) {
      console.error("Error toggling office:", error);
      setError("Failed to update office status");
    }
  };

  const handleDeleteOffice = async (id, name) => {
    if (
      !confirm(
        `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase.from("offices").delete().eq("id", id);

      if (error) throw error;
      fetchOffices();
    } catch (error) {
      console.error("Error deleting office:", error);
      setError(
        "Failed to delete office. It may be in use by existing tickets.",
      );
    }
  };

  const startEdit = (office) => {
    setEditingOffice(office.id);
    setEditName(office.name);
    setError("");
  };

  const cancelEdit = () => {
    setEditingOffice(null);
    setEditName("");
    setError("");
  };

  // Calculate statistics
  const stats = {
    total: offices.length,
    active: offices.filter((o) => o.is_active).length,
    inactive: offices.filter((o) => !o.is_active).length,
  };

  // Filter offices based on search
  const filteredOffices = offices.filter((office) =>
    office.name.toLowerCase().includes(searchTerm.toLowerCase()),
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
            <div className="stat-label">Total Offices</div>
            <div className="stat-icon" style={{ background: "#eff6ff" }}>
              <FiMapPin style={{ color: "#2563eb" }} />
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

      {/* Add New Office Form */}
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
          Add New Office
        </h4>
        <form
          onSubmit={handleAddOffice}
          style={{ display: "flex", gap: "0.75rem" }}
        >
          <input
            type="text"
            className="form-input"
            placeholder="Office name..."
            value={newOfficeName}
            onChange={(e) => setNewOfficeName(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-success">
            <FiPlus size={18} />
            Add Office
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
          placeholder="Search offices..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ paddingLeft: "2.75rem" }}
        />
      </div>

      {/* Offices Table */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          minHeight: 0,
        }}
      >
        {filteredOffices.length === 0 ? (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            <FiMapPin
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
                ? "No offices found matching your search."
                : "No offices created yet. Add one above to get started."}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                <tr>
                  <th>Office Name</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOffices.map((office) => (
                  <tr key={office.id}>
                    <td>
                      {editingOffice === office.id ? (
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
                            color: office.is_active
                              ? "var(--text-primary)"
                              : "var(--text-muted)",
                            textDecoration: office.is_active
                              ? "none"
                              : "line-through",
                          }}
                        >
                          {office.name}
                        </span>
                      )}
                    </td>
                    <td>
                      {editingOffice === office.id ? (
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
                          className={`badge ${office.is_active ? "badge-resolved" : "badge-closed"}`}
                        >
                          {office.is_active ? (
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
                      {editingOffice === office.id ? (
                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            justifyContent: "flex-end",
                          }}
                        >
                          <button
                            className="btn btn-success btn-small"
                            onClick={() => handleUpdateOffice(office.id)}
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
                            onClick={() => startEdit(office)}
                          >
                            <FiEdit2 size={16} />
                            Edit
                          </button>
                          <button
                            className={`btn btn-small ${office.is_active ? "btn-ghost" : "btn-success"}`}
                            onClick={() => handleToggleActive(office)}
                          >
                            {office.is_active ? (
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
                              handleDeleteOffice(office.id, office.name)
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
          <strong>Note:</strong> Only active offices will appear in the ticket
          submission form dropdown.
        </div>
      </div>
    </div>
  );
}

export default ManageOffices;
