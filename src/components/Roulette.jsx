import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { FiTarget, FiUser, FiRefreshCw, FiAward, FiTrash2, FiRotateCcw, FiUsers, FiPlus, FiMinus, FiSettings, FiCrosshair, FiRepeat, FiShield } from "react-icons/fi";

const COLORS = [
  "#f43f5e", // Rose
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#0ea5e9", // Light Blue
  "#14b8a6", // Teal
  "#eab308", // Yellow
  "#6366f1", // Indigo
];

const WHEEL_ICONS = {
  main: FiCrosshair,
  sub: FiRepeat,
  support: FiShield,
};

const WHEEL_TYPES = [
  { key: "main", label: "Main", color: "#2563eb", lightColor: "#dbeafe" },
  { key: "sub", label: "Sub", color: "#10b981", lightColor: "#d1fae5" },
  { key: "support", label: "Support", color: "#f59e0b", lightColor: "#fef3c7" },
];

function Roulette() {
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Game state
  const [mode, setMode] = useState("standard"); // "standard", "elimination", or "weekends"
  const [autoSpin, setAutoSpin] = useState(false);
  const [activeOfficers, setActiveOfficers] = useState([]);
  const [eliminatedOfficers, setEliminatedOfficers] = useState([]);
  
  // Wheel state
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState(null); 
  
  // Weekend state
  const [activeWheelType, setActiveWheelType] = useState("main");
  const [wheelAssignments, setWheelAssignments] = useState({ main: [], sub: [], support: [] });
  const [showManagePanel, setShowManagePanel] = useState(false);
  const [weekendRotations, setWeekendRotations] = useState({ main: 0, sub: 0, support: 0 });
  const [weekendSelected, setWeekendSelected] = useState({ main: null, sub: null, support: null });
  
  const wheelRef = useRef(null);

  useEffect(() => {
    fetchOfficers();
  }, []);

  useEffect(() => {
    if (mode === "weekends") {
      fetchWheelAssignments();
    }
  }, [mode]);

  const fetchOfficers = async () => {
    try {
      const { data, error } = await supabase
        .from("officers")
        .select("*")
        .order("name");

      if (error) throw error;
      const fetchedOfficers = data || [];
      setOfficers(fetchedOfficers);
      setActiveOfficers(fetchedOfficers);
    } catch (error) {
      console.error("Error fetching officers:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWheelAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from("weekend_wheel_assignments")
        .select("*, officers(*)");

      if (error) throw error;

      const assignments = { main: [], sub: [], support: [] };
      (data || []).forEach(row => {
        if (row.officers && assignments[row.wheel_type]) {
          assignments[row.wheel_type].push(row.officers);
        }
      });
      setWheelAssignments(assignments);
    } catch (error) {
      console.error("Error fetching wheel assignments:", error);
    }
  };

  const assignOfficerToWheel = async (officerId, wheelType) => {
    try {
      const { error } = await supabase
        .from("weekend_wheel_assignments")
        .insert({ officer_id: officerId, wheel_type: wheelType });

      if (error) throw error;
      await fetchWheelAssignments();
    } catch (error) {
      console.error("Error assigning officer:", error);
    }
  };

  const removeOfficerFromWheel = async (officerId, wheelType) => {
    try {
      const { error } = await supabase
        .from("weekend_wheel_assignments")
        .delete()
        .eq("officer_id", officerId)
        .eq("wheel_type", wheelType);

      if (error) throw error;
      await fetchWheelAssignments();
    } catch (error) {
      console.error("Error removing officer:", error);
    }
  };

  const isOfficerInWheel = (officerId, wheelType) => {
    return wheelAssignments[wheelType]?.some(o => o.id === officerId);
  };

  // Check if an officer is assigned to ANY other wheel (not the given one)
  const isOfficerInOtherWheel = (officerId, currentWheelType) => {
    return WHEEL_TYPES.some(wt => 
      wt.key !== currentWheelType && wheelAssignments[wt.key]?.some(o => o.id === officerId)
    );
  };

  // Get which other wheel an officer is assigned to
  const getOfficerOtherWheel = (officerId, currentWheelType) => {
    const found = WHEEL_TYPES.find(wt => 
      wt.key !== currentWheelType && wheelAssignments[wt.key]?.some(o => o.id === officerId)
    );
    return found || null;
  };

  const handleModeChange = (newMode) => {
    if (isSpinning) return;
    setMode(newMode);
    setAutoSpin(false);
    resetGame();
  };

  const resetGame = () => {
    setActiveOfficers(officers);
    setEliminatedOfficers([]);
    setSelectedOfficer(null);
    setRotation(0);
    setAutoSpin(false);
  };

  const spinWheel = () => {
    if (isSpinning) return;
    
    // For weekends mode, spin only the active wheel's officers
    const officersToSpin = mode === "weekends" 
      ? wheelAssignments[activeWheelType] 
      : activeOfficers;
    
    if (officersToSpin.length === 0) return;
    
    // In elimination mode, if 1 left, they are the winner, no need to spin
    if (mode === "elimination" && activeOfficers.length <= 1) return;
    
    setIsSpinning(true);
    setSelectedOfficer(null);
    if (mode === "weekends") {
      setWeekendSelected(prev => ({ ...prev, [activeWheelType]: null }));
    }

    const currentRotation = mode === "weekends" ? weekendRotations[activeWheelType] : rotation;
    const extraSpins = 5; 
    const randomDegree = Math.floor(Math.random() * 360);
    const totalRotation = currentRotation + (360 - (currentRotation % 360)) + (extraSpins * 360) + randomDegree;
    
    if (mode === "weekends") {
      setWeekendRotations(prev => ({ ...prev, [activeWheelType]: totalRotation }));
    } else {
      setRotation(totalRotation);
    }

    setTimeout(() => {
      setIsSpinning(false);
      
      const normalizedRotation = totalRotation % 360;
      const winningDegree = (360 - normalizedRotation) % 360;
      
      const sliceSize = 360 / officersToSpin.length;
      const winningIndex = Math.floor(winningDegree / sliceSize);
      
      const winner = officersToSpin[winningIndex];
      
      if (mode === "weekends") {
        setWeekendSelected(prev => ({ ...prev, [activeWheelType]: winner }));
      }
      setSelectedOfficer(winner);
    }, 4000); 
  };

  const handleContinue = () => {
    if (mode === "weekends") {
      setSelectedOfficer(null);
      setWeekendSelected(prev => ({ ...prev, [activeWheelType]: null }));
      return;
    }
    if (selectedOfficer) {
      setActiveOfficers(activeOfficers.filter(o => o.id !== selectedOfficer.id));
      setEliminatedOfficers([...eliminatedOfficers, selectedOfficer]);
    }
    setSelectedOfficer(null);
  };

  // Auto-spin logic
  useEffect(() => {
    let timer;
    if (mode === "weekends") return; // no auto-spin in weekends mode
    // When a player is selected (popup is showing)
    if (autoSpin && selectedOfficer && !isSpinning) {
      timer = setTimeout(() => {
        handleContinue();
      }, 2000); // Wait 2s to show who was selected
    }
    // When no player is selected, we are not spinning, and there are active officers
    else if (autoSpin && !selectedOfficer && !isSpinning && activeOfficers.length > 0) {
      const isGameOver = (mode === "elimination" && activeOfficers.length <= 1) || (mode === "standard" && activeOfficers.length === 0);
      if (!isGameOver) {
        timer = setTimeout(() => {
          spinWheel();
        }, 500); // Wait 0.5s before spinning again
      } else {
        setAutoSpin(false); // turn off auto spin if game is over
      }
    }
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSpin, selectedOfficer, isSpinning, activeOfficers.length, mode]);

  if (loading) {
    return (
      <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column", padding: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2rem" }}>
          <div>
            <div className="skeleton-shimmer" style={{ width: "200px", height: "32px", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)", marginBottom: "0.5rem" }}></div>
            <div className="skeleton-shimmer" style={{ width: "300px", height: "20px", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)" }}></div>
          </div>
          <div className="skeleton-shimmer" style={{ width: "200px", height: "40px", background: "var(--bg-elevated)", borderRadius: "var(--radius-lg)" }}></div>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="skeleton-shimmer" style={{ width: "400px", height: "400px", borderRadius: "50%", background: "var(--bg-elevated)", border: "8px solid var(--border)" }}></div>
        </div>
      </div>
    );
  }

  if (officers.length === 0) {
    return (
      <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
        <h2>No Officers Found</h2>
        <p className="text-muted">You need to add some officers before you can use the roulette.</p>
      </div>
    );
  }

  const isGrandWinner = mode === "elimination" && activeOfficers.length === 1 && eliminatedOfficers.length > 0;

  // Determine which officers to render on the wheel
  const displayOfficers = mode === "weekends" 
    ? (wheelAssignments[activeWheelType] || [])
    : activeOfficers;

  const currentRotation = mode === "weekends" ? weekendRotations[activeWheelType] : rotation;

  const sliceSize = displayOfficers.length > 0 ? 360 / displayOfficers.length : 360;
  const gradientBackground = displayOfficers.length > 0 ? displayOfficers.map((off, index) => {
    const start = index * sliceSize;
    const end = start + sliceSize;
    const color = COLORS[index % COLORS.length];
    return `${color} ${start}deg ${end}deg`;
  }).join(", ") : "var(--border) 0 360deg";

  const activeWheelConfig = WHEEL_TYPES.find(w => w.key === activeWheelType);

  // Render the weekends mode
  if (mode === "weekends") {
    return (
      <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
        
        {/* Header and Mode Selector */}
        <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
              <FiTarget className="text-primary" />
              Weekend Roulette
            </h2>
            <p className="text-muted" style={{ margin: "0.5rem 0 0" }}>
              Assign officers to Main, Sub, and Support wheels for weekend duty.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", background: "var(--bg-card)", border: "1px solid var(--border)", padding: "0.25rem", borderRadius: "var(--radius-lg)" }}>
            <button 
              onClick={() => handleModeChange("standard")}
              style={{ 
                padding: "0.5rem 1rem", 
                border: "none", 
                background: "transparent",
                color: "var(--text-secondary)",
                fontWeight: "500",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Standard
            </button>
            <button 
              onClick={() => handleModeChange("elimination")}
              style={{ 
                padding: "0.5rem 1rem", 
                border: "none", 
                background: "transparent",
                color: "var(--text-secondary)",
                fontWeight: "500",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Elimination
            </button>
            <button 
              onClick={() => handleModeChange("weekends")}
              style={{ 
                padding: "0.5rem 1rem", 
                border: "none", 
                background: "#fef3c7",
                color: "#b45309",
                fontWeight: "600",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Weekends
            </button>
          </div>
        </div>

        {/* Wheel Type Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {WHEEL_TYPES.map(wt => (
            <button
              key={wt.key}
              onClick={() => {
                if (!isSpinning) {
                  setActiveWheelType(wt.key);
                  setSelectedOfficer(weekendSelected[wt.key]);
                }
              }}
              style={{
                flex: "1 1 0",
                minWidth: "120px",
                padding: "0.75rem 1rem",
                border: activeWheelType === wt.key ? `2px solid ${wt.color}` : "2px solid var(--border)",
                background: activeWheelType === wt.key ? wt.lightColor : "var(--bg-card)",
                color: activeWheelType === wt.key ? wt.color : "var(--text-secondary)",
                fontWeight: activeWheelType === wt.key ? "700" : "500",
                borderRadius: "var(--radius-lg)",
                cursor: isSpinning ? "not-allowed" : "pointer",
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                fontSize: "0.95rem",
                transform: activeWheelType === wt.key ? "scale(1.02)" : "scale(1)",
                boxShadow: activeWheelType === wt.key ? `0 4px 12px ${wt.color}25` : "none"
              }}
            >
              {(() => { const Icon = WHEEL_ICONS[wt.key]; return <Icon size={18} />; })()}
              {wt.label}
              <span style={{
                background: activeWheelType === wt.key ? wt.color : "var(--border-light)",
                color: activeWheelType === wt.key ? "white" : "var(--text-muted)",
                padding: "0.15rem 0.5rem",
                borderRadius: "100px",
                fontSize: "0.75rem",
                fontWeight: "700",
                minWidth: "24px",
                textAlign: "center"
              }}>
                {wheelAssignments[wt.key]?.length || 0}
              </span>
            </button>
          ))}
        </div>

        <div style={{ flex: 1, display: "flex", gap: "2rem", overflow: "auto", flexWrap: "wrap" }}>
          
          {/* Main Wheel Area */}
          <div style={{ flex: "1 1 300px", minWidth: "300px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2rem" }}>
            
            {displayOfficers.length === 0 ? (
              <div style={{ 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center", 
                justifyContent: "center",
                padding: "3rem",
                gap: "1rem",
                color: "var(--text-muted)" 
              }}>
                <div style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  background: activeWheelConfig.lightColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: activeWheelConfig.color
                }}>
                  {(() => { const Icon = WHEEL_ICONS[activeWheelType]; return <Icon size={48} />; })()}
                </div>
                <p style={{ fontSize: "1.1rem", fontWeight: "600", color: "var(--text-secondary)" }}>
                  No officers assigned to {activeWheelConfig.label} wheel
                </p>
                <p style={{ fontSize: "0.9rem" }}>
                  Click <strong>"Manage"</strong> to assign officers
                </p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowManagePanel(true)}
                  style={{ borderRadius: "100px", padding: "0.75rem 2rem" }}
                >
                  <FiPlus /> Assign Officers
                </button>
              </div>
            ) : (
              <>
                {/* Wheel Container */}
                <div className="responsive-wheel" style={{ maxWidth: "400px" }}>
                  
                  {/* Pointer */}
                  <div style={{
                    position: "absolute",
                    top: "-20px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "40px",
                    height: "50px",
                    background: activeWheelConfig.color,
                    clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                    zIndex: 10,
                    filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.3))"
                  }}></div>

                  {/* Wheel */}
                  <div 
                    ref={wheelRef}
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      background: `conic-gradient(${gradientBackground})`,
                      transition: "transform 4s cubic-bezier(0.15, 0.85, 0.15, 1)", 
                      transform: `rotate(${currentRotation}deg)`,
                      boxShadow: `0 10px 30px rgba(0,0,0,0.15), inset 0 0 0 10px rgba(255,255,255,0.2), 0 0 0 4px ${activeWheelConfig.color}30`,
                      position: "relative",
                      overflow: "hidden",
                      border: `6px solid ${activeWheelConfig.color}40`,
                    }}
                  >
                    {/* Labels */}
                    {displayOfficers.map((officer, index) => {
                      const rotateAngle = index * sliceSize + sliceSize / 2;
                      return (
                        <div 
                          key={officer.id}
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            width: "50%",
                            height: "40px",
                            transformOrigin: "left center",
                            transform: `translateY(-50%) rotate(${rotateAngle - 90}deg)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            paddingRight: "12px",
                            paddingLeft: "40px",
                            color: "white",
                            fontWeight: "bold",
                            textShadow: "1px 1px 3px rgba(0,0,0,0.9)",
                            fontSize: displayOfficers.length > 16 ? "0.65rem" : displayOfficers.length > 12 ? "0.75rem" : displayOfficers.length > 8 ? "0.85rem" : displayOfficers.length > 5 ? "0.95rem" : "1.1rem",
                            boxSizing: "border-box",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis"
                          }}
                        >
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{officer.name}</span>
                        </div>
                      );
                    })}
                    
                    {/* Center Dot */}
                    <div style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      width: "55px",
                      height: "55px",
                      background: "white",
                      borderRadius: "50%",
                      boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: activeWheelConfig.color
                    }}>
                      {(() => { const Icon = WHEEL_ICONS[activeWheelType]; return <Icon size={26} />; })()}
                    </div>
                  </div>
                </div>

                {/* Spin Button */}
                <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
                  <button 
                    className="btn" 
                    onClick={spinWheel}
                    disabled={isSpinning || displayOfficers.length === 0}
                    style={{ 
                      fontSize: "1.1rem", 
                      padding: "0.85rem 3rem", 
                      borderRadius: "100px",
                      background: activeWheelConfig.color,
                      color: "white",
                      border: "none",
                      boxShadow: `0 4px 14px ${activeWheelConfig.color}60`,
                      transform: isSpinning ? "scale(0.95)" : "scale(1)",
                      transition: "all 0.2s ease",
                      fontWeight: "bold",
                      cursor: isSpinning ? "not-allowed" : "pointer",
                      opacity: isSpinning ? 0.7 : 1
                    }}
                  >
                    {isSpinning ? (
                      <><FiRefreshCw className="spin" /> Spinning...</>
                    ) : (
                      "SPIN THE WHEEL"
                    )}
                  </button>

                  <button
                    className="btn"
                    onClick={() => setShowManagePanel(!showManagePanel)}
                    style={{
                      borderRadius: "100px",
                      padding: "0.85rem 1.5rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      border: showManagePanel ? `2px solid ${activeWheelConfig.color}` : "2px solid var(--border)",
                      background: showManagePanel ? activeWheelConfig.lightColor : "var(--bg-card)",
                      color: showManagePanel ? activeWheelConfig.color : "var(--text-secondary)",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    <FiSettings size={16} />
                    Manage
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Sidebar — Assigned Officers or Manage Panel */}
          <div style={{ 
            flex: "1 1 280px",
            minWidth: "280px",
            display: "flex",
            flexDirection: "column"
          }}>
            {showManagePanel ? (
              /* ===== MANAGE PANEL ===== */
              <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  marginBottom: "1rem" 
                }}>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem", color: activeWheelConfig.color }}>
                    <FiSettings />
                    Manage {activeWheelConfig.label} Wheel
                  </h3>
                  <button 
                    onClick={() => setShowManagePanel(false)}
                    style={{
                      border: "none",
                      background: "var(--bg-elevated)",
                      padding: "0.35rem 0.75rem",
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                      fontWeight: "600"
                    }}
                  >
                    Done
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {officers.map(officer => {
                    const isAssigned = isOfficerInWheel(officer.id, activeWheelType);
                    const inOtherWheel = isOfficerInOtherWheel(officer.id, activeWheelType);
                    const otherWheelInfo = inOtherWheel ? getOfficerOtherWheel(officer.id, activeWheelType) : null;

                    // Skip officers already assigned to another wheel
                    if (inOtherWheel && !isAssigned) return (
                      <div 
                        key={officer.id} 
                        style={{ 
                          padding: "0.6rem 0.75rem", 
                          background: "var(--bg-elevated)", 
                          border: "1.5px solid transparent",
                          borderRadius: "var(--radius-md)",
                          fontSize: "0.9rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "0.5rem",
                          opacity: 0.45
                        }}
                      >
                        <div style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: "0.5rem",
                          color: "var(--text-muted)"
                        }}>
                          <FiUser size={14} />
                          {officer.name}
                        </div>
                        <span style={{
                          fontSize: "0.7rem",
                          fontWeight: "600",
                          color: otherWheelInfo?.color || "var(--text-muted)",
                          background: otherWheelInfo?.lightColor || "var(--bg-elevated)",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "100px"
                        }}>
                          {otherWheelInfo && (() => { const Icon = WHEEL_ICONS[otherWheelInfo.key]; return <Icon size={10} style={{ marginRight: 2 }} />; })()} In {otherWheelInfo?.label}
                        </span>
                      </div>
                    );

                    return (
                      <div 
                        key={officer.id} 
                        style={{ 
                          padding: "0.6rem 0.75rem", 
                          background: isAssigned ? activeWheelConfig.lightColor : "var(--bg-elevated)", 
                          border: isAssigned ? `1.5px solid ${activeWheelConfig.color}40` : "1.5px solid transparent",
                          borderRadius: "var(--radius-md)",
                          fontSize: "0.9rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "0.5rem",
                          transition: "all 0.2s"
                        }}
                      >
                        <div style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: "0.5rem",
                          color: isAssigned ? activeWheelConfig.color : "var(--text-primary)",
                          fontWeight: isAssigned ? "600" : "normal"
                        }}>
                          <FiUser size={14} />
                          {officer.name}
                        </div>
                        <button
                          onClick={() => isAssigned 
                            ? removeOfficerFromWheel(officer.id, activeWheelType) 
                            : assignOfficerToWheel(officer.id, activeWheelType)
                          }
                          style={{
                            border: "none",
                            background: isAssigned ? "#fecaca" : `${activeWheelConfig.color}20`,
                            color: isAssigned ? "#dc2626" : activeWheelConfig.color,
                            padding: "0.3rem 0.6rem",
                            borderRadius: "var(--radius-sm)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            fontSize: "0.8rem",
                            fontWeight: "600",
                            transition: "all 0.2s"
                          }}
                        >
                          {isAssigned ? <><FiMinus size={12} /> Remove</> : <><FiPlus size={12} /> Add</>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* ===== ASSIGNED OFFICERS LIST ===== */
              <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem", color: activeWheelConfig.color }}>
                  {(() => { const Icon = WHEEL_ICONS[activeWheelType]; return <Icon size={18} />; })()}
                  {activeWheelConfig.label} Wheel ({displayOfficers.length})
                </h3>
                
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {displayOfficers.length === 0 ? (
                    <div style={{ 
                      padding: "2rem", 
                      textAlign: "center", 
                      color: "var(--text-muted)",
                      background: "var(--bg-elevated)",
                      borderRadius: "var(--radius-lg)",
                      border: "2px dashed var(--border)"
                    }}>
                      <p style={{ margin: 0, fontSize: "0.9rem" }}>No officers assigned yet</p>
                    </div>
                  ) : (
                    displayOfficers.map((officer, index) => (
                      <div key={officer.id} style={{ 
                        padding: "0.6rem 0.75rem", 
                        background: weekendSelected[activeWheelType]?.id === officer.id 
                          ? activeWheelConfig.lightColor 
                          : "var(--bg-elevated)", 
                        border: weekendSelected[activeWheelType]?.id === officer.id 
                          ? `1.5px solid ${activeWheelConfig.color}` 
                          : "1.5px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        fontSize: "0.9rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontWeight: weekendSelected[activeWheelType]?.id === officer.id ? "700" : "normal",
                        color: weekendSelected[activeWheelType]?.id === officer.id ? activeWheelConfig.color : "var(--text-primary)",
                        transition: "all 0.2s"
                      }}>
                        <span style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          background: COLORS[index % COLORS.length],
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          fontSize: "0.65rem",
                          color: "white",
                          fontWeight: "700"
                        }}>
                          {index + 1}
                        </span>
                        {officer.name}
                        {weekendSelected[activeWheelType]?.id === officer.id && (
                          <FiAward size={14} style={{ marginLeft: "auto", color: activeWheelConfig.color }} />
                        )}
                      </div>
                    ))
                  )}
                </div>

                {displayOfficers.length > 0 && (
                  <button
                    className="btn"
                    onClick={() => setShowManagePanel(true)}
                    style={{
                      marginTop: "1rem",
                      borderRadius: "var(--radius-md)",
                      padding: "0.6rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      border: "1px dashed var(--border-light)",
                      background: "transparent",
                      color: "var(--text-muted)",
                      fontWeight: "500",
                      cursor: "pointer",
                      fontSize: "0.85rem"
                    }}
                  >
                    <FiSettings size={14} /> Manage Officers
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Selected Officer Overlay (Weekends) */}
        {selectedOfficer && !isSpinning && mode === "weekends" && (
          <div style={{
            position: "absolute",
            inset: 0,
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(4px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20,
            animation: "fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
            borderRadius: "var(--radius-lg)"
          }}>
            <div style={{
              animation: "slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center"
            }}>
              <div style={{
                width: "100px",
                height: "100px",
                background: activeWheelConfig.lightColor,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
                color: activeWheelConfig.color,
                boxShadow: `0 8px 24px ${activeWheelConfig.color}30`
              }}>
                {(() => { const Icon = WHEEL_ICONS[activeWheelType]; return <Icon size={44} />; })()}
              </div>
              
              <h3 style={{ fontSize: "1.2rem", color: "var(--text-secondary)", margin: "0 0 0.25rem", textTransform: "uppercase", letterSpacing: "1px" }}>
                {activeWheelConfig.label} Wheel
              </h3>
              <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: "0 0 0.75rem" }}>Selected Officer</p>
              
              <h1 style={{ 
                fontSize: "3rem", 
                color: "var(--text-primary)", 
                margin: "0 0 2rem", 
                background: `linear-gradient(135deg, ${activeWheelConfig.color}, ${activeWheelConfig.color}aa)`,
                WebkitBackgroundClip: "text", 
                WebkitTextFillColor: "transparent" 
              }}>
                {selectedOfficer.name}
              </h1>
              
              <button 
                className="btn"
                onClick={handleContinue}
                style={{ 
                  fontSize: "1.1rem", 
                  padding: "0.75rem 3rem", 
                  borderRadius: "100px",
                  background: activeWheelConfig.color,
                  color: "white",
                  border: "none",
                  fontWeight: "700",
                  cursor: "pointer",
                  boxShadow: `0 4px 14px ${activeWheelConfig.color}50`
                }}
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========== STANDARD / ELIMINATION RENDER ==========
  return (
    <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      
      {/* Header and Mode Selector */}
      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
            <FiTarget className="text-primary" />
            Officer Roulette
          </h2>
          <p className="text-muted" style={{ margin: "0.5rem 0 0" }}>
            {mode === "standard" ? "Randomly select an officer for assignments." : "Spin to eliminate! Last officer standing wins."}
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", background: "var(--bg-card)", border: "1px solid var(--border)", padding: "0.25rem", borderRadius: "var(--radius-lg)" }}>
          <button 
            onClick={() => handleModeChange("standard")}
            style={{ 
              padding: "0.5rem 1rem", 
              border: "none", 
              background: mode === "standard" ? "var(--primary-light)" : "transparent",
              color: mode === "standard" ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: mode === "standard" ? "600" : "500",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Standard
          </button>
          <button 
            onClick={() => handleModeChange("elimination")}
            style={{ 
              padding: "0.5rem 1rem", 
              border: "none", 
              background: mode === "elimination" ? "var(--danger-light)" : "transparent",
              color: mode === "elimination" ? "var(--danger)" : "var(--text-secondary)",
              fontWeight: mode === "elimination" ? "600" : "500",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Elimination
          </button>
          <button 
            onClick={() => handleModeChange("weekends")}
            style={{ 
              padding: "0.5rem 1rem", 
              border: "none", 
              background: "transparent",
              color: "var(--text-secondary)",
              fontWeight: "500",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Weekends
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", gap: "2rem", overflow: "auto", flexWrap: "wrap" }}>
        
        {/* Main Wheel Area */}
        <div style={{ flex: 1, minWidth: "300px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2.5rem" }}>
          
          {/* Wheel Container */}
          <div className="responsive-wheel">
            
            {/* Pointer */}
            <div style={{
              position: "absolute",
              top: "-20px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "40px",
              height: "50px",
              background: "var(--text-primary)",
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              zIndex: 10,
              filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.3))"
            }}></div>

            {/* Wheel */}
            <div 
              ref={wheelRef}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                background: `conic-gradient(${gradientBackground})`,
                transition: "transform 4s cubic-bezier(0.15, 0.85, 0.15, 1)", 
                transform: `rotate(${rotation}deg)`,
                boxShadow: "0 10px 30px rgba(0,0,0,0.15), inset 0 0 0 10px rgba(255,255,255,0.2)",
                position: "relative",
                overflow: "hidden",
                border: "6px solid white",
                opacity: isGrandWinner ? 0.5 : 1
              }}
            >
              {/* Labels */}
              {activeOfficers.map((officer, index) => {
                const rotateAngle = index * sliceSize + sliceSize / 2;
                return (
                  <div 
                    key={officer.id}
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: "50%",
                      height: "40px",
                      transformOrigin: "left center",
                      transform: `translateY(-50%) rotate(${rotateAngle - 90}deg)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      paddingRight: "12px",
                      paddingLeft: "40px",
                      color: "white",
                      fontWeight: "bold",
                      textShadow: "1px 1px 3px rgba(0,0,0,0.9)",
                      fontSize: activeOfficers.length > 16 ? "0.65rem" : activeOfficers.length > 12 ? "0.75rem" : activeOfficers.length > 8 ? "0.85rem" : activeOfficers.length > 5 ? "0.95rem" : "1.1rem",
                      boxSizing: "border-box",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis"
                    }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{officer.name}</span>
                  </div>
                );
              })}
              
              {/* Center Dot */}
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "60px",
                height: "60px",
                background: "white",
                borderRadius: "50%",
                boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <FiTarget size={30} color="var(--primary)" />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
            <button 
              className={`btn ${mode === "elimination" ? "btn-danger" : "btn-primary"}`} 
              onClick={spinWheel}
              disabled={isSpinning || isGrandWinner || activeOfficers.length === 0}
              style={{ 
                fontSize: "1.2rem", 
                padding: "1rem 4rem", 
                borderRadius: "100px",
                boxShadow: `0 4px 14px ${mode === "elimination" ? "rgba(239, 68, 68, 0.4)" : "rgba(37, 99, 235, 0.4)"}`,
                transform: isSpinning ? "scale(0.95)" : "scale(1)",
                transition: "all 0.2s ease",
                fontWeight: "bold"
              }}
            >
              {isSpinning ? (
                <><FiRefreshCw className="spin" /> Spinning...</>
              ) : isGrandWinner ? (
                "GAME OVER"
              ) : (
                "SPIN THE WHEEL"
              )}
            </button>
            
            {eliminatedOfficers.length > 0 && (
              <button 
                className="btn" 
                onClick={resetGame}
                disabled={isSpinning}
                style={{ borderRadius: "100px", padding: "1rem 1.5rem" }}
                title="Reset Game"
              >
                <FiRotateCcw size={20} />
              </button>
            )}

            {/* Auto Spin Toggle */}
            <div 
              style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "0.5rem", 
                background: "var(--bg-elevated)", 
                padding: "0.5rem 1rem", 
                borderRadius: "100px",
                cursor: isSpinning && !autoSpin ? "not-allowed" : "pointer",
                border: autoSpin ? "2px solid var(--primary)" : "2px solid transparent",
                opacity: (isSpinning && !autoSpin) || isGrandWinner ? 0.5 : 1
              }} 
              onClick={() => {
                if (isGrandWinner || (isSpinning && !autoSpin)) return;
                setAutoSpin(!autoSpin);
              }}
            >
              <div style={{ 
                width: "40px", 
                height: "24px", 
                background: autoSpin ? "var(--primary)" : "var(--border-light)", 
                borderRadius: "12px",
                position: "relative",
                transition: "all 0.3s"
              }}>
                <div style={{
                  position: "absolute",
                  top: "2px",
                  left: autoSpin ? "18px" : "2px",
                  width: "20px",
                  height: "20px",
                  background: "white",
                  borderRadius: "50%",
                  transition: "all 0.3s"
                }}></div>
              </div>
              <span style={{ fontWeight: "600", fontSize: "0.9rem", color: autoSpin ? "var(--primary)" : "var(--text-secondary)" }}>Auto Spin</span>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ 
          flex: "1 1 250px",
          minWidth: "250px",
          display: "flex",
          flexDirection: "column"
        }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FiUsers className="text-muted" /> {mode === "standard" ? "Wheel" : "Players"} ({activeOfficers.length})
          </h3>
          
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {/* Selected / Eliminated list */}
            {eliminatedOfficers.map((officer, index) => (
              <div key={officer.id} style={{ 
                padding: "0.5rem 0.75rem", 
                background: mode === "standard" ? "var(--success-light)" : "var(--bg-main)", 
                border: mode === "standard" ? "1px solid var(--success)" : "none",
                borderRadius: "var(--radius-md)",
                color: mode === "standard" ? "var(--success)" : "var(--danger)",
                textDecoration: mode === "standard" ? "none" : "line-through",
                fontSize: "0.9rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontWeight: mode === "standard" ? "bold" : "normal"
              }}>
                {officer.name}
                {mode === "standard" ? <FiAward size={14} /> : <FiTrash2 size={14} />}
              </div>
            ))}
            
            {/* Active list */}
            {activeOfficers.map(officer => (
              <div key={officer.id} style={{ 
                padding: "0.5rem 0.75rem", 
                background: isGrandWinner && activeOfficers.length === 1 ? "var(--success-light)" : "var(--bg-elevated)", 
                border: isGrandWinner && activeOfficers.length === 1 ? "1px solid var(--success)" : "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                color: isGrandWinner && activeOfficers.length === 1 ? "var(--success)" : "var(--text-primary)",
                fontWeight: isGrandWinner && activeOfficers.length === 1 ? "bold" : "normal",
                fontSize: "0.9rem"
              }}>
                {officer.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Officer Overlay */}
      {selectedOfficer && !isSpinning && !isGrandWinner && mode !== "weekends" && (
        <div style={{
          position: "absolute",
          inset: 0,
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(4px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 20,
          animation: "fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          borderRadius: "var(--radius-lg)"
        }}>
          <div style={{
            animation: "slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center"
          }}>
            <div style={{
              width: "100px",
              height: "100px",
              background: mode === "standard" ? "var(--primary-light)" : "var(--danger-light)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1rem",
              color: mode === "standard" ? "var(--primary)" : "var(--danger)"
            }}>
              {mode === "standard" ? <FiAward size={50} /> : <FiTrash2 size={46} />}
            </div>
            
            <h3 style={{ fontSize: "1.5rem", color: "var(--text-secondary)", margin: "0 0 0.5rem" }}>
              {mode === "standard" ? "The Winner is" : "Eliminated"}
            </h3>
            
            <h1 style={{ 
              fontSize: "3.5rem", 
              color: "var(--text-primary)", 
              margin: "0 0 2rem", 
              background: mode === "standard" 
                ? "linear-gradient(135deg, var(--primary), var(--primary-dark, #1e40af))"
                : "linear-gradient(135deg, var(--danger), #b91c1c)",
              WebkitBackgroundClip: "text", 
              WebkitTextFillColor: "transparent" 
            }}>
              {selectedOfficer.name}
            </h1>
            
            <button 
              className={`btn ${mode === "standard" ? "btn-primary" : "btn-danger"}`}
              onClick={handleContinue}
              style={{ fontSize: "1.1rem", padding: "0.75rem 3rem", borderRadius: "100px" }}
            >
              {mode === "standard" ? "Play Again" : "Continue"}
            </button>
          </div>
        </div>
      )}

      {/* Grand Winner Overlay (Elimination Mode) */}
      {isGrandWinner && !isSpinning && (
        <div style={{
          position: "absolute",
          inset: 0,
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(8px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 20,
          animation: "fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
          borderRadius: "var(--radius-lg)"
        }}>
          <div style={{
            animation: "slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center"
          }}>
            <div style={{
              width: "120px",
              height: "120px",
              background: "var(--success-light)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1.5rem",
              color: "var(--success)",
              animation: "pulse 2s infinite"
            }}>
              <FiAward size={60} />
            </div>
            
            <h3 style={{ fontSize: "1.75rem", color: "var(--success)", margin: "0 0 0.5rem", textTransform: "uppercase", letterSpacing: "2px" }}>
              Last Officer Standing
            </h3>
            
            <h1 style={{ 
              fontSize: "4.5rem", 
              fontWeight: "900",
              margin: "0 0 2.5rem", 
              background: "linear-gradient(135deg, var(--success), #10b981)",
              WebkitBackgroundClip: "text", 
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))"
            }}>
              {activeOfficers[0].name}
            </h1>
            
            <button 
              className="btn btn-primary"
              onClick={resetGame}
              style={{ fontSize: "1.2rem", padding: "1rem 4rem", borderRadius: "100px", boxShadow: "0 4px 15px rgba(37,99,235,0.3)" }}
            >
              Start New Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Roulette;
