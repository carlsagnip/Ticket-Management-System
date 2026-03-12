import { useState } from "react";
import { FiMapPin, FiTag, FiUser } from "react-icons/fi";
import ManageOffices from "./ManageOffices";
import ManageCategories from "./ManageCategories";
import ManageOfficers from "./ManageOfficers";

function Settings() {
  const [activeTab, setActiveTab] = useState("offices");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "1rem",
        }}
      >
        <button
          onClick={() => setActiveTab("offices")}
          style={{
            padding: "0.75rem 1.25rem",
            border: "none",
            background:
              activeTab === "offices" ? "var(--bg-elevated)" : "transparent",
            color:
              activeTab === "offices"
                ? "var(--primary)"
                : "var(--text-secondary)",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            fontWeight: activeTab === "offices" ? "600" : "500",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "all 0.2s ease",
          }}
        >
          <FiMapPin size={18} />
          Offices
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          style={{
            padding: "0.75rem 1.25rem",
            border: "none",
            background:
              activeTab === "categories" ? "var(--bg-elevated)" : "transparent",
            color:
              activeTab === "categories"
                ? "var(--primary)"
                : "var(--text-secondary)",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            fontWeight: activeTab === "categories" ? "600" : "500",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "all 0.2s ease",
          }}
        >
          <FiTag size={18} />
          Categories
        </button>
        <button
          onClick={() => setActiveTab("officers")}
          style={{
            padding: "0.75rem 1.25rem",
            border: "none",
            background:
              activeTab === "officers" ? "var(--bg-elevated)" : "transparent",
            color:
              activeTab === "officers"
                ? "var(--primary)"
                : "var(--text-secondary)",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            fontWeight: activeTab === "officers" ? "600" : "500",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "all 0.2s ease",
          }}
        >
          <FiUser size={18} />
          Officers
        </button>
      </div>

      <div style={{ flex: 1, overflow: "hidden" }}>
        {activeTab === "offices" && <ManageOffices />}
        {activeTab === "categories" && <ManageCategories />}
        {activeTab === "officers" && <ManageOfficers />}
      </div>
    </div>
  );
}

export default Settings;
