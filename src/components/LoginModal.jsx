import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { FiLock, FiMail, FiKey, FiShield, FiAlertCircle, FiX } from "react-icons/fi";

function LoginModal({ onClose }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/admin/dashboard");
      }
    });
  }, [navigate]);

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
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        padding: "1rem",
        animation: "fadeIn 0.3s ease-out",
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          boxShadow: "var(--shadow-xl)",
          maxWidth: "550px",
          width: "100%",
          padding: "3rem",
          position: "relative",
          backgroundColor: "var(--bg-card)",
          animation: "slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
          }}
        >
          <FiX size={24} />
        </button>

        <div className="text-center">
          <img
            src="/logo.jpg"
            alt="Palayan City ICT Logo"
            style={{
              width: "100px",
              height: "100px",
              margin: "0 auto 1.5rem",
              borderRadius: "50%",
              objectFit: "cover",
              boxShadow: "var(--shadow-md)",
              display: "block",
            }}
          />
          <h2
            style={{
              color: "var(--text-primary)",
              marginBottom: "0.5rem",
              fontSize: "1.8rem",
              fontWeight: "800",
            }}
          >
            Palayan City ICT System
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "1rem", marginBottom: "2rem" }}>
            Admin Login - Sign in to manage tickets and settings
          </p>
        </div>

        <form onSubmit={handleLogin}>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>
              <FiAlertCircle />
              {error}
            </div>
          )}

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

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
            style={{ marginTop: "1rem" }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: "18px", height: "18px" }}></div>
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
    </div>
  );
}

export default LoginModal;
