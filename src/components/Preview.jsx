import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import TicketDetails from "./TicketDetails";
import {
  FiSearch,
  FiFilter,
  FiTrendingUp,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiFileText,
  FiInbox,
  FiCalendar,
  FiExternalLink,
  FiArrowLeft,
  FiChevronDown,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import SearchableSelect from "../components/SearchableSelect";

function Preview() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [officeFilter, setOfficeFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  // Date filter states
  const [dateFilter, setDateFilter] = useState("All");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showOfficeDropdown, setShowOfficeDropdown] = useState(false);

  // Animation tracking states
  const [newTicketIds, setNewTicketIds] = useState(new Set());
  const [prevStats, setPrevStats] = useState(null);
  const [animatingStats, setAnimatingStats] = useState({});

  // Ref to track current ticket IDs for animation detection
  const ticketIdsRef = useRef(new Set());

  // Update ref when tickets change
  useEffect(() => {
    ticketIdsRef.current = new Set(tickets.map((t) => t.id));
  }, [tickets]);

  useEffect(() => {
    fetchTickets();
    fetchOffices();

    // Realtime subscription for tickets
    const channel = supabase
      .channel("tickets_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => {
          fetchTickets(false);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTickets = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tickets")
        .select(
          `
          *,
          offices (name),
          categories (name)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Detect new tickets for animation using ref (avoids stale closure)
      if (!showLoading && data && ticketIdsRef.current.size > 0) {
        const newIds = data
          .filter((t) => !ticketIdsRef.current.has(t.id))
          .map((t) => t.id);
        if (newIds.length > 0) {
          setNewTicketIds(new Set(newIds));
          // Clear animation after 3 seconds
          setTimeout(() => setNewTicketIds(new Set()), 3000);
        }
      }

      setTickets(data || []);
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchOffices = async () => {
    try {
      const { data, error } = await supabase
        .from("offices")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setOffices(data || []);
    } catch (error) {
      console.error("Error fetching offices:", error);
    }
  };

  const handleTicketClick = (ticket) => {
    setSelectedTicket(ticket);
  };

  const handleCloseDetails = () => {
    setSelectedTicket(null);
    fetchTickets();
  };

  // Calculate statistics
  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "Open").length,
    inProgress: tickets.filter((t) => t.status === "In Progress").length,
    resolved: tickets.filter((t) => t.status === "Resolved").length,
    closed: tickets.filter((t) => t.status === "Closed").length,
  };

  // Animate stats when they increase
  useEffect(() => {
    if (prevStats) {
      const changedStats = {};
      Object.keys(stats).forEach((key) => {
        // Only animate if the stat increased
        if (stats[key] > prevStats[key]) {
          changedStats[key] = true;
        }
      });
      if (Object.keys(changedStats).length > 0) {
        setAnimatingStats(changedStats);
        setTimeout(() => setAnimatingStats({}), 1000);
      }
    }
    setPrevStats(stats);
  }, [stats.total, stats.open, stats.inProgress, stats.resolved, stats.closed]);

  // Apply filters
  let filteredTickets = tickets.filter((ticket) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      ticket.ticket_id?.toLowerCase().includes(search) ||
      ticket.full_name?.toLowerCase().includes(search) ||
      ticket.subject?.toLowerCase().includes(search) ||
      ticket.offices?.name?.toLowerCase().includes(search) ||
      ticket.categories?.name?.toLowerCase().includes(search);

    const matchesStatus =
      statusFilter === "All" || ticket.status === statusFilter;
    const matchesOffice =
      officeFilter === "All" || ticket.office_id === officeFilter;

    // Date filtering logic
    let matchesDate = true;
    if (dateFilter !== "All") {
      const ticketDate = new Date(ticket.created_at);
      const now = new Date();

      if (dateFilter === "Today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        matchesDate = ticketDate >= today;
      } else if (dateFilter === "1 Week") {
        const oneWeekAgo = new Date(now.setDate(now.getDate() - 7));
        matchesDate = ticketDate >= oneWeekAgo;
      } else if (dateFilter === "1 Month") {
        const oneMonthAgo = new Date(now.setMonth(now.getMonth() - 1));
        matchesDate = ticketDate >= oneMonthAgo;
      } else if (dateFilter === "3 Months") {
        const threeMonthsAgo = new Date(now.setMonth(now.getMonth() - 3));
        matchesDate = ticketDate >= threeMonthsAgo;
      } else if (dateFilter === "1 Year") {
        const oneYearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
        matchesDate = ticketDate >= oneYearAgo;
      } else if (dateFilter === "Custom") {
        if (customStartDate && customEndDate) {
          const startDate = new Date(customStartDate);
          const endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999); // Include entire end date
          matchesDate = ticketDate >= startDate && ticketDate <= endDate;
        }
      }
    }

    return matchesSearch && matchesStatus && matchesOffice && matchesDate;
  });

  // Apply sorting
  if (sortBy === "newest") {
    filteredTickets.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
    );
  } else if (sortBy === "oldest") {
    filteredTickets.sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at),
    );
  }

  const getPriorityBadge = (priority) => {
    const className = `badge badge-${priority.toLowerCase()}`;
    const icons = {
      Low: <FiCheckCircle />,
      Medium: <FiAlertCircle />,
      High: <FiTrendingUp />,
    };
    return (
      <span className={className}>
        {icons[priority]}
        {priority}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const statusKey = status.toLowerCase().replace(" ", "-");
    const className = `badge badge-${statusKey}`;
    const icons = {
      Open: <FiFileText />,
      "In Progress": <FiClock />,
      Resolved: <FiCheckCircle />,
      Closed: <FiXCircle />,
    };
    return (
      <span className={className}>
        {icons[status]}
        {status}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // PDF Export Function using browser's print dialog
  const exportToPDF = async () => {
    // 1. Fetch all remarks for the filtered tickets
    const ticketIds = filteredTickets.map((t) => t.id);
    let remarksMap = {};

    if (ticketIds.length > 0) {
      try {
        const { data: remarksData } = await supabase
          .from("ticket_comments")
          .select("*")
          .in("ticket_id", ticketIds)
          .order("created_at", { ascending: true });

        if (remarksData) {
          remarksData.forEach((remark) => {
            if (!remarksMap[remark.ticket_id]) {
              remarksMap[remark.ticket_id] = [];
            }
            remarksMap[remark.ticket_id].push(remark);
          });
        }
      } catch (error) {
        console.error("Error fetching remarks for export:", error);
      }
    }

    // 2. Create print content
    const printContent = document.createElement("div");
    printContent.style.cssText =
      "font-family: Arial, sans-serif; font-size: 12px;";

    // Add header
    const header = `
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
        <h1 style="color: #2563eb; margin: 0; font-size: 18px;">Ticket Management System</h1>
        <p style="color: #64748b; margin: 4px 0 0 0; font-size: 11px;">Export Date: ${new Date().toLocaleString()}</p>
        <p style="color: #64748b; margin: 2px 0 0 0; font-size: 11px;">Total Tickets: ${filteredTickets.length}</p>
      </div>
    `;
    printContent.innerHTML = header;

    // Add each ticket
    filteredTickets.forEach((ticket, index) => {
      const ticketRemarks = remarksMap[ticket.id] || [];
      const remarksHtml =
        ticketRemarks.length > 0
          ? `
        <div style="margin-top: 8px; border-top: 1px dashed #cbd5e1; padding-top: 6px;">
          <strong style="display: block; margin-bottom: 4px; color: #475569; font-size: 10px; text-transform: uppercase;">REMARKS</strong>
          ${ticketRemarks
            .map(
              (r) => `
            <div style="margin-bottom: 4px; font-size: 11px; line-height: 1.4;">
              <span style="color: #2563eb; font-weight: 600;">${r.author_name || "Admin"}</span>
              <span style="color: #94a3b8; font-size: 10px;">(${new Date(r.created_at).toLocaleString()})</span>: 
              <span style="color: #334155;">${r.content}</span>
            </div>
          `,
            )
            .join("")}
        </div>
      `
          : "";

      const ticketCard = `
      <div style="page-break-inside: avoid; margin-bottom: 15px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
        <div style="background: #2563eb; color: white; padding: 6px 10px; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; font-size: 13px;">#${index + 1}: ${ticket.ticket_id}</h3>
          <span style="font-size: 11px; background: rgba(255,255,255,0.2); padding: 1px 6px; border-radius: 4px;">${ticket.status}</span>
        </div>
        <div style="padding: 10px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; font-size: 11px;">
            <div><strong>Full Name:</strong> ${ticket.full_name || "N/A"}</div>
            <div><strong>Email:</strong> ${ticket.email || "N/A"}</div>
            <div><strong>Office:</strong> ${ticket.offices?.name || "N/A"}</div>
            <div><strong>Category:</strong> ${ticket.categories?.name || "N/A"}</div>
            <div><strong>Priority:</strong> <span style="color: ${ticket.priority === "High" ? "#ef4444" : ticket.priority === "Medium" ? "#f59e0b" : "#10b981"}; font-weight: bold;">${ticket.priority || "N/A"}</span></div>
            <div><strong>Created:</strong> ${new Date(ticket.created_at).toLocaleString()}</div>
          </div>
          
          <div style="margin-bottom: 6px;">
            <strong style="display: block; margin-bottom: 2px; color: #1e40af; font-size: 10px;">SUBJECT</strong>
            <div style="font-size: 12px; font-weight: 500;">${ticket.subject || "N/A"}</div>
          </div>
          
          <div style="background: #f8fafc; padding: 6px; border-radius: 4px;">
            <strong style="display: block; margin-bottom: 2px; color: #1e40af; font-size: 10px;">DESCRIPTION</strong>
            <div style="font-size: 11px; color: #334155;">${ticket.description || "N/A"}</div>
          </div>

          ${remarksHtml}
        </div>
      </div>
    `;
      printContent.innerHTML += ticketCard;
    });

    // Create print window
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Tickets Report - ${new Date().toLocaleDateString()}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            color: #0f172a;
            font-size: 12px;
          }
          @media print {
            body { padding: 0; }
            .page-break { page-break-after: always; }
          }
          h1, h2, h3, h4, h5, h6 { margin: 0; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
    </html>
  `);
    printWindow.document.close();

    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
      // Close the window after printing
      setTimeout(() => printWindow.close(), 500);
    }, 500);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div
      className="page-container"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
      }}
    >
      <div
        className="container"
        style={{
          paddingTop: "2rem",
          paddingBottom: "2rem",
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Statistics Cards - Fixed */}
          <div
            className="preview-stats-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "1rem",
              marginBottom: "1.5rem",
              flexShrink: 0,
            }}
          >
            <div
              className={`stat-card ${animatingStats.total ? "stat-glow-blue" : ""}`}
            >
              <div className="stat-card-header">
                <div className="stat-label">Total Tickets</div>
                <div className="stat-icon" style={{ background: "#eff6ff" }}>
                  <FiFileText style={{ color: "#2563eb" }} />
                </div>
              </div>
              <div className="stat-value" style={{ color: "#2563eb" }}>
                {stats.total}
              </div>
            </div>
            <div
              className={`stat-card ${animatingStats.open ? "stat-glow-navy" : ""}`}
            >
              <div className="stat-card-header">
                <div className="stat-label">Open</div>
                <div className="stat-icon" style={{ background: "#dbeafe" }}>
                  <FiAlertCircle style={{ color: "#1e40af" }} />
                </div>
              </div>
              <div className="stat-value" style={{ color: "#1e40af" }}>
                {stats.open}
              </div>
            </div>
            <div
              className={`stat-card ${animatingStats.inProgress ? "stat-glow-orange" : ""}`}
            >
              <div className="stat-card-header">
                <div className="stat-label">In Progress</div>
                <div className="stat-icon" style={{ background: "#fed7aa" }}>
                  <FiClock style={{ color: "#92400e" }} />
                </div>
              </div>
              <div className="stat-value" style={{ color: "#92400e" }}>
                {stats.inProgress}
              </div>
            </div>
            <div
              className={`stat-card ${animatingStats.resolved ? "stat-glow-green" : ""}`}
            >
              <div className="stat-card-header">
                <div className="stat-label">Resolved</div>
                <div className="stat-icon" style={{ background: "#d1fae5" }}>
                  <FiCheckCircle style={{ color: "#065f46" }} />
                </div>
              </div>
              <div className="stat-value" style={{ color: "#065f46" }}>
                {stats.resolved}
              </div>
            </div>
          </div>

          {/* Search and Filters Row - All in one line */}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: "1rem",
              flexShrink: 0,
            }}
          >
            {/* Search Field */}
            <div
              style={{
                position: "relative",
                flex: "1",
                minWidth: "200px",
              }}
            >
              <FiSearch
                style={{
                  position: "absolute",
                  left: "1rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                  width: "16px",
                  height: "16px",
                }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  paddingLeft: "2.5rem",
                  margin: 0,
                  height: "38px",
                }}
              />
            </div>

            {/* All Filter Buttons - Grouped together */}
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              {/* Date Filter Dropdown */}
              <div style={{ position: "relative" }}>
                <button
                  className={`filter-pill ${dateFilter !== "All" ? "active" : ""}`}
                  onClick={() => setShowDateDropdown(!showDateDropdown)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <FiCalendar size={16} />
                  {dateFilter === "All"
                    ? "All Time"
                    : dateFilter === "Custom"
                      ? "Custom Range"
                      : dateFilter}
                </button>

                {/* Date Dropdown Menu */}
                {showDateDropdown && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      marginTop: "0.5rem",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      boxShadow: "var(--shadow-lg)",
                      zIndex: 50,
                      minWidth: "180px",
                      overflow: "hidden",
                    }}
                  >
                    {[
                      { value: "All", label: "All Time" },
                      { value: "Today", label: "Today" },
                      { value: "1 Week", label: "1 Week" },
                      { value: "1 Month", label: "1 Month" },
                      { value: "3 Months", label: "3 Months" },
                      { value: "1 Year", label: "1 Year" },
                      { value: "Custom", label: "Custom Range" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setDateFilter(option.value);
                          if (option.value === "Custom") {
                            setShowCustomDatePicker(true);
                          } else {
                            setShowCustomDatePicker(false);
                          }
                          setShowDateDropdown(false);
                        }}
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          border: "none",
                          background:
                            dateFilter === option.value
                              ? "var(--primary)"
                              : "transparent",
                          color:
                            dateFilter === option.value
                              ? "white"
                              : "var(--text-primary)",
                          textAlign: "left",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontSize: "0.875rem",
                          fontWeight: "500",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (dateFilter !== option.value) {
                            e.target.style.background = "var(--bg-elevated)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (dateFilter !== option.value) {
                            e.target.style.background = "transparent";
                          }
                        }}
                      >
                        <FiCalendar size={14} />
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Click outside to close date dropdown */}
                {showDateDropdown && (
                  <div
                    style={{
                      position: "fixed",
                      inset: 0,
                      zIndex: 40,
                    }}
                    onClick={() => setShowDateDropdown(false)}
                  />
                )}
              </div>
              {/* Status Filter Dropdown */}
              <div style={{ position: "relative" }}>
                <button
                  className={`filter-pill ${statusFilter !== "All" ? "active" : ""}`}
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <FiFilter size={16} />
                  {statusFilter === "All"
                    ? `All (${stats.total})`
                    : statusFilter === "Open"
                      ? `Open (${stats.open})`
                      : statusFilter === "In Progress"
                        ? `In Progress (${stats.inProgress})`
                        : statusFilter === "Resolved"
                          ? `Resolved (${stats.resolved})`
                          : `Closed (${stats.closed})`}
                </button>

                {/* Status Dropdown Menu */}
                {showStatusDropdown && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      marginTop: "0.5rem",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      boxShadow: "var(--shadow-lg)",
                      zIndex: 50,
                      minWidth: "200px",
                      overflow: "hidden",
                    }}
                  >
                    {[
                      {
                        value: "All",
                        label: "All",
                        count: stats.total,
                        icon: <FiFilter size={14} />,
                      },
                      {
                        value: "Open",
                        label: "Open",
                        count: stats.open,
                        icon: <FiFileText size={14} />,
                      },
                      {
                        value: "In Progress",
                        label: "In Progress",
                        count: stats.inProgress,
                        icon: <FiClock size={14} />,
                      },
                      {
                        value: "Resolved",
                        label: "Resolved",
                        count: stats.resolved,
                        icon: <FiCheckCircle size={14} />,
                      },
                      {
                        value: "Closed",
                        label: "Closed",
                        count: stats.closed,
                        icon: <FiXCircle size={14} />,
                      },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setStatusFilter(option.value);
                          setShowStatusDropdown(false);
                        }}
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          border: "none",
                          background:
                            statusFilter === option.value
                              ? "var(--primary)"
                              : "transparent",
                          color:
                            statusFilter === option.value
                              ? "white"
                              : "var(--text-primary)",
                          textAlign: "left",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "0.5rem",
                          fontSize: "0.875rem",
                          fontWeight: "500",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (statusFilter !== option.value) {
                            e.target.style.background = "var(--bg-elevated)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (statusFilter !== option.value) {
                            e.target.style.background = "transparent";
                          }
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          {option.icon}
                          {option.label}
                        </span>
                        <span
                          style={{
                            background:
                              statusFilter === option.value
                                ? "rgba(255,255,255,0.2)"
                                : "var(--bg-elevated)",
                            padding: "0.125rem 0.5rem",
                            borderRadius: "9999px",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                          }}
                        >
                          {option.count}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Click outside to close status dropdown */}
                {showStatusDropdown && (
                  <div
                    style={{
                      position: "fixed",
                      inset: 0,
                      zIndex: 40,
                    }}
                    onClick={() => setShowStatusDropdown(false)}
                  />
                )}
              </div>

              {/* Sort Dropdown */}
              <div style={{ position: "relative" }}>
                <button
                  className="filter-pill"
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {sortBy === "newest" ? "Newest" : "Oldest"}
                  <FiChevronDown size={14} />
                </button>

                {/* Sort Dropdown Menu */}
                {showSortDropdown && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      marginTop: "0.5rem",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      boxShadow: "var(--shadow-lg)",
                      zIndex: 50,
                      minWidth: "140px",
                      overflow: "hidden",
                    }}
                  >
                    {[
                      { value: "newest", label: "Newest First" },
                      { value: "oldest", label: "Oldest First" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value);
                          setShowSortDropdown(false);
                        }}
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          border: "none",
                          background:
                            sortBy === option.value
                              ? "var(--primary)"
                              : "transparent",
                          color:
                            sortBy === option.value
                              ? "white"
                              : "var(--text-primary)",
                          textAlign: "left",
                          cursor: "pointer",
                          fontSize: "0.875rem",
                          fontWeight: "500",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (sortBy !== option.value) {
                            e.target.style.background = "var(--bg-elevated)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (sortBy !== option.value) {
                            e.target.style.background = "transparent";
                          }
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Click outside to close sort dropdown */}
                {showSortDropdown && (
                  <div
                    style={{
                      position: "fixed",
                      inset: 0,
                      zIndex: 40,
                    }}
                    onClick={() => setShowSortDropdown(false)}
                  />
                )}
              </div>

              {/* Office Filter Dropdown */}
              <div
                className="preview-office-filter"
                style={{ position: "relative" }}
              >
                <button
                  className={`filter-pill ${officeFilter !== "All" ? "active" : ""}`}
                  onClick={() => setShowOfficeDropdown(!showOfficeDropdown)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    maxWidth: "150px",
                  }}
                >
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {officeFilter === "All"
                      ? "All Offices"
                      : offices.find((o) => o.id === officeFilter)?.name ||
                        officeFilter}
                  </span>
                  <FiChevronDown size={14} style={{ flexShrink: 0 }} />
                </button>

                {/* Office Dropdown Menu */}
                {showOfficeDropdown && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      marginTop: "0.5rem",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      boxShadow: "var(--shadow-lg)",
                      zIndex: 50,
                      minWidth: "200px",
                      maxWidth: "300px",
                      maxHeight: "300px",
                      overflow: "auto",
                    }}
                  >
                    {[{ id: "All", name: "All Offices" }, ...offices].map(
                      (option) => (
                        <button
                          key={option.id}
                          onClick={() => {
                            setOfficeFilter(option.id);
                            setShowOfficeDropdown(false);
                          }}
                          style={{
                            width: "100%",
                            padding: "0.75rem 1rem",
                            border: "none",
                            background:
                              officeFilter === option.id
                                ? "var(--primary)"
                                : "transparent",
                            color:
                              officeFilter === option.id
                                ? "white"
                                : "var(--text-primary)",
                            textAlign: "left",
                            cursor: "pointer",
                            fontSize: "0.875rem",
                            fontWeight: "500",
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (officeFilter !== option.id) {
                              e.target.style.background = "var(--bg-elevated)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (officeFilter !== option.id) {
                              e.target.style.background = "transparent";
                            }
                          }}
                        >
                          {option.name}
                        </button>
                      ),
                    )}
                  </div>
                )}

                {/* Click outside to close office dropdown */}
                {showOfficeDropdown && (
                  <div
                    style={{
                      position: "fixed",
                      inset: 0,
                      zIndex: 40,
                    }}
                    onClick={() => setShowOfficeDropdown(false)}
                  />
                )}
              </div>

              {/* Export Button - Compact */}
              <button
                className="filter-pill active"
                onClick={exportToPDF}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "var(--success)",
                  borderColor: "var(--success)",
                  color: "white",
                }}
                title={`Export PDF (${filteredTickets.length})`}
              >
                <FiExternalLink size={16} />
                <span>{filteredTickets.length}</span>
              </button>
            </div>
          </div>

          {/* Custom Date Picker - Shows when Custom Range is selected */}
          {showCustomDatePicker && dateFilter === "Custom" && (
            <div
              style={{
                marginBottom: "1rem",
                padding: "1rem",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                gap: "0.75rem",
                alignItems: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: "1", minWidth: "150px" }}>
                <label
                  htmlFor="startDate"
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "var(--text-secondary)",
                    marginBottom: "0.25rem",
                  }}
                >
                  Start Date
                </label>
                <input
                  id="startDate"
                  type="date"
                  className="form-input"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  style={{ margin: 0 }}
                />
              </div>
              <div style={{ flex: "1", minWidth: "150px" }}>
                <label
                  htmlFor="endDate"
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "var(--text-secondary)",
                    marginBottom: "0.25rem",
                  }}
                >
                  End Date
                </label>
                <input
                  id="endDate"
                  type="date"
                  className="form-input"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  min={customStartDate}
                  style={{ margin: 0 }}
                />
              </div>
            </div>
          )}

          {/* Scrollable Tickets Table Container */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              minHeight: 0,
              maxHeight: "calc(100vh - 350px)",
              backgroundColor: "white",
              borderRadius: "1rem",
            }}
          >
            {filteredTickets.length === 0 ? (
              <div
                style={{
                  padding: "3rem",
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                <FiInbox
                  style={{
                    width: "64px",
                    height: "64px",
                    margin: "0 auto 1rem",
                    color: "var(--text-muted)",
                    opacity: 0.5,
                  }}
                />
                <p style={{ fontSize: "1.125rem", fontWeight: "600" }}>
                  {searchTerm ||
                  statusFilter !== "All" ||
                  officeFilter !== "All"
                    ? "No tickets found matching your criteria."
                    : "No tickets submitted yet."}
                </p>
              </div>
            ) : (
              <>
                <div
                  className="table-container preview-table-desktop"
                  style={{
                    border: "none",
                    background: "transparent",
                    height: "100%",
                    overflowX: "auto",
                    overflowY: "auto",
                  }}
                >
                  <table className="table">
                    <thead
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 10,
                      }}
                    >
                      <tr>
                        <th>Ticket ID</th>
                        <th>Name</th>
                        <th>Office</th>
                        <th>Category</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTickets.map((ticket) => (
                        <tr
                          key={ticket.id}
                          className={
                            newTicketIds.has(ticket.id) ? "ticket-new" : ""
                          }
                          onClick={() => handleTicketClick(ticket)}
                        >
                          <td>
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontWeight: "600",
                                color: "var(--primary)",
                              }}
                            >
                              {ticket.ticket_id}
                            </span>
                          </td>
                          <td>{ticket.full_name}</td>
                          <td>{ticket.offices?.name || "N/A"}</td>
                          <td>{ticket.categories?.name || "N/A"}</td>
                          <td>{getPriorityBadge(ticket.priority)}</td>
                          <td>{getStatusBadge(ticket.status)}</td>
                          <td
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "0.875rem",
                            }}
                          >
                            {formatDate(ticket.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="preview-mobile-cards">
                  {filteredTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className={`preview-ticket-card ${newTicketIds.has(ticket.id) ? "ticket-new" : ""}`}
                      onClick={() => handleTicketClick(ticket)}
                    >
                      <div className="preview-card-top">
                        <span className="preview-card-name">
                          {ticket.full_name}
                        </span>
                        <span className="preview-card-status">
                          {getStatusBadge(ticket.status)}
                        </span>
                      </div>
                      <div className="preview-card-bottom">
                        <span className="preview-card-id">
                          {ticket.ticket_id}
                        </span>
                        <span className="preview-card-divider">•</span>
                        <span className="preview-card-office">
                          {ticket.offices?.name || "N/A"}
                        </span>
                        <span className="preview-card-divider">•</span>
                        <span className="preview-card-category">
                          {ticket.categories?.name || "N/A"}
                        </span>
                        <span className="preview-card-divider">•</span>
                        <span className="preview-card-priority">
                          {getPriorityBadge(ticket.priority)}
                        </span>
                      </div>
                      <div className="preview-card-date">
                        {formatDate(ticket.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Ticket Details Modal */}
          {selectedTicket && (
            <TicketDetails
              ticket={selectedTicket}
              onClose={handleCloseDetails}
              authorName="Developer"
              readOnly={true}
              allowStatusUpdate={false}
              allowAttachmentEdit={false}
              allowRemarks={true}
            />
          )}

          {/* Return to Form Button */}
          <button
            onClick={() => navigate("/")}
            className="btn btn-icon"
            style={{
              position: "fixed",
              bottom: "2rem",
              right: "2rem",
              background: "var(--primary)",
              border: "1px solid var(--border)",
              width: "48px",
              height: "48px",
              boxShadow: "var(--shadow-lg)",
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              borderRadius: "50%",
            }}
            title="Return to Form"
          >
            <FiArrowLeft size={24} style={{ color: "white" }} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Preview;
