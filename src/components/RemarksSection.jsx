import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { FiMessageSquare, FiSend, FiUser, FiClock } from "react-icons/fi";

const RemarksSection = ({ ticketId, readOnly = false }) => {
  const [Remarks, setRemarks] = useState([]);
  const [newRemark, setNewRemark] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRemarks();
  }, [ticketId]);

  const fetchRemarks = async () => {
    try {
      const { data, error } = await supabase
        .from("ticket_comments")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setRemarks(data || []);
    } catch (error) {
      console.error("Error fetching Remarks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newRemark.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("ticket_comments").insert([
        {
          ticket_id: ticketId,
          content: newRemark.trim(),
          author_name: "Developer", // Ideally fetch from auth session
        },
      ]);

      if (error) throw error;
      setNewRemark("");
      fetchRemarks(); // Refresh list
    } catch (error) {
      console.error("Error adding Remark:", error);
      alert("Failed to add Remark");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
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
          marginBottom: "0.75rem",
        }}
      >
        <FiMessageSquare size={14} />
        Remarks ({Remarks.length})
      </label>

      {/* Remarks List */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          marginBottom: "1rem",
          maxHeight: "300px",
          overflowY: "auto",
        }}
      >
        {loading ? (
          <div
            style={{
              padding: "1rem",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            Loading Remarks...
          </div>
        ) : Remarks.length === 0 ? (
          <div
            style={{
              padding: "1.5rem",
              textAlign: "center",
              background: "#f8fafc",
              borderRadius: "8px",
              border: "1px dashed #e2e8f0",
              color: "var(--text-muted)",
              fontSize: "0.875rem",
            }}
          >
            No Remarks yet. Start the conversation!
          </div>
        ) : (
          Remarks.map((Remark) => (
            <div
              key={Remark.id}
              style={{
                display: "flex",
                gap: "0.75rem",
                animation: "fadeIn 0.3s ease",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "#e0e7ff",
                  color: "#4f46e5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: "0.75rem",
                  fontWeight: "600",
                }}
              >
                {Remark.author_name?.charAt(0) || "A"}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    background: "#f1f5f9",
                    padding: "0.75rem 1rem",
                    borderRadius: "0 12px 12px 12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.25rem",
                      fontSize: "0.75rem",
                    }}
                  >
                    <span style={{ fontWeight: "600", color: "#334155" }}>
                      {Remark.author_name}
                    </span>
                    <span
                      style={{
                        color: "#94a3b8",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      {formatDate(Remark.created_at)}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.9375rem",
                      color: "#1e293b",
                      whiteSpace: "pre-wrap",
                      lineHeight: "1.5",
                    }}
                  >
                    {Remark.content}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Remark Field - Only show if not readOnly */}
      {!readOnly && (
        <form onSubmit={handleSubmit} style={{ position: "relative" }}>
          <textarea
            placeholder="Type a Remark..."
            value={newRemark}
            onChange={(e) => setNewRemark(e.target.value)}
            style={{
              width: "100%",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              padding: "0.75rem 3rem 0.75rem 0.75rem",
              minHeight: "44px",
              fontSize: "0.9375rem",
              resize: "vertical",
              fontFamily: "inherit",
            }}
            disabled={submitting}
          />
          <button
            type="submit"
            className="btn-icon"
            disabled={!newRemark.trim() || submitting}
            style={{
              position: "absolute",
              right: "8px",
              bottom: "10px", // Align to bottom if multiline
              background: newRemark.trim() ? "var(--primary)" : "#e2e8f0",
              color: newRemark.trim() ? "white" : "#94a3b8",
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: newRemark.trim() ? "pointer" : "default",
              transition: "all 0.2s",
            }}
          >
            {submitting ? (
              <div
                className="spinner"
                style={{
                  width: "14px",
                  height: "14px",
                  borderTopColor: "white",
                  borderRightColor: "white",
                }}
              ></div>
            ) : (
              <FiSend size={14} />
            )}
          </button>
        </form>
      )}
    </div>
  );
};

export default RemarksSection;
