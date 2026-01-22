import { useState } from "react";
import { supabase } from "../supabaseClient";

import {
  FiAlertCircle,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiEdit2,
  FiFileText,
  FiInfo,
  FiMail,
  FiMapPin,
  FiPaperclip,
  FiSave,
  FiSearch,
  FiTag,
  FiToggleLeft,
  FiToggleRight,
  FiUser,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import RemarksSection from "./RemarksSection";
import imageCompression from "browser-image-compression";

function TicketDetails({
  ticket,
  onClose,
  readOnly = false,
  authorName,
  allowStatusUpdate = true,
  allowAttachmentEdit = true,
  allowRemarks = true,
}) {
  const [status, setStatus] = useState(ticket.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState(ticket.attachment_url);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [editableDescription, setEditableDescription] = useState(
    ticket.description,
  );
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);

  const deleteAttachmentFromStorage = async (url) => {
    if (!url) return;
    try {
      const path = url.split("ticket-attachments/")[1];
      if (path) {
        const decodedPath = decodeURIComponent(path);
        console.log("Deleting file from storage:", decodedPath);
        const { error } = await supabase.storage
          .from("ticket-attachments")
          .remove([decodedPath]);
        if (error) console.error("Error deleting file:", error);
      }
    } catch (err) {
      console.error("Error in deleteAttachmentFromStorage:", err);
    }
  };

  const handleImageUpload = async (event) => {
    const imageFile = event.target.files[0];
    if (!imageFile) return;

    setUploading(true);
    setError("");

    try {
      // Delete existing attachment if present
      if (attachmentUrl) {
        await deleteAttachmentFromStorage(attachmentUrl);
      }

      console.log("Original size:", imageFile.size / 1024 / 1024, "MB");

      const options = {
        maxSizeMB: 0.15, // 150KB
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(imageFile, options);
      console.log("Compressed size:", compressedFile.size / 1024 / 1024, "MB");

      // Upload to Supabase Storage
      const fileName = `${ticket.id}/${Date.now()}-${imageFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("ticket-attachments")
        .upload(fileName, compressedFile);

      if (uploadError) throw uploadError;

      // Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from("ticket-attachments")
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;

      // Update Ticket Record
      const { error: updateError } = await supabase
        .from("tickets")
        .update({ attachment_url: publicUrl })
        .eq("id", ticket.id);

      if (updateError) throw updateError;

      setAttachmentUrl(publicUrl);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (error) {
      console.error("Error uploading image:", error);
      setError("Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

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

  const handleSaveDescription = async () => {
    setSavingDescription(true);
    setError("");
    setSuccess(false);

    try {
      const { error } = await supabase
        .from("tickets")
        .update({ description: editableDescription })
        .eq("id", ticket.id);

      if (error) throw error;
      setSuccess(true);
      setIsEditingDescription(false);
      setTimeout(() => setSuccess(false), 2000);
    } catch (error) {
      console.error("Error updating description:", error);
      setError("Failed to update description");
      setEditableDescription(ticket.description); // Revert on error
    } finally {
      setSavingDescription(false);
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.5rem",
              }}
            >
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
                <FiFileText size={14} />
                Description
              </label>
              {!readOnly && !isEditingDescription && (
                <button
                  className="btn btn-small btn-ghost"
                  onClick={() => setIsEditingDescription(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    padding: "0.25rem 0.5rem",
                  }}
                  title="Edit description"
                >
                  <FiEdit2 size={14} />
                  Edit
                </button>
              )}
            </div>
            {isEditingDescription ? (
              <div>
                <textarea
                  value={editableDescription}
                  onChange={(e) => setEditableDescription(e.target.value)}
                  style={{
                    width: "100%",
                    minHeight: "150px",
                    padding: "1rem",
                    border: "1px solid var(--primary)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-elevated)",
                    fontSize: "0.9375rem",
                    color: "var(--text-secondary)",
                    lineHeight: "1.6",
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                  disabled={savingDescription}
                />
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    marginTop: "0.75rem",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    className="btn btn-small btn-ghost"
                    onClick={() => {
                      setIsEditingDescription(false);
                      setEditableDescription(ticket.description);
                    }}
                    disabled={savingDescription}
                  >
                    <FiX size={14} />
                    Cancel
                  </button>
                  <button
                    className="btn btn-small btn-primary"
                    onClick={handleSaveDescription}
                    disabled={savingDescription}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                    }}
                  >
                    {savingDescription ? (
                      <div
                        className="spinner"
                        style={{ width: "14px", height: "14px" }}
                      ></div>
                    ) : (
                      <FiSave size={14} />
                    )}
                    Save
                  </button>
                </div>
              </div>
            ) : (
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
                  {editableDescription}
                </p>
              </div>
            )}
          </div>

          {/* Attachment Section */}
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
              <FiPaperclip size={14} />
              Attachment
            </label>
            <div
              style={{
                border: "1px dashed var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "1rem",
                background: "var(--bg-card)",
              }}
            >
              {attachmentUrl ? (
                <div style={{ position: "relative" }}>
                  <img
                    src={attachmentUrl}
                    alt="Ticket Attachment"
                    onClick={() => setImagePreviewOpen(true)}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "300px",
                      borderRadius: "var(--radius-sm)",
                      display: "block",
                      cursor: "zoom-in",
                    }}
                    title="Click to enlarge"
                  />

                  <div
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      display: "flex",
                      gap: "0.5rem",
                    }}
                  >
                    <button
                      className="btn btn-small btn-primary"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const response = await fetch(attachmentUrl);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = url;
                          link.download = `attachment-${ticket.ticket_id}.${blob.type.split("/")[1] || "jpg"}`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          window.URL.revokeObjectURL(url);
                        } catch (error) {
                          console.error("Error downloading image:", error);
                          // Fallback to opening in new tab if fetch fails
                          window.open(attachmentUrl, "_blank");
                        }
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "32px",
                        height: "32px",
                        padding: 0,
                        cursor: "pointer",
                      }}
                      title="Download image"
                    >
                      <FiDownload size={16} />
                    </button>

                    {!readOnly && allowAttachmentEdit && (
                      <button
                        className="btn btn-small btn-danger"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (
                            !confirm(
                              "Are you sure you want to remove this attachment?",
                            )
                          )
                            return;
                          try {
                            // Delete from storage first
                            await deleteAttachmentFromStorage(attachmentUrl);

                            const { error: updateError } = await supabase
                              .from("tickets")
                              .update({ attachment_url: null })
                              .eq("id", ticket.id);

                            if (updateError) throw updateError;

                            setAttachmentUrl(null);
                          } catch (e) {
                            console.error(e);
                            setError("Failed to remove attachment");
                          }
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "32px",
                          height: "32px",
                          padding: 0,
                        }}
                        title="Remove attachment"
                      >
                        <FiX size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                !readOnly &&
                allowAttachmentEdit && (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: "none" }}
                      id="file-upload"
                      disabled={uploading}
                    />
                    <label
                      htmlFor="file-upload"
                      className={`btn ${uploading ? "btn-disabled" : "btn-secondary"}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        cursor: uploading ? "not-allowed" : "pointer",
                      }}
                    >
                      {uploading ? (
                        <>
                          <div
                            className="spinner"
                            style={{ width: "16px", height: "16px" }}
                          ></div>
                          Compressing & Uploading...
                        </>
                      ) : (
                        <>
                          <FiPaperclip />
                          Attach Image (Max 150KB Compressed)
                        </>
                      )}
                    </label>
                  </div>
                )
              )}
              {!attachmentUrl && (readOnly || !allowAttachmentEdit) && (
                <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                  No attachment provided.
                </p>
              )}
            </div>
          </div>

          {/* Remarks Section */}
          <RemarksSection
            ticketId={ticket.id}
            readOnly={readOnly && !allowRemarks}
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

      {/* Image Lightbox */}
      {imagePreviewOpen && attachmentUrl && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            zIndex: 1000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "2rem",
          }}
          onClick={() => setImagePreviewOpen(false)}
        >
          <button
            onClick={() => setImagePreviewOpen(false)}
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              background: "transparent",
              border: "none",
              color: "white",
              cursor: "pointer",
            }}
          >
            <FiX size={32} />
          </button>

          <img
            src={attachmentUrl}
            alt="Full size attachment"
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              borderRadius: "4px",
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default TicketDetails;
