import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import {
  FiUser,
  FiMail,
  FiMapPin,
  FiTag,
  FiAlertCircle,
  FiFileText,
  FiSend,
  FiSettings,
  FiCheckCircle,
  FiX,
} from "react-icons/fi";

function TicketForm() {
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    officeId: "",
    categoryId: "",
    priority: "Medium",
    subject: "",
    description: "",
  });

  // Dropdown options
  const [offices, setOffices] = useState([]);
  const [categories, setCategories] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [ticketId, setTicketId] = useState("");

  // Fetch offices and categories on mount
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

    if (error) {
      console.error("Error fetching offices:", error);
    } else {
      setOffices(data || []);
    }
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching categories:", error);
    } else {
      setCategories(data || []);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    if (!formData.officeId) {
      newErrors.officeId = "Please select an office";
    }

    if (!formData.categoryId) {
      newErrors.categoryId = "Please select a category";
    }

    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Get current ticket count for ID generation
      const { count } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true });

      const ticketCount = count || 0;
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");

      const { data, error } = await supabase
        .from("tickets")
        .insert([
          {
            full_name: formData.fullName,
            email: formData.email || null,
            office_id: formData.officeId,
            category_id: formData.categoryId,
            priority: formData.priority,
            subject: formData.subject,
            description: formData.description,
            status: "Open", // Default status
            // Generate ticket ID with incrementing number
            // Format: TCKT-YYYYMMDD-COUNT
            ticket_id: `TCKT-${dateStr}${ticketCount + 1}`,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Show success message with ticket ID
      setTicketId(data.ticket_id);
      setShowSuccess(true);

      // Reset form
      setFormData({
        fullName: "",
        email: "",
        officeId: "",
        categoryId: "",
        priority: "Medium",
        subject: "",
        description: "",
      });
    } catch (error) {
      console.error("❌ Error submitting ticket:", error);
      console.error("Error details:", {
        message: error.message,
        hint: error.hint,
        details: error.details,
        code: error.code,
      });

      // More specific error messages based on the error
      let errorMessage = "Failed to submit ticket. Please try again.";

      if (error.message?.includes("JWT")) {
        errorMessage =
          "Authentication error. Please check your Supabase credentials in .env.local";
      } else if (error.message?.includes("violates row-level security")) {
        errorMessage =
          "Database permission error. Please ensure the RLS policies are set up correctly.";
      } else if (error.message?.includes("null value in column")) {
        errorMessage =
          "Missing required field in database. Please check the schema.";
      } else if (error.code === "PGRST116") {
        errorMessage =
          "Network error. Please check your Supabase URL and internet connection.";
      }

      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const closeSuccessModal = () => {
    setShowSuccess(false);
    setTicketId("");
  };

  return (
    <div className="page-container">
      <div className="container">
        <div style={{ maxWidth: "800px", margin: "2rem auto" }}>
          {/* Header */}
          <div className="text-center" style={{ marginBottom: "2rem" }}>
            <div
              style={{
                width: "80px",
                height: "80px",
                margin: "0 auto 1.5rem",
                background: "var(--primary)",
                borderRadius: "var(--radius-lg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "var(--shadow-lg)",
              }}
            >
              <FiFileText
                style={{ width: "40px", height: "40px", color: "white" }}
              />
            </div>
            <h1
              style={{
                color: "var(--text-primary)",
                marginBottom: "0.5rem",
                fontSize: "2rem",
                fontWeight: "700",
              }}
            >
              Submit a Ticket
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
              We're here to help! Submit your request below.
            </p>
          </div>

          {/* Ticket Form Card */}
          <div className="card" style={{ boxShadow: "var(--shadow-lg)" }}>
            <form onSubmit={handleSubmit}>
              {/* Error Alert */}
              {errors.submit && (
                <div
                  className="alert alert-error"
                  style={{ marginBottom: "1.5rem" }}
                >
                  <FiAlertCircle />
                  {errors.submit}
                </div>
              )}

              {/* Full Name */}
              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="fullName"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    textTransform: "none",
                  }}
                >
                  <FiUser size={16} />
                  Full Name
                  <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  className="form-input"
                  placeholder="Ex. Juan Dela Cruz"
                  value={formData.fullName}
                  onChange={handleChange}
                />
                {errors.fullName && (
                  <p
                    style={{
                      color: "var(--danger)",
                      fontSize: "0.875rem",
                      marginTop: "0.25rem",
                    }}
                  >
                    {errors.fullName}
                  </p>
                )}
              </div>

              {/* Email (Optional) */}
              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="email"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    textTransform: "none",
                  }}
                >
                  <FiMail size={16} />
                  Email (Optional)
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="form-input"
                  placeholder="juandelacruz@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              {/* Office & Category Row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                {/* Office */}
                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="officeId"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      textTransform: "none",
                    }}
                  >
                    <FiMapPin size={16} />
                    Office
                    <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <select
                    id="officeId"
                    name="officeId"
                    className="form-select"
                    value={formData.officeId}
                    onChange={handleChange}
                  >
                    <option value="">Select an office</option>
                    {offices.map((office) => (
                      <option key={office.id} value={office.id}>
                        {office.name}
                      </option>
                    ))}
                  </select>
                  {errors.officeId && (
                    <p
                      style={{
                        color: "var(--danger)",
                        fontSize: "0.875rem",
                        marginTop: "0.25rem",
                      }}
                    >
                      {errors.officeId}
                    </p>
                  )}
                </div>

                {/* Category */}
                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="categoryId"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      textTransform: "none",
                    }}
                  >
                    <FiTag size={16} />
                    Category
                    <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <select
                    id="categoryId"
                    name="categoryId"
                    className="form-select"
                    value={formData.categoryId}
                    onChange={handleChange}
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.categoryId && (
                    <p
                      style={{
                        color: "var(--danger)",
                        fontSize: "0.875rem",
                        marginTop: "0.25rem",
                      }}
                    >
                      {errors.categoryId}
                    </p>
                  )}
                </div>
              </div>

              {/* Priority */}
              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="priority"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    textTransform: "none",
                  }}
                >
                  <FiAlertCircle size={16} />
                  Priority
                  <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <select
                  id="priority"
                  name="priority"
                  className="form-select"
                  value={formData.priority}
                  onChange={handleChange}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              {/* Subject */}
              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="subject"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    textTransform: "none",
                  }}
                >
                  <FiFileText size={16} />
                  Subject
                  <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  className="form-input"
                  placeholder="Brief summary of your request"
                  value={formData.subject}
                  onChange={handleChange}
                />
                {errors.subject && (
                  <p
                    style={{
                      color: "var(--danger)",
                      fontSize: "0.875rem",
                      marginTop: "0.25rem",
                    }}
                  >
                    {errors.subject}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="description"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    textTransform: "none",
                  }}
                >
                  <FiFileText size={16} />
                  Description
                  <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  className="form-textarea"
                  placeholder="Provide details about your request..."
                  value={formData.description}
                  onChange={handleChange}
                  rows={6}
                />
                {errors.description && (
                  <p
                    style={{
                      color: "var(--danger)",
                      fontSize: "0.875rem",
                      marginTop: "0.25rem",
                    }}
                  >
                    {errors.description}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading}
                style={{ marginTop: "0.5rem" }}
              >
                {loading ? (
                  <>
                    <div
                      className="spinner"
                      style={{ width: "18px", height: "18px" }}
                    ></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <FiSend size={18} />
                    Submit Ticket
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Admin Controls */}
      <div
        style={{
          position: "fixed",
          bottom: "2rem",
          right: "2rem",
          display: "flex",
          gap: "1rem",
          zIndex: 100,
        }}
      >
        <button
          onClick={() => navigate("/preview")}
          className="btn btn-icon"
          style={{
            background: "var(--primary)",
            border: "1px solid var(--border)",
            width: "48px",
            height: "48px",
            boxShadow: "var(--shadow-lg)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          title="Preview Tickets"
        >
          <FiFileText size={24} style={{ color: "white" }} />
        </button>

        <button
          onClick={() => navigate("/admin/login")}
          className="btn btn-icon"
          style={{
            background: "var(--secondary)",
            border: "1px solid var(--border)",
            width: "48px",
            height: "48px",
            boxShadow: "var(--shadow-lg)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          title="Admin Login"
        >
          <FiSettings size={24} style={{ color: "white" }} />
        </button>
      </div>

      {/* Success Modal */}
      {showSuccess && (
        <div className="modal-overlay" onClick={closeSuccessModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3
                className="modal-title"
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <FiCheckCircle style={{ color: "var(--success)" }} />
                Ticket Submitted!
              </h3>
              <button
                className="btn btn-icon btn-ghost"
                onClick={closeSuccessModal}
                style={{ width: "36px", height: "36px" }}
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    margin: "0 auto 1.5rem",
                    background: "var(--success)",
                    borderRadius: "var(--radius-lg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FiCheckCircle
                    style={{ width: "40px", height: "40px", color: "white" }}
                  />
                </div>
                <p
                  style={{
                    fontSize: "1.125rem",
                    marginBottom: "1rem",
                    color: "var(--text-primary)",
                    fontWeight: "600",
                  }}
                >
                  Your ticket has been successfully submitted!
                </p>
                <div
                  style={{
                    background: "#eff6ff",
                    border: "2px solid var(--primary)",
                    borderRadius: "var(--radius-md)",
                    padding: "1.25rem",
                    marginTop: "1.5rem",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--text-secondary)",
                      marginBottom: "0.5rem",
                      fontWeight: "600",
                    }}
                  >
                    Your Ticket ID
                  </p>
                  <p
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "700",
                      color: "var(--primary)",
                      fontFamily: "monospace",
                      margin: 0,
                    }}
                  >
                    {ticketId}
                  </p>
                </div>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--text-muted)",
                    marginTop: "1rem",
                  }}
                >
                  Please save this ID for your reference.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={closeSuccessModal}>
                <FiCheckCircle size={18} />
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TicketForm;
