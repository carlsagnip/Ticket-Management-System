import { useState } from "react";
import { supabase } from "../supabaseClient";
import {
  FiAlertCircle,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiInfo,
  FiMail,
  FiMapPin,
  FiSearch,
  FiTag,
  FiToggleLeft,
  FiToggleRight,
  FiUser,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import RemarksSection from "./RemarksSection";

function TicketDetails({
  ticket,
  onClose,
  readOnly = false,
  authorName,
  allowStatusUpdate = true,
}) {
  const [status, setStatus] = useState(ticket.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus);
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const { error } = await supabase
        .from("tickets")
        .update({ status: newStatus })
        .eq("id", ticket.id);

      if (error) throw error;
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (error) {
      console.error("Error updating status:", error);
      setError("Failed to update status");
      setStatus(ticket.status); // Revert on error
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High":
        return "var(--danger)";
      case "Medium":
        return "var(--warning)";
      case "Low":
        return "var(--success)";
      default:
        return "var(--text-muted)";
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "700px" }}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3 className="modal-title" style={{ marginBottom: "0.25rem" }}>
              Ticket Details
            </h3>
            <p
              style={{
                fontFamily: "monospace",
                fontSize: "0.875rem",
                color: "var(--primary)",
                margin: 0,
                fontWeight: "600",
              }}
            >
              {ticket.ticket_id}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span
              className={`badge badge-${status.toLowerCase().replace(" ", "-")}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                fontSize: "0.875rem",
                padding: "0.375rem 0.75rem",
              }}
            >
              {status === "Open" && <FiFileText />}
              {status === "In Progress" && <FiClock />}
              {status === "Resolved" && <FiCheckCircle />}
              {status === "Closed" && <FiXCircle />}
              {status}
            </span>
            <button
              className="btn btn-icon btn-ghost"
              onClick={onClose}
              style={{ width: "36px", height: "36px" }}
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Alerts */}
          {error && (
            <div className="alert alert-error">
              <FiXCircle />
              {error}
            </div>
          )}
          {success && (
            <div className="alert alert-success">
              <FiCheckCircle />
              Status updated successfully!
            </div>
          )}

          {/* Info Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <div>
              <label
                style={{
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  fontWeight: "600",
                  letterSpacing: "0.05em",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <FiUser size={14} />
                Full Name
              </label>
              <p
                style={{
                  fontSize: "1rem",
                  color: "var(--text-primary)",
                  margin: "0.5rem 0 0",
                  fontWeight: "500",
                }}
              >
                {ticket.full_name}
              </p>
            </div>

            <div>
              <label
                style={{
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  fontWeight: "600",
                  letterSpacing: "0.05em",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <FiInfo size={14} />
                Status
              </label>
              <p
                style={{
                  fontSize: "1rem",
                  color: "var(--text-primary)",
                  margin: "0.5rem 0 0",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                {status}
              </p>
            </div>

            <div>
              <label
                style={{
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  fontWeight: "600",
                  letterSpacing: "0.05em",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <FiMail size={14} />
                Email
              </label>
              <p
                style={{
                  fontSize: "1rem",
                  color: "var(--text-primary)",
                  margin: "0.5rem 0 0",
                  fontWeight: "500",
                }}
              >
                {ticket.email || "Not provided"}
              </p>
            </div>

            <div>
              <label
                style={{
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  fontWeight: "600",
                  letterSpacing: "0.05em",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <FiMapPin size={14} />
                Office
              </label>
              <p
                style={{
                  fontSize: "1rem",
                  color: "var(--text-primary)",
                  margin: "0.5rem 0 0",
                  fontWeight: "500",
                }}
              >
                {ticket.offices?.name || "N/A"}
              </p>
            </div>

            <div>
              <label
                style={{
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  fontWeight: "600",
                  letterSpacing: "0.05em",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <FiTag size={14} />
                Category
              </label>
              <p
                style={{
                  fontSize: "1rem",
                  color: "var(--text-primary)",
                  margin: "0.5rem 0 0",
                  fontWeight: "500",
                }}
              >
                {ticket.categories?.name || "N/A"}
              </p>
            </div>

            <div>
              <label
                style={{
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  fontWeight: "600",
                  letterSpacing: "0.05em",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <FiAlertCircle size={14} />
                Priority
              </label>
              <p
                style={{
                  fontSize: "1rem",
                  color: getPriorityColor(ticket.priority),
                  margin: "0.5rem 0 0",
                  fontWeight: "600",
                }}
              >
                {ticket.priority}
              </p>
            </div>

            <div>
              <label
                style={{
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  fontWeight: "600",
                  letterSpacing: "0.05em",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <FiCalendar size={14} />
                Created
              </label>
              <p
                style={{
                  fontSize: "1rem",
                  color: "var(--text-primary)",
                  margin: "0.5rem 0 0",
                  fontWeight: "500",
                }}
              >
                {formatDate(ticket.created_at)}
              </p>
            </div>
          </div>

          {/* Subject */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                fontSize: "0.75rem",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                fontWeight: "600",
                letterSpacing: "0.05em",
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                marginBottom: "0.5rem",
              }}
            >
              <FiFileText size={14} />
              Subject
            </label>
            <div
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "var(--radius-md)",
                padding: "0.875rem 1rem",
              }}
            >
              <p
                style={{
                  fontSize: "1rem",
                  color: "var(--text-primary)",
                  margin: 0,
                  fontWeight: "500",
                }}
              >
                {ticket.subject}
              </p>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                fontSize: "0.75rem",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                fontWeight: "600",
                letterSpacing: "0.05em",
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                marginBottom: "0.5rem",
              }}
            >
              <FiFileText size={14} />
              Description
            </label>
            <div
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "1rem",
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              <p
                style={{
                  fontSize: "0.9375rem",
                  color: "var(--text-secondary)",
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  lineHeight: "1.6",
                }}
              >
                {ticket.description}
              </p>
            </div>
          </div>

          {/* Remarks Section */}
          <RemarksSection
            ticketId={ticket.id}
            readOnly={readOnly}
            authorName={authorName}
          />

          {/* Status Change - Only show if not readOnly and updates allowed */}
          {!readOnly && allowStatusUpdate && (
            <div
              style={{
                borderTop: "1px solid var(--border)",
                paddingTop: "1.5rem",
              }}
            >
              <label
                className="form-label"
                htmlFor="status"
                style={{ marginBottom: "0.75rem" }}
              >
                Update Status
              </label>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {[
                  { label: "Open", icon: <FiFileText size={16} /> },
                  { label: "In Progress", icon: <FiClock size={16} /> },
                  { label: "Resolved", icon: <FiCheckCircle size={16} /> },
                  { label: "Closed", icon: <FiXCircle size={16} /> },
                ].map(({ label, icon }) => (
                  <button
                    key={label}
                    className={`btn btn-small ${status === label ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => handleStatusChange(label)}
                    disabled={saving}
                    style={{ gap: "0.375rem" }}
                  >
                    {status === label && saving ? (
                      <div
                        className="spinner"
                        style={{ width: "14px", height: "14px" }}
                      ></div>
                    ) : (
                      icon
                    )}
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            <FiX size={18} />
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default TicketDetails;
