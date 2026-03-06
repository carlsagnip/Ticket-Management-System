import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import {
  FiBox,
  FiSearch,
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiX,
  FiAlertCircle,
  FiChevronDown,
  FiFilter,
} from "react-icons/fi";

const EMPTY_FORM = {
  barcode: "",
  model: "",
  category: "Monitor",
  status: "Available",
  location: "ICT",
};

const CATEGORIES = [
  "Monitor",
  "Computer",
  "Laptop",
  "Printer",
  "Keyboard",
  "Mouse",
  "AVR",
  "White Screen",
  "Other",
];
const STATUSES = ["Available", "Borrowed"];

function Inventory() {
  const [items, setItems] = useState([]);
  const [borrowLocationMap, setBorrowLocationMap] = useState({}); // barcode → office name
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  // Dropdown open states (ticket-module style)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  // Modals & Forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Edit modal
  const [editItem, setEditItem] = useState(null); // the item being edited
  const [editData, setEditData] = useState({}); // { barcode, model, category }
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  // Barcode Listener
  const barcodeInputRef = useRef(null);
  const [barcodeBuffer, setBarcodeBuffer] = useState("");

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .in("status", ["Available", "Borrowed"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      setItems(data || []);

      // Fetch active borrow records to build barcode → office map
      const { data: borrowData, error: borrowError } = await supabase
        .from("repair_borrowed")
        .select("scanned_barcodes, offices(name)")
        .eq("category", "Borrowed")
        .neq("status", "Returned");

      if (borrowError) {
        console.error("Error fetching borrow locations:", borrowError);
      } else {
        const map = {};
        (borrowData || []).forEach((rec) => {
          const officeName = rec.offices?.name;
          if (officeName && Array.isArray(rec.scanned_barcodes)) {
            rec.scanned_barcodes.forEach((bc) => {
              map[bc] = officeName;
            });
          }
        });
        setBorrowLocationMap(map);
      }
    } catch (err) {
      console.error("Error fetching inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Global Barcode Listener ────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)
      ) {
        return;
      }
      if (e.key === "Enter" && barcodeBuffer.length > 0) {
        e.preventDefault();
        handleScan(barcodeBuffer);
        setBarcodeBuffer("");
      } else if (e.key.length === 1) {
        setBarcodeBuffer((prev) => prev + e.key);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [barcodeBuffer]);

  useEffect(() => {
    if (barcodeBuffer.length > 0) {
      const timeoutId = setTimeout(() => {
        setBarcodeBuffer("");
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [barcodeBuffer]);

  const handleScan = async (scannedBarcode) => {
    const existingObj = items.find((i) => i.barcode === scannedBarcode);
    if (existingObj) {
      alert(
        `Item is already in inventory: ${existingObj.model} (${existingObj.status})`,
      );
      return;
    }
    setFormData({ ...EMPTY_FORM, barcode: scannedBarcode });
    setShowAddModal(true);
  };

  // ── Form Handlers ──────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (!formData.barcode || !formData.model) {
      setError("Barcode and Model are required.");
      setSubmitting(false);
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from("inventory_items")
        .insert([
          {
            barcode: formData.barcode.trim(),
            model: formData.model.trim(),
            category: formData.category,
            status: formData.status,
            location: formData.location.trim() || null,
          },
        ]);

      if (insertError) {
        if (insertError.code === "23505") {
          throw new Error("An item with this barcode already exists.");
        }
        throw insertError;
      }

      setShowAddModal(false);
      setFormData(EMPTY_FORM);
      fetchInventory();
    } catch (err) {
      console.error("Error adding inventory item:", err);
      setError(err.message || "Failed to add item.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, modelName) => {
    if (!confirm(`Are you sure you want to delete ${modelName}?`)) return;
    try {
      const { error } = await supabase
        .from("inventory_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
      fetchInventory();
    } catch (err) {
      console.error("Error deleting item:", err);
      alert("Failed to delete item.");
    }
  };

  // ── Edit handlers ─────────────────────────────────────────────────────────
  const openEdit = (item) => {
    setEditItem(item);
    setEditData({
      barcode: item.barcode,
      model: item.model,
      category: item.category,
    });
    setEditError("");
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError("");
    if (!editData.barcode.trim() || !editData.model.trim()) {
      setEditError("Barcode and Model are required.");
      return;
    }
    setEditSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({
          barcode: editData.barcode.trim(),
          model: editData.model.trim(),
          category: editData.category,
        })
        .eq("id", editItem.id);
      if (updateError) {
        if (updateError.code === "23505") {
          throw new Error("Another item already uses that barcode.");
        }
        throw updateError;
      }
      setEditItem(null);
      fetchInventory();
    } catch (err) {
      console.error("Error updating item:", err);
      setEditError(err.message || "Failed to save changes.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from("inventory_items")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: newStatus } : item,
        ),
      );
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // ── Filter & Search ──────────────────────────────────────────────────────
  const locationOptions = [
    ...new Set(items.map((i) => i.location).filter(Boolean)),
  ].sort();
  const hasActiveFilters =
    filterCategory || filterStatus || filterLocation || searchQuery;

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterCategory("");
    setFilterStatus("");
    setFilterLocation("");
  };

  const filteredItems = items.filter((item) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchModel = item.model?.toLowerCase().includes(q);
      const matchBarcode = item.barcode?.toLowerCase().includes(q);
      if (!matchModel && !matchBarcode) return false;
    }
    if (filterCategory && item.category !== filterCategory) return false;
    if (filterStatus && item.status !== filterStatus) return false;
    if (filterLocation) {
      const loc =
        item.status === "Borrowed" && borrowLocationMap[item.barcode]
          ? borrowLocationMap[item.barcode]
          : item.location;
      if (loc !== filterLocation) return false;
    }
    return true;
  });

  // Helper to close all dropdowns on outside click
  const closeAllDropdowns = () => {
    setShowCategoryDropdown(false);
    setShowStatusDropdown(false);
    setShowLocationDropdown(false);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        height: "100%",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h2
            style={{
              margin: "0 0 0.25rem 0",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <FiBox style={{ color: "var(--primary)" }} /> Inventory Tracking
          </h2>
          <p
            style={{
              margin: 0,
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
            }}
          >
            Scan a barcode anytime (without clicking) to add or locate an item.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setFormData(EMPTY_FORM);
            setShowAddModal(true);
          }}
        >
          <FiPlus size={16} /> Add Item Manually
        </button>
      </div>

      {/* ── Action Bar ── */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", flex: "1", minWidth: "200px" }}>
          <FiSearch
            style={{
              position: "absolute",
              left: "1rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              width: "16px",
              height: "16px",
            }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Search by barcode or model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: "2.5rem", margin: 0, height: "38px" }}
          />
        </div>

        {/* Right-side pill filters */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {/* Count badge */}
          <button
            className="filter-pill"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "default",
            }}
          >
            <FiFilter size={16} />
            All ({filteredItems.length})
          </button>

          {/* Category dropdown */}
          <div style={{ position: "relative" }}>
            <button
              className={`filter-pill ${filterCategory ? "active" : ""}`}
              onClick={() => {
                setShowCategoryDropdown(!showCategoryDropdown);
                setShowStatusDropdown(false);
                setShowLocationDropdown(false);
              }}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              {filterCategory || "All Categories"}
              <FiChevronDown size={14} />
            </button>
            {showCategoryDropdown && (
              <>
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    marginTop: "0.5rem",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "var(--shadow-lg)",
                    zIndex: 50,
                    minWidth: "175px",
                    overflow: "hidden",
                  }}
                >
                  {["", ...CATEGORIES].map((c) => (
                    <button
                      key={c || "__all__"}
                      onClick={() => {
                        setFilterCategory(c);
                        setShowCategoryDropdown(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        border: "none",
                        background:
                          filterCategory === c
                            ? "var(--primary)"
                            : "transparent",
                        color:
                          filterCategory === c
                            ? "white"
                            : "var(--text-primary)",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (filterCategory !== c)
                          e.currentTarget.style.background =
                            "var(--bg-elevated)";
                      }}
                      onMouseLeave={(e) => {
                        if (filterCategory !== c)
                          e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {c || "All Categories"}
                    </button>
                  ))}
                </div>
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 40 }}
                  onClick={() => setShowCategoryDropdown(false)}
                />
              </>
            )}
          </div>

          {/* Status dropdown */}
          <div style={{ position: "relative" }}>
            <button
              className={`filter-pill ${filterStatus ? "active" : ""}`}
              onClick={() => {
                setShowStatusDropdown(!showStatusDropdown);
                setShowCategoryDropdown(false);
                setShowLocationDropdown(false);
              }}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              {filterStatus || "All Statuses"}
              <FiChevronDown size={14} />
            </button>
            {showStatusDropdown && (
              <>
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    marginTop: "0.5rem",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "var(--shadow-lg)",
                    zIndex: 50,
                    minWidth: "160px",
                    overflow: "hidden",
                  }}
                >
                  {["", ...STATUSES].map((s) => (
                    <button
                      key={s || "__all__"}
                      onClick={() => {
                        setFilterStatus(s);
                        setShowStatusDropdown(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        border: "none",
                        background:
                          filterStatus === s ? "var(--primary)" : "transparent",
                        color:
                          filterStatus === s ? "white" : "var(--text-primary)",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (filterStatus !== s)
                          e.currentTarget.style.background =
                            "var(--bg-elevated)";
                      }}
                      onMouseLeave={(e) => {
                        if (filterStatus !== s)
                          e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {s || "All Statuses"}
                    </button>
                  ))}
                </div>
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 40 }}
                  onClick={() => setShowStatusDropdown(false)}
                />
              </>
            )}
          </div>

          {/* Location dropdown */}
          <div style={{ position: "relative" }}>
            <button
              className={`filter-pill ${filterLocation ? "active" : ""}`}
              onClick={() => {
                setShowLocationDropdown(!showLocationDropdown);
                setShowCategoryDropdown(false);
                setShowStatusDropdown(false);
              }}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              {filterLocation || "All Locations"}
              <FiChevronDown size={14} />
            </button>
            {showLocationDropdown && (
              <>
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    marginTop: "0.5rem",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "var(--shadow-lg)",
                    zIndex: 50,
                    minWidth: "160px",
                    overflow: "hidden",
                  }}
                >
                  {["", ...locationOptions].map((loc) => (
                    <button
                      key={loc || "__all__"}
                      onClick={() => {
                        setFilterLocation(loc);
                        setShowLocationDropdown(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        border: "none",
                        background:
                          filterLocation === loc
                            ? "var(--primary)"
                            : "transparent",
                        color:
                          filterLocation === loc
                            ? "white"
                            : "var(--text-primary)",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (filterLocation !== loc)
                          e.currentTarget.style.background =
                            "var(--bg-elevated)";
                      }}
                      onMouseLeave={(e) => {
                        if (filterLocation !== loc)
                          e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {loc || "All Locations"}
                    </button>
                  ))}
                </div>
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 40 }}
                  onClick={() => setShowLocationDropdown(false)}
                />
              </>
            )}
          </div>

          {/* Clear chip */}
          {hasActiveFilters && (
            <button
              className="filter-pill"
              onClick={clearAllFilters}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <FiX size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Items Table ── */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          minHeight: 0,
          backgroundColor: "white",
          borderRadius: "1rem",
        }}
      >
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <div className="spinner" style={{ margin: "0 auto 1rem" }} />
            <p style={{ color: "var(--text-muted)", margin: 0 }}>
              Loading inventory...
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            <FiBox
              style={{
                width: "64px",
                height: "64px",
                margin: "0 auto 1rem",
                opacity: 0.4,
              }}
            />
            <p style={{ fontSize: "1.125rem", fontWeight: "600" }}>
              {searchQuery || filterCategory || filterStatus || filterLocation
                ? "No items found matching your filters."
                : "No inventory items yet. Start scanning!"}
            </p>
          </div>
        ) : (
          <div
            className="table-container preview-table-desktop"
            style={{
              border: "none",
              background: "transparent",
              height: "100%",
            }}
          >
            <table className="table">
              <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                <tr>
                  <th>Barcode</th>
                  <th>Model</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Date Added</th>
                  <th style={{ textAlign: "right", width: "80px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontWeight: "600",
                          color: "var(--primary)",
                        }}
                      >
                        {item.barcode}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{item.model}</td>
                    <td>
                      <span
                        style={{
                          background: "var(--bg-elevated)",
                          padding: "2px 10px",
                          borderRadius: "9999px",
                          fontSize: "0.78rem",
                          fontWeight: "600",
                          border: "1px solid var(--border)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {item.category}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                          padding: "3px 10px",
                          borderRadius: "9999px",
                          fontSize: "0.78rem",
                          fontWeight: "700",
                          background:
                            item.status === "Available"
                              ? "#dcfce7"
                              : item.status === "Borrowed"
                                ? "#dbeafe"
                                : "#fef9c3",
                          color:
                            item.status === "Available"
                              ? "#166534"
                              : item.status === "Borrowed"
                                ? "#1d4ed8"
                                : "#854d0e",
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "0.875rem",
                      }}
                    >
                      {item.status === "Borrowed" &&
                      borrowLocationMap[item.barcode] ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            background: "#eff6ff",
                            color: "#2563eb",
                            border: "1px solid #bfdbfe",
                            borderRadius: "var(--radius-md)",
                            padding: "2px 8px",
                            fontSize: "0.78rem",
                            fontWeight: "600",
                          }}
                        >
                          {borrowLocationMap[item.barcode]}
                        </span>
                      ) : item.location ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            padding: "2px 10px",
                            borderRadius: "9999px",
                            fontSize: "0.78rem",
                            fontWeight: "700",
                            background:
                              item.location === "ICT"
                                ? "#f0fdf4"
                                : "var(--bg-elevated)",
                            color:
                              item.location === "ICT"
                                ? "#15803d"
                                : "var(--text-secondary)",
                            border:
                              item.location === "ICT"
                                ? "1px solid #bbf7d0"
                                : "1px solid var(--border)",
                          }}
                        >
                          {item.location === "ICT" && (
                            <svg
                              width="9"
                              height="9"
                              viewBox="0 0 8 8"
                              fill="currentColor"
                              style={{ flexShrink: 0 }}
                            >
                              <circle cx="4" cy="4" r="4" />
                            </svg>
                          )}
                          {item.location}
                        </span>
                      ) : (
                        <em style={{ opacity: 0.45 }}>Unassigned</em>
                      )}
                    </td>
                    <td
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {new Date(item.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "0.25rem" }}>
                        <button
                          className="btn btn-icon btn-ghost"
                          onClick={() => openEdit(item)}
                          title="Edit Item"
                        >
                          <FiEdit2 size={15} />
                        </button>
                        <button
                          className="btn btn-icon btn-ghost"
                          onClick={() => handleDelete(item.id, item.model)}
                          title="Delete Item"
                          style={{ color: "var(--danger)" }}
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Item Modal ── */}
      {showAddModal && (
        <div
          className="modal-overlay"
          onClick={() => !submitting && setShowAddModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Register New Item</h2>
              <button
                className="btn btn-icon btn-ghost"
                onClick={() => !submitting && setShowAddModal(false)}
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="modal-body">
              {error && (
                <div
                  className="error-message"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "1rem",
                  }}
                >
                  <FiAlertCircle /> {error}
                </div>
              )}

              <form id="add-item-form" onSubmit={handleAddSubmit}>
                <div className="form-group">
                  <label className="form-label">Barcode</label>
                  <input
                    type="text"
                    name="barcode"
                    className="form-input"
                    value={formData.barcode}
                    onChange={handleChange}
                    placeholder="Scan or type barcode"
                    autoFocus
                    required
                  />
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      marginTop: "4px",
                    }}
                  >
                    Make sure this matches the physical sticker exactly.
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">Item Model</label>
                  <input
                    type="text"
                    name="model"
                    className="form-input"
                    value={formData.model}
                    onChange={handleChange}
                    placeholder="e.g. Dell UltraSharp 27"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    name="category"
                    className="form-select"
                    value={formData.category}
                    onChange={handleChange}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </form>
            </div>

            <div
              className="modal-footer"
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem",
              }}
            >
              <button
                className="btn btn-outline"
                onClick={() => setShowAddModal(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-item-form"
                className="btn btn-primary"
                disabled={submitting || !formData.barcode || !formData.model}
              >
                {submitting ? "Saving..." : "Save Item"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Item Modal ── */}
      {editItem && (
        <div
          className="modal-overlay"
          onClick={() => !editSubmitting && setEditItem(null)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Item</h2>
              <button
                className="btn btn-icon btn-ghost"
                onClick={() => !editSubmitting && setEditItem(null)}
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="modal-body">
              {editError && (
                <div
                  className="error-message"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "1rem",
                  }}
                >
                  <FiAlertCircle /> {editError}
                </div>
              )}

              <form id="edit-item-form" onSubmit={handleEditSubmit}>
                <div className="form-group">
                  <label className="form-label">Barcode</label>
                  <input
                    type="text"
                    name="barcode"
                    className="form-input"
                    value={editData.barcode}
                    onChange={handleEditChange}
                    placeholder="Barcode"
                    autoFocus
                    required
                  />
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      marginTop: "4px",
                    }}
                  >
                    Make sure this matches the physical sticker exactly.
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">Item Model</label>
                  <input
                    type="text"
                    name="model"
                    className="form-input"
                    value={editData.model}
                    onChange={handleEditChange}
                    placeholder="e.g. Dell UltraSharp 27"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    name="category"
                    className="form-select"
                    value={editData.category}
                    onChange={handleEditChange}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </form>
            </div>

            <div
              className="modal-footer"
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem",
              }}
            >
              <button
                className="btn btn-outline"
                onClick={() => setEditItem(null)}
                disabled={editSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-item-form"
                className="btn btn-primary"
                disabled={
                  editSubmitting || !editData.barcode || !editData.model
                }
              >
                {editSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventory;
