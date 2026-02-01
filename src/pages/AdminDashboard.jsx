import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import TicketList from "../components/TicketList";
import ManageOffices from "../components/ManageOffices";
import ManageCategories from "../components/ManageCategories";
import {
  FiLogOut,
  FiFileText,
  FiMapPin,
  FiTag,
  FiGrid,
  FiMenu,
  FiX,
} from "react-icons/fi";

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("tickets");
  const [showMobileMenu, setShowMobileMenu] = useState(false);

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
        className="admin-navbar"
        style={{
          background: "white",
          borderBottom: "1px solid var(--border)",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          padding: "0.5rem 1rem",
        }}
      >
        <div
          className="admin-navbar-content"
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          {/* Left: Branding - clickable on mobile to toggle menu */}
          <div
            className="admin-branding-wrapper"
            style={{ position: "relative" }}
          >
            <div
              className="admin-branding"
              onClick={() => {
                // Only toggle menu on tablet/mobile (when nav is hidden)
                if (window.innerWidth <= 1024) {
                  setShowMobileMenu(!showMobileMenu);
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  background: "var(--primary)",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <FiGrid
                  style={{ width: "20px", height: "20px", color: "white" }}
                />
              </div>
              <div className="admin-branding-text">
                <h1
                  style={{
                    margin: 0,
                    fontSize: "1rem",
                    fontWeight: "700",
                    color: "var(--text-primary)",
                    letterSpacing: "-0.01em",
                    whiteSpace: "nowrap",
                  }}
                >
                  Ticket Management System
                </h1>
                <p
                  className="admin-subtitle"
                  style={{
                    margin: 0,
                    fontSize: "0.7rem",
                    color: "var(--text-secondary)",
                    fontWeight: "500",
                  }}
                >
                  Admin Dashboard
                </p>
              </div>
            </div>

            {/* Mobile Dropdown Menu - under branding */}
            {showMobileMenu && (
              <div
                className="admin-branding-dropdown"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: "0.5rem",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-lg)",
                  zIndex: 100,
                  minWidth: "200px",
                  overflow: "hidden",
                }}
              >
                {[
                  {
                    id: "tickets",
                    label: "Tickets",
                    icon: <FiFileText size={16} />,
                  },
                  {
                    id: "offices",
                    label: "Offices",
                    icon: <FiMapPin size={16} />,
                  },
                  {
                    id: "categories",
                    label: "Categories",
                    icon: <FiTag size={16} />,
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setShowMobileMenu(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: "none",
                      background:
                        activeTab === item.id
                          ? "var(--primary)"
                          : "transparent",
                      color:
                        activeTab === item.id ? "white" : "var(--text-primary)",
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== item.id) {
                        e.target.style.background = "var(--bg-elevated)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== item.id) {
                        e.target.style.background = "transparent";
                      }
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}

                {/* Divider */}
                <div
                  style={{
                    height: "1px",
                    background: "var(--border)",
                    margin: "0.25rem 0",
                  }}
                />

                {/* Logout in mobile menu */}
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    handleLogout();
                  }}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    border: "none",
                    background: "transparent",
                    color: "var(--danger)",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "rgba(239, 68, 68, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "transparent";
                  }}
                >
                  <FiLogOut size={16} />
                  Logout
                </button>
              </div>
            )}

            {/* Click outside to close mobile menu */}
            {showMobileMenu && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 90,
                }}
                onClick={() => setShowMobileMenu(false)}
              />
            )}
          </div>

          {/* Center: Navigation Tabs - Desktop */}
          <div
            className="admin-nav-tabs admin-nav-desktop"
            style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
          >
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
                padding: "0.5rem 0.875rem",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                fontSize: "0.8125rem",
                fontWeight: "600",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
              }}
            >
              <FiFileText size={16} />
              <span className="nav-tab-text">Tickets</span>
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
                padding: "0.5rem 0.875rem",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                fontSize: "0.8125rem",
                fontWeight: "600",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
              }}
            >
              <FiMapPin size={16} />
              <span className="nav-tab-text">Offices</span>
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
                padding: "0.5rem 0.875rem",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                fontSize: "0.8125rem",
                fontWeight: "600",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
              }}
            >
              <FiTag size={16} />
              <span className="nav-tab-text">Categories</span>
            </button>
          </div>

          {/* Right: Logout Button */}
          <button
            className="admin-logout-btn"
            onClick={handleLogout}
            style={{
              background: "var(--danger)",
              color: "white",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              fontSize: "0.8125rem",
              fontWeight: "600",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              flexShrink: 0,
            }}
          >
            <FiLogOut size={16} />
            <span className="logout-text">Logout</span>
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
