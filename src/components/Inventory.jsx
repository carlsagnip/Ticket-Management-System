import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import {
  FiBox,
  FiSearch,
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";

const EMPTY_FORM = {
  barcode: "",
  model: "",
  category: "Monitor",
  status: "Available",
  location: "ICT",
};

const CATEGORIES = ["Monitor", "Computer", "Laptop", "Printer", "Keyboard", "Mouse", "AVR", "White Screen", "Other"];
const STATUSES = ["Available", "Borrowed", "Repairing", "Returned", "Scrapped"];

function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals & Forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error("Error fetching inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Global Barcode Listener ────────────────────────────────────────────────
  // Listens for rapid keystrokes ending in "Enter" (typical scanner behavior)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input, textarea, or select
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)
      ) {
        return;
      }

      if (e.key === "Enter" && barcodeBuffer.length > 0) {
        e.preventDefault();
        handleScan(barcodeBuffer);
        setBarcodeBuffer(""); // Clear buffer after scan
      } else if (e.key.length === 1) { // Normal character
        setBarcodeBuffer((prev) => prev + e.key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [barcodeBuffer]);

  // Timeout to clear buffer if someone types part of a barcode manually but doesn't press Enter
  useEffect(() => {
    if (barcodeBuffer.length > 0) {
      const timeoutId = setTimeout(() => {
        setBarcodeBuffer("");
      }, 500); // If 500ms passes without a keystroke, it's not a barcode scanner
      return () => clearTimeout(timeoutId);
    }
  }, [barcodeBuffer]);

  const handleScan = async (scannedBarcode) => {
    // Check if it already exists
    const existingObj = items.find((i) => i.barcode === scannedBarcode);
    if (existingObj) {
      alert(`Item is already in inventory: ${existingObj.model} (${existingObj.status})`);
      // Flash it or highlight it in table if we had advanced logic
      return;
    }

    // New Barcode! Open Add Modal prefilled with barcode
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
          }
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
      const { error } = await supabase.from("inventory_items").delete().eq("id", id);
      if (error) throw error;
      fetchInventory();
    } catch (err) {
      console.error("Error deleting item:", err);
      alert("Failed to delete item.");
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from("inventory_items")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
      
      // Optimistic URL Update
      setItems((prev) => prev.map((item) => item.id === id ? { ...item, status: newStatus } : item));
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };


  // ── Filter & Search ──────────────────────────────────────────────────────
  const filteredItems = items.filter((item) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchModel = item.model?.toLowerCase().includes(q);
      const matchBarcode = item.barcode?.toLowerCase().includes(q);
      if (!matchModel && !matchBarcode) return false;
    }
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", height: "100%" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ margin: "0 0 0.25rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FiBox style={{ color: "var(--primary)" }} /> Inventory Tracking
          </h2>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Scan a barcode anytime (without clicking) to add or locate an item.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setFormData(EMPTY_FORM);
          setShowAddModal(true);
        }}>
          <FiPlus size={16} /> Add Item Manually
        </button>
      </div>

      {/* ── Action Bar ── */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <div className="search-wrapper" style={{ flex: "1 1 300px", position: "relative" }}>
          <FiSearch size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by barcode or model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: "36px", margin: 0 }}
          />
        </div>
      </div>

      {/* ── Items Table ── */}
      <div className="card" style={{ padding: 0, flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <div className="spinner" style={{ margin: "0 auto 1rem" }} />
            <p style={{ color: "var(--text-muted)", margin: 0 }}>Loading inventory...</p>
          </div>
        ) : (
          <div className="table-responsive" style={{ flex: 1, overflow: "auto" }}>
            <table className="table">
              <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                <tr>
                  <th>Barcode</th>
                  <th>Model</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Date Added</th>
                  <th style={{ textAlign: "right", width: "100px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                      <FiBox size={32} style={{ marginBottom: "1rem", opacity: 0.3 }} />
                      <div>No inventory items found. Start scanning!</div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600, fontFamily: "monospace" }}>{item.barcode}</td>
                      <td style={{ fontWeight: 500 }}>{item.model}</td>
                      <td>
                        <span style={{ 
                          background: "var(--bg-elevated)", 
                          padding: "2px 8px", 
                          borderRadius: "12px", 
                          fontSize: "0.75rem",
                          border: "1px solid var(--border)"
                        }}>
                          {item.category}
                        </span>
                      </td>
                      <td>
                        <span 
                          style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "transparent",
                            fontSize: "0.8rem",
                            fontWeight: "600",
                            color: item.status === "Available" ? "var(--success)" 
                                 : item.status === "Repairing" ? "var(--warning)"
                                 : item.status === "Borrowed" ? "var(--primary)"
                                 : "var(--text-secondary)"
                          }}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                        {item.location || <em style={{ opacity: 0.5 }}>Unassigned</em>}
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="btn btn-icon btn-ghost"
                          onClick={() => handleDelete(item.id, item.model)}
                          title="Delete Item"
                          style={{ color: "var(--danger)" }}
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Item Modal ── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => !submitting && setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Register New Item</h2>
              <button className="btn btn-icon btn-ghost" onClick={() => !submitting && setShowAddModal(false)}>
                <FiX size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              {error && (
                <div className="error-message" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
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
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
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
                  <select name="category" className="form-select" value={formData.category} onChange={handleChange}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </form>
            </div>
            
            <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
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
    </div>
  );
}

export default Inventory;
