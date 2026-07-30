import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useConfirm } from "./ConfirmProvider";
import { useToast } from "./ui/use-toast";
import {
  format, addMonths, subMonths,
  startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isWithinInterval, isAfter, isBefore
} from "date-fns";
import {
  FiPlus, FiClock, FiTrash2, FiAlertCircle,
  FiUser, FiCalendar, FiCheckCircle, FiChevronLeft, FiChevronRight,
} from "react-icons/fi";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "./ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "./ui/select";

const EMPTY_FORM = {
  officer_name: "",
  type: "Leave",
  durationMode: "single",
  start_date: null,
  end_date: null,
  reason: "",
};

// ── Inline Calendar Picker ────────────────────────────────────────────────────
function CalendarPicker({ mode, startDate, endDate, onChange }) {
  const [viewDate, setViewDate] = useState(new Date());
  const [hoverDate, setHoverDate] = useState(null);

  const days = eachDayOfInterval({ start: startOfMonth(viewDate), end: endOfMonth(viewDate) });
  const firstDow = startOfMonth(viewDate).getDay();

  const isSelected = (d) => {
    if (!startDate) return false;
    if (mode === "single") return isSameDay(d, startDate);
    if (startDate && endDate) return isSameDay(d, startDate) || isSameDay(d, endDate) || isWithinInterval(d, { start: startDate, end: endDate });
    return isSameDay(d, startDate);
  };

  const isInHoverRange = (d) => {
    if (mode !== "range" || !startDate || endDate || !hoverDate) return false;
    const lo = isAfter(hoverDate, startDate) ? startDate : hoverDate;
    const hi = isAfter(hoverDate, startDate) ? hoverDate : startDate;
    return isWithinInterval(d, { start: lo, end: hi });
  };

  const handleClick = (d) => {
    if (mode === "single") { onChange(d, null); return; }
    if (!startDate || (startDate && endDate)) { onChange(d, null); return; }
    if (isBefore(d, startDate)) { onChange(d, null); return; }
    onChange(startDate, d);
  };

  const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div style={{ background: "var(--bg-card)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", overflow: "hidden", userSelect: "none" }}>
      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.65rem 1rem", background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)" }}>
        <button type="button" onClick={() => setViewDate(v => subMonths(v, 1))}
          style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.25rem 0.5rem", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
          <FiChevronLeft size={14} />
        </button>
        <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-primary)" }}>
          {format(viewDate, "MMMM yyyy")}
        </span>
        <button type="button" onClick={() => setViewDate(v => addMonths(v, 1))}
          style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.25rem 0.5rem", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
          <FiChevronRight size={14} />
        </button>
      </div>

      {/* Day-of-week labels */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "0.5rem 0.75rem 0" }}>
        {DOW.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", paddingBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.03em" }}>{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "0 0.75rem 0.75rem", gap: "2px" }}>
        {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
        {days.map((d) => {
          const sel = isSelected(d);
          const hover = isInHoverRange(d);
          const today = isSameDay(d, new Date());
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => handleClick(d)}
              onMouseEnter={() => setHoverDate(d)}
              onMouseLeave={() => setHoverDate(null)}
              style={{
                textAlign: "center",
                padding: "0.4rem 0",
                fontSize: "0.8rem",
                border: "none",
                borderRadius: "var(--radius-sm)",
                background: sel ? "var(--primary)" : hover ? "rgba(37,99,235,0.12)" : "transparent",
                color: sel ? "#fff" : today ? "var(--primary)" : "var(--text-primary)",
                fontWeight: today && !sel ? 700 : 500,
                cursor: "pointer",
                outline: today && !sel ? "2px solid var(--primary)" : "none",
                outlineOffset: "-2px",
                transition: "background 0.12s, color 0.12s",
              }}
            >
              {format(d, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function LeaveManagement() {
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [records, setRecords] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recordsRes, officersRes] = await Promise.all([
        supabase.from("leave_offsets").select("*").order("created_at", { ascending: false }),
        supabase.from("officers").select("name").eq("is_active", true).order("name"),
      ]);
      if (recordsRes.error) throw recordsRes.error;
      if (officersRes.error) throw officersRes.error;
      setRecords(recordsRes.data || []);
      setOfficers(officersRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const ch = supabase
      .channel("leave_offsets_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "leave_offsets" }, fetchData)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.officer_name || !formData.start_date) return;
    setSubmitting(true);
    setError("");
    try {
      const startStr = format(formData.start_date, "yyyy-MM-dd");
      const endStr = formData.durationMode === "single"
        ? startStr
        : formData.end_date ? format(formData.end_date, "yyyy-MM-dd") : startStr;
      const { error } = await supabase.from("leave_offsets").insert([{
        officer_name: formData.officer_name,
        type: formData.type,
        start_date: startStr,
        end_date: endStr,
        reason: formData.reason,
      }]);
      if (error) throw error;
      toast({ title: "Success", description: "Record added successfully.", variant: "success" });
      setShowModal(false);
      setFormData(EMPTY_FORM);
    } catch (err) {
      setError(err.message);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete Record",
      message: "Are you sure you want to delete this record?",
      isDestructive: true
    });
    if (!isConfirmed) return;
    try {
      const { error } = await supabase.from("leave_offsets").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Record deleted successfully.", variant: "success" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete record.", variant: "destructive" });
    }
  };

  const fmtRange = (start, end) => {
    if (!start) return "—";
    try {
      const s = format(new Date(start), "MMM d, yyyy");
      if (!end || start === end) return s;
      return `${format(new Date(start), "MMM d")} – ${format(new Date(end), "MMM d, yyyy")}`;
    } catch { return "—"; }
  };

  const typeStats = records.reduce((acc, r) => { acc[r.type] = (acc[r.type] || 0) + 1; return acc; }, {});

  // Label for calendar selection
  const calLabel = () => {
    const { durationMode, start_date, end_date } = formData;
    if (durationMode === "range") {
      if (start_date && end_date) return `${format(start_date, "MMM d")} – ${format(end_date, "MMM d, yyyy")}`;
      if (start_date) return `Start: ${format(start_date, "MMM d, yyyy")} — now click end date`;
      return "Click to select start date";
    }
    return start_date ? format(start_date, "MMMM d, yyyy") : "Click to select a date";
  };

  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <FiClock style={{ color: "var(--primary)" }} /> Leaves & Offsets
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>Track officer leave and offset records</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setFormData(EMPTY_FORM); setError(""); setShowModal(true); }}>
          <FiPlus /> Add Record
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid-3">
        {[
          { label: "Total Records", value: records.length, color: "var(--primary)" },
          { label: "Leaves", value: typeStats["Leave"] || 0, color: "var(--danger)" },
          { label: "Offsets", value: typeStats["Offset"] || 0, color: "var(--warning)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding: "1.25rem", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.2rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>
        ) : records.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            <FiCalendar size={36} style={{ opacity: 0.25, marginBottom: "0.75rem" }} />
            <p>No records yet. Click <strong>Add Record</strong> to get started.</p>
          </div>
        ) : (
          <>
          <div className="table-container preview-table-desktop" style={{ overflowX: "auto", border: "none" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Officer</th>
                  <th>Type</th>
                  <th>Date / Range</th>
                  <th>Reason</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <FiUser size={14} style={{ color: "var(--text-muted)" }} />
                        {r.officer_name}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${r.type === "Leave" ? "badge-error" : "badge-warning"}`}>{r.type}</span>
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>{fmtRange(r.start_date, r.end_date)}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.85rem", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.reason || "—"}</td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn-ghost" style={{ padding: "0.35rem 0.75rem", color: "var(--danger)" }} onClick={() => handleDelete(r.id)}>
                        <FiTrash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="preview-mobile-cards" style={{ padding: "1rem" }}>
            {records.map(r => (
              <div key={r.id} className="preview-ticket-card">
                <div className="preview-card-top">
                  <span className="preview-card-name" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <FiUser size={14} style={{ color: "var(--text-muted)" }} />
                    {r.officer_name}
                  </span>
                  <span className="preview-card-status">
                    <span className={`badge ${r.type === "Leave" ? "badge-error" : "badge-warning"}`}>{r.type}</span>
                  </span>
                </div>
                <div className="preview-card-bottom" style={{ marginBottom: r.reason ? "0.25rem" : "0.75rem" }}>
                  <span className="preview-card-date">{fmtRange(r.start_date, r.end_date)}</span>
                </div>
                {r.reason && (
                  <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                    {r.reason}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost" style={{ padding: "0.35rem 0.75rem", color: "var(--danger)", height: "auto" }} onClick={() => handleDelete(r.id)}>
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      {/* ── Add Record Modal ─────────────────────────────────────────────── */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[540px]" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.15rem" }}>
              <FiPlus style={{ color: "var(--primary)" }} />
              Add Leave or Offset
            </DialogTitle>
          </DialogHeader>

          <div className="modal-body">
            <form id="add-record-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>

              {error && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid var(--danger)", borderRadius: "var(--radius-md)", padding: "0.65rem 0.875rem", color: "var(--danger)", fontSize: "0.84rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <FiAlertCircle size={15} /> {error}
                </div>
              )}

              {/* Officer */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Officer</label>
                <Select value={formData.officer_name} onValueChange={v => setFormData(f => ({ ...f, officer_name: v }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select Officer..." /></SelectTrigger>
                  <SelectContent>
                    {officers.map(o => <SelectItem key={o.name} value={o.name}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Record Type — card buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Record Type</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                  {["Leave", "Offset"].map(t => {
                    const active = formData.type === t;
                    const activeColor = t === "Leave" ? "var(--danger)" : "var(--warning)";
                    const activeBg = t === "Leave" ? "rgba(239,68,68,0.07)" : "rgba(245,158,11,0.07)";
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormData(f => ({ ...f, type: t }))}
                        style={{
                          padding: "0.65rem 1rem",
                          border: `2px solid ${active ? activeColor : "var(--border)"}`,
                          borderRadius: "var(--radius-md)",
                          background: active ? activeBg : "transparent",
                          color: active ? activeColor : "var(--text-secondary)",
                          fontWeight: active ? 700 : 500,
                          cursor: "pointer",
                          fontSize: "0.9rem",
                          transition: "all 0.15s",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.4rem",
                        }}
                      >
                        {active && <FiCheckCircle size={14} />}
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Duration — pill toggle */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Duration</label>
                <div style={{ display: "inline-flex", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", padding: "0.2rem", border: "1px solid var(--border)", alignSelf: "flex-start" }}>
                  {[{ v: "single", label: "Single Day" }, { v: "range", label: "Multiple Days" }].map(({ v, label }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, durationMode: v, start_date: null, end_date: null }))}
                      style={{
                        padding: "0.4rem 1rem",
                        borderRadius: "calc(var(--radius-md) - 2px)",
                        border: "none",
                        background: formData.durationMode === v ? "var(--bg-card)" : "transparent",
                        color: formData.durationMode === v ? "var(--primary)" : "var(--text-muted)",
                        fontWeight: formData.durationMode === v ? 700 : 500,
                        cursor: "pointer",
                        fontSize: "0.82rem",
                        boxShadow: formData.durationMode === v ? "var(--shadow-sm)" : "none",
                        transition: "all 0.15s",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calendar */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label className="form-label" style={{ marginBottom: 0, display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <FiCalendar size={12} />
                  <span style={{ color: formData.start_date ? "var(--primary)" : "var(--text-muted)", fontStyle: formData.start_date ? "normal" : "italic" }}>
                    {calLabel()}
                  </span>
                </label>
                <CalendarPicker
                  mode={formData.durationMode === "range" ? "range" : "single"}
                  startDate={formData.start_date}
                  endDate={formData.end_date}
                  onChange={(start, end) => setFormData(f => ({ ...f, start_date: start, end_date: end }))}
                />
              </div>

              {/* Reason */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  Reason / Notes <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(Optional)</span>
                </label>
                <textarea
                  className="form-input"
                  rows="2"
                  value={formData.reason}
                  onChange={e => setFormData(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Enter reason for leave/offset..."
                />
              </div>

            </form>
          </div>

          <DialogFooter>
            <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={submitting}>Cancel</button>
            <button
              type="submit"
              form="add-record-form"
              className="btn btn-primary"
              disabled={submitting || !formData.officer_name || !formData.start_date || (formData.durationMode === "range" && !formData.end_date)}
            >
              {submitting ? "Saving…" : "Add Record"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

