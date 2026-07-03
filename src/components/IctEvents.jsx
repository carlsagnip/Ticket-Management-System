import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useConfirm } from "./ConfirmProvider";
import { useToast } from "./ui/use-toast";
import { format, formatDistanceToNow, isPast, isToday, isFuture } from "date-fns";
import SearchableSelect from "./SearchableSelect";
import {
  FiPlus, FiCalendar, FiUser, FiCheckSquare, FiTrash2, FiX,
  FiEdit2, FiPlusCircle, FiCheck, FiSearch, FiClock, FiRefreshCw,
  FiMapPin, FiTag, FiFileText,
} from "react-icons/fi";

const EMPTY_EVENT = { 
  title: "", person_in_charge: [], 
  startDate: "", startTime: "", endDate: "", endTime: "", isMultiDay: false,
  location: "", event_type: "", notes: "", checklist: [] 
};

const EVENT_TYPES = ["Press Conference", "Meeting", "Technical Support", "Training", "Seminar", "Barangay Activity", "City Event", "Other"];

// Parse person_in_charge — handles both old string and new JSON array
const parseOfficers = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { const p = JSON.parse(val); return Array.isArray(p) ? p : [val]; }
  catch { return val ? [val] : []; }
};

const displayOfficers = (val) => parseOfficers(val).join(", ") || "—";

// Countdown hook
function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate) - new Date();
      if (diff <= 0) { setTimeLeft("Ongoing / Past"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    calc();
    const t = setInterval(calc, 30000);
    return () => clearInterval(t);
  }, [targetDate]);
  return timeLeft;
}

// Returns the "effective end" date for completed/countdown logic
const eventEndDate = (evt) => evt.event_end_date ? new Date(evt.event_end_date) : new Date(evt.event_date);

const getEventStatus = (evt) => {
  const end = eventEndDate(evt);
  const start = new Date(evt.event_date);
  const now = new Date();
  
  if (isPast(end)) {
    return "completed";
  }
  
  if (isToday(start) || isToday(end) || (now >= start && now <= end)) {
    return "today";
  }
  
  const diffMs = start - now;
  const diffHours = diffMs / (1000 * 60 * 60);
  
  if (diffHours > 0 && diffHours <= 24) {
    return "urgent"; // Less than 24 hours
  }
  if (diffHours > 0 && diffHours <= 48) {
    return "near"; // Less than 48 hours
  }
  
  return "upcoming";
};

const getEventCardStyle = (evt, isSelected) => {
  const status = getEventStatus(evt);
  if (status === "completed") {
    return {
      bg: "#ecfdf5", // Pastel green
      borderColor: isSelected ? "#2563eb" : "#a7f3d0"
    };
  }
  
  const start = new Date(evt.event_date);
  const now = new Date();
  const diffMs = start - now;
  const diffHours = diffMs / (1000 * 60 * 60);
  
  if (status === "today" || status === "urgent" || status === "near") {
    return {
      bg: "#fee2e2", // Pastel red if near (<= 48h or today)
      borderColor: isSelected ? "#2563eb" : "#fca5a5"
    };
  }
  
  // Yellow if starts in <= 5 days
  if (diffHours > 48 && diffHours <= 120) {
    return {
      bg: "#fef9c3", // Pastel yellow
      borderColor: isSelected ? "#2563eb" : "#fde047"
    };
  }
  
  // Blue if starts in > 5 days ("very very long pa")
  return {
    bg: "#eff6ff", // Pastel blue
    borderColor: isSelected ? "#2563eb" : "#bfdbfe"
  };
};

function CountdownBadge({ evt }) {
  const end = eventEndDate(evt);
  const t = useCountdown(end);
  const status = getEventStatus(evt);
  
  let color = "#1e40af";
  let icon = <FiClock size={11}/>;
  let text = t;
  
  if (status === "completed") {
    color = "#166534";
    icon = <FiCheck size={11}/>;
    text = "Completed";
  } else if (status === "today") {
    color = "#92400e";
    const isOngoing = new Date() >= new Date(evt.event_date);
    text = isOngoing ? "Ongoing" : `Today: ${t}`;
  } else {
    const start = new Date(evt.event_date);
    const now = new Date();
    const diffMs = start - now;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours > 0 && diffHours <= 48) {
      color = "#9f1239"; // red
      text = `Soon: ${t}`;
    } else if (diffHours > 48 && diffHours <= 120) {
      color = "#854d0e"; // yellow/amber
      text = t;
    } else {
      color = "#1e40af"; // blue
      text = t;
    }
  }
  
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:"4px",
      padding:"2px 8px", borderRadius:"999px", fontSize:"0.75rem", fontWeight:600,
      background: "#ffffff",
      color: color,
      border: `1px solid ${color}22`
    }}>
      {icon} {text}
    </span>
  );
}



export default function IctEvents() {
  const { confirm, alert } = useConfirm();
  const { toast } = useToast();
  const [events, setEvents] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(EMPTY_EVENT);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [newItemText, setNewItemText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [officerSearch, setOfficerSearch] = useState("");
  const [showOfficerDD, setShowOfficerDD] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("ict_events").select("*").order("event_date");
      if (error) throw error;
      setEvents(data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchEvents();
    supabase.from("officers").select("*").eq("is_active", true).order("name")
      .then(({ data }) => setOfficers(data || []));
    const ch = supabase.channel("ict_events_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "ict_events" }, fetchEvents)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchEvents]);

  // Keep selected in sync with events
  useEffect(() => {
    if (selected) setSelected(events.find(e => e.id === selected.id) || null);
  }, [events]);

  const openModal = (evt = null) => {
    let sd = "", st = "", ed = "", et = "", multi = false;
    if (evt) {
      if (evt.event_date) {
        const d = new Date(evt.event_date);
        sd = format(d, 'yyyy-MM-dd');
        st = format(d, 'HH:mm');
      }
      if (evt.event_end_date) {
        const d = new Date(evt.event_end_date);
        ed = format(d, 'yyyy-MM-dd');
        et = format(d, 'HH:mm');
        if (ed !== sd) multi = true;
      }
    } else {
       sd = format(new Date(), 'yyyy-MM-dd');
       st = "08:00";
       ed = sd;
    }

    setFormData(evt ? {
      title: evt.title,
      person_in_charge: parseOfficers(evt.person_in_charge),
      startDate: sd,
      startTime: st,
      endDate: ed,
      endTime: et,
      isMultiDay: multi,
      location: evt.location || "",
      event_type: evt.event_type || "",
      notes: evt.notes || "",
      checklist: evt.checklist || []
    } : { ...EMPTY_EVENT, startDate: sd, startTime: st, endDate: sd });
    setEditingId(evt?.id || null);
    setOfficerSearch(""); setShowOfficerDD(false);
    setNewItemText(""); setError(""); setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setFormData(EMPTY_EVENT); setEditingId(null); setShowOfficerDD(false); setOfficerSearch(""); };

  const addItem = () => {
    if (!newItemText.trim()) return;
    setFormData(p => ({ ...p, checklist: [...p.checklist, { id: Date.now().toString(), text: newItemText.trim(), checked: false }] }));
    setNewItemText("");
  };

  const toggleItem = (id) =>
    setFormData(p => ({ ...p, checklist: p.checklist.map(i => i.id===id ? {...i,checked:!i.checked} : i) }));

  const removeItem = (id) =>
    setFormData(p => ({ ...p, checklist: p.checklist.filter(i => i.id!==id) }));

  const toggleInDb = async (evtId, itemId) => {
    const evt = events.find(e => e.id===evtId);
    if (!evt) return;
    const item = evt.checklist.find(i => i.id===itemId);
    const updated = evt.checklist.map(i => i.id===itemId ? {...i,checked:!i.checked} : i);
    setEvents(prev => prev.map(e => e.id===evtId ? {...e,checklist:updated} : e));
    try {
      const { error } = await supabase.from("ict_events").update({ checklist: updated }).eq("id", evtId);
      if (error) throw error;
      toast({
        title: "Checklist Updated",
        description: `"${item?.text || "Item"}" has been ${!item?.checked ? "checked" : "unchecked"}.`,
        variant: "success"
      });
    } catch (err) {
      console.error("Error updating checklist:", err);
      toast({
        title: "Error",
        description: "Failed to update checklist item.",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const officersList = Array.isArray(formData.person_in_charge) ? formData.person_in_charge : [];
    if (!formData.title || officersList.length === 0 || !formData.startDate)
      return setError("Fill in all required fields.");
      
    const evDateStr = `${formData.startDate}T${formData.startTime || "00:00"}`;
    const evDate = new Date(evDateStr);
    let evEndDate = null;
    
    if (formData.isMultiDay || formData.endTime) {
       const eDate = formData.isMultiDay && formData.endDate ? formData.endDate : formData.startDate;
       const eTime = formData.endTime || "23:59";
       evEndDate = new Date(`${eDate}T${eTime}`);
       if (evEndDate < evDate) {
           return setError("End date/time cannot be before start date/time.");
       }
    }

    setSubmitting(true); setError("");
    try {
      const payload = { 
        title: formData.title,
        person_in_charge: JSON.stringify(officersList),
        event_date: evDate.toISOString(),
        event_end_date: evEndDate ? evEndDate.toISOString() : null,
        location: formData.location || null,
        event_type: formData.event_type || null,
        notes: formData.notes || null,
        checklist: formData.checklist
      };
      if (editingId) {
        const { error } = await supabase.from("ict_events").update(payload).eq("id", editingId);
        if (error) throw error;
        toast({
          title: "Event Updated",
          description: `Event "${formData.title}" has been updated successfully.`,
          variant: "success"
        });
      } else {
        const { error } = await supabase.from("ict_events").insert([payload]);
        if (error) throw error;
        toast({
          title: "Event Created",
          description: `Event "${formData.title}" has been created successfully.`,
          variant: "success"
        });
      }
      closeModal(); fetchEvents();
    } catch (err) {
      setError("Failed to save. Try again.");
      toast({
        title: "Error",
        description: err.message || "Failed to save event. Try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete Event",
      message: "Delete this event?",
      isDestructive: true
    });
    if (!isConfirmed) return;
    try {
      const { error } = await supabase.from("ict_events").delete().eq("id", id);
      if (error) throw error;
      toast({
        title: "Event Deleted",
        description: "Event has been deleted successfully.",
        variant: "success"
      });
      if (selected?.id === id) setSelected(null);
      fetchEvents();
    } catch (err) {
      console.error("Error deleting event:", err);
      toast({
        title: "Error",
        description: "Failed to delete event.",
        variant: "destructive"
      });
    }
  };



  // Stats — use end date if available for completed logic
  const upcoming = events.filter(e => isFuture(new Date(e.event_date)));
  const pastEvents = events.filter(e => isPast(eventEndDate(e)));
  const today = events.filter(e => isToday(new Date(e.event_date)) || (e.event_end_date && isToday(new Date(e.event_end_date))));
  const completed = pastEvents;

  // Filtered list
  const filtered = events.filter(e => {
    const isCompleted = isPast(eventEndDate(e));
    const matchTab = tab === "all"
      ? !isCompleted
      : (tab === "upcoming" ? (isFuture(new Date(e.event_date)) && !isCompleted) : isCompleted);
    const officersStr = displayOfficers(e.person_in_charge).toLowerCase();
    const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase()) || officersStr.includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const CARD = { background:"white", borderRadius:"12px", border:"1px solid #e2e8f0", boxShadow:"0 1px 3px rgba(0,0,0,0.06)" };
  const INPUT_STYLE = { width:"100%", padding:"8px 12px", border:"1px solid #e2e8f0", borderRadius:"8px", fontSize:"0.9rem", outline:"none", fontFamily:"inherit" };

  return (
    <div style={{ display:"flex", gap:"20px", height:"100%", minHeight:0 }}>
      {/* LEFT PANEL */}
      <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:"16px", overflow:"auto" }}>
        {/* Stats Row */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"12px" }}>
          {[
            { label:"Total Events", value:events.length, color:"#2563eb", bg:"#eff6ff" },
            { label:"Upcoming", value:upcoming.length, color:"#7c3aed", bg:"#f5f3ff" },
            { label:"Today", value:today.length, color:"#d97706", bg:"#fffbeb" },
            { label:"Completed", value:completed.length, color:"#059669", bg:"#ecfdf5" },
          ].map(s => (
            <div key={s.label} style={{ ...CARD, padding:"16px" }}>
              <div style={{ fontSize:"0.75rem", fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"8px" }}>{s.label}</div>
              <div style={{ fontSize:"2rem", fontWeight:700, color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
          <div style={{ position:"relative", flex:1 }}>
            <FiSearch size={14} style={{ position:"absolute", left:"10px", top:"50%", transform:"translateY(-50%)", color:"#94a3b8" }}/>
            <input placeholder="Search events..." value={search} onChange={e=>setSearch(e.target.value)}
              style={{ ...INPUT_STYLE, paddingLeft:"32px" }}/>
          </div>
          <div style={{ display:"flex", gap:"4px", background:"#f1f5f9", padding:"4px", borderRadius:"8px" }}>
            {["all","upcoming","past"].map(t => (
              <button key={t} onClick={()=>setTab(t)} style={{
                padding:"6px 14px", borderRadius:"6px", border:"none", cursor:"pointer",
                fontSize:"0.8rem", fontWeight:600, textTransform:"capitalize",
                background:tab===t?"white":"transparent", color:tab===t?"#2563eb":"#64748b",
                boxShadow:tab===t?"0 1px 3px rgba(0,0,0,0.1)":"none", transition:"all 0.15s"
              }}>{t}</button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={()=>openModal()} style={{ height:"38px", display:"flex", alignItems:"center", gap:"6px" }}>
            <FiPlus size={16}/> Add Event
          </button>
          <button onClick={fetchEvents} style={{ height:"38px", padding:"0 12px", border:"1px solid #e2e8f0", borderRadius:"8px", background:"white", cursor:"pointer", display:"flex", alignItems:"center" }}>
            <FiRefreshCw size={15} color="#64748b"/>
          </button>
        </div>

        {/* Event List */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton-shimmer" style={{ background: "white", borderRadius: "12px", border: "1px solid var(--border)", height: "90px", padding: "16px" }}></div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ ...CARD, padding:"48px", textAlign:"center", color:"#94a3b8" }}>
            <FiCalendar size={40} style={{ marginBottom:"12px" }}/>
            <div style={{ fontWeight:600, fontSize:"1rem" }}>No events found</div>
            <div style={{ fontSize:"0.85rem", marginTop:"4px" }}>Try a different filter or add a new event.</div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
            {filtered.map(evt => {
              const isSelected = selected?.id === evt.id;
              const total = evt.checklist?.length || 0;
              const done = evt.checklist?.filter(i=>i.checked).length || 0;
              
              const { bg, borderColor } = getEventCardStyle(evt, isSelected);

              return (
                <div key={evt.id} onClick={()=>setSelected(isSelected?null:evt)}
                  style={{ 
                    ...CARD, 
                    padding:"16px", 
                    cursor:"pointer", 
                    transition:"all 0.15s",
                    background: bg,
                    borderColor: borderColor,
                    boxShadow: isSelected ? "0 0 0 2px rgba(37,99,235,0.15), 0 1px 3px rgba(0,0,0,0.06)" : CARD.boxShadow 
                  }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"6px", flexWrap:"wrap" }}>
                        <span style={{ fontWeight:700, fontSize:"1rem", color:"#0f172a" }}>{evt.title}</span>
                        {evt.event_type && <span style={{ padding:"1px 7px", background:"#f1f5f9", color:"#475569", borderRadius:"999px", fontSize:"0.72rem", fontWeight:600 }}>{evt.event_type}</span>}
                        <CountdownBadge evt={evt}/>
                      </div>
                      <div style={{ display:"flex", gap:"12px", fontSize:"0.82rem", color:"#64748b", flexWrap:"wrap" }}>
                        <span style={{ display:"flex", alignItems:"center", gap:"4px" }}>
                          <FiCalendar size={12}/>
                          {format(new Date(evt.event_date),"MMM d, yyyy")}
                          {evt.event_end_date && ` – ${format(new Date(evt.event_end_date), new Date(evt.event_date).toDateString()===new Date(evt.event_end_date).toDateString() ? "h:mm a" : "MMM d, yyyy")}`}
                        </span>
                        <span style={{ display:"flex", alignItems:"center", gap:"4px" }}>
                          <FiUser size={12}/>{displayOfficers(evt.person_in_charge)}
                        </span>
                        {evt.location && <span style={{ display:"flex", alignItems:"center", gap:"4px" }}>
                          <FiMapPin size={12}/>{evt.location}
                        </span>}
                        {total > 0 && <span style={{ display:"flex", alignItems:"center", gap:"4px" }}>
                          <FiCheckSquare size={12}/>{done}/{total} items
                        </span>}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:"6px", marginLeft:"12px" }} onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>openModal(evt)} title="Edit" style={{ background:"none", border:"none", cursor:"pointer", color:"#64748b", padding:"4px" }}><FiEdit2 size={15}/></button>
                      <button onClick={()=>handleDelete(evt.id)} title="Delete" style={{ background:"none", border:"none", cursor:"pointer", color:"#ef4444", padding:"4px" }}><FiTrash2 size={15}/></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT PANEL — Detail / Live Preview */}
      {selected && (
        <div style={{ width:"340px", flexShrink:0, ...CARD, padding:0, display:"flex", flexDirection:"column", overflow:"hidden", alignSelf:"flex-start", position:"sticky", top:0 }}>
          <div style={{ padding:"16px 20px", borderBottom:"1px solid #e2e8f0", display:"flex", justifyContent:"space-between", alignItems:"center", background:"#f8fafc" }}>
            <span style={{ fontWeight:700, fontSize:"0.95rem", color:"#0f172a" }}>Event Details</span>
            <button onClick={()=>setSelected(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", display:"flex", alignItems:"center" }}><FiX size={16}/></button>
          </div>
          <div style={{ padding:"20px", overflowY:"auto", flex:1 }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:"8px", marginBottom:"8px", flexWrap:"wrap" }}>
              <h3 style={{ margin:0, fontSize:"1.1rem", color:"#0f172a", flex:1 }}>{selected.title}</h3>
              <CountdownBadge evt={selected}/>
            </div>
            {selected.event_type && (
              <span style={{ display:"inline-flex", alignItems:"center", gap:"4px", padding:"2px 8px", background:"#f1f5f9", color:"#475569", borderRadius:"999px", fontSize:"0.75rem", fontWeight:600, marginBottom:"12px" }}>
                <FiTag size={10}/> {selected.event_type}
              </span>
            )}
            <div style={{ marginTop:"12px", display:"flex", flexDirection:"column", gap:"10px" }}>
              <div style={{ display:"flex", gap:"10px", alignItems:"flex-start", fontSize:"0.85rem", color:"#475569" }}>
                <FiCalendar size={14} color="#2563eb" style={{ marginTop:"2px", flexShrink:0 }}/>
                <div>
                  <div style={{ fontWeight:600 }}>{selected.event_end_date ? "Date Range" : "Date"}</div>
                  <div>{format(new Date(selected.event_date),"EEEE, MMMM d, yyyy h:mm a")}</div>
                  {selected.event_end_date && <div style={{ color:"#94a3b8" }}>to {format(new Date(selected.event_end_date),"EEEE, MMMM d, yyyy h:mm a")}</div>}
                </div>
              </div>
              {selected.location && (
                <div style={{ display:"flex", gap:"10px", alignItems:"center", fontSize:"0.85rem", color:"#475569" }}>
                  <FiMapPin size={14} color="#2563eb"/>
                  <div><div style={{ fontWeight:600 }}>Location</div><div>{selected.location}</div></div>
                </div>
              )}
              <div style={{ display:"flex", gap:"10px", alignItems:"flex-start", fontSize:"0.85rem", color:"#475569" }}>
                <FiUser size={14} color="#2563eb" style={{ marginTop:"2px", flexShrink:0 }}/>
                <div>
                  <div style={{ fontWeight:600, marginBottom:"4px" }}>Officers In Charge</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"4px" }}>
                    {parseOfficers(selected.person_in_charge).map((name, i) => (
                      <span key={i} style={{ padding:"2px 8px", background:"#eff6ff", color:"#2563eb", borderRadius:"999px", fontSize:"0.78rem", fontWeight:600 }}>{name}</span>
                    ))}
                  </div>
                </div>
              </div>
              {!isPast(eventEndDate(selected)) && (
                <div style={{ display:"flex", gap:"10px", alignItems:"center", fontSize:"0.85rem", color:"#475569" }}>
                  <FiClock size={14} color={
                    getEventStatus(selected) === "urgent" ? "#ef4444" :
                    getEventStatus(selected) === "near" ? "#f97316" :
                    getEventStatus(selected) === "today" ? "#f59e0b" : "#3b82f6"
                  }/>
                  <div>
                    <div style={{ fontWeight:600 }}>Time Until {selected.event_end_date ? "End" : "Event"}</div>
                    <div>{formatDistanceToNow(eventEndDate(selected), { addSuffix:true })}</div>
                  </div>
                </div>
              )}
              {selected.notes && (
                <div style={{ display:"flex", gap:"10px", alignItems:"flex-start", fontSize:"0.85rem", color:"#475569" }}>
                  <FiFileText size={14} color="#2563eb" style={{ marginTop:"2px", flexShrink:0 }}/>
                  <div>
                    <div style={{ fontWeight:600 }}>Notes</div>
                    <div style={{ whiteSpace:"pre-wrap", lineHeight:"1.5" }}>{selected.notes}</div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop:"20px", paddingTop:"16px", borderTop:"1px solid #f1f5f9" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"12px", fontWeight:700, fontSize:"0.85rem", color:"#0f172a" }}>
                <FiCheckSquare size={14} color="#2563eb"/> Requirements Checklist
              </div>

              {(!selected.checklist || selected.checklist.length === 0) ? (
                <p style={{ fontSize:"0.82rem", color:"#94a3b8", fontStyle:"italic", marginTop:"8px" }}>No items added.</p>
              ) : (
                <ul style={{ listStyle:"none", padding:0, margin:"12px 0 0", display:"flex", flexDirection:"column", gap:"8px" }}>
                  {selected.checklist.map(item => (
                    <li key={item.id} style={{ display:"flex", alignItems:"center", gap:"8px", fontSize:"0.85rem", cursor:"pointer" }}
                      onClick={()=>toggleInDb(selected.id, item.id)}>
                      <div style={{ width:"18px", height:"18px", borderRadius:"4px", border:"2px solid",
                        borderColor:item.checked?"#10b981":"#cbd5e1", background:item.checked?"#10b981":"transparent",
                        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.15s" }}>
                        {item.checked && <FiCheck size={11} color="white"/>}
                      </div>
                      <span style={{ textDecoration:item.checked?"line-through":"none", color:item.checked?"#94a3b8":"#334155" }}>{item.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div style={{ padding:"12px 20px", borderTop:"1px solid #e2e8f0", display:"flex", gap:"8px" }}>
            <button onClick={()=>openModal(selected)} className="btn btn-ghost" style={{ flex:1, height:"36px", fontSize:"0.82rem" }}><FiEdit2 size={14}/> Edit</button>
            <button onClick={()=>handleDelete(selected.id)} style={{ flex:1, height:"36px", border:"none", borderRadius:"8px", background:"#fee2e2", color:"#dc2626", fontWeight:600, cursor:"pointer", fontSize:"0.82rem", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" }}><FiTrash2 size={14}/> Delete</button>
          </div>
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
          <div style={{ background:"white", borderRadius:"16px", width:"100%", maxWidth:"520px", maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 25px 50px rgba(0,0,0,0.2)" }}>
            <div style={{ padding:"20px 24px", borderBottom:"1px solid #e2e8f0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <h3 style={{ margin:0, fontSize:"1.15rem", fontWeight:700 }}>{editingId?"Edit Event":"New Event"}</h3>
              <button onClick={closeModal} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8" }}><FiX size={20}/></button>
            </div>
            <div style={{ padding:"24px", overflowY:"auto", flex:1 }}>
              {error && <div style={{ padding:"10px 14px", background:"#fee2e2", color:"#dc2626", borderRadius:"8px", marginBottom:"16px", fontSize:"0.875rem" }}>{error}</div>}
              <form id="evt-form" onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
                <div>
                  <label style={{ display:"block", marginBottom:"6px", fontWeight:600, fontSize:"0.85rem" }}>Event Title *</label>
                  <input value={formData.title} onChange={e=>setFormData(p=>({...p,title:e.target.value}))}
                    placeholder="e.g., Mayor's Press Conference" required style={INPUT_STYLE}/>
                </div>
                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                    <label style={{ fontWeight: 600, fontSize: "0.85rem", margin: 0 }}>Event Schedule *</label>
                    <label style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "#475569", fontWeight: 500 }}>
                      <input type="checkbox" checked={formData.isMultiDay} 
                        onChange={e => setFormData(p => ({ ...p, isMultiDay: e.target.checked, endDate: e.target.checked ? p.startDate : p.endDate }))} 
                        style={{ cursor: "pointer" }} />
                      Multi-day event
                    </label>
                  </div>
                  
                  <div style={{ display: "grid", gridTemplateColumns: formData.isMultiDay ? "1fr 1fr" : "1fr", gap: "12px", marginBottom: "12px" }}>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "4px" }}>{formData.isMultiDay ? "Start Date *" : "Date *"}</div>
                      <input type="date" value={formData.startDate} onChange={e => setFormData(p => ({ ...p, startDate: e.target.value, endDate: !p.isMultiDay ? e.target.value : p.endDate }))} required style={INPUT_STYLE} />
                    </div>
                    {formData.isMultiDay && (
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "4px" }}>End Date *</div>
                        <input type="date" value={formData.endDate} onChange={e => setFormData(p => ({ ...p, endDate: e.target.value }))} required={formData.isMultiDay} style={INPUT_STYLE} />
                      </div>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "4px" }}>Start Time</div>
                      <input type="time" value={formData.startTime} onChange={e => setFormData(p => ({ ...p, startTime: e.target.value }))} style={INPUT_STYLE} />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "4px" }}>End Time (Optional)</div>
                      <input type="time" value={formData.endTime} onChange={e => setFormData(p => ({ ...p, endTime: e.target.value }))} style={INPUT_STYLE} />
                    </div>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                  <div>
                    <label style={{ display:"block", marginBottom:"6px", fontWeight:600, fontSize:"0.85rem" }}>Event Type</label>
                    <select value={formData.event_type} onChange={e=>setFormData(p=>({...p,event_type:e.target.value}))}
                      style={{ ...INPUT_STYLE, cursor:"pointer" }}>
                      <option value="">Select type...</option>
                      {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display:"block", marginBottom:"6px", fontWeight:600, fontSize:"0.85rem" }}>Location</label>
                    <input value={formData.location} onChange={e=>setFormData(p=>({...p,location:e.target.value}))}
                      placeholder="e.g., City Hall, Barangay Gym" style={INPUT_STYLE}/>
                  </div>
                </div>
                <div>
                  <label style={{ display:"block", marginBottom:"6px", fontWeight:600, fontSize:"0.85rem" }}>Officers In Charge *</label>
                  {/* Selected chips */}
                  {Array.isArray(formData.person_in_charge) && formData.person_in_charge.length > 0 && (
                    <div style={{ display:"flex", flexWrap:"wrap", gap:"6px", marginBottom:"8px" }}>
                      {formData.person_in_charge.map((name, i) => (
                        <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:"4px", padding:"4px 10px", background:"#eff6ff", color:"#2563eb", borderRadius:"999px", fontSize:"0.8rem", fontWeight:600 }}>
                          {name}
                          <button type="button" onClick={() => setFormData(p => ({ ...p, person_in_charge: p.person_in_charge.filter((_,j)=>j!==i) }))}
                            style={{ background:"none", border:"none", cursor:"pointer", color:"#93c5fd", padding:0, display:"flex", lineHeight:1 }}>
                            <FiX size={12}/>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Dropdown selector */}
                  <div style={{ position:"relative" }}>
                    <input
                      value={officerSearch}
                      onChange={e => { setOfficerSearch(e.target.value); setShowOfficerDD(true); }}
                      onFocus={() => setShowOfficerDD(true)}
                      placeholder="Search and select officer..."
                      style={INPUT_STYLE}
                    />
                    {showOfficerDD && (
                      <>
                        <div style={{ position:"fixed", inset:0, zIndex:9998 }} onClick={() => { setShowOfficerDD(false); setOfficerSearch(""); }}/>
                        <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"white", border:"1px solid #e2e8f0", borderRadius:"8px", boxShadow:"0 10px 25px rgba(0,0,0,0.12)", zIndex:9999, maxHeight:"180px", overflowY:"auto", marginTop:"4px" }}>
                          {officers
                            .filter(o => !formData.person_in_charge.includes(o.name) && o.name.toLowerCase().includes(officerSearch.toLowerCase()))
                            .map(o => (
                              <div key={o.id} onClick={() => { setFormData(p => ({ ...p, person_in_charge: [...p.person_in_charge, o.name] })); setOfficerSearch(""); setShowOfficerDD(false); }}
                                style={{ padding:"10px 14px", cursor:"pointer", fontSize:"0.875rem", color:"#0f172a", borderBottom:"1px solid #f1f5f9" }}
                                onMouseEnter={e => e.currentTarget.style.background="#f8fafc"}
                                onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                                {o.name}
                              </div>
                            ))
                          }
                          {officers.filter(o => !formData.person_in_charge.includes(o.name) && o.name.toLowerCase().includes(officerSearch.toLowerCase())).length === 0 && (
                            <div style={{ padding:"12px 14px", color:"#94a3b8", fontSize:"0.85rem" }}>No officers found</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ display:"block", marginBottom:"8px", fontWeight:600, fontSize:"0.85rem" }}>Checklist Items</label>
                  <div style={{ display:"flex", gap:"8px", marginBottom:"10px" }}>
                    <input value={newItemText} onChange={e=>setNewItemText(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addItem();}}}
                      placeholder="Add item & press Enter..." style={{ ...INPUT_STYLE, flex:1 }}/>
                    <button type="button" onClick={addItem} style={{ padding:"8px 14px", border:"1px solid #e2e8f0", borderRadius:"8px", background:"#f8fafc", cursor:"pointer", display:"flex", alignItems:"center", gap:"4px", fontSize:"0.82rem", fontWeight:600, whiteSpace:"nowrap" }}><FiPlusCircle size={14}/> Add</button>
                  </div>
                  {formData.checklist.length > 0 && (
                    <ul style={{ listStyle:"none", padding:0, margin:0, display:"flex", flexDirection:"column", gap:"6px" }}>
                      {formData.checklist.map(item=>(
                        <li key={item.id} style={{ display:"flex", alignItems:"center", gap:"8px", padding:"8px 12px", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"8px" }}>
                          <input type="checkbox" checked={item.checked} onChange={()=>toggleItem(item.id)} style={{ cursor:"pointer" }}/>
                          <span style={{ flex:1, fontSize:"0.87rem", textDecoration:item.checked?"line-through":"none", color:item.checked?"#94a3b8":"#334155" }}>{item.text}</span>
                          <button type="button" onClick={()=>removeItem(item.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#ef4444", padding:"2px" }}><FiTrash2 size={14}/></button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <label style={{ display:"block", marginBottom:"6px", fontWeight:600, fontSize:"0.85rem" }}>Notes / Additional Details</label>
                  <textarea value={formData.notes} onChange={e=>setFormData(p=>({...p,notes:e.target.value}))}
                    placeholder="Any additional instructions or notes for this event..."
                    rows={3} style={{ ...INPUT_STYLE, height:"auto", resize:"vertical", padding:"10px 12px" }}/>
                </div>
              </form>
            </div>
            <div style={{ padding:"16px 24px", borderTop:"1px solid #e2e8f0", display:"flex", justifyContent:"flex-end", gap:"10px" }}>
              <button type="button" onClick={closeModal} style={{ padding:"8px 20px", border:"1px solid #e2e8f0", borderRadius:"8px", background:"white", cursor:"pointer", fontWeight:600, fontSize:"0.875rem" }}>Cancel</button>
              <button type="submit" form="evt-form" disabled={submitting}
                style={{ padding:"8px 20px", border:"none", borderRadius:"8px", background:"#2563eb", color:"white", cursor:submitting?"not-allowed":"pointer", fontWeight:600, fontSize:"0.875rem", opacity:submitting?0.7:1 }}>
                {submitting?"Saving…":"Save Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
