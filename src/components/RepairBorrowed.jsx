import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import {
  FiPlus,
  FiX,
  FiTool,
  FiMapPin,
  FiUser,
  FiTrash2,
  FiInbox,
  FiAlertCircle,
  FiCheckCircle,
  FiMonitor,
  FiPrinter,
  FiCpu,
  FiHardDrive,
  FiCamera,
  FiTag,
  FiCalendar,
  FiEdit2,
} from "react-icons/fi";

// ── Unit types available for selection ────────────────────────────────────────
const UNIT_TYPES = [
  { id: "computer",   label: "Computer",   icon: <FiCpu size={18} /> },
  { id: "laptop",     label: "Laptop",     icon: <FiHardDrive size={18} /> },
  { id: "printer",    label: "Printer",    icon: <FiPrinter size={18} /> },
  { id: "monitor",    label: "Monitor",    icon: <FiMonitor size={18} /> },
  { id: "scanner",    label: "Scanner",    icon: <FiCamera size={18} /> },
  { id: "projector",  label: "Projector",  icon: <FiTool size={18} /> },
  { id: "ups",        label: "UPS",        icon: <FiTool size={18} /> },
  { id: "keyboard",   label: "Keyboard",   icon: <FiTool size={18} /> },
  { id: "mouse",      label: "Mouse",      icon: <FiTool size={18} /> },
  { id: "avr",        label: "AVR",        icon: <FiTool size={18} /> },
  { id: "whitescreen",label: "White Screen", icon: <FiMonitor size={18} /> },
];

const EMPTY_FORM = {
  officeId: "",
  category: "",
  name: "",
  date: "",
  model: "",
  description: "",
};

function RepairBorrowed() {
  const [records, setRecords]           = useState([]);
  const [offices, setOffices]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState("");
  const [formData, setFormData]         = useState(EMPTY_FORM);
  const [formErrors, setFormErrors]     = useState({});
  const [selectedUnits, setSelectedUnits] = useState({});
  // ── View / edit state ──
  const [viewRecord, setViewRecord]     = useState(null);
  const [editData, setEditData]         = useState({});
  const [editUnits, setEditUnits]       = useState({});
  const [editSaving, setEditSaving]     = useState(false);
  const [editError, setEditError]       = useState("");
  const [editDirty, setEditDirty]       = useState(false);
  const [lastSaved, setLastSaved]       = useState(null);
  const [statusConfirmModal, setStatusConfirmModal] = useState(null);

  useEffect(() => {
    fetchOffices();
    fetchRecords();
  }, []);

  // ── Data fetching ────────────────────────────────────────────────────────────
  const fetchOffices = async () => {
    try {
      const { data, error } = await supabase
        .from("offices")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      setOffices(data || []);
    } catch (err) {
      console.error("Error fetching offices:", err);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("repair_borrowed")
        .select("*, offices(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error("Error fetching repair/borrowed records:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Unit type button handler ──────────────────────────────────────────────────
  const handleUnitClick = (unitId) => {
    setSelectedUnits((prev) => ({
      ...prev,
      [unitId]: (prev[unitId] || 0) + 1,
    }));
  };

  const handleUnitRemove = (unitId) => {
    setSelectedUnits((prev) => {
      const next = { ...prev };
      if (next[unitId] > 1) {
        next[unitId] -= 1;
      } else {
        delete next[unitId];
      }
      return next;
    });
  };

  // ── Form helpers ─────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.officeId) errs.officeId = "Please select an office";
    if (!formData.category) errs.category = "Please select a category";
    if (Object.keys(selectedUnits).length === 0)
      errs.units = "Please select at least one unit type";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setError("");

    try {
      // Build units array: [{ type, quantity }]
      const units = Object.entries(selectedUnits).map(([type, quantity]) => ({
        type,
        quantity,
      }));

      const { error: insertError } = await supabase
        .from("repair_borrowed")
        .insert([
          {
            office_id:   formData.officeId || null,
            category:    formData.category || null,
            name:        formData.name.trim() || null,
            units,
            date:        formData.date || new Date().toISOString(),
            model:       formData.model.trim() || null,
            description: formData.description.trim() || null,
            status:      formData.category === "Borrowed" ? "Borrowed" : "Repairing",
          },
        ]);

      if (insertError) throw insertError;

      closeModal();
      fetchRecords();
    } catch (err) {
      console.error("Error saving record:", err);
      setError("Failed to save record. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this record? This cannot be undone.")) return;
    try {
      const { error: delErr } = await supabase
        .from("repair_borrowed")
        .delete()
        .eq("id", id);
      if (delErr) throw delErr;
      fetchRecords();
    } catch (err) {
      console.error("Error deleting record:", err);
    }
  };

  const openModal = () => {
    setFormData(EMPTY_FORM);
    setSelectedUnits({});
    setFormErrors({});
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData(EMPTY_FORM);
    setSelectedUnits({});
    setFormErrors({});
    setError("");
  };

  // ── View / Edit handlers ──────────────────────────────────────────────────────
  const openViewModal = (rec) => {
    setViewRecord(rec);
    setEditData({
      officeId:    rec.office_id   || "",
      category:    rec.category    || "",
      name:        rec.name        || "",
      date:        rec.date        || "",
      model:       rec.model       || "",
      description: rec.description || "",
      status:      rec.status      || "",
    });
    // Convert units array to {id: qty} map
    const unitMap = {};
    (rec.units || []).forEach((u) => { unitMap[u.type] = u.quantity; });
    setEditUnits(unitMap);
    setEditError("");
  };

  const closeViewModal = () => {
    setViewRecord(null);
    setEditData({});
    setEditUnits({});
    setEditError("");
    setEditDirty(false);
    setLastSaved(null);
    setStatusConfirmModal(null);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
    setEditDirty(true);
    setLastSaved(null);
  };

  const handleEditUnitClick = (unitId) => {
    setEditUnits((prev) => ({ ...prev, [unitId]: (prev[unitId] || 0) + 1 }));
    setEditDirty(true);
    setLastSaved(null);
  };

  const handleEditUnitRemove = (unitId) => {
    setEditUnits((prev) => {
      const next = { ...prev };
      if (next[unitId] > 1) next[unitId] -= 1;
      else delete next[unitId];
      return next;
    });
    setEditDirty(true);
    setLastSaved(null);
  };

  // Auto-Save effect
  useEffect(() => {
    if (!viewRecord || !editDirty) return;

    const saveChanges = async () => {
      setEditSaving(true);
      setEditError("");
      try {
        const units = Object.entries(editUnits).map(([type, quantity]) => ({ type, quantity }));
        const { error: updErr } = await supabase
          .from("repair_borrowed")
          .update({
            office_id:   editData.officeId    || null,
            category:    editData.category    || null,
            name:        editData.name.trim() || null,
            date:        editData.date        || null,
            model:       editData.model.trim()|| null,
            description: editData.description.trim() || null,
            status:      editData.status      || null,
            returned_date: editData.status === "Returned"
                             ? (viewRecord.returned_date || new Date().toISOString())
                             : null,
            units,
          })
          .eq("id", viewRecord.id);

        if (updErr) throw updErr;
        
        // Background refresh table
        fetchRecords();
        setEditDirty(false);
        setLastSaved(new Date());
      } catch (err) {
        console.error("Auto-Update error:", err);
        setEditError("Failed to auto-save. Please check your connection.");
      } finally {
        setEditSaving(false);
      }
    };

    const timer = setTimeout(() => {
      saveChanges();
    }, 600); // 600ms debounce

    return () => clearTimeout(timer);
  }, [editData, editUnits, editDirty, viewRecord]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const formatDate = (str) =>
    new Date(str).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const unitLabel = (unitId) =>
    UNIT_TYPES.find((u) => u.id === unitId)?.label ?? unitId;

  // ── Computed statistics ───────────────────────────────────────────────────────
  const borrowedRecords = records.filter((r) => r.category === "Borrowed");
  const repairRecords   = records.filter((r) => r.category === "Repair");

  const borrowStats = {
    total:    borrowedRecords.length,
    active:   borrowedRecords.filter((r) => r.status !== "Returned").length,
    returned: borrowedRecords.filter((r) => r.status === "Returned").length,
  };

  const repairStats = {
    total:     repairRecords.length,
    repairing: repairRecords.filter((r) => r.status !== "Returned").length,
    returned:  repairRecords.filter((r) => r.status === "Returned").length,
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>

      {/* ── Page header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
          flexShrink: 0,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "1.375rem",
              fontWeight: "700",
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <FiTool size={22} style={{ color: "var(--primary)" }} />
            Repair / Borrowed
          </h2>
          <p style={{ margin: "0.25rem 0 0", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Track equipment sent for repair or borrowed by offices.
          </p>
        </div>

        <button className="btn btn-primary" onClick={openModal}>
          <FiPlus size={18} />
          Add Record
        </button>
      </div>

      {/* ── Statistics ── */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem", flexShrink: 0 }}>

          {/* Borrowed stats */}
          <div style={{ background: "var(--bg-card)", border: "1px solid #bfdbfe", borderRadius: "var(--radius-lg)", padding: "1rem", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.875rem" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#2563eb", flexShrink: 0 }} />
              <span style={{ fontWeight: "700", fontSize: "0.875rem", color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.05em" }}>Borrowed</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
              {[
                { label: "Total Borrowed", value: borrowStats.total,    bg: "#eff6ff", color: "#1e40af" },
                { label: "Borrowed",       value: borrowStats.active,   bg: "#dbeafe", color: "#2563eb" },
                { label: "Returned",       value: borrowStats.returned, bg: "#d1fae5", color: "#065f46" },
              ].map((s) => (
                <div key={s.label} style={{ background: s.bg, borderRadius: "var(--radius-md)", padding: "0.75rem", textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: "800", color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: "0.7rem", fontWeight: "600", color: s.color, marginTop: "0.25rem", opacity: 0.8 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Repair stats */}
          <div style={{ background: "var(--bg-card)", border: "1px solid #ddd6fe", borderRadius: "var(--radius-lg)", padding: "1rem", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.875rem" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#7c3aed", flexShrink: 0 }} />
              <span style={{ fontWeight: "700", fontSize: "0.875rem", color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.05em" }}>Repair</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
              {[
                { label: "Total Repair", value: repairStats.total,     bg: "#f5f3ff", color: "#6d28d9" },
                { label: "Repairing",   value: repairStats.repairing, bg: "#ede9fe", color: "#7c3aed" },
                { label: "Returned",    value: repairStats.returned,  bg: "#d1fae5", color: "#065f46" },
              ].map((s) => (
                <div key={s.label} style={{ background: s.bg, borderRadius: "var(--radius-md)", padding: "0.75rem", textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: "800", color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: "0.7rem", fontWeight: "600", color: s.color, marginTop: "0.25rem", opacity: 0.8 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ── Records list ── */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
        </div>
      ) : records.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            gap: "1rem",
          }}
        >
          <FiInbox size={56} style={{ opacity: 0.4 }} />
          <p style={{ fontSize: "1.125rem", fontWeight: "600", margin: 0 }}>
            No records yet.
          </p>
          <p style={{ margin: 0, fontSize: "0.875rem" }}>
            Click <strong>Add Record</strong> to log your first entry.
          </p>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
          <div className="table-container">
            <table className="table">
              <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                <tr>
                  <th>#</th>
                  <th>Office</th>
                  <th>Model</th>
                  <th>Category</th>
                  <th>Name</th>
                  <th>Units</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Returned</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec, idx) => (
                  <tr
                    key={rec.id}
                    onClick={() => openViewModal(rec)}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-elevated)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = ""}
                  >
                    <td style={{ color: "var(--text-muted)", fontWeight: "600" }}>
                      {idx + 1}
                    </td>
                    <td>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                        <FiMapPin size={14} style={{ color: "var(--primary)", flexShrink: 0 }} />
                        {rec.offices?.name ?? <em style={{ color: "var(--text-muted)" }}>—</em>}
                      </span>
                    </td>
                    <td>{rec.model || <em style={{ color: "var(--text-muted)" }}>—</em>}</td>
                    <td>
                      {rec.category ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "0.2rem 0.65rem",
                            borderRadius: "var(--radius-md)",
                            fontSize: "0.75rem",
                            fontWeight: "700",
                            background: rec.category === "Borrowed" ? "#eff6ff" : "#f5f3ff",
                            color: rec.category === "Borrowed" ? "#2563eb" : "#7c3aed",
                            border: `1px solid ${rec.category === "Borrowed" ? "#bfdbfe" : "#ddd6fe"}`,
                          }}
                        >
                          {rec.category}
                        </span>
                      ) : (
                        <em style={{ color: "var(--text-muted)" }}>—</em>
                      )}
                    </td>
                    <td>
                      {rec.name ? (
                        <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                          <FiUser size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                          {rec.name}
                        </span>
                      ) : (
                        <em style={{ color: "var(--text-muted)" }}>—</em>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                        {(rec.units || []).map((u) => (
                          <span
                            key={u.type}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              background: "#eff6ff",
                              color: "var(--primary)",
                              border: "1px solid #bfdbfe",
                              borderRadius: "var(--radius-md)",
                              padding: "0.2rem 0.6rem",
                              fontSize: "0.75rem",
                              fontWeight: "600",
                            }}
                          >
                            {unitLabel(u.type)}
                            {u.quantity > 1 && (
                              <span
                                style={{
                                  background: "var(--primary)",
                                  color: "white",
                                  borderRadius: "9999px",
                                  padding: "0 0.35rem",
                                  fontSize: "0.65rem",
                                  fontWeight: "700",
                                  lineHeight: "1.4",
                                }}
                              >
                                ×{u.quantity}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {rec.status ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "0.2rem 0.65rem",
                            borderRadius: "var(--radius-md)",
                            fontSize: "0.75rem",
                            fontWeight: "700",
                            background: rec.status === "Returned" ? "#d1fae5" : "#fef3c7",
                            color: rec.status === "Returned" ? "#065f46" : "#92400e",
                            border: `1px solid ${rec.status === "Returned" ? "#6ee7b7" : "#fcd34d"}`,
                          }}
                        >
                          {rec.status}
                        </span>
                      ) : (
                        <em style={{ color: "var(--text-muted)" }}>—</em>
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                      {rec.date
                        ? new Date(rec.date).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                        : <em style={{ color: "var(--text-muted)" }}>—</em>}
                    </td>
                    <td style={{ whiteSpace: "nowrap", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                      {rec.status === "Returned" && rec.returned_date
                        ? new Date(rec.returned_date).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                        : <em style={{ color: "var(--text-muted)" }}>—</em>}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn btn-small btn-danger"
                        onClick={(e) => { e.stopPropagation(); handleDelete(rec.id); }}
                      >
                        <FiTrash2 size={14} />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add Record Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal"
            style={{ maxWidth: "680px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <FiTool style={{ color: "var(--primary)" }} />
                Add Repair / Borrowed Record
              </h3>
              <button
                className="btn btn-icon btn-ghost"
                onClick={closeModal}
                style={{ width: "36px", height: "36px" }}
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="modal-body">
              {error && (
                <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
                  <FiAlertCircle />
                  {error}
                </div>
              )}

              <form id="rb-form" onSubmit={handleSubmit}>
                {/* Office */}
                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="rb-office"
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                  >
                    <FiMapPin size={15} />
                    Office
                    <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <select
                    id="rb-office"
                    name="officeId"
                    className="form-select"
                    value={formData.officeId}
                    onChange={handleChange}
                  >
                    <option value="">Select an office</option>
                    {offices.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.officeId && (
                    <p style={{ color: "var(--danger)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                      {formErrors.officeId}
                    </p>
                  )}
                </div>

                {/* Category */}
                <div className="form-group">
                  <label
                    className="form-label"
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                  >
                    <FiTag size={15} />
                    Category
                    <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    {["Borrowed", "Repair"].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setFormData((p) => ({ ...p, category: cat }));
                          if (formErrors.category)
                            setFormErrors((p) => ({ ...p, category: "" }));
                        }}
                        style={{
                          flex: 1,
                          padding: "0.6rem 1rem",
                          border: `2px solid ${
                            formData.category === cat
                              ? cat === "Borrowed"
                                ? "#2563eb"
                                : "#7c3aed"
                              : "var(--border)"
                          }`,
                          borderRadius: "var(--radius-md)",
                          background:
                            formData.category === cat
                              ? cat === "Borrowed"
                                ? "#eff6ff"
                                : "#f5f3ff"
                              : "var(--bg-card)",
                          color:
                            formData.category === cat
                              ? cat === "Borrowed"
                                ? "#2563eb"
                                : "#7c3aed"
                              : "var(--text-secondary)",
                          fontWeight: "700",
                          fontSize: "0.875rem",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  {formErrors.category && (
                    <p style={{ color: "var(--danger)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                      {formErrors.category}
                    </p>
                  )}
                </div>


                {/* Name (optional) */}
                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="rb-name"
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                  >
                    <FiUser size={15} />
                    Name&nbsp;<span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.8rem" }}>(optional)</span>
                  </label>
                  <input
                    id="rb-name"
                    name="name"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Juan Dela Cruz"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>

                {/* Date */}
                <div className="form-group">
                  <label className="form-label" htmlFor="date" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <FiCalendar size={15} /> Date & Time <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.8rem" }}>(optional)</span>
                  </label>
                  <input
                    id="date"
                    name="date"
                    type="datetime-local"
                    className="form-input"
                    value={formData.date}
                    onChange={handleChange}
                    style={{ cursor: "pointer" }}
                  />
                </div>

                {/* Unit Types */}

                <div className="form-group">
                  <label
                    className="form-label"
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                  >
                    <FiTool size={15} />
                    Unit Type
                    <span style={{ color: "var(--danger)" }}>*</span>
                    <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.8rem", marginLeft: "0.25rem" }}>
                      — click to add, click again to increase qty
                    </span>
                  </label>

                  {/* Clickable unit buttons */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
                    {UNIT_TYPES.map((unit) => {
                      const qty = selectedUnits[unit.id] || 0;
                      const active = qty > 0;
                      return (
                        <button
                          key={unit.id}
                          type="button"
                          onClick={() => handleUnitClick(unit.id)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.375rem",
                            padding: "0.45rem 0.875rem",
                            border: `1.5px solid ${active ? "var(--primary)" : "var(--border)"}`,
                            borderRadius: "var(--radius-md)",
                            background: active ? "#eff6ff" : "var(--bg-card)",
                            color: active ? "var(--primary)" : "var(--text-secondary)",
                            fontWeight: "600",
                            fontSize: "0.8125rem",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            position: "relative",
                          }}
                        >
                          {unit.icon}
                          {unit.label}
                          {active && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "var(--primary)",
                                color: "white",
                                borderRadius: "9999px",
                                minWidth: "20px",
                                height: "20px",
                                fontSize: "0.7rem",
                                fontWeight: "700",
                                padding: "0 5px",
                              }}
                            >
                              {qty}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected units summary with remove */}
                  {Object.keys(selectedUnits).length > 0 && (
                    <div
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        padding: "0.75rem",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.5rem",
                      }}
                    >
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", width: "100%", marginBottom: "0.25rem", fontWeight: "600" }}>
                        Selected units:
                      </span>
                      {Object.entries(selectedUnits).map(([id, qty]) => (
                        <div
                          key={id}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.375rem",
                            background: "white",
                            border: "1.5px solid var(--primary)",
                            borderRadius: "var(--radius-md)",
                            padding: "0.3rem 0.625rem",
                            fontSize: "0.8125rem",
                            fontWeight: "600",
                            color: "var(--primary)",
                          }}
                        >
                          <span>{unitLabel(id)}</span>
                          <span
                            style={{
                              background: "var(--primary)",
                              color: "white",
                              borderRadius: "9999px",
                              padding: "0 6px",
                              fontSize: "0.7rem",
                              fontWeight: "700",
                            }}
                          >
                            ×{qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUnitRemove(id)}
                            title="Decrease / remove"
                            style={{
                              border: "none",
                              background: "transparent",
                              color: "var(--danger)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              padding: 0,
                              lineHeight: 1,
                            }}
                          >
                            <FiX size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {formErrors.units && (
                    <p style={{ color: "var(--danger)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                      {formErrors.units}
                    </p>
                  )}
                </div>

                {/* Model */}
                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="rb-model"
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                  >
                    <FiCpu size={15} />
                    Model
                    <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.8rem" }}>(optional)</span>
                  </label>
                  <input
                    id="rb-model"
                    name="model"
                    type="text"
                    className="form-input"
                    placeholder="e.g. HP LaserJet Pro M404n"
                    value={formData.model}
                    onChange={handleChange}
                  />
                </div>

                {/* Description */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label
                    className="form-label"
                    htmlFor="rb-description"
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                  >
                    <FiAlertCircle size={15} />
                    Description
                    <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.8rem" }}>(optional)</span>
                  </label>
                  <textarea
                    id="rb-description"
                    name="description"
                    className="form-textarea"
                    placeholder="Describe the issue, purpose for borrowing, etc."
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                  />
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal} disabled={submitting}>
                <FiX size={16} />
                Cancel
              </button>
              <button
                type="submit"
                form="rb-form"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="spinner" style={{ width: "16px", height: "16px" }} />
                    Saving…
                  </>
                ) : (
                  <>
                    <FiCheckCircle size={16} />
                    Save Record
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── View / Edit Modal ── */}
      {viewRecord && (
        <div className="modal-overlay" onClick={closeViewModal}>
          <div
            className="modal"
            style={{ maxWidth: "680px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <FiEdit2 style={{ color: "var(--primary)" }} />
                View / Edit Record
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                {/* Category badge */}
                {editData.category && (
                  <span style={{
                    padding: "0.35rem 1rem",
                    borderRadius: "var(--radius-md)",
                    fontWeight: "800",
                    fontSize: "0.9rem",
                    background: editData.category === "Borrowed" ? "#fef3c7" : "#fef3c7",
                    color: editData.category === "Borrowed" ? "#92400e" : "#92400e",
                    border: `2px solid ${editData.category === "Borrowed" ? "#f59e0b" : "#f59e0b"}`,
                  }}>
                    {editData.category}
                  </span>
                )}
                <button className="btn btn-icon btn-ghost" onClick={closeViewModal} style={{ width: "36px", height: "36px" }}>
                  <FiX size={20} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="modal-body">
              {editError && (
                <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
                  <FiAlertCircle />
                  {editError}
                </div>
              )}

              <form id="edit-rb-form" onSubmit={(e) => e.preventDefault()}>

                {/* Office */}
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-office" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <FiMapPin size={15} /> Office
                  </label>
                  <select id="edit-office" name="officeId" className="form-select" value={editData.officeId} onChange={handleEditChange}>
                    <option value="">Select an office</option>
                    {offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>

                {/* Status */}
                {editData.category && (
                  <div className="form-group">
                    <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <FiCheckCircle size={15} /> Status
                    </label>
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      {(editData.category === "Borrowed" ? ["Borrowed", "Returned"] : ["Repairing", "Returned"]).map((st) => {
                        const isActive = editData.status === st;
                        const isReturned = st === "Returned";
                        return (
                          <button key={st} type="button"
                            onClick={() => {
                              if (editData.status !== st) {
                                setStatusConfirmModal(st);
                              }
                            }}
                            style={{
                              flex: 1, padding: "0.6rem 1rem",
                              border: `2px solid ${isActive ? (isReturned ? "#10b981" : "#f59e0b") : "var(--border)"}`,
                              borderRadius: "var(--radius-md)",
                              background: isActive ? (isReturned ? "#d1fae5" : "#fef3c7") : "var(--bg-card)",
                              color: isActive ? (isReturned ? "#065f46" : "#92400e") : "var(--text-secondary)",
                              fontWeight: "700", fontSize: "0.875rem", cursor: "pointer", transition: "all 0.15s ease",
                            }}
                          >{st}</button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Name */}
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-name" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <FiUser size={15} /> Name <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.8rem" }}>(optional)</span>
                  </label>
                  <input id="edit-name" name="name" type="text" className="form-input"
                    placeholder="e.g. Juan Dela Cruz" value={editData.name || ""} onChange={handleEditChange} />
                </div>

                {/* Date */}
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-date" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <FiCalendar size={15} /> Date & Time <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.8rem" }}>(optional)</span>
                  </label>
                  <input id="edit-date" name="date" type="datetime-local" className="form-input"
                    value={editData.date ? new Date(editData.date).toISOString().slice(0, 16) : ""} onChange={handleEditChange} style={{ cursor: "pointer" }} />
                </div>

                {/* Unit Types */}
                <div className="form-group">
                  <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <FiTool size={15} /> Unit Types
                    <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.8rem", marginLeft: "0.25rem" }}>— click to add, × to decrease</span>
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
                    {UNIT_TYPES.map((unit) => {
                      const qty = editUnits[unit.id] || 0;
                      const active = qty > 0;
                      return (
                        <button key={unit.id} type="button" onClick={() => handleEditUnitClick(unit.id)}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: "0.375rem",
                            padding: "0.45rem 0.875rem",
                            border: `1.5px solid ${active ? "var(--primary)" : "var(--border)"}`,
                            borderRadius: "var(--radius-md)",
                            background: active ? "#eff6ff" : "var(--bg-card)",
                            color: active ? "var(--primary)" : "var(--text-secondary)",
                            fontWeight: "600", fontSize: "0.8125rem", cursor: "pointer", transition: "all 0.15s ease",
                          }}
                        >
                          {unit.icon}{unit.label}
                          {active && (
                            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
                              background: "var(--primary)", color: "white", borderRadius: "9999px",
                              minWidth: "20px", height: "20px", fontSize: "0.7rem", fontWeight: "700", padding: "0 5px" }}>
                              {qty}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {Object.keys(editUnits).length > 0 && (
                    <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)", padding: "0.75rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", width: "100%", marginBottom: "0.25rem", fontWeight: "600" }}>Selected units:</span>
                      {Object.entries(editUnits).map(([id, qty]) => (
                        <div key={id} style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem",
                          background: "white", border: "1.5px solid var(--primary)", borderRadius: "var(--radius-md)",
                          padding: "0.3rem 0.625rem", fontSize: "0.8125rem", fontWeight: "600", color: "var(--primary)" }}>
                          <span>{unitLabel(id)}</span>
                          <span style={{ background: "var(--primary)", color: "white", borderRadius: "9999px",
                            padding: "0 6px", fontSize: "0.7rem", fontWeight: "700" }}>×{qty}</span>
                          <button type="button" onClick={() => handleEditUnitRemove(id)}
                            style={{ border: "none", background: "transparent", color: "var(--danger)",
                              cursor: "pointer", display: "flex", alignItems: "center", padding: 0, lineHeight: 1 }}>
                            <FiX size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Model */}
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-model" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <FiCpu size={15} /> Model <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.8rem" }}>(optional)</span>
                  </label>
                  <input id="edit-model" name="model" type="text" className="form-input"
                    placeholder="e.g. HP LaserJet Pro M404n" value={editData.model || ""} onChange={handleEditChange} />
                </div>

                {/* Description */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="edit-description" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <FiAlertCircle size={15} /> Description <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "0.8rem" }}>(optional)</span>
                  </label>
                  <textarea id="edit-description" name="description" className="form-textarea" rows={3}
                    placeholder="Describe the issue or purpose..." value={editData.description || ""} onChange={handleEditChange} />
                </div>

              </form>
            </div>

            {/* Footer */}
            <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {editSaving && (
                  <><div className="spinner" style={{ width: "14px", height: "14px" }} /> <span style={{ color: "var(--primary)", fontWeight: "600" }}>Saving...</span></>
                )}
                {!editSaving && lastSaved && (
                  <><FiCheckCircle style={{ color: "var(--success)" }} /> <span style={{ color: "var(--success)", fontWeight: "600" }}>All changes saved</span></>
                )}
                {!editSaving && !lastSaved && !editDirty && (
                  <span>No changes</span>
                )}
              </div>
              <button className="btn btn-outline" onClick={closeViewModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Status Change Confirmation Modal ── */}
      {statusConfirmModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={() => setStatusConfirmModal(null)}>
          <div className="modal" style={{ maxWidth: "400px", padding: "1.5rem" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1rem" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "0.5rem" }}>
                <FiAlertCircle size={32} style={{ color: "#d97706" }} />
              </div>
              <h3 style={{ margin: 0, fontSize: "1.25rem", color: "var(--text-primary)" }}>Confirm Status Change</h3>
              <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.5 }}>
                Are you sure you want to change the status to <strong style={{ color: "var(--primary)" }}>{statusConfirmModal}</strong>? This will be saved automatically.
              </p>
              <div style={{ display: "flex", gap: "0.75rem", width: "100%", marginTop: "1rem" }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setStatusConfirmModal(null)}>
                  Cancel
                </button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => {
                  setEditData((p) => ({ ...p, status: statusConfirmModal }));
                  setEditDirty(true);
                  setLastSaved(null);
                  setStatusConfirmModal(null);
                }}>
                  Yes, Change Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RepairBorrowed;
