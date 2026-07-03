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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

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

  const handleMonthChange = (val) => {
    const newDate = new Date(date);
    newDate.setMonth(parseInt(val));
    onNavigate('DATE', newDate);
  };

  const handleYearChange = (val) => {
    const newDate = new Date(date);
    newDate.setFullYear(parseInt(val));
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
      
      {/* Left side: Navigation */}
      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', background: 'var(--bg-elevated)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <button type="button" onClick={goToBack} style={{ padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 600, transition: 'all 0.2s' }}>&lt;</button>
        <button type="button" onClick={goToCurrent} style={{ padding: '0.4rem 1rem', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--bg-card)', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 600, boxShadow: 'var(--shadow-sm)' }}>Today</button>
        <button type="button" onClick={goToNext} style={{ padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 600, transition: 'all 0.2s' }}>&gt;</button>
      </div>

      {/* Center: Month/Year Dropdowns */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <Select value={date.getMonth().toString()} onValueChange={handleMonthChange}>
          <SelectTrigger className="form-input" style={{ width: '130px', padding: '0.4rem 0.75rem', fontWeight: 600, fontSize: '0.95rem', backgroundColor: 'var(--bg-card)' }}>
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {months.map((m, i) => (
              <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={date.getFullYear().toString()} onValueChange={handleYearChange}>
          <SelectTrigger className="form-input" style={{ width: '100px', padding: '0.4rem 0.75rem', fontWeight: 600, fontSize: '0.95rem', backgroundColor: 'var(--bg-card)' }}>
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Right side: View Toggle */}
      <div style={{ display: 'flex', background: 'var(--bg-elevated)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        {['month', 'week', 'day', 'agenda'].map(v => (
          <button 
            key={v}
            type="button"
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
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState('month');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leavesRes, eventsRes] = await Promise.all([
        supabase.from('leave_offsets').select('*'),
        supabase.from('ict_events').select('*')
      ]);

      if (leavesRes.error) throw leavesRes.error;
      if (eventsRes.error) throw eventsRes.error;

      console.log('[CalendarView] Leaves raw count:', leavesRes.data?.length, leavesRes.data);
      console.log('[CalendarView] Events raw count:', eventsRes.data?.length, eventsRes.data);

      const formattedEvents = [];

      const parseLocalDate = (str) => {
        if (!str) return new Date();
        if (str.includes('T') || str.includes(' ')) return new Date(str);
        const [year, month, day] = str.split('-').map(Number);
        return new Date(year, month - 1, day, 12, 0, 0);
      };

      leavesRes.data.forEach(leave => {
        const startDate = parseLocalDate(leave.start_date);
        const endDate = parseLocalDate(leave.end_date);

        formattedEvents.push({
          id: `leave-${leave.id}`,
          title: `${leave.officer_name} — ${leave.type}`,
          start: startDate,
          end: endDate,
          allDay: true,
          resource: { ...leave, category: 'leave' }
        });
      });

      eventsRes.data.forEach(evt => {
        const startDate = new Date(evt.event_date);
        const endDate = evt.event_end_date
          ? new Date(evt.event_end_date)
          : new Date(startDate.getTime() + 60 * 60 * 1000);
        const allDay = !evt.event_date.includes('T') && !evt.event_date.includes(' ');

        formattedEvents.push({
          id: `event-${evt.id}`,
          title: evt.title,
          start: startDate,
          end: endDate,
          allDay,
          resource: { ...evt, category: 'ict' }
        });
      });

      console.log('[CalendarView] Total formatted events:', formattedEvents.length);
      setEvents(formattedEvents);
    } catch (err) {
      console.error('[CalendarView] Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);


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
      const isOffset = event.resource.type?.toLowerCase() === 'offset';
      style.backgroundColor = isOffset ? 'var(--warning)' : 'var(--danger)';
    } else {
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
        
        <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "var(--primary)" }}></div>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>ICT Events ({events.filter(e => e.resource?.category === 'ict').length})</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "var(--danger)" }}></div>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>Leaves ({events.filter(e => e.resource?.category === 'leave' && e.resource?.type?.toLowerCase() === 'leave').length})</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "var(--warning)" }}></div>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>Offsets ({events.filter(e => e.resource?.category === 'leave' && e.resource?.type?.toLowerCase() === 'offset').length})</span>
          </div>
          <button className="btn btn-outline" style={{ marginLeft: 'auto', padding: '0.3rem 0.75rem', fontSize: '0.8rem' }} onClick={fetchData}>↻ Refresh Data</button>
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
            date={date}
            onNavigate={setDate}
            view={view}
            onView={setView}
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
                          {format(selectedEvent.end, 'MMM d, yyyy')}
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
