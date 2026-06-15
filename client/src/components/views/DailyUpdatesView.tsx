import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Trash2, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Employee { id: string; name: string; }

interface DailyUpdate {
  id: string;
  employeeId: string;
  date: string;   // YYYY-MM-DD
  text: string;
}

interface Props {
  mode: 'manager' | 'employee';
  employeeId?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SK   = 'craft_daily_updates';
const FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif';

const DAYS_SHORT  = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ── Helpers ────────────────────────────────────────────────────────────────────

function load<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; }
  catch { return fallback; }
}
function persist(key: string, val: unknown) { localStorage.setItem(key, JSON.stringify(val)); }

function todayISO() { return new Date().toISOString().slice(0, 10); }

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function getMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i); return d;
  });
}
function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDayFull(d: Date) {
  return d.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Avatar colour (stable per name) ───────────────────────────────────────────

const AVATAR_COLORS = ['#4a9eff','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899'];
function avatarColor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function DailyUpdatesView({ mode, employeeId }: Props) {
  const [updates,  setUpdates]  = useState<DailyUpdate[]>(() => load(SK, []));
  const [text,     setText]     = useState('');
  const [date,     setDate]     = useState(todayISO);
  const [filter,   setFilter]   = useState('');

  // Manager calendar state
  const today = useMemo(() => new Date(), []);
  const [viewYear,    setViewYear]    = useState(() => today.getFullYear());
  const [viewMonth,   setViewMonth]   = useState(() => today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(() => todayISO());
  const [panelWidth,  setPanelWidth]  = useState(360);
  const [isDragging,  setIsDragging]  = useState(false);
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);

  useEffect(() => { persist(SK, updates); }, [updates]);

  const employees = load<Employee[]>('leave_employees', []);
  const empName   = (id: string) => employees.find(e => e.id === id)?.name ?? 'Unknown';

  const visibleUpdates = mode === 'employee'
    ? updates.filter(u => u.employeeId === employeeId).sort((a, b) => b.date.localeCompare(a.date))
    : updates.filter(u => !filter || u.employeeId === filter);

  const submit = useCallback(() => {
    if (!text.trim() || !employeeId) return;
    const existing = updates.find(u => u.employeeId === employeeId && u.date === date);
    if (existing) {
      setUpdates(p => p.map(u => u.id === existing.id ? { ...u, text: text.trim() } : u));
    } else {
      setUpdates(p => [...p, { id: crypto.randomUUID(), employeeId: employeeId!, date, text: text.trim() }]);
    }
    setText('');
  }, [text, date, employeeId, updates]);

  const deleteUpdate = useCallback((id: string) => {
    setUpdates(p => p.filter(u => u.id !== id));
  }, []);

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startW: panelWidth };
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const newW = Math.max(200, Math.min(680, dragRef.current.startW + (dragRef.current.startX - ev.clientX)));
      setPanelWidth(newW);
    };
    const onUp = () => {
      dragRef.current = null;
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [panelWidth]);

  // ── Calendar helpers ─────────────────────────────────────────────────────────

  const days = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  // Map of date key → updates for that day (respects employee filter)
  const updateMap = useMemo(() => {
    const map: Record<string, DailyUpdate[]> = {};
    visibleUpdates.forEach(u => {
      if (!map[u.date]) map[u.date] = [];
      map[u.date].push(u);
    });
    return map;
  }, [visibleUpdates]);

  const prevMonth = () => {
    const d = new Date(viewYear, viewMonth - 1);
    setViewYear(d.getFullYear()); setViewMonth(d.getMonth());
  };
  const nextMonth = () => {
    const d = new Date(viewYear, viewMonth + 1);
    setViewYear(d.getFullYear()); setViewMonth(d.getMonth());
  };

  const selectedDayUpdates = selectedDay
    ? (updateMap[selectedDay] ?? []).map(u => ({ ...u, name: empName(u.employeeId) }))
    : [];

  // ── EMPLOYEE MODE ────────────────────────────────────────────────────────────

  if (mode === 'employee') {
    return (
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', fontFamily: FONT }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>My Daily Update</h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Write a short update on what you worked on today</p>
        </div>

        {/* Submit form */}
        {employeeId && (
          <div style={{ background: 'var(--bg-editor)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Date</label>
                <input type="date" lang="en-ZA" value={date} max={todayISO()} onChange={e => setDate(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-block-hover)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
                />
              </div>
            </div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              What did you work on today?
            </label>
            <textarea value={text} onChange={e => setText(e.target.value)}
              placeholder="e.g. Completed the quarterly report, attended standup, reviewed pull requests..."
              rows={4}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-block-hover)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', resize: 'vertical', lineHeight: 1.6, fontFamily: FONT }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button onClick={submit} disabled={!text.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, border: 'none', background: text.trim() ? 'var(--accent)' : 'var(--bg-block-hover)', color: text.trim() ? '#fff' : 'var(--text-tertiary)', fontSize: 13, fontWeight: 600, cursor: text.trim() ? 'pointer' : 'not-allowed' }}>
                <Plus size={13}/> Submit Update
              </button>
            </div>
          </div>
        )}

        {/* Past updates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visibleUpdates.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>No updates submitted yet. Write your first one above!</div>
          ) : visibleUpdates.map(u => (
            <div key={u.id} style={{ background: 'var(--bg-editor)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>{fmtDate(u.date)}</div>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{u.text}</p>
              </div>
              <button onClick={() => deleteUpdate(u.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4, display: 'flex', alignItems: 'flex-start', borderRadius: 5, flexShrink: 0 }}>
                <Trash2 size={13}/>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── MANAGER MODE — CALENDAR ──────────────────────────────────────────────────

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: FONT }}>

      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Daily Updates</h2>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
            {updates.length} update{updates.length !== 1 ? 's' : ''} across all employees
          </p>
        </div>

        {/* Filter */}
        {employees.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={13} style={{ color: 'var(--text-tertiary)' }} />
            <select value={filter} onChange={e => setFilter(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-block-hover)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
              <option value="">All employees</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Body: calendar + day panel side by side */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Calendar ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '10px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 6, borderRadius: 6 }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-block-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              <ChevronLeft size={16}/>
            </button>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', minWidth: 160, textAlign: 'center' }}>
              {MONTHS_LONG[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 6, borderRadius: 6 }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-block-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              <ChevronRight size={16}/>
            </button>
          </div>

          {/* Weekday header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', flexShrink: 0 }}>
            {DAYS_SHORT.map((d, i) => (
              <div key={d} style={{ textAlign: 'center', padding: '8px 0', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600, borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.1)' : 'none', borderBottom: '1px solid var(--border)' }}>{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gridTemplateRows: 'repeat(6,1fr)', borderLeft: '1px solid var(--border)', overflow: 'hidden' }}>
            {days.map((d, i) => {
              const inMonth  = d.getMonth() === viewMonth;
              const isToday  = sameDay(d, today);
              const dk       = toKey(d);
              const isSel    = selectedDay === dk;
              const dayCount = updateMap[dk]?.length ?? 0;

              return (
                <button key={i} onClick={() => setSelectedDay(isSel ? null : dk)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '6px 8px',
                    border: 'none', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
                    background: isSel ? 'rgba(74,158,255,0.12)' : isToday ? 'rgba(74,158,255,0.05)' : 'transparent',
                    cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s', position: 'relative',
                    outline: isSel ? '2px solid var(--accent)' : 'none', outlineOffset: -2,
                  }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--bg-block-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isSel ? 'rgba(74,158,255,0.12)' : isToday ? 'rgba(74,158,255,0.05)' : 'transparent'; }}
                >
                  {/* Day number */}
                  <span style={{
                    fontSize: 13, fontWeight: isToday ? 700 : 400,
                    color: !inMonth ? 'var(--text-tertiary)' : isToday ? '#fff' : isSel ? 'var(--accent)' : 'var(--text-primary)',
                    background: isToday ? 'var(--accent)' : 'transparent',
                    width: 24, height: 24, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {d.getDate()}
                  </span>

                  {/* Update dots */}
                  {dayCount > 0 && inMonth && (
                    <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
                      {dayCount <= 4
                        ? (updateMap[dk] ?? []).map(u => (
                            <span key={u.id} style={{ width: 7, height: 7, borderRadius: '50%', background: avatarColor(empName(u.employeeId)), display: 'inline-block', flexShrink: 0 }} />
                          ))
                        : <>
                            {(updateMap[dk] ?? []).slice(0, 3).map(u => (
                              <span key={u.id} style={{ width: 7, height: 7, borderRadius: '50%', background: avatarColor(empName(u.employeeId)), display: 'inline-block' }} />
                            ))}
                            <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 700, lineHeight: '7px' }}>+{dayCount - 3}</span>
                          </>
                      }
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Resize divider ── */}
        {selectedDay && (
          <div
            onMouseDown={onDividerMouseDown}
            style={{
              width: 6, flexShrink: 0, cursor: 'col-resize', position: 'relative',
              background: isDragging ? 'var(--accent)' : 'var(--border)',
              transition: isDragging ? 'none' : 'background 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
            }}
            onMouseEnter={e => { if (!isDragging) e.currentTarget.style.background = 'var(--accent)'; }}
            onMouseLeave={e => { if (!isDragging) e.currentTarget.style.background = 'var(--border)'; }}
          >
            <div style={{ width: 2, height: 32, borderRadius: 2, background: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }}/>
          </div>
        )}

        {/* ── Day detail panel ── */}
        {selectedDay && (
          <div style={{ width: panelWidth, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Panel header */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {fmtDayFull(new Date(selectedDay + 'T12:00:00'))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                {selectedDayUpdates.length} update{selectedDayUpdates.length !== 1 ? 's' : ''}{filter ? ` · filtered` : ''}
              </div>
            </div>

            {/* Updates list */}
            <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selectedDayUpdates.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                  No updates for this day{filter ? ' (filtered)' : ''}.
                </div>
              ) : selectedDayUpdates.map(u => {
                const color = avatarColor(u.name);
                return (
                  <div key={u.id} style={{ background: 'var(--bg-editor)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 5 }}>{u.name}</div>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{u.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
