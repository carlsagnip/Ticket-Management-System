import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import TicketList from "../components/TicketList";
import RepairBorrowed from "../components/RepairBorrowed";
import Inventory from "../components/Inventory";
import Settings from "../components/Settings";
import {
  FiLogOut,
  FiFileText,
  FiTool,
  FiBox,
  FiChevronLeft,
  FiChevronRight,
  FiSettings,
  FiMenu,
  FiX,
} from "react-icons/fi";

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("tickets");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  // Close mobile menu when active tab changes
  useEffect(() => {
    setShowMobileMenu(false);
  }, [activeTab]);

  const navItems = [
    { id: "tickets", label: "Tickets", icon: <FiFileText size={18} /> },
    {
      id: "repairBorrowed",
      label: "Repair/Borrowed",
      icon: <FiTool size={18} />,
    },
    { id: "inventory", label: "Inventory", icon: <FiBox size={18} /> },
  ];

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .admin-layout {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background-color: var(--bg-dark);
        }
        .admin-sidebar {
          width: 260px;
          background: white;
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          z-index: 50;
          transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .admin-sidebar.minimized {
          width: 80px;
        }
        
        /* Smooth text hide/show */
        .sidebar-text {
          white-space: nowrap;
          overflow: hidden;
          opacity: 1;
          transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .admin-sidebar.minimized .sidebar-text {
          width: 0;
          opacity: 0;
          pointer-events: none;
        }
        .admin-main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }
        .admin-mobile-header {
          display: none;
          background: white;
          border-bottom: 1px solid var(--border);
          padding: 1rem;
          align-items: center;
          justify-content: space-between;
          z-index: 40;
          box-shadow: var(--shadow-sm);
        }
        .admin-sidebar-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 45;
          backdrop-filter: blur(2px);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .admin-sidebar-overlay.mobile-open {
          display: block;
          opacity: 1;
        }
        
        .main-scroll-area {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .nav-button {
          width: 100%;
          padding: 0.875rem 1.25rem;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          text-align: left;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.875rem;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          border-left: 3px solid transparent;
          white-space: nowrap;
          overflow: hidden;
        }
        .nav-button svg {
          flex-shrink: 0;
          transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .nav-button:hover:not(.active) {
          background: var(--bg-elevated);
          color: var(--text-primary);
        }
        .nav-button.active {
          background: var(--bg-elevated);
          color: var(--primary);
          border-left-color: var(--primary);
          font-weight: 600;
        }
        .admin-sidebar.minimized .nav-button {
          padding-left: 1.7rem; /* Centers the icon perfectly with scale */
        }
        .admin-sidebar.minimized .nav-button svg {
          transform: scale(1.3);
        }

        @media (max-width: 1024px) {
          .admin-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            transform: translateX(-100%);
          }
          .admin-sidebar.mobile-open {
            transform: translateX(0);
          }
          .admin-mobile-header {
            display: flex;
          }
          .admin-layout {
            flex-direction: column;
          }
        }
      `,
        }}
      />
      <div className="admin-layout">
        {/* Mobile Overlay */}
        <div
          className={`admin-sidebar-overlay ${showMobileMenu ? "mobile-open" : ""}`}
          onClick={() => setShowMobileMenu(false)}
        />

        {/* Sidebar */}
        <div
          className={`admin-sidebar ${showMobileMenu ? "mobile-open" : ""} ${isSidebarMinimized ? "minimized" : ""}`}
        >
          {/* Branding */}
          <div
            style={{
              padding: "1.5rem 1.25rem",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              position: "relative",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            <img
              src="/logo.jpg"
              alt="Palayan City ICT Logo"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "var(--radius-md)",
                objectFit: "cover",
                flexShrink: 0,
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            />
            <div
              className="admin-branding-text sidebar-text"
              style={{ flex: 1 }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: "1.05rem",
                  fontWeight: "700",
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                }}
              >
                Palayan City ICT
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

          {/* Navigation Links */}
          <div
            style={{
              flex: 1,
              padding: "1.5rem 0",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
            }}
          >
            <div
              className="sidebar-text"
              style={{ padding: "0 1.25rem", marginBottom: "0.5rem" }}
            >
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: "700",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Main Menu
              </span>
            </div>
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`nav-button ${activeTab === item.id ? "active" : ""}`}
                onClick={() => setActiveTab(item.id)}
                title={isSidebarMinimized ? item.label : undefined}
              >
                {item.icon}
                <span className="sidebar-text">{item.label}</span>
              </button>
            ))}
          </div>

          {/* User & Logout section */}
          <div
            style={{
              padding: "1.5rem 0",
              borderTop: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            {/* Settings Button */}
            <button
              onClick={() => setActiveTab("settings")}
              className={`nav-button ${activeTab === "settings" ? "active" : ""}`}
              title={isSidebarMinimized ? "Settings" : undefined}
            >
              <FiSettings size={18} />
              <span className="sidebar-text">Settings</span>
            </button>

            {/* Toggle Sidebar Button */}
            <button
              onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
              className="nav-button"
              title={isSidebarMinimized ? "Expand Menu" : "Collapse Menu"}
            >
              <FiChevronLeft
                size={20}
                style={{
                  transform: isSidebarMinimized
                    ? "rotate(180deg) scale(1.3)"
                    : "rotate(0) scale(1)",
                  transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />
              <span className="sidebar-text">Collapse Menu</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="nav-button"
              title="Logout"
            >
              <FiLogOut size={18} />
              <span className="sidebar-text">Logout</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="admin-main-content">
          {/* Mobile Header */}
          <div className="admin-mobile-header">
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
            >
              <img
                src="/logo.jpg"
                alt="Logo"
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "var(--radius-md)",
                  objectFit: "cover",
                }}
              />
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "1rem",
                    fontWeight: "700",
                    color: "var(--text-primary)",
                  }}
                >
                  ICT Dashboard
                </h1>
              </div>
            </div>
            <button
              className="btn btn-icon btn-ghost"
              onClick={() => setShowMobileMenu(true)}
            >
              <FiMenu size={24} />
            </button>
          </div>

          {/* Scrolling Content Area */}
          <div className="main-scroll-area">
            <div
              style={{
                padding: "2rem",
                flex: 1,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  marginBottom: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <div
                  style={{
                    padding: "0.5rem",
                    background: "var(--bg-elevated)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--primary)",
                  }}
                >
                  {activeTab === "settings" ? (
                    <FiSettings size={18} />
                  ) : (
                    navItems.find((t) => t.id === activeTab)?.icon
                  )}
                </div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "1.5rem",
                    color: "var(--text-primary)",
                  }}
                >
                  {activeTab === "settings"
                    ? "Settings"
                    : navItems.find((t) => t.id === activeTab)?.label}
                </h2>
              </div>
              <div
                style={{ flex: 1, display: "flex", flexDirection: "column" }}
              >
                {activeTab === "tickets" && <TicketList />}
                {activeTab === "settings" && <Settings />}
                {activeTab === "repairBorrowed" && <RepairBorrowed />}
                {activeTab === "inventory" && <Inventory />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default AdminDashboard;
