import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useToast } from "./ui/use-toast";
import {
  FiUser,
  FiMail,
  FiMapPin,
  FiTag,
  FiAlertCircle,
  FiFileText,
  FiSend,
  FiCheckCircle,
  FiX,
  FiPaperclip,
  FiTrash2,
} from "react-icons/fi";
import SearchableSelect from "./SearchableSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

function TicketFormModal({ onClose }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    officeId: "",
    categoryId: "",
    priority: "Medium",
    errorType: "",
    subject: "",
    description: "",
  });

  const [offices, setOffices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [attachment, setAttachment] = useState(null);

  useEffect(() => {
    fetchOffices();
    fetchCategories();
  }, []);

  const fetchOffices = async () => {
    const { data, error } = await supabase
      .from("offices")
      .select("*")
      .eq("is_active", true)
      .order("name");
    if (!error) setOffices(data || []);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("name");
    if (!error) setCategories(data || []);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateAll = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.officeId) newErrors.officeId = "Please select an office";
    if (!formData.categoryId) newErrors.categoryId = "Please select a category";
    if (!formData.errorType) newErrors.errorType = "Please select an error type";
    if (!formData.subject.trim()) newErrors.subject = "Subject is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAll()) {
      return;
    }

    setLoading(true);
    const MAX_RETRIES = 3;
    let attempts = 0;
    let submitted = false;
    let lastError = null;

    while (attempts < MAX_RETRIES && !submitted) {
      try {
        attempts++;
        const { count, error: countError } = await supabase
          .from("tickets")
          .select("*", { count: "exact", head: true });
        if (countError) throw countError;

        const ticketCount = count || 0;
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const newTicketId = `TCKT-${dateStr}${ticketCount + 1}`;

        let attachmentUrl = null;
        if (attachment) {
          const fileExt = attachment.name.split(".").pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("ticket-attachments")
            .upload(filePath, attachment);

          if (uploadError) {
            console.error("Upload error:", uploadError);
          } else {
            const { data: publicUrlData } = supabase.storage
              .from("ticket-attachments")
              .getPublicUrl(filePath);
            attachmentUrl = publicUrlData.publicUrl;
          }
        }

        const { data, error } = await supabase
          .from("tickets")
          .insert([
            {
              full_name: formData.fullName,
              email: formData.email || null,
              office_id: formData.officeId,
              category_id: formData.categoryId,
              priority: formData.priority,
              error_type: formData.errorType,
              subject: formData.subject,
              description: formData.description,
              attachment_url: attachmentUrl,
              status: "Open",
              ticket_id: newTicketId,
            },
          ])
          .select()
          .single();

        if (error) {
          if (error.code === "23505" && attempts < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));
            continue;
          }
          throw error;
        }

        submitted = true;
        setTicketId(data.ticket_id);
        setShowSuccess(true);
        toast({
          title: "Ticket Created Successfully",
          description: `Ticket ID #${data.ticket_id} has been created.`,
          variant: "success"
        });
        setFormData({
          fullName: "", email: "", officeId: "", categoryId: "",
          priority: "Medium", errorType: "", subject: "", description: "",
        });
        setAttachment(null);
      } catch (error) {
        lastError = error;
        if (error.code !== "23505" || attempts >= MAX_RETRIES) break;
      }
    }

    if (!submitted) {
      let errorMessage = "Failed to submit ticket. Please try again.";
      if (lastError?.code === "23505") errorMessage = "System is busy. Please try again.";
      setErrors({ submit: errorMessage });
      toast({
        title: "Creation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const ErrorText = ({ error }) =>
    error ? (
      <p style={{ color: "var(--danger)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
        {error}
      </p>
    ) : null;

  if (showSuccess) {
    return (
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
          backgroundColor: "rgba(0, 0, 0, 0.5)", padding: "1rem",
          animation: "fadeIn 0.3s ease-out",
        }}
        onClick={() => { setShowSuccess(false); onClose(); }}
      >
        <div
          className="card"
          style={{
            maxWidth: "480px", width: "100%", padding: "2.5rem",
            backgroundColor: "var(--bg-card)",
            animation: "slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
            textAlign: "center",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              width: "80px", height: "80px", margin: "0 auto 1.5rem",
              background: "var(--success)", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <FiCheckCircle style={{ width: "40px", height: "40px", color: "white" }} />
          </div>
          <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Ticket Submitted!
          </h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
            Your ticket has been successfully submitted.
          </p>
          <div
            style={{
              background: "#eff6ff", border: "2px solid var(--primary)",
              borderRadius: "var(--radius-md)", padding: "1.25rem", marginBottom: "1rem",
            }}
          >
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem", fontWeight: 600 }}>
              Your Ticket ID
            </p>
            <p style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--primary)", fontFamily: "monospace", margin: 0 }}>
              {ticketId}
            </p>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
            Please save this ID for your reference.
          </p>
          <button
            className="btn btn-primary w-full"
            onClick={() => { setShowSuccess(false); onClose(); }}
          >
            <FiCheckCircle size={18} /> Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)", padding: "1rem",
        animation: "fadeIn 0.3s ease-out",
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: "700px", width: "100%", padding: 0,
          backgroundColor: "var(--bg-card)", overflow: "hidden",
          animation: "slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
          display: "flex", flexDirection: "column",
          maxHeight: "90vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.5rem 2rem", borderBottom: "1px solid var(--border)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "var(--bg-elevated)", flexShrink: 0,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Submit a Ticket
            </h2>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Fill in the details below to submit your request
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "none",
              cursor: "pointer", color: "var(--text-muted)", padding: "0.5rem",
            }}
          >
            <FiX size={22} />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="hide-scrollbar" style={{ padding: "1.75rem 2rem", overflow: "auto", flex: 1 }}>
          <form onSubmit={handleSubmit} id="ticket-form" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {errors.submit && (
              <div className="alert alert-error">
                <FiAlertCircle /> {errors.submit}
              </div>
            )}

            {/* Personal Info Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="modal-fullName"
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", textTransform: "none" }}>
                  <FiUser size={16} /> Full Name <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input id="modal-fullName" name="fullName" type="text" className="form-input"
                  placeholder="Ex. Juan Dela Cruz" value={formData.fullName} onChange={handleChange} style={{ margin: 0 }} />
                <ErrorText error={errors.fullName} />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="modal-email"
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", textTransform: "none" }}>
                  <FiMail size={16} /> Email (Optional)
                </label>
                <input id="modal-email" name="email" type="email" className="form-input"
                  placeholder="juandelacruz@example.com" value={formData.email} onChange={handleChange} style={{ margin: 0 }} />
              </div>
            </div>

            {/* Ticket Details Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <SearchableSelect
                label="Office"
                icon={FiMapPin}
                options={offices}
                value={formData.officeId}
                onChange={handleChange}
                placeholder="Select an office"
                error={errors.officeId}
                required
                modal
              />

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="modal-categoryId"
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", textTransform: "none", marginBottom: "0.5rem" }}>
                  <FiTag size={16} /> Category <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <Select value={formData.categoryId} onValueChange={(value) => handleSelectChange("categoryId", value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ErrorText error={errors.categoryId} />
              </div>
            </div>

            {/* Priority & Error Type Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="modal-priority"
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", textTransform: "none", marginBottom: "0.5rem" }}>
                  <FiAlertCircle size={16} /> Priority <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <Select value={formData.priority} onValueChange={(value) => handleSelectChange("priority", value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="modal-errorType"
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", textTransform: "none", marginBottom: "0.5rem" }}>
                  <FiAlertCircle size={16} /> Error Type <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <Select value={formData.errorType} onValueChange={(value) => handleSelectChange("errorType", value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Error Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="User Error">User Error</SelectItem>
                    <SelectItem value="System Error">System Error</SelectItem>
                  </SelectContent>
                </Select>
                <ErrorText error={errors.errorType} />
              </div>
            </div>

            {/* Subject */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="modal-subject"
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", textTransform: "none" }}>
                <FiFileText size={16} /> Subject <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input id="modal-subject" name="subject" type="text" className="form-input"
                placeholder="Brief summary of your request" value={formData.subject}
                onChange={handleChange} style={{ margin: 0 }} />
              <ErrorText error={errors.subject} />
            </div>

            {/* Description */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="modal-description"
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", textTransform: "none" }}>
                <FiFileText size={16} /> Description <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <textarea id="modal-description" name="description" className="form-textarea"
                placeholder="Provide details about your request..." value={formData.description}
                onChange={handleChange} rows={5} style={{ margin: 0 }} />
              <ErrorText error={errors.description} />
            </div>

            {/* File Attachment */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label"
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", textTransform: "none" }}>
                <FiPaperclip size={16} /> Attachment (Optional)
              </label>
              {!attachment ? (
                <div style={{ position: "relative" }}>
                  <input
                    type="file"
                    id="modal-attachment"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setAttachment(e.target.files[0]);
                      }
                    }}
                    style={{
                      position: "absolute", width: "100%", height: "100%", opacity: 0, cursor: "pointer", zIndex: 2
                    }}
                  />
                  <div className="form-input" style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", borderStyle: "dashed", cursor: "pointer", color: "var(--text-muted)", margin: 0
                  }}>
                    <FiPaperclip /> Click or drag to attach a file
                  </div>
                </div>
              ) : (
                <div className="form-input" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-elevated)", margin: 0 }}>
                  <span style={{ fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, paddingRight: "1rem" }}>
                    {attachment.name}
                  </span>
                  <button type="button" onClick={() => setAttachment(null)} style={{ background: "transparent", border: "none", color: "var(--danger)", cursor: "pointer", display: "flex", alignItems: "center", padding: "0.25rem" }} title="Remove attachment">
                    <FiTrash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer with Submit button */}
        <div
          style={{
            padding: "1.25rem 2rem", borderTop: "1px solid var(--border)",
            display: "flex", justifyContent: "flex-end", alignItems: "center",
            background: "var(--bg-elevated)", flexShrink: 0, gap: "1rem",
          }}
        >
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="submit"
            form="ticket-form"
            className="btn btn-primary"
            disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: "16px", height: "16px" }}></div>
                Submitting...
              </>
            ) : (
              <>
                <FiSend size={16} /> Submit Ticket
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TicketFormModal;
