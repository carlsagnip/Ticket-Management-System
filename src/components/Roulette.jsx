import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { FiTarget, FiUser, FiRefreshCw, FiAward, FiTrash2, FiRotateCcw, FiUsers } from "react-icons/fi";

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

function Roulette() {
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Game state
  const [mode, setMode] = useState("standard"); // "standard" or "elimination"
  const [autoSpin, setAutoSpin] = useState(false);
  const [activeOfficers, setActiveOfficers] = useState([]);
  const [eliminatedOfficers, setEliminatedOfficers] = useState([]);
  
  // Wheel state
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState(null); 
  
  const wheelRef = useRef(null);

  useEffect(() => {
    fetchOfficers();
  }, []);

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
    if (isSpinning || activeOfficers.length === 0) return;
    
    // In elimination mode, if 1 left, they are the winner, no need to spin
    if (mode === "elimination" && activeOfficers.length <= 1) return;
    
    setIsSpinning(true);
    setSelectedOfficer(null);

    const extraSpins = 5; 
    const randomDegree = Math.floor(Math.random() * 360);
    const totalRotation = rotation + (360 - (rotation % 360)) + (extraSpins * 360) + randomDegree;
    
    setRotation(totalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      
      const normalizedRotation = totalRotation % 360;
      const winningDegree = (360 - normalizedRotation) % 360;
      
      const sliceSize = 360 / activeOfficers.length;
      const winningIndex = Math.floor(winningDegree / sliceSize);
      
      setSelectedOfficer(activeOfficers[winningIndex]);
    }, 4000); 
  };

  const handleContinue = () => {
    if (selectedOfficer) {
      setActiveOfficers(activeOfficers.filter(o => o.id !== selectedOfficer.id));
      setEliminatedOfficers([...eliminatedOfficers, selectedOfficer]);
    }
    setSelectedOfficer(null);
  };

  // Auto-spin logic
  useEffect(() => {
    let timer;
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

  const sliceSize = 360 / activeOfficers.length;
  const gradientBackground = activeOfficers.length > 0 ? activeOfficers.map((off, index) => {
    const start = index * sliceSize;
    const end = start + sliceSize;
    const color = COLORS[index % COLORS.length];
    return `${color} ${start}deg ${end}deg`;
  }).join(", ") : "var(--border) 0 360deg";

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
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", gap: "2rem", overflow: "hidden" }}>
        
        {/* Main Wheel Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2.5rem" }}>
          
          {/* Wheel Container - INCREASED SIZE TO 500px */}
          <div style={{ position: "relative", width: "500px", height: "500px", margin: "0 auto", transition: "all 0.3s" }}>
            
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
                      paddingRight: "30px",
                      color: "white",
                      fontWeight: "bold",
                      textShadow: "1px 1px 4px rgba(0,0,0,0.8)",
                      fontSize: activeOfficers.length > 12 ? "0.8rem" : "1.1rem",
                      boxSizing: "border-box"
                    }}
                  >
                    {officer.name}
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
          width: "250px", 
          borderLeft: "1px solid var(--border)", 
          paddingLeft: "1.5rem",
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
      {selectedOfficer && !isSpinning && !isGrandWinner && (
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
