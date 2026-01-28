import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import TicketDetails from "./TicketDetails";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
  FiDownload,
} from "react-icons/fi";
import SearchableSelect from "../components/SearchableSelect";

function TicketList() {
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

  useEffect(() => {
    fetchTickets();
    fetchOffices();

    // Realtime subscription
    const channel = supabase
      .channel("ticket_list_channel")
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
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      {/* Statistics Cards - Fixed */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
          flexShrink: 0,
        }}
      >
        <div className="stat-card">
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
        <div className="stat-card">
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
        <div className="stat-card">
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
        <div className="stat-card">
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
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-label">Closed</div>
            <div className="stat-icon" style={{ background: "#e2e8f0" }}>
              <FiXCircle style={{ color: "#475569" }} />
            </div>
          </div>
          <div className="stat-value" style={{ color: "#475569" }}>
            {stats.closed}
          </div>
        </div>
      </div>

      {/* Search - Fixed */}
      <div
        style={{ marginBottom: "1rem", flexShrink: 0, position: "relative" }}
      >
        <FiSearch
          style={{
            position: "absolute",
            left: "1rem",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-muted)",
            width: "18px",
            height: "18px",
          }}
        />
        <input
          type="text"
          className="form-input"
          placeholder="Search tickets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ paddingLeft: "2.75rem" }}
        />
      </div>

      {/* Date Filter - Fixed */}
      <div style={{ marginBottom: "1rem", flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <button
            className={`filter-pill ${dateFilter === "All" ? "active" : ""}`}
            onClick={() => {
              setDateFilter("All");
              setShowCustomDatePicker(false);
            }}
          >
            <FiCalendar size={16} />
            All Time
          </button>
          <button
            className={`filter-pill ${dateFilter === "Today" ? "active" : ""}`}
            onClick={() => {
              setDateFilter("Today");
              setShowCustomDatePicker(false);
            }}
          >
            <FiCalendar size={16} />
            Today
          </button>
          <button
            className={`filter-pill ${dateFilter === "1 Week" ? "active" : ""}`}
            onClick={() => {
              setDateFilter("1 Week");
              setShowCustomDatePicker(false);
            }}
          >
            <FiCalendar size={16} />1 Week
          </button>
          <button
            className={`filter-pill ${dateFilter === "1 Month" ? "active" : ""}`}
            onClick={() => {
              setDateFilter("1 Month");
              setShowCustomDatePicker(false);
            }}
          >
            <FiCalendar size={16} />1 Month
          </button>
          <button
            className={`filter-pill ${dateFilter === "3 Months" ? "active" : ""}`}
            onClick={() => {
              setDateFilter("3 Months");
              setShowCustomDatePicker(false);
            }}
          >
            <FiCalendar size={16} />3 Months
          </button>
          <button
            className={`filter-pill ${dateFilter === "1 Year" ? "active" : ""}`}
            onClick={() => {
              setDateFilter("1 Year");
              setShowCustomDatePicker(false);
            }}
          >
            <FiCalendar size={16} />1 Year
          </button>
          <button
            className={`filter-pill ${dateFilter === "Custom" ? "active" : ""}`}
            onClick={() => {
              setDateFilter("Custom");
              setShowCustomDatePicker(!showCustomDatePicker);
            }}
          >
            <FiCalendar size={16} />
            Custom Range
          </button>
        </div>

        {/* Custom Date Picker */}
        {showCustomDatePicker && dateFilter === "Custom" && (
          <div
            style={{
              marginTop: "0.75rem",
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
      </div>

      {/* Filter Pills and Dropdowns - Fixed */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
          flexShrink: 0,
        }}
      >
        {/* Status Filter Pills */}
        <div
          style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", flex: 1 }}
        >
          <button
            className={`filter-pill ${statusFilter === "All" ? "active" : ""}`}
            onClick={() => setStatusFilter("All")}
          >
            <FiFilter size={16} />
            All ({stats.total})
          </button>
          <button
            className={`filter-pill ${statusFilter === "Open" ? "active" : ""}`}
            onClick={() => setStatusFilter("Open")}
          >
            <FiFileText size={16} />
            Open ({stats.open})
          </button>
          <button
            className={`filter-pill ${statusFilter === "In Progress" ? "active" : ""}`}
            onClick={() => setStatusFilter("In Progress")}
          >
            <FiClock size={16} />
            In Progress ({stats.inProgress})
          </button>
          <button
            className={`filter-pill ${statusFilter === "Resolved" ? "active" : ""}`}
            onClick={() => setStatusFilter("Resolved")}
          >
            <FiCheckCircle size={16} />
            Resolved ({stats.resolved})
          </button>
          <button
            className={`filter-pill ${statusFilter === "Closed" ? "active" : ""}`}
            onClick={() => setStatusFilter("Closed")}
          >
            <FiXCircle size={16} />
            Closed ({stats.closed})
          </button>
        </div>

        {/* Dropdowns */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <SearchableSelect
            options={[
              { id: "newest", name: "Newest First" },
              { id: "oldest", name: "Oldest First" },
            ]}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            name="sortBy"
            placeholder="Sort By"
            style={{ width: "170px", marginBottom: 0 }}
            modal
          />
          <SearchableSelect
            options={[{ id: "All", name: "All Offices" }, ...offices]}
            value={officeFilter}
            onChange={(e) => setOfficeFilter(e.target.value)}
            name="officeFilter"
            placeholder="All Offices"
            style={{ width: "170px", marginBottom: 0 }}
            modal
            modalWidth="500px"
          />
          <button
            className="btn btn-success"
            onClick={exportToPDF}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              whiteSpace: "nowrap",
            }}
          >
            <FiDownload size={18} />
            Export PDF ({filteredTickets.length})
          </button>
        </div>
      </div>

      {/* Scrollable Tickets Table Container */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          minHeight: 0,
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
              {searchTerm || statusFilter !== "All" || officeFilter !== "All"
                ? "No tickets found matching your criteria."
                : "No tickets submitted yet."}
            </p>
          </div>
        ) : (
          <div
            className="table-container"
            style={{
              border: "none",
              background: "transparent",
              height: "100%",
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
                  <th>Error Type</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} onClick={() => handleTicketClick(ticket)}>
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
                    <td>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: ticket.error_type
                            ? "var(--text-primary)"
                            : "var(--text-muted)",
                        }}
                      >
                        {ticket.error_type || "-"}
                      </span>
                    </td>
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
        )}
      </div>

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <TicketDetails
          ticket={selectedTicket}
          onClose={handleCloseDetails}
          authorName="Admin"
        />
      )}
    </div>
  );
}

export default TicketList;
