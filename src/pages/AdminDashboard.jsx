import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import TicketList from "../components/TicketList";
import RepairBorrowed from "../components/RepairBorrowed";
import Inventory from "../components/Inventory";
import IctEvents from "../components/IctEvents";
import Settings from "../components/Settings";
import Overview from "../components/Overview";
import Roulette from "../components/Roulette";
import LeaveManagement from "../components/LeaveManagement";
import CalendarView from "../components/CalendarView";
import {
  FiLogOut,
  FiFileText,
  FiTool,
  FiBox,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiSettings,
  FiMenu,
  FiX,
  FiHome,
  FiTarget,
  FiClock,
  FiList,
} from "react-icons/fi";

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [mountedTabs, setMountedTabs] = useState(["overview"]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // Close mobile menu when active tab changes
  useEffect(() => {
    setShowMobileMenu(false);
    if (!mountedTabs.includes(activeTab)) {
      setMountedTabs((prev) => [...prev, activeTab]);
    }
  }, [activeTab, mountedTabs]);

  const navItems = [
    { id: "overview", label: "Dashboard", icon: <FiHome size={18} /> },
    { id: "tickets", label: "Tickets", icon: <FiFileText size={18} /> },
    {
      id: "repairBorrowed",
      label: "Repair/Borrowed",
      icon: <FiTool size={18} />,
    },
    { id: "inventory", label: "Inventory", icon: <FiBox size={18} /> },
    { id: "calendar", label: "Calendar", icon: <FiCalendar size={18} /> },
    { id: "ictEvents", label: "ICT Events", icon: <FiList size={18} /> },
    { id: "leaves", label: "Leaves & Offsets", icon: <FiClock size={18} /> },
    { id: "roulette", label: "Roulette", icon: <FiTarget size={18} /> },
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
          position: relative;
        }
        .sidebar-toggle-btn {
          position: absolute;
          right: -16px;
          top: 50%;
          transform: translateY(-50%);
          width: 32px;
          height: 32px;
          background: white;
          border: 1px solid var(--border);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-secondary);
          z-index: 60;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          transition: all 0.2s ease;
        }
        .sidebar-toggle-btn:hover {
          color: var(--primary);
          border-color: var(--primary);
          background: var(--bg-elevated);
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
          .dashboard-content {
            padding: 1rem;
            flex: 1;
            display: flex;
            flex-direction: column;
          }
        }
        
        @media (max-width: 768px) {
          .admin-sidebar {
            width: 100% !important;
            max-width: 100% !important;
            top: auto;
            bottom: 0;
            height: auto;
            max-height: 85vh;
            border-radius: var(--radius-xl) var(--radius-xl) 0 0;
            transform: translateY(100%);
            border-right: none;
            box-shadow: 0 -4px 12px rgba(0,0,0,0.1);
            transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .admin-sidebar.mobile-open {
            transform: translateY(0);
          }
          .admin-sidebar.mobile-open .nav-button {
            animation: mobileItemSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .admin-sidebar.mobile-open .nav-button:nth-child(1) { animation-delay: 0.04s; }
          .admin-sidebar.mobile-open .nav-button:nth-child(2) { animation-delay: 0.08s; }
          .admin-sidebar.mobile-open .nav-button:nth-child(3) { animation-delay: 0.12s; }
          .admin-sidebar.mobile-open .nav-button:nth-child(4) { animation-delay: 0.16s; }
          .admin-sidebar.mobile-open .nav-button:nth-child(5) { animation-delay: 0.20s; }
          .admin-sidebar.mobile-open .nav-button:nth-child(6) { animation-delay: 0.24s; }
          .admin-sidebar.mobile-open .nav-button:nth-child(7) { animation-delay: 0.28s; }
          .admin-sidebar.mobile-open .nav-button:nth-child(8) { animation-delay: 0.32s; }
          
          .nav-button {
            padding: 1rem 1.5rem;
            font-size: 1rem;
          }
          .sidebar-toggle-btn {
            display: none !important;
          }
        }
        
        /* Burger Button Micro-Animations */
        .burger-btn {
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.2s ease !important;
        }
        .burger-btn:active, .burger-btn.burger-active {
          transform: scale(0.82) rotate(-90deg) !important;
          background-color: var(--bg-elevated) !important;
        }
        .burger-btn svg {
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .burger-btn:hover svg {
          transform: scale(1.15);
        }

        @keyframes mobileItemSlideIn {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @media (min-width: 1025px) {
          .dashboard-content {
            padding: 2rem;
            flex: 1;
            display: flex;
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

          {/* Floating Toggle Button */}
          <button 
            className="sidebar-toggle-btn"
            onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
            title={isSidebarMinimized ? "Expand Menu" : "Collapse Menu"}
          >
            <FiChevronLeft 
              size={20} 
              style={{
                transform: isSidebarMinimized ? "rotate(180deg)" : "rotate(0)",
                transition: "transform 0.3s"
              }}
            />
          </button>
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
              className={`btn btn-icon btn-ghost burger-btn ${showMobileMenu ? "burger-active" : ""}`}
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              aria-label="Toggle navigation menu"
            >
              <FiMenu size={26} />
            </button>
          </div>

          {/* Scrolling Content Area */}
          <div className="main-scroll-area">
            <div className="dashboard-content">
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
                {mountedTabs.includes("overview") && (
                  <div style={{ display: activeTab === "overview" ? "block" : "none", height: "100%" }}>
                    <Overview onNavigate={setActiveTab} />
                  </div>
                )}
                {mountedTabs.includes("tickets") && (
                  <div style={{ display: activeTab === "tickets" ? "block" : "none", height: "100%" }}>
                    <TicketList />
                  </div>
                )}
                {mountedTabs.includes("settings") && (
                  <div style={{ display: activeTab === "settings" ? "block" : "none", height: "100%" }}>
                    <Settings />
                  </div>
                )}
                {mountedTabs.includes("repairBorrowed") && (
                  <div style={{ display: activeTab === "repairBorrowed" ? "block" : "none", height: "100%" }}>
                    <RepairBorrowed />
                  </div>
                )}
                {mountedTabs.includes("inventory") && (
                  <div style={{ display: activeTab === "inventory" ? "block" : "none", height: "100%" }}>
                    <Inventory />
                  </div>
                )}
                
                {/* Calendar Tab */}
                {mountedTabs.includes("calendar") && (
                  <div style={{ display: activeTab === "calendar" ? "block" : "none", height: "100%" }}>
                    <CalendarView />
                  </div>
                )}

                {mountedTabs.includes("ictEvents") && (
                  <div style={{ display: activeTab === "ictEvents" ? "block" : "none", height: "100%" }}>
                    <IctEvents />
                  </div>
                )}
                
                {/* Leaves & Offsets Tab */}
                <div style={{ display: activeTab === "leaves" ? "block" : "none", height: "100%" }}>
                  {mountedTabs.includes("leaves") && <LeaveManagement />}
                </div>

                {/* Roulette Tab */}
                {mountedTabs.includes("roulette") && (
                  <div style={{ display: activeTab === "roulette" ? "block" : "none", height: "100%" }}>
                    <Roulette />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default AdminDashboard;
