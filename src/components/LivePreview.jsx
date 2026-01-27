import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  FiFileText,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiTrendingUp,
  FiRefreshCw,
} from "react-icons/fi";

function LivePreview() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    fetchTickets();

    // Realtime subscription for tickets
    const channel = supabase
      .channel("live_tickets_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => {
          fetchTickets(false);
          setLastUpdate(new Date());
        },
      )
      .subscribe();

    // Auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchTickets(false);
      setLastUpdate(new Date());
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(refreshInterval);
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

  // Calculate statistics
  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "Open").length,
    inProgress: tickets.filter((t) => t.status === "In Progress").length,
    resolved: tickets.filter((t) => t.status === "Resolved").length,
    closed: tickets.filter((t) => t.status === "Closed").length,
  };

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

  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="loading-container" style={{ height: "100vh" }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        color: "white",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1.5rem 2rem",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: "700",
              margin: 0,
              background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Live Ticket Dashboard
          </h1>
          <p
            style={{
              margin: "0.25rem 0 0",
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            Real-time ticket monitoring
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            color: "rgba(255,255,255,0.6)",
            fontSize: "0.875rem",
          }}
        >
          <FiRefreshCw
            size={16}
            style={{
              animation: "spin 2s linear infinite",
            }}
          />
          Last updated: {formatTime(lastUpdate)}
        </div>
      </div>

      {/* Statistics Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "1rem",
          padding: "1.5rem 2rem",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            borderRadius: "1rem",
            padding: "1.25rem",
            border: "1px solid rgba(255,255,255,0.1)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "2.5rem",
              fontWeight: "700",
              color: "#3b82f6",
              lineHeight: 1,
            }}
          >
            {stats.total}
          </div>
          <div
            style={{
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.7)",
              marginTop: "0.5rem",
              fontWeight: "600",
            }}
          >
            Total Tickets
          </div>
        </div>
        <div
          style={{
            background: "rgba(59,130,246,0.15)",
            borderRadius: "1rem",
            padding: "1.25rem",
            border: "1px solid rgba(59,130,246,0.3)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "2.5rem",
              fontWeight: "700",
              color: "#60a5fa",
              lineHeight: 1,
            }}
          >
            {stats.open}
          </div>
          <div
            style={{
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.7)",
              marginTop: "0.5rem",
              fontWeight: "600",
            }}
          >
            Open
          </div>
        </div>
        <div
          style={{
            background: "rgba(245,158,11,0.15)",
            borderRadius: "1rem",
            padding: "1.25rem",
            border: "1px solid rgba(245,158,11,0.3)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "2.5rem",
              fontWeight: "700",
              color: "#fbbf24",
              lineHeight: 1,
            }}
          >
            {stats.inProgress}
          </div>
          <div
            style={{
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.7)",
              marginTop: "0.5rem",
              fontWeight: "600",
            }}
          >
            In Progress
          </div>
        </div>
        <div
          style={{
            background: "rgba(16,185,129,0.15)",
            borderRadius: "1rem",
            padding: "1.25rem",
            border: "1px solid rgba(16,185,129,0.3)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "2.5rem",
              fontWeight: "700",
              color: "#34d399",
              lineHeight: 1,
            }}
          >
            {stats.resolved}
          </div>
          <div
            style={{
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.7)",
              marginTop: "0.5rem",
              fontWeight: "600",
            }}
          >
            Resolved
          </div>
        </div>
        <div
          style={{
            background: "rgba(100,116,139,0.15)",
            borderRadius: "1rem",
            padding: "1.25rem",
            border: "1px solid rgba(100,116,139,0.3)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "2.5rem",
              fontWeight: "700",
              color: "#94a3b8",
              lineHeight: 1,
            }}
          >
            {stats.closed}
          </div>
          <div
            style={{
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.7)",
              marginTop: "0.5rem",
              fontWeight: "600",
            }}
          >
            Closed
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          padding: "0 2rem 2rem",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            flex: 1,
            overflow: "auto",
            borderRadius: "1rem",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead
              style={{
                position: "sticky",
                top: 0,
                background: "rgba(15,23,42,0.95)",
                backdropFilter: "blur(10px)",
                zIndex: 10,
              }}
            >
              <tr>
                <th
                  style={{
                    padding: "1rem 1.5rem",
                    textAlign: "left",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "rgba(255,255,255,0.5)",
                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  Name
                </th>
                <th
                  style={{
                    padding: "1rem 1.5rem",
                    textAlign: "left",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "rgba(255,255,255,0.5)",
                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  Category
                </th>
                <th
                  style={{
                    padding: "1rem 1.5rem",
                    textAlign: "center",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "rgba(255,255,255,0.5)",
                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  Priority
                </th>
                <th
                  style={{
                    padding: "1rem 1.5rem",
                    textAlign: "center",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "rgba(255,255,255,0.5)",
                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: "3rem",
                      textAlign: "center",
                      color: "rgba(255,255,255,0.4)",
                    }}
                  >
                    No tickets submitted yet.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket, index) => (
                  <tr
                    key={ticket.id}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      animation: `fadeIn 0.3s ease-out ${index * 0.02}s both`,
                    }}
                  >
                    <td
                      style={{
                        padding: "1rem 1.5rem",
                        color: "white",
                        fontWeight: "500",
                        fontSize: "0.9375rem",
                      }}
                    >
                      {ticket.full_name}
                    </td>
                    <td
                      style={{
                        padding: "1rem 1.5rem",
                        color: "rgba(255,255,255,0.7)",
                        fontSize: "0.9375rem",
                      }}
                    >
                      {ticket.categories?.name || "N/A"}
                    </td>
                    <td
                      style={{
                        padding: "1rem 1.5rem",
                        textAlign: "center",
                      }}
                    >
                      {getPriorityBadge(ticket.priority)}
                    </td>
                    <td
                      style={{
                        padding: "1rem 1.5rem",
                        textAlign: "center",
                      }}
                    >
                      {getStatusBadge(ticket.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSS Animation */}
      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
}

export default LivePreview;
