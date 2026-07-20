import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus, MoreHorizontal, CheckSquare, FileText,
  ChevronLeft, ChevronRight, X, MousePointer2,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import {
  loadGIS, getStoredToken, clearToken, requestNewToken, fetchGoogleEvents,
} from '../../services/googleCalendar';
import type { CalendarEvent } from '../../services/googleCalendar';

// ── constants & helpers ───────────────────────────────────────────────────────

const DAYS_SHORT   = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const DAYS_LONG    = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const EVENT_COLORS = [
  '#ef4444','#f97316','#eab308','#22c55e',
  '#06b6d4','#3b82f6','#8b5cf6','#ec4899',
];

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

function newId() { return `ev-${Date.now()}-${Math.random().toString(36).slice(2,8)}`; }

function currentUserKey(): string {
  return useAuthStore.getState().userId || 'shared';
}

function loadEvents(key: string): CalendarEvent[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

function saveEvents(evs: CalendarEvent[], key: string) {
  localStorage.setItem(key, JSON.stringify(evs));
}

function formatDateList(dates: Date[]): string {
  if (dates.length === 0) return '';
  const sorted = [...dates].sort((a,b) => a.getTime()-b.getTime());
  if (sorted.length <= 3)
    return sorted.map(d => `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`).join(', ');
  return `${sorted[0].getDate()} ${MONTHS_SHORT[sorted[0].getMonth()]} + ${sorted.length-1} more`;
}

// ── TagInput ──────────────────────────────────────────────────────────────────

function TagInput({ value, onChange, placeholder }: {
  value: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [input, setInput] = useState('');
  const add = (raw: string) => {
    const t = raw.trim().replace(/,$/, '');
    if (t && !value.includes(t)) onChange([...value, t]);
    setInput('');
  };
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:6, padding:'8px 10px', background:'var(--bg-editor)', borderRadius:8, border:'1px solid var(--border)', minHeight:40, cursor:'text' }}>
      {value.map(v => (
        <span key={v} style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 8px 3px 10px', background:'var(--bg-block-hover)', borderRadius:20, fontSize:12, color:'var(--text-primary)' }}>
          {v}
          <button onClick={() => onChange(value.filter(x=>x!==v))} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-tertiary)', padding:0, display:'flex', lineHeight:1 }}>×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key==='Enter'||e.key===',') { e.preventDefault(); add(input); }
          if (e.key==='Backspace' && !input && value.length) onChange(value.slice(0,-1));
        }}
        onBlur={() => { if (input.trim()) add(input); }}
        placeholder={value.length===0 ? (placeholder||'Type + Enter') : ''}
        style={{ border:'none', background:'transparent', outline:'none', fontSize:13, color:'var(--text-primary)', flex:1, minWidth:100 }}
      />
    </div>
  );
}

// ── BookingModal ──────────────────────────────────────────────────────────────

interface BookingModalProps {
  dates: Date[];
  defaultType: 'booking' | 'busy';
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
}

function BookingModal({ dates, defaultType, onClose, onSave }: BookingModalProps) {
  const [title,      setTitle]      = useState('');
  const [purpose,    setPurpose]    = useState('');
  const [attendees,  setAttendees]  = useState<string[]>([]);
  const [startTime,  setStartTime]  = useState('09:00');
  const [endTime,    setEndTime]    = useState('17:00');
  const [color,      setColor]      = useState(EVENT_COLORS[4]);
  const [type,       setType]       = useState<'booking'|'busy'>(defaultType);
  const [customColor,setCustomColor]= useState(false);
  const customRef = useRef<HTMLInputElement>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      id: newId(),
      title: title.trim(),
      purpose: purpose.trim(),
      attendees,
      startTime,
      endTime,
      color,
      type,
      dates: dates.map(toKey),
    });
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize:11, fontWeight:600, color:'var(--text-tertiary)', letterSpacing:'0.06em', marginBottom:6 }}>{label}</div>
      {children}
    </div>
  );

  const inputStyle: React.CSSProperties = {
    width:'100%', boxSizing:'border-box',
    padding:'9px 12px', borderRadius:8,
    background:'var(--bg-editor)', border:'1px solid var(--border)',
    color:'var(--text-primary)', fontSize:13, outline:'none',
  };

  return (
    <div
      onClick={onClose}
      style={{ position:'fixed', inset:0, zIndex:600, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width:480, borderRadius:16,
          background:'var(--bg-app)', border:'1px solid var(--border)',
          boxShadow:'0 24px 64px rgba(0,0,0,0.5)',
          fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif',
          overflow:'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)' }}>
              {type === 'booking' ? 'Book Days' : 'Mark as Busy'}
            </div>
            <div style={{ fontSize:12, color:'var(--text-tertiary)', marginTop:2 }}>
              {formatDateList(dates)} · {dates.length} day{dates.length!==1?'s':''}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'var(--bg-block-hover)', border:'none', borderRadius:'50%', width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text-secondary)' }}>
            <X size={13}/>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} style={{ padding:'20px 20px 0' }}>

          {/* Type toggle */}
          <div style={{ display:'flex', background:'var(--bg-block-hover)', borderRadius:9, padding:3, gap:3, marginBottom:20 }}>
            {(['booking','busy'] as const).map(t => (
              <button key={t} type="button" onClick={() => setType(t)} style={{
                flex:1, padding:'7px 0', borderRadius:7, border:'none', cursor:'pointer', fontSize:13, fontWeight:500,
                background: type===t ? 'var(--bg-editor)' : 'transparent',
                color: type===t ? 'var(--text-primary)' : 'var(--text-tertiary)',
                boxShadow: type===t ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                transition:'all 0.15s',
              }}>
                {t === 'booking' ? '📅 Book' : '🚫 Mark as Busy'}
              </button>
            ))}
          </div>

          <Field label="TITLE *">
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="What will happen?"
              required style={inputStyle} autoFocus
            />
          </Field>

          <Field label="PURPOSE">
            <input
              value={purpose} onChange={e => setPurpose(e.target.value)}
              placeholder="What is it for?"
              style={inputStyle}
            />
          </Field>

          <Field label="ATTENDEES">
            <TagInput value={attendees} onChange={setAttendees} placeholder="Type a name + Enter" />
          </Field>

          <Field label="TIME">
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                style={{ ...inputStyle, width:'auto', flex:1 }}/>
              <span style={{ color:'var(--text-tertiary)', fontSize:13 }}>→</span>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                style={{ ...inputStyle, width:'auto', flex:1 }}/>
            </div>
          </Field>

          <Field label="COLOUR">
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              {EVENT_COLORS.map(c => (
                <button key={c} type="button" onClick={() => { setColor(c); setCustomColor(false); }} style={{
                  width:28, height:28, borderRadius:7, background:c, border:'none', cursor:'pointer',
                  outline: color===c && !customColor ? `3px solid ${c}` : '3px solid transparent',
                  outlineOffset:2, transform: color===c && !customColor ? 'scale(1.15)' : 'scale(1)',
                  transition:'all 0.12s',
                }}/>
              ))}
              {/* Custom colour swatch */}
              <button type="button" onClick={() => { setCustomColor(true); customRef.current?.click(); }} style={{
                width:28, height:28, borderRadius:7,
                background: customColor ? color : 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)',
                border:'none', cursor:'pointer',
                outline: customColor ? `3px solid ${color}` : '3px solid transparent',
                outlineOffset:2,
              }}/>
              <input ref={customRef} type="color" value={color}
                onChange={e => { setColor(e.target.value); setCustomColor(true); }}
                style={{ width:0, height:0, opacity:0, position:'absolute', pointerEvents:'none' }}
              />
              <span style={{ fontSize:11, color:'var(--text-tertiary)', marginLeft:2 }}>Custom</span>
            </div>

            {/* Live preview */}
            <div style={{
              marginTop:10, padding:'8px 12px', borderRadius:8,
              background: `${color}22`,
              border: `1px solid ${color}55`,
              display:'flex', alignItems:'center', gap:8,
            }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:color, flexShrink:0 }}/>
              <span style={{ fontSize:12, color:'var(--text-primary)' }}>
                {title || (type==='booking' ? 'Booking' : 'Busy')}
              </span>
            </div>
          </Field>

          {/* Footer buttons */}
          <div style={{ display:'flex', gap:10, padding:'4px 0 20px', justifyContent:'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding:'9px 20px', borderRadius:8, border:'1px solid var(--border)', background:'none', color:'var(--text-secondary)', fontSize:13, fontWeight:500, cursor:'pointer' }}>
              Cancel
            </button>
            <button type="submit" style={{ padding:'9px 24px', borderRadius:8, border:'none', background:color, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', opacity: title.trim() ? 1 : 0.5 }}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── MonthContent ──────────────────────────────────────────────────────────────

type NavMode = 'days' | 'months' | 'years';

interface MonthContentProps {
  today: Date;
  selectedDays: Date[];
  selectMode: boolean;
  events: CalendarEvent[];
  onDayClick: (day: Date, e: React.MouseEvent) => void;
  onDaySelect?: (day: Date) => void;
}

function MonthContent({ today, selectedDays, selectMode, events, onDayClick, onDaySelect }: MonthContentProps) {
  const [navMode,   setNavMode]   = useState<NavMode>('days');
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [lastClickTime, setLastClickTime] = useState(0);
  const [lastClickedDay, setLastClickedDay] = useState<Date | null>(null);

  const days        = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const decadeStart = Math.floor(viewYear / 10) * 10;

  const prevPeriod = () => {
    if (navMode==='days')   { const d=new Date(viewYear,viewMonth-1); setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }
    else if (navMode==='months') setViewYear(y=>y-1);
    else                         setViewYear(y=>y-10);
  };
  const nextPeriod = () => {
    if (navMode==='days')   { const d=new Date(viewYear,viewMonth+1); setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }
    else if (navMode==='months') setViewYear(y=>y+1);
    else                         setViewYear(y=>y+10);
  };

  const navLabel =
    navMode==='days'   ? `${MONTHS_LONG[viewMonth]} ${viewYear}` :
    navMode==='months' ? `${viewYear}` :
                         `${decadeStart} – ${decadeStart+9}`;

  const eventMap = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      for (const dk of ev.dates) {
        if (!map[dk]) map[dk] = [];
        map[dk].push(ev);
      }
    }
    return map;
  }, [events]);

  const handleDayDoubleClick = (d: Date) => {
    setNavMode('days');
  };

  const handleDaySingleClick = (d: Date, e: React.MouseEvent) => {
    const now = Date.now();
    if (sameDay(d, lastClickedDay || new Date(0)) && now - lastClickTime < 300) {
      handleDayDoubleClick(d);
      setLastClickTime(0);
      setLastClickedDay(null);
    } else {
      setLastClickTime(now);
      setLastClickedDay(new Date(d));
      if (onDaySelect && !selectMode) {
        onDaySelect(d);
      } else {
        onDayClick(d, e);
      }
    }
  };

  const btnHov: React.CSSProperties = { background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', display:'flex', padding:6, borderRadius:6 };

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Sub-header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:16, padding:'10px 20px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <button style={btnHov} onClick={prevPeriod}
          onMouseEnter={e=>(e.currentTarget.style.background='var(--bg-block-hover)')}
          onMouseLeave={e=>(e.currentTarget.style.background='none')}><ChevronLeft size={16}/></button>
        <button
          onClick={() => navMode!=='years' && setNavMode(navMode==='days'?'months':'years')}
          style={{ background:'none', border:'none', cursor: navMode==='years'?'default':'pointer', color:'var(--text-primary)', fontSize:15, fontWeight:700, padding:'4px 12px', borderRadius:8 }}
          onMouseEnter={e=>{ if(navMode!=='years') e.currentTarget.style.background='var(--bg-block-hover)'; }}
          onMouseLeave={e=>(e.currentTarget.style.background='none')}
        >{navLabel}</button>
        <button style={btnHov} onClick={nextPeriod}
          onMouseEnter={e=>(e.currentTarget.style.background='var(--bg-block-hover)')}
          onMouseLeave={e=>(e.currentTarget.style.background='none')}><ChevronRight size={16}/></button>
      </div>

      {/* ── days ── */}
      {navMode==='days' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* Weekday header */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', flexShrink:0 }}>
            {DAYS_SHORT.map((d,i) => (
              <div key={d} style={{ textAlign:'center', padding:'10px 0', background:'var(--accent)', color:'#fff', fontSize:13, fontWeight:600, borderLeft: i>0?'1px solid rgba(255,255,255,0.1)':'none', borderBottom:'1px solid var(--border)' }}>{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ flex:1, display:'grid', gridTemplateColumns:'repeat(7,1fr)', gridTemplateRows:'repeat(6,1fr)', borderLeft:'1px solid var(--border)' }}>
            {days.map((d, i) => {
              const inMonth   = d.getMonth()===viewMonth;
              const isToday   = sameDay(d, today);
              const isSel     = selectedDays.some(s => sameDay(s,d));
              const dk        = toKey(d);
              const dayEvs    = eventMap[dk] || [];
              const busyEv    = dayEvs.find(e=>e.type==='busy');

              return (
                <button
                  key={i}
                  onClick={e => handleDaySingleClick(d, e)}
                  style={{
                    background: isSel
                      ? 'var(--accent)22'
                      : busyEv
                        ? `${busyEv.color}28`
                        : 'none',
                    border:'none',
                    borderRight:'1px solid var(--border)',
                    borderBottom:'1px solid var(--border)',
                    outline: isSel ? `2px solid var(--accent)` : 'none',
                    outlineOffset:-1,
                    cursor: selectMode ? 'cell' : 'pointer',
                    padding:'8px 10px',
                    display:'flex', flexDirection:'column', alignItems:'flex-start',
                    textAlign:'left', position:'relative', overflow:'hidden',
                  }}
                  onMouseEnter={e => { if(!isSel) e.currentTarget.style.background='var(--bg-block-hover)'; }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = isSel
                      ? 'var(--accent)22'
                      : busyEv ? `${busyEv.color}28` : 'none';
                  }}
                >
                  {/* Date number */}
                  <span style={{
                    width:26, height:26, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                    background: isToday ? 'var(--accent)' : 'none',
                    color: isToday ? '#fff' : inMonth ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    fontSize:12, fontWeight: isToday ? 700 : 400,
                  }}>{d.getDate()}</span>

                  {/* Event pills */}
                  {dayEvs.length > 0 && (
                    <div style={{ display:'flex', flexDirection:'column', gap:2, marginTop:3, width:'100%' }}>
                      {dayEvs.slice(0,2).map(ev => (
                        <div key={ev.id} style={{
                          fontSize:10, lineHeight:'14px', padding:'1px 5px', borderRadius:4,
                          background:`${ev.color}cc`, color:'#fff',
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                          maxWidth:'100%',
                        }}>{ev.title}</div>
                      ))}
                      {dayEvs.length > 2 && (
                        <div style={{ fontSize:10, color:'var(--text-tertiary)' }}>+{dayEvs.length-2} more</div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── months ── */}
      {navMode==='months' && (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:32 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, width:'100%', maxWidth:520 }}>
            {Array.from({length:16},(_,i)=>{
              const yr=i<12?viewYear:viewYear+1; const mo=i%12;
              const isNow=mo===today.getMonth()&&yr===today.getFullYear();
              const isSel=mo===viewMonth&&yr===viewYear;
              const active=isNow||isSel;
              return (
                <button key={i} onClick={()=>{setViewMonth(mo);if(yr!==viewYear)setViewYear(yr);setNavMode('days');}} style={{ padding:'20px 8px', borderRadius:12, border:'none', cursor:'pointer', background:active?'var(--accent)':'var(--bg-block-hover)', color:active?'#fff':i<12?'var(--text-primary)':'var(--text-tertiary)', fontSize:14, fontWeight:active?600:400, transition:'background 0.1s' }}
                  onMouseEnter={e=>{if(!active)e.currentTarget.style.background='var(--bg-sidebar)';}}
                  onMouseLeave={e=>{if(!active)e.currentTarget.style.background='var(--bg-block-hover)';}}
                >{MONTHS_SHORT[mo]}</button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── years ── */}
      {navMode==='years' && (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:32 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, width:'100%', maxWidth:520 }}>
            {Array.from({length:16},(_,i)=>decadeStart-2+i).map(y=>{
              const inRange=y>=decadeStart&&y<decadeStart+10;
              const active=y===today.getFullYear()||y===viewYear;
              return (
                <button key={y} onClick={()=>{setViewYear(y);setNavMode('months');}} style={{ padding:'16px 8px', borderRadius:12, border:'none', cursor:'pointer', background:active?'var(--accent)':'var(--bg-block-hover)', color:active?'#fff':inRange?'var(--text-primary)':'var(--text-tertiary)', fontSize:14, fontWeight:active?600:400, transition:'background 0.1s' }}
                  onMouseEnter={e=>{if(!active)e.currentTarget.style.background='var(--bg-sidebar)';}}
                  onMouseLeave={e=>{if(!active)e.currentTarget.style.background='var(--bg-block-hover)';}}
                >{y}</button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── ListContent ───────────────────────────────────────────────────────────────

function ListContent({ today, startDate, events }: { today: Date; startDate: Date; events: CalendarEvent[] }) {
  const days = useMemo(() => Array.from({length:60},(_,i)=>{const d=new Date(startDate);d.setDate(startDate.getDate()+i);return d;}), [startDate]);

  const eventMap = useMemo(() => {
    const map: Record<string,CalendarEvent[]>={};
    for(const ev of events) for(const dk of ev.dates){if(!map[dk])map[dk]=[];map[dk].push(ev);}
    return map;
  }, [events]);

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'12px 24px 80px' }}>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {days.map((day,i)=>{
          const isToday=sameDay(day,today);
          const isFirst=i===0;
          const dk=toKey(day);
          const dayEvs=eventMap[dk]||[];
          return (
            <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
              <div style={{ width:120, padding:'12px 14px', borderRadius:10, flexShrink:0, background:isToday?'rgba(37,99,235,0.12)':'var(--bg-sidebar)', border:isToday?'1px solid var(--accent)':'1px solid var(--border)' }}>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>{day.getDate()} {MONTHS_SHORT[day.getMonth()]}</div>
                {isToday && <div style={{ fontSize:12, fontWeight:600, color:'var(--accent)', marginTop:1 }}>Today</div>}
                {!isToday&&isFirst&&!sameDay(startDate,today)&&<div style={{ fontSize:12, color:'var(--text-tertiary)', marginTop:1 }}>Selected</div>}
                {i===1&&sameDay(startDate,today)&&<div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:1 }}>Tomorrow</div>}
                <div style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:1 }}>{DAYS_LONG[day.getDay()]}</div>
              </div>
              {dayEvs.length>0 && (
                <div style={{ flex:1, display:'flex', flexDirection:'column', gap:4 }}>
                  {dayEvs.map(ev=>(
                    <div key={ev.id} style={{ padding:'10px 14px', borderRadius:10, background:`${ev.color}18`, border:`1px solid ${ev.color}44`, display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:ev.color, flexShrink:0 }}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.title}</div>
                          {ev.id.startsWith('gcal-') && (
                            <span style={{ fontSize:9, fontWeight:700, color:'#4285F4', border:'1px solid #4285F4', borderRadius:3, padding:'1px 3px', lineHeight:1, flexShrink:0 }}>G</span>
                          )}
                        </div>
                        <div style={{ fontSize:11, color:'var(--text-tertiary)' }}>{ev.startTime}{ev.endTime ? ` – ${ev.endTime}` : ''}{ev.purpose?` · ${ev.purpose}`:''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── CalendarView (main) ───────────────────────────────────────────────────────

type CalView = 'month' | 'list';

export function CalendarView() {
  const today = useMemo(()=>{ const d=new Date(); d.setHours(0,0,0,0); return d; },[]);

  const [calView,     setCalView]     = useState<CalView>('month');
  const [selectMode,  setSelectMode]  = useState(false);
  const [selectedDays,setSelectedDays]= useState<Date[]>([]);
  const [listStart,   setListStart]   = useState<Date>(today);
  const calKey = `craft_cal_events_${currentUserKey()}`;
  const [events,      setEvents]      = useState<CalendarEvent[]>(() => loadEvents(calKey));
  const [modal,       setModal]       = useState<{ type:'booking'|'busy', days: Date[] } | null>(null);
  const [dayModal,    setDayModal]    = useState<Date | null>(null);

  // ── Google Calendar sync ─────────────────────────────────────────────────
  const [gcalConnected, setGcalConnected] = useState(() => !!getStoredToken());
  const [gcalEvents,    setGcalEvents]    = useState<CalendarEvent[]>([]);
  const [gcalLoading,   setGcalLoading]   = useState(false);
  const [gcalError,     setGcalError]     = useState<string | null>(null);

  useEffect(() => {
    const tok = getStoredToken();
    if (!tok) return;
    setGcalLoading(true);
    fetchGoogleEvents(tok.accessToken)
      .then(evs => { setGcalEvents(evs); setGcalConnected(true); })
      .catch(() => { clearToken(); setGcalConnected(false); })
      .finally(() => setGcalLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnectGCal = async () => {
    setGcalLoading(true);
    setGcalError(null);
    try {
      await loadGIS();
      const tok = await requestNewToken();
      const evs = await fetchGoogleEvents(tok.accessToken);
      setGcalEvents(evs);
      setGcalConnected(true);
    } catch (err: any) {
      setGcalError(err.message ?? 'Could not connect Google Calendar');
    } finally {
      setGcalLoading(false);
    }
  };

  const handleDisconnectGCal = () => {
    clearToken();
    setGcalConnected(false);
    setGcalEvents([]);
    setGcalError(null);
  };

  const handleDayClick = (day: Date, e: React.MouseEvent) => {
    const multi = e.ctrlKey || e.metaKey || selectMode;
    if (multi) {
      setSelectedDays(prev => prev.some(d=>sameDay(d,day)) ? prev.filter(d=>!sameDay(d,day)) : [...prev, day]);
    } else {
      if (selectedDays.length > 0) { setSelectedDays([]); return; }
      const d = new Date(day); d.setHours(0,0,0,0);
      setListStart(d); setCalView('list');
    }
  };

  const handleDaySelect = (day: Date) => {
    setDayModal(day);
  };

  const closeDayModal = () => {
    setDayModal(null);
  };

  const openDayModalAs = (type: 'booking' | 'busy') => {
    if (!dayModal) return;
    setModal({ type, days: [dayModal] });
    setDayModal(null);
  };

  const clearSelection = () => { setSelectedDays([]); if (selectMode) setSelectMode(false); };

  const openModal = (type: 'booking'|'busy') => {
    if (selectedDays.length === 0) return;
    setModal({ type, days: selectedDays });
  };

  const handleSave = (event: CalendarEvent) => {
    const next = [...events, event];
    setEvents(next); saveEvents(next, calKey);
    setModal(null); clearSelection();
  };

  const hasSelection = selectedDays.length > 0;

  const allEvents = useMemo(() => [...events, ...gcalEvents], [events, gcalEvents]);

  const [menuOpen,       setMenuOpen]       = useState(false);
  const [showDailyNotes, setShowDailyNotes] = useState(true);
  const [showTasks,      setShowTasks]      = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden', position:'relative', background:'var(--bg-app)', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 24px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <button style={{ width:28, height:28, borderRadius:'50%', background:'var(--text-primary)', color:'var(--bg-editor)', display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer' }}>
          <Plus size={16}/>
        </button>
        <h1 style={{ fontSize:20, fontWeight:700, color:'var(--text-primary)', margin:0, flex:1 }}>Calendar</h1>

        {/* Google Calendar sync button */}
        {gcalConnected ? (
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, background:'rgba(66,133,244,0.1)', border:'1px solid rgba(66,133,244,0.3)', fontSize:12, color:'#4285F4', fontWeight:500 }}>
              <svg width="12" height="12" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              {gcalLoading ? 'Syncing…' : 'Google Synced'}
            </div>
            <button onClick={handleDisconnectGCal} title="Disconnect Google Calendar" style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-tertiary)', padding:'4px 6px', borderRadius:6, display:'flex', fontSize:11 }}>
              <X size={12}/>
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnectGCal}
            disabled={gcalLoading}
            title={gcalError ?? 'Sync your Google Calendar events'}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, border:'1px solid var(--border)', background:'none', color: gcalError ? '#ef4444' : 'var(--text-secondary)', fontSize:12, fontWeight:500, cursor: gcalLoading ? 'default' : 'pointer', opacity: gcalLoading ? 0.7 : 1 }}
          >
            {gcalLoading ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation:'spin 0.8s linear infinite' }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
            )}
            {gcalLoading ? 'Connecting…' : gcalError ? 'Retry Google Cal' : 'Connect Google Cal'}
          </button>
        )}

        {/* Select mode button */}
        <button
          onClick={() => { setSelectMode(v=>!v); if (selectMode) clearSelection(); }}
          title="Select days (or hold Ctrl to multi-select)"
          style={{
            display:'flex', alignItems:'center', gap:6,
            padding:'6px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:500,
            background: selectMode ? 'var(--accent)' : 'var(--bg-block-hover)',
            color: selectMode ? '#fff' : 'var(--text-secondary)',
            transition:'all 0.15s',
          }}
        >
          <MousePointer2 size={13}/> Select
        </button>

        {/* View toggle */}
        <div style={{ display:'flex', background:'var(--bg-block-hover)', borderRadius:8, padding:2, gap:2 }}>
          {(['month','list'] as CalView[]).map(v => (
            <button key={v} onClick={() => setCalView(v)} style={{
              padding:'5px 14px', borderRadius:6, border:'none', cursor:'pointer',
              fontSize:12, fontWeight:500, textTransform:'capitalize',
              background: calView===v ? 'var(--bg-editor)' : 'transparent',
              color: calView===v ? 'var(--text-primary)' : 'var(--text-tertiary)',
              boxShadow: calView===v ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
              transition:'all 0.15s',
            }}>{v}</button>
          ))}
        </div>

        {/* ⋯ menu */}
        <div ref={menuRef} style={{ position:'relative' }}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            style={{ background: menuOpen ? 'var(--bg-block-hover)' : 'none', border:'none', color:'var(--text-secondary)', cursor:'pointer', padding:6, borderRadius:6, display:'flex' }}
          >
            <MoreHorizontal size={16}/>
          </button>

          {menuOpen && (
            <>
              {/* backdrop to close on outside click */}
              <div onClick={() => setMenuOpen(false)} style={{ position:'fixed', inset:0, zIndex:98 }}/>
              <div style={{
                position:'absolute', top:'calc(100% + 6px)', right:0,
                zIndex:99,
                background:'var(--bg-editor)',
                border:'1px solid var(--border)',
                borderRadius:10,
                boxShadow:'0 8px 24px rgba(0,0,0,0.3)',
                overflow:'hidden', minWidth:160,
              }}>
                {[
                  { label:'Daily Notes', value: showDailyNotes, set: setShowDailyNotes },
                  { label:'Tasks',       value: showTasks,      set: setShowTasks      },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => item.set(v => !v)}
                    style={{
                      display:'flex', alignItems:'center', justifyContent:'space-between',
                      width:'100%', padding:'11px 16px',
                      background:'none', border:'none', cursor:'pointer',
                      color:'var(--text-primary)', fontSize:14, textAlign:'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-block-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    {item.label}
                    {item.value && (
                      <span style={{ color:'var(--text-primary)', fontSize:15, lineHeight:1 }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      {calView==='month' ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <MonthContent today={today} selectedDays={selectedDays} selectMode={selectMode} events={allEvents} onDayClick={handleDayClick} onDaySelect={handleDaySelect}/>

          {/* Daily Notes / Tasks strips (toggled via ⋯ menu) */}
          {(showDailyNotes || showTasks) && (
            <div style={{ flexShrink:0, borderTop:'1px solid var(--border)', display:'flex', gap:0 }}>
              {showDailyNotes && (
                <div style={{ flex:1, padding:'10px 16px', borderRight: showTasks ? '1px solid var(--border)' : 'none', display:'flex', alignItems:'center', gap:8 }}>
                  <FileText size={13} style={{ color:'var(--text-tertiary)', flexShrink:0 }}/>
                  <span style={{ fontSize:12, fontWeight:600, color:'var(--text-tertiary)' }}>Daily Notes</span>
                  <span style={{ fontSize:12, color:'var(--text-tertiary)', marginLeft:4 }}>— no note for today</span>
                  <button style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', fontSize:12, color:'var(--accent)', fontWeight:500 }}>+ New</button>
                </div>
              )}
              {showTasks && (
                <div style={{ flex:1, padding:'10px 16px', display:'flex', alignItems:'center', gap:8 }}>
                  <CheckSquare size={13} style={{ color:'var(--text-tertiary)', flexShrink:0 }}/>
                  <span style={{ fontSize:12, fontWeight:600, color:'var(--text-tertiary)' }}>Tasks</span>
                  <span style={{ fontSize:12, color:'var(--text-tertiary)', marginLeft:4 }}>— no tasks due today</span>
                  <button style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', fontSize:12, color:'var(--accent)', fontWeight:500 }}>+ Add</button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <ListContent today={today} startDate={listStart} events={allEvents}/>
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 24px', borderTop:'1px solid var(--border)', background:'var(--bg-app)', flexShrink:0 }}>
            <button style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:'var(--text-secondary)', cursor:'pointer', fontSize:13, padding:'4px 8px', borderRadius:6 }}>
              <CheckSquare size={14}/> Add Task
            </button>
            <button style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:'var(--text-secondary)', cursor:'pointer', fontSize:13, padding:'4px 8px', borderRadius:6 }}>
              <FileText size={14}/> Create Daily Note
            </button>
          </div>
        </>
      )}

      {/* ── Selection action bar ─────────────────────────────────── */}
      {hasSelection && (
        <div style={{
          position:'absolute', bottom:0, left:0, right:0,
          display:'flex', alignItems:'center', gap:10,
          padding:'14px 24px',
          background:'var(--bg-editor)',
          borderTop:'2px solid var(--accent)',
          boxShadow:'0 -4px 20px rgba(0,0,0,0.2)',
          zIndex:50,
          fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif',
        }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--accent)' }}/>
          <span style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', flex:1 }}>
            {selectedDays.length} day{selectedDays.length!==1?'s':''} selected
            <span style={{ fontWeight:400, color:'var(--text-tertiary)', marginLeft:6 }}>
              {formatDateList(selectedDays)}
            </span>
          </span>
          <button onClick={() => openModal('booking')} style={{ padding:'8px 18px', borderRadius:8, border:'none', background:'var(--accent)', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            📅 Book
          </button>
          <button onClick={() => openModal('busy')} style={{ padding:'8px 18px', borderRadius:8, border:'1px solid var(--border)', background:'none', color:'var(--text-primary)', fontSize:13, fontWeight:500, cursor:'pointer' }}>
            🚫 Mark as Busy
          </button>
          <button onClick={clearSelection} style={{ padding:'8px 12px', borderRadius:8, border:'none', background:'none', color:'var(--text-tertiary)', fontSize:13, cursor:'pointer' }}>
            Clear
          </button>
        </div>
      )}

      {/* ── Day selection modal ──────────────────────────────────── */}
      {dayModal && (
        <div
          onClick={closeDayModal}
          style={{ position:'fixed', inset:0, zIndex:600, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              borderRadius:16,
              background:'var(--bg-app)', border:'1px solid var(--border)',
              boxShadow:'0 24px 64px rgba(0,0,0,0.5)',
              fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif',
              overflow:'hidden',
              minWidth:360,
            }}
          >
            <div style={{ display:'flex', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid var(--border)' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)' }}>
                  {dayModal.getDate()} {MONTHS_SHORT[dayModal.getMonth()]} {dayModal.getFullYear()}
                </div>
                <div style={{ fontSize:12, color:'var(--text-tertiary)', marginTop:2 }}>
                  {DAYS_LONG[dayModal.getDay()]}
                </div>
              </div>
              <button onClick={closeDayModal} style={{ background:'var(--bg-block-hover)', border:'none', borderRadius:'50%', width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text-secondary)' }}>
                <X size={13}/>
              </button>
            </div>
            <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
              <button onClick={() => openDayModalAs('booking')} style={{ padding:'12px 16px', borderRadius:8, border:'none', background:'var(--accent)', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', textAlign:'left' }}>
                📅 Book this day
              </button>
              <button onClick={() => openDayModalAs('busy')} style={{ padding:'12px 16px', borderRadius:8, border:'1px solid var(--border)', background:'none', color:'var(--text-primary)', fontSize:13, fontWeight:600, cursor:'pointer', textAlign:'left' }}>
                🚫 Mark as busy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Booking modal ────────────────────────────────────────── */}
      {modal && (
        <BookingModal
          dates={modal.days}
          defaultType={modal.type}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
