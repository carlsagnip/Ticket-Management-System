import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useConfirm } from "./ConfirmProvider";
import { useToast } from "./ui/use-toast";
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
  const { confirm, alert } = useConfirm();
  const { toast } = useToast();
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
    const officerName = newOfficerName.trim();
    if (!officerName) return;

    setError("");
    try {
      const { error } = await supabase
        .from("officers")
        .insert([{ name: officerName, is_active: true }]);

      if (error) {
        if (error.code === "23505") {
          setError("An officer with this name already exists");
          toast({
            title: "Error",
            description: "An officer with this name already exists",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Officer Added",
        description: `Officer "${officerName}" has been added successfully.`,
        variant: "success"
      });
      setNewOfficerName("");
      fetchOfficers();
    } catch (error) {
      console.error("Error adding officer:", error);
      setError("Failed to add officer");
      toast({
        title: "Error",
        description: "Failed to add officer",
        variant: "destructive"
      });
    }
  };

  const handleUpdateOfficer = async (id) => {
    const updatedName = editName.trim();
    if (!updatedName) return;

    setError("");
    try {
      const { error } = await supabase
        .from("officers")
        .update({ name: updatedName })
        .eq("id", id);

      if (error) {
        if (error.code === "23505") {
          setError("An officer with this name already exists");
          toast({
            title: "Error",
            description: "An officer with this name already exists",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Officer Updated",
        description: `Officer has been renamed to "${updatedName}" successfully.`,
        variant: "success"
      });
      setEditingOfficer(null);
      setEditName("");
      fetchOfficers();
    } catch (error) {
      console.error("Error updating officer:", error);
      setError("Failed to update officer");
      toast({
        title: "Error",
        description: "Failed to update officer",
        variant: "destructive"
      });
    }
  };

  const handleToggleActive = async (officer) => {
    const nextActive = !officer.is_active;
    try {
      const { error } = await supabase
        .from("officers")
        .update({ is_active: nextActive })
        .eq("id", officer.id);

      if (error) throw error;
      toast({
        title: "Officer Status Updated",
        description: `Officer "${officer.name}" is now ${nextActive ? "Active" : "Inactive"}.`,
        variant: "success"
      });
      fetchOfficers();
    } catch (error) {
      console.error("Error toggling officer:", error);
      setError("Failed to update officer status");
      toast({
        title: "Error",
        description: "Failed to update officer status",
        variant: "destructive"
      });
    }
  };

  const handleDeleteOfficer = async (id, name) => {
    const isConfirmed = await confirm({
      title: "Delete Officer",
      message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      isDestructive: true
    });
    if (!isConfirmed) {
      return;
    }

    try {
      const { error } = await supabase.from("officers").delete().eq("id", id);

      if (error) throw error;
      toast({
        title: "Officer Deleted",
        description: `Officer "${name}" has been deleted successfully.`,
        variant: "success"
      });
      fetchOfficers();
    } catch (error) {
      console.error("Error deleting officer:", error);
      setError(
        "Failed to delete officer. It may be in use by existing records.",
      );
      toast({
        title: "Error",
        description: "Failed to delete officer. It may be in use by existing records.",
        variant: "destructive"
      });
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
    const SkeletonStatCard = () => (
      <div className="skeleton-shimmer" style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "1.25rem", border: "1px solid var(--border)", height: "100px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ width: "50%", height: "14px", background: "var(--bg-elevated)", borderRadius: "4px" }}></div>
          <div style={{ width: "32px", height: "32px", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)" }}></div>
        </div>
        <div style={{ width: "30%", height: "24px", background: "var(--bg-elevated)", borderRadius: "4px" }}></div>
      </div>
    );

    const SkeletonRow = () => (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px", gap: "1rem", padding: "1rem", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton-shimmer" style={{ height: "16px", background: "var(--bg-elevated)", borderRadius: "4px" }}></div>
        ))}
      </div>
    );

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", height: "100%" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
        </div>
        <div className="skeleton-shimmer" style={{ height: "80px", background: "white", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}></div>
        <div style={{ flex: 1, background: "white", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
          <div style={{ background: "var(--bg-elevated)", display: "grid", gridTemplateColumns: "1fr 100px 100px", gap: "1rem", padding: "1rem", borderBottom: "1px solid var(--border)" }}>
             {[...Array(3)].map((_, i) => <div key={i} className="skeleton-shimmer" style={{ height: "14px", background: "var(--border)", borderRadius: "4px", width: "70%" }}></div>)}
          </div>
          {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
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
