import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import {
  FiLock,
  FiMail,
  FiKey,
  FiArrowLeft,
  FiShield,
  FiAlertCircle,
} from "react-icons/fi";

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Redirect to dashboard on successful login
      navigate("/admin/dashboard");
    } catch (error) {
      setError(error.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="container">
        <div className="auth-container">
          {/* Header with Icon */}
          <div className="text-center">
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
              <FiShield
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
              Ticket Management System Admin Login
            </h1>
            <p
              style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}
            >
              Sign in to manage tickets and settings
            </p>
          </div>

          {/* Login Card */}
          <div className="card" style={{ boxShadow: "var(--shadow-lg)" }}>
            <form onSubmit={handleLogin}>
              {/* Error Alert */}
              {error && (
                <div
                  className="alert alert-error"
                  style={{ marginBottom: "1.5rem" }}
                >
                  <FiAlertCircle />
                  {error}
                </div>
              )}

              {/* Email */}
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
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div className="form-group">
                <label
                  className="form-label"
                  htmlFor="password"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    textTransform: "none",
                  }}
                >
                  <FiKey size={16} />
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading}
                style={{ marginTop: "1rem" }}
              >
                {loading ? (
                  <>
                    <div
                      className="spinner"
                      style={{ width: "18px", height: "18px" }}
                    ></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    <FiLock size={18} />
                    Sign In
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Back to Ticket Form */}
          <button
            onClick={() => navigate("/")}
            className="btn btn-ghost"
            style={{ margin: "0 auto" }}
          >
            <FiArrowLeft size={18} />
            Back to Ticket Form
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
