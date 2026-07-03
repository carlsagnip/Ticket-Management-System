import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from '../supabaseClient';
import { FiCalendar, FiClock, FiMapPin, FiUser } from 'react-icons/fi';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

import enUS from 'date-fns/locale/en-US';

const locales = {
  'en-US': enUS
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const CustomToolbar = ({ date, onNavigate, view, onView }) => {
  const goToBack = () => onNavigate('PREV');
  const goToNext = () => onNavigate('NEXT');
  const goToCurrent = () => onNavigate('TODAY');

  const handleMonthChange = (e) => {
    const newDate = new Date(date);
    newDate.setMonth(parseInt(e.target.value));
    onNavigate('DATE', newDate);
  };

  const handleYearChange = (e) => {
    const newDate = new Date(date);
    newDate.setFullYear(parseInt(e.target.value));
    onNavigate('DATE', newDate);
  };

  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 10}, (_, i) => currentYear - 5 + i);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button className="btn btn-outline" style={{ padding: '0.5rem 1rem' }} onClick={goToCurrent}>Today</button>
        <button className="btn btn-outline" style={{ padding: '0.5rem 1rem' }} onClick={goToBack}>&lt;</button>
        <button className="btn btn-outline" style={{ padding: '0.5rem 1rem' }} onClick={goToNext}>&gt;</button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <select className="form-input" style={{ width: 'auto', padding: '0.4rem 2rem 0.4rem 0.75rem', fontWeight: 600, fontSize: '1rem' }} value={date.getMonth()} onChange={handleMonthChange}>
          {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select className="form-input" style={{ width: 'auto', padding: '0.4rem 2rem 0.4rem 0.75rem', fontWeight: 600, fontSize: '1rem' }} value={date.getFullYear()} onChange={handleYearChange}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', background: 'var(--bg-elevated)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        {['month', 'week', 'day', 'agenda'].map(v => (
          <button 
            key={v}
            onClick={() => onView(v)}
            style={{ 
              padding: '0.4rem 1rem', 
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: view === v ? 'var(--bg-card)' : 'transparent',
              color: view === v ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: view === v ? '600' : '500',
              cursor: 'pointer',
              textTransform: 'capitalize',
              boxShadow: view === v ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
};

export default function CalendarView() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch both simultaneously
      const [leavesRes, eventsRes] = await Promise.all([
        supabase.from('leave_offsets').select('*'),
        supabase.from('ict_events').select('*')
      ]);

      if (leavesRes.error) throw leavesRes.error;
      if (eventsRes.error) throw eventsRes.error;

      const formattedEvents = [];

      // Format Leave & Offsets
      leavesRes.data.forEach(leave => {
        // react-big-calendar treats all-day events ending on X as exclusive if no time is provided, 
        // but we'll try to just give it date strings and mark allDay
        const startDate = new Date(leave.start_date);
        const endDate = new Date(leave.end_date);
        
        // For pure dates, react-big-calendar usually needs the end date to be the next day if we want it to visually cover the whole day
        endDate.setDate(endDate.getDate() + 1);

        formattedEvents.push({
          id: `leave-${leave.id}`,
          title: `${leave.officer_name} - ${leave.type}`,
          start: startDate,
          end: endDate,
          allDay: true,
          resource: { ...leave, category: 'leave' }
        });
      });

      // Format ICT Events
      eventsRes.data.forEach(evt => {
        const startDate = new Date(evt.event_date);
        const endDate = evt.event_end_date ? new Date(evt.event_end_date) : new Date(startDate.getTime() + 60 * 60 * 1000); // Add 1 hour if no end date
        
        formattedEvents.push({
          id: `event-${evt.id}`,
          title: evt.title,
          start: startDate,
          end: endDate,
          allDay: !evt.event_date.includes('T') && !evt.event_date.includes(' '), // rough heuristic
          resource: { ...evt, category: 'ict' }
        });
      });

      setEvents(formattedEvents);
    } catch (err) {
      console.error("Error fetching calendar data:", err);
    } finally {
      setLoading(false);
    }
  };

  const eventStyleGetter = (event, start, end, isSelected) => {
    let style = {
      borderRadius: 'var(--radius-md)',
      opacity: 0.9,
      color: 'white',
      border: '0px',
      display: 'block',
      padding: '2px 6px',
      fontSize: '0.85rem'
    };

    if (event.resource.category === 'leave') {
      // Red/Orange for leaves
      style.backgroundColor = 'var(--error)';
      if (event.resource.type === 'Offset') {
        style.backgroundColor = 'var(--warning)';
      }
    } else {
      // Blue for ICT Events
      style.backgroundColor = 'var(--primary)';
    }

    return {
      style: style
    };
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", display: "flex", justifyContent: "center" }}>
        <div className="spinner" style={{ width: "2rem", height: "2rem", border: "3px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card" style={{ flex: 1, padding: "1.5rem", display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "var(--primary)" }}></div>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>ICT Events</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "var(--error)" }}></div>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Leaves</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "var(--warning)" }}></div>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Offsets</span>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: "500px" }}>
          {/* Injecting some basic styles overrides for Big Calendar to match theme */}
          <style dangerouslySetInnerHTML={{__html: `
            .rbc-calendar {
              font-family: inherit;
              color: var(--text-primary);
            }
            .rbc-header {
              padding: 0.5rem !important;
              font-weight: 600 !important;
              border-bottom: 1px solid var(--border) !important;
              border-left: 1px solid var(--border) !important;
              background-color: var(--bg-elevated);
            }
            .rbc-month-view, .rbc-time-view, .rbc-agenda-view {
              border-color: var(--border) !important;
            }
            .rbc-day-bg {
              border-left: 1px solid var(--border) !important;
            }
            .rbc-month-row {
              border-top: 1px solid var(--border) !important;
            }
            .rbc-off-range-bg {
              background-color: var(--bg-body) !important;
            }
            .rbc-today {
              background-color: rgba(var(--primary-rgb), 0.05) !important;
            }
          `}} />
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={handleSelectEvent}
            popup
            views={['month', 'week', 'day', 'agenda']}
            components={{ toolbar: CustomToolbar }}
          />
        </div>
      </div>

      {/* Event Details Modal */}
      <Dialog open={showEventModal} onOpenChange={setShowEventModal}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  {selectedEvent.resource.category === 'ict' ? <FiCalendar className="text-primary" /> : <FiClock className="text-warning" />}
                  {selectedEvent.title}
                </DialogTitle>
              </DialogHeader>

              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {selectedEvent.resource.category === 'ict' ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", marginBottom: "0.25rem" }}>Date</div>
                        <div style={{ color: "var(--text-primary)" }}>
                          {format(selectedEvent.start, 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                      {selectedEvent.resource.location && (
                        <div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", marginBottom: "0.25rem" }}>Location</div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--text-primary)" }}>
                            <FiMapPin size={14} className="text-muted" />
                            {selectedEvent.resource.location}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", marginBottom: "0.25rem" }}>Person In Charge</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--text-primary)" }}>
                        <FiUser size={14} className="text-muted" />
                        {typeof selectedEvent.resource.person_in_charge === 'string' ? selectedEvent.resource.person_in_charge : 
                         (Array.isArray(selectedEvent.resource.person_in_charge) ? selectedEvent.resource.person_in_charge.join(", ") : 
                         "Not specified")}
                      </div>
                    </div>

                    {selectedEvent.resource.notes && (
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", marginBottom: "0.25rem" }}>Notes</div>
                        <div style={{ color: "var(--text-secondary)", backgroundColor: "var(--bg-body)", padding: "0.75rem", borderRadius: "var(--radius-md)", whiteSpace: "pre-wrap", fontSize: "0.9rem" }}>
                          {selectedEvent.resource.notes}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", marginBottom: "0.25rem" }}>Start Date</div>
                        <div style={{ color: "var(--text-primary)" }}>
                          {format(selectedEvent.start, 'MMM d, yyyy')}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", marginBottom: "0.25rem" }}>End Date</div>
                        <div style={{ color: "var(--text-primary)" }}>
                          {/* We subtract 1 day from end date for display because we artificially added 1 day for big calendar full-day rendering */}
                          {format(new Date(selectedEvent.end.getTime() - 86400000), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", marginBottom: "0.25rem" }}>Type</div>
                      <span className={`badge ${selectedEvent.resource.type === 'Leave' ? 'badge-error' : 'badge-warning'}`}>
                        {selectedEvent.resource.type}
                      </span>
                    </div>

                    {selectedEvent.resource.reason && (
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700", marginBottom: "0.25rem" }}>Reason</div>
                        <div style={{ color: "var(--text-secondary)", backgroundColor: "var(--bg-body)", padding: "0.75rem", borderRadius: "var(--radius-md)", whiteSpace: "pre-wrap", fontSize: "0.9rem" }}>
                          {selectedEvent.resource.reason}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
