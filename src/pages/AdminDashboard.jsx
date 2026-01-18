import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import TicketList from "../components/TicketList";
import ManageOffices from "../components/ManageOffices";
import ManageCategories from "../components/ManageCategories";
import { FiLogOut, FiFileText, FiMapPin, FiTag, FiGrid } from "react-icons/fi";

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("tickets");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  return (
    <div
      className="page-container"
      style={{
        minHeight: "100vh",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Navigation Bar */}
      <div
        style={{
          background: "white",
          borderBottom: "1px solid var(--border)",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          padding: "0.4rem",
        }}
      >
        <div
          style={{
            maxWidth: "100%",
            padding: "0 2rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            height: "64px",
          }}
        >
          {/* Left: Branding */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                background: "var(--primary)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FiGrid
                style={{ width: "24px", height: "24px", color: "white" }}
              />
            </div>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "1.125rem",
                  fontWeight: "700",
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                }}
              >
                Ticket Management System
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                  fontWeight: "500",
                }}
              >
                Admin Dashboard
              </p>
            </div>
          </div>

          {/* Center: Navigation Tabs */}
          <div style={{ display: "flex", gap: "0.5rem", marginRight: "11rem" }}>
            <button
              className={`nav-tab ${activeTab === "tickets" ? "active" : ""}`}
              onClick={() => setActiveTab("tickets")}
              style={{
                background:
                  activeTab === "tickets" ? "var(--primary)" : "transparent",
                color:
                  activeTab === "tickets" ? "white" : "var(--text-secondary)",
                border: "1px solid",
                borderColor:
                  activeTab === "tickets" ? "var(--primary)" : "var(--border)",
                padding: "0.5rem 1rem",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: "600",
                transition: "all 0.2s ease",
                height: "40px",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <FiFileText size={18} />
              Tickets
            </button>
            <button
              className={`nav-tab ${activeTab === "offices" ? "active" : ""}`}
              onClick={() => setActiveTab("offices")}
              style={{
                background:
                  activeTab === "offices" ? "var(--primary)" : "transparent",
                color:
                  activeTab === "offices" ? "white" : "var(--text-secondary)",
                border: "1px solid",
                borderColor:
                  activeTab === "offices" ? "var(--primary)" : "var(--border)",
                padding: "0.5rem 1rem",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: "600",
                transition: "all 0.2s ease",
                height: "40px",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <FiMapPin size={18} />
              Offices
            </button>
            <button
              className={`nav-tab ${activeTab === "categories" ? "active" : ""}`}
              onClick={() => setActiveTab("categories")}
              style={{
                background:
                  activeTab === "categories" ? "var(--primary)" : "transparent",
                color:
                  activeTab === "categories"
                    ? "white"
                    : "var(--text-secondary)",
                border: "1px solid",
                borderColor:
                  activeTab === "categories"
                    ? "var(--primary)"
                    : "var(--border)",
                padding: "0.5rem 1rem",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: "600",
                transition: "all 0.2s ease",
                height: "40px",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <FiTag size={18} />
              Categories
            </button>
          </div>

          {/* Right: Logout Button */}
          <button
            onClick={handleLogout}
            style={{
              background: "var(--danger)",
              color: "white",
              border: "none",
              padding: "0.5rem 1.25rem",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: "600",
              transition: "all 0.2s ease",
              height: "40px",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <FiLogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="container"
        style={{
          paddingTop: "2rem",
          paddingBottom: "2rem",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          {activeTab === "tickets" && <TicketList />}
          {activeTab === "offices" && <ManageOffices />}
          {activeTab === "categories" && <ManageCategories />}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
