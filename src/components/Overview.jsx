import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  FiFileText,
  FiTool,
  FiBox,
  FiCalendar,
  FiTrendingUp,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiActivity,
  FiArrowUpRight,
  FiArrowDownRight,
} from "react-icons/fi";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const CHART_COLORS = [
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#0ea5e9",
  "#ec4899",
  "#14b8a6",
];

const STATUS_COLORS = {
  Open: "#2563eb",
  "In Progress": "#f59e0b",
  Resolved: "#10b981",
  Closed: "#64748b",
};

const PRIORITY_COLORS = {
  High: "#ef4444",
  Medium: "#f59e0b",
  Low: "#10b981",
};

function Overview({ onNavigate }) {
  const [tickets, setTickets] = useState([]);
  const [repairItems, setRepairItems] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [ticketsRes, repairRes, inventoryRes, eventsRes] =
        await Promise.all([
          supabase
            .from("tickets")
            .select("*, offices(name), categories(name)")
            .order("created_at", { ascending: false }),
          supabase
            .from("repair_borrowed")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase.from("inventory").select("*").order("created_at", { ascending: false }),
          supabase
            .from("ict_events")
            .select("*")
            .order("event_date", { ascending: false }),
        ]);

      setTickets(ticketsRes.data || []);
      setRepairItems(repairRes.data || []);
      setInventoryItems(inventoryRes.data || []);
      setEvents(eventsRes.data || []);
    } catch (err) {
      console.error("Error fetching overview data:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- Ticket Stats ---
  const ticketStats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "Open").length,
    inProgress: tickets.filter((t) => t.status === "In Progress").length,
    resolved: tickets.filter((t) => t.status === "Resolved").length,
    closed: tickets.filter((t) => t.status === "Closed").length,
  };

  const ticketStatusData = [
    { name: "Open", value: ticketStats.open, color: STATUS_COLORS.Open },
    {
      name: "In Progress",
      value: ticketStats.inProgress,
      color: STATUS_COLORS["In Progress"],
    },
    {
      name: "Resolved",
      value: ticketStats.resolved,
      color: STATUS_COLORS.Resolved,
    },
    { name: "Closed", value: ticketStats.closed, color: STATUS_COLORS.Closed },
  ].filter((d) => d.value > 0);

  const ticketPriorityData = [
    {
      name: "High",
      value: tickets.filter((t) => t.priority === "High").length,
      color: PRIORITY_COLORS.High,
    },
    {
      name: "Medium",
      value: tickets.filter((t) => t.priority === "Medium").length,
      color: PRIORITY_COLORS.Medium,
    },
    {
      name: "Low",
      value: tickets.filter((t) => t.priority === "Low").length,
      color: PRIORITY_COLORS.Low,
    },
  ].filter((d) => d.value > 0);

  // --- Tickets Over Time (last 12 months) ---
  const getTicketsOverTime = () => {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: d.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        year: d.getFullYear(),
        monthIdx: d.getMonth(),
        tickets: 0,
        resolved: 0,
      });
    }
    tickets.forEach((t) => {
      const d = new Date(t.created_at);
      const entry = months.find(
        (m) => m.year === d.getFullYear() && m.monthIdx === d.getMonth()
      );
      if (entry) {
        entry.tickets++;
        if (t.status === "Resolved" || t.status === "Closed") {
          entry.resolved++;
        }
      }
    });
    return months;
  };

  // --- Repair/Borrowed Stats ---
  const repairStats = {
    total: repairItems.length,
    pending: repairItems.filter((r) => r.status === "Pending").length,
    inRepair: repairItems.filter((r) => r.status === "In Repair" || r.status === "Under Repair").length,
    completed: repairItems.filter(
      (r) => r.status === "Completed" || r.status === "Returned" || r.status === "Done"
    ).length,
    borrowed: repairItems.filter((r) => r.status === "Borrowed").length,
  };

  // --- Inventory Stats ---
  const inventoryStats = {
    total: inventoryItems.length,
    available: inventoryItems.filter((i) => i.status === "Available").length,
    borrowed: inventoryItems.filter((i) => i.status === "Borrowed").length,
  };

  const inventoryCategoryData = () => {
    const map = {};
    inventoryItems.forEach((item) => {
      const cat = item.category || "Other";
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value], idx) => ({
        name,
        value,
        color: CHART_COLORS[idx % CHART_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  };

  // --- Events Stats ---
  const now = new Date();
  const upcomingEvents = events.filter((e) => new Date(e.event_date) > now);
  const pastEvents = events.filter((e) => {
    const end = e.event_end_date
      ? new Date(e.event_end_date)
      : new Date(e.event_date);
    return end < now;
  });

  // --- Top Offices by tickets ---
  const getTopOffices = () => {
    const map = {};
    tickets.forEach((t) => {
      const name = t.offices?.name || "Unknown";
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name: name.length > 20 ? name.substring(0, 20) + "…" : name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  };

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: "white",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "0.75rem 1rem",
            boxShadow: "var(--shadow-lg)",
            fontSize: "0.85rem",
          }}
        >
          <p
            style={{
              margin: 0,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {label}
          </p>
          {payload.map((entry, idx) => (
            <p
              key={idx}
              style={{ margin: "0.25rem 0 0", color: entry.color }}
            >
              {entry.name}: <strong>{entry.value}</strong>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    const SkeletonCard = ({ height = "140px" }) => (
      <div
        className="skeleton-shimmer"
        style={{
          borderRadius: "var(--radius-lg)",
          padding: "1.5rem",
          border: "1px solid var(--border)",
          height,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ width: "60%" }}>
            <div style={{ width: "80%", height: "14px", background: "var(--bg-elevated)", borderRadius: "4px", marginBottom: "0.75rem" }}></div>
            <div style={{ width: "50%", height: "32px", background: "var(--bg-elevated)", borderRadius: "4px" }}></div>
          </div>
          <div style={{ width: "40px", height: "40px", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)" }}></div>
        </div>
        <div style={{ width: "40%", height: "14px", background: "var(--bg-elevated)", borderRadius: "4px" }}></div>
      </div>
    );

    const SkeletonChart = ({ height = "350px" }) => (
      <div
        className="skeleton-shimmer"
        style={{
          borderRadius: "var(--radius-lg)",
          padding: "1.5rem",
          border: "1px solid var(--border)",
          height,
          display: "flex",
          flexDirection: "column",
          gap: "1rem"
        }}
      >
        <div style={{ width: "30%", height: "20px", background: "var(--bg-elevated)", borderRadius: "4px" }}></div>
        <div style={{ width: "100%", flex: 1, background: "var(--bg-elevated)", borderRadius: "4px" }}></div>
      </div>
    );

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%" }}>
        {/* Top Cards Skeleton */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
          }}
        >
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        
        {/* Row 1 Charts Skeleton */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "1rem",
          }}
        >
          <SkeletonChart height="350px" />
          <SkeletonChart height="350px" />
        </div>
        
        {/* Row 2 Charts Skeleton */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "1rem",
          }}
        >
          <SkeletonChart height="300px" />
          <SkeletonChart height="300px" />
          <SkeletonChart height="300px" />
        </div>
      </div>
    );
  }

  const summaryCards = [
    {
      label: "Total Tickets",
      value: ticketStats.total,
      icon: <FiFileText size={22} />,
      color: "#2563eb",
      bg: "#eff6ff",
      sub: `${ticketStats.open} open`,
      tabId: "tickets",
    },
    {
      label: "Repair / Borrowed",
      value: repairStats.total,
      icon: <FiTool size={22} />,
      color: "#f59e0b",
      bg: "#fffbeb",
      sub: `${repairStats.pending + repairStats.inRepair} active`,
      tabId: "repairBorrowed",
    },
    {
      label: "Inventory Items",
      value: inventoryStats.total,
      icon: <FiBox size={22} />,
      color: "#10b981",
      bg: "#ecfdf5",
      sub: `${inventoryStats.available} available`,
      tabId: "inventory",
    },
    {
      label: "ICT Events",
      value: events.length,
      icon: <FiCalendar size={22} />,
      color: "#8b5cf6",
      bg: "#f5f3ff",
      sub: `${upcomingEvents.length} upcoming`,
      tabId: "ictEvents",
    },
  ];

  const ticketsOverTime = getTicketsOverTime();
  const topOffices = getTopOffices();
  const inventoryByCategory = inventoryCategoryData();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        {summaryCards.map((card) => (
          <div
            key={card.label}
            onClick={() => onNavigate && onNavigate(card.tabId)}
            style={{
              background: "white",
              borderRadius: "var(--radius-lg)",
              padding: "1.5rem",
              border: "1px solid var(--border)",
              cursor: "pointer",
              transition: "all 0.2s ease",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "var(--shadow-lg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "1rem",
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {card.label}
                </p>
                <h3
                  style={{
                    margin: "0.5rem 0 0",
                    fontSize: "2rem",
                    fontWeight: 800,
                    color: card.color,
                    lineHeight: 1,
                  }}
                >
                  {card.value}
                </h3>
              </div>
              <div
                style={{
                  padding: "0.75rem",
                  background: card.bg,
                  borderRadius: "var(--radius-md)",
                  color: card.color,
                }}
              >
                {card.icon}
              </div>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                fontWeight: 500,
              }}
            >
              {card.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Row 1: Tickets Over Time + Status Pie */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "1rem",
        }}
      >
        {/* Tickets Over Time */}
        <div
          style={{
            background: "white",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.25rem",
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                Ticket Trends
              </h3>
              <p
                style={{
                  margin: "0.25rem 0 0",
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                }}
              >
                Tickets created vs resolved over the last 12 months
              </p>
            </div>
            <FiActivity size={20} style={{ color: "var(--text-muted)" }} />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={ticketsOverTime}>
              <defs>
                <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient
                  id="colorResolved"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "0.8rem", paddingTop: "0.5rem" }}
              />
              <Area
                type="monotone"
                dataKey="tickets"
                name="Created"
                stroke="#2563eb"
                strokeWidth={2.5}
                fill="url(#colorTickets)"
              />
              <Area
                type="monotone"
                dataKey="resolved"
                name="Resolved"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#colorResolved)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Ticket Status Pie */}
        <div
          style={{
            background: "white",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
            border: "1px solid var(--border)",
          }}
        >
          <h3
            style={{
              margin: "0 0 1rem",
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Ticket Status
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={ticketStatusData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {ticketStatusData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              justifyContent: "center",
            }}
          >
            {ticketStatusData.map((item) => (
              <div
                key={item.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontSize: "0.8rem",
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: item.color,
                  }}
                />
                <span style={{ color: "var(--text-secondary)" }}>
                  {item.name}
                </span>
                <strong style={{ color: "var(--text-primary)" }}>
                  {item.value}
                </strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2: Top Offices Bar + Priority Pie + Inventory */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "1rem",
        }}
      >
        {/* Top Offices */}
        <div
          style={{
            background: "white",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
            border: "1px solid var(--border)",
          }}
        >
          <h3
            style={{
              margin: "0 0 1rem",
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Top Offices
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topOffices} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                width={100}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="count"
                name="Tickets"
                fill="#2563eb"
                radius={[0, 6, 6, 0]}
                barSize={16}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Ticket Priority */}
        <div
          style={{
            background: "white",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
            border: "1px solid var(--border)",
          }}
        >
          <h3
            style={{
              margin: "0 0 1rem",
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Ticket Priority
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={ticketPriorityData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
              >
                {ticketPriorityData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              justifyContent: "center",
              marginTop: "0.5rem",
            }}
          >
            {ticketPriorityData.map((item) => (
              <div
                key={item.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontSize: "0.8rem",
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: item.color,
                  }}
                />
                <span style={{ color: "var(--text-secondary)" }}>
                  {item.name}
                </span>
                <strong style={{ color: "var(--text-primary)" }}>
                  {item.value}
                </strong>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory by Category */}
        <div
          style={{
            background: "white",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
            border: "1px solid var(--border)",
          }}
        >
          <h3
            style={{
              margin: "0 0 1rem",
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Inventory by Category
          </h3>
          {inventoryByCategory.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={inventoryByCategory}
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {inventoryByCategory.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                  justifyContent: "center",
                  marginTop: "0.5rem",
                }}
              >
                {inventoryByCategory.slice(0, 6).map((item) => (
                  <div
                    key={item.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      fontSize: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: item.color,
                      }}
                    />
                    <span style={{ color: "var(--text-secondary)" }}>
                      {item.name}
                    </span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "3rem 1rem",
                color: "var(--text-muted)",
              }}
            >
              No inventory data
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Module Quick Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
        }}
      >
        {/* Repair/Borrowed Overview */}
        <div
          style={{
            background: "white",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.25rem",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              Repair / Borrowed Status
            </h3>
            <button
              onClick={() => onNavigate && onNavigate("repairBorrowed")}
              style={{
                background: "none",
                border: "none",
                color: "var(--primary)",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              View All <FiArrowUpRight size={14} />
            </button>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "1rem",
            }}
          >
            {[
              {
                label: "Pending",
                value: repairStats.pending,
                icon: <FiClock size={18} />,
                color: "#f59e0b",
                bg: "#fffbeb",
              },
              {
                label: "In Repair",
                value: repairStats.inRepair,
                icon: <FiTool size={18} />,
                color: "#2563eb",
                bg: "#eff6ff",
              },
              {
                label: "Completed",
                value: repairStats.completed,
                icon: <FiCheckCircle size={18} />,
                color: "#10b981",
                bg: "#ecfdf5",
              },
              {
                label: "Borrowed",
                value: repairStats.borrowed,
                icon: <FiAlertCircle size={18} />,
                color: "#8b5cf6",
                bg: "#f5f3ff",
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "1rem",
                  background: "var(--bg-elevated)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <div
                  style={{
                    padding: "0.5rem",
                    borderRadius: "var(--radius-sm)",
                    background: item.bg,
                    color: item.color,
                  }}
                >
                  {item.icon}
                </div>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color: item.color,
                    }}
                  >
                    {item.value}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      fontWeight: 500,
                    }}
                  >
                    {item.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events */}
        <div
          style={{
            background: "white",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.25rem",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              Upcoming Events
            </h3>
            <button
              onClick={() => onNavigate && onNavigate("ictEvents")}
              style={{
                background: "none",
                border: "none",
                color: "var(--primary)",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              View All <FiArrowUpRight size={14} />
            </button>
          </div>
          {upcomingEvents.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {upcomingEvents.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem 1rem",
                    background: "var(--bg-elevated)",
                    borderRadius: "var(--radius-md)",
                    borderLeft: "3px solid #8b5cf6",
                  }}
                >
                  <div
                    style={{
                      padding: "0.5rem",
                      background: "#f5f3ff",
                      borderRadius: "var(--radius-sm)",
                      color: "#8b5cf6",
                      flexShrink: 0,
                    }}
                  >
                    <FiCalendar size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        color: "var(--text-primary)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {event.title}
                    </p>
                    <p
                      style={{
                        margin: "0.15rem 0 0",
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {new Date(event.event_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {event.event_type && ` · ${event.event_type}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "3rem 1rem",
                color: "var(--text-muted)",
              }}
            >
              <FiCalendar
                size={32}
                style={{ marginBottom: "0.5rem", opacity: 0.5 }}
              />
              <p style={{ margin: 0 }}>No upcoming events</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Overview;
