/**
 * Leave Tracker — with Dashboard overview
 *
 * Annual leave  – 15 days total | accrues 1.25 days/month | 1 day = 8 h
 * Sick leave    – 10 days total | accrues 0.83 days/month | usable from month 3
 * Family resp.  – 3 days flat (not accruing)
 * Partial first month: fraction = (days remaining in month) / days in month
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, X, Trash2, UserPlus, Clock,
  ChevronDown, ChevronUp, ClipboardList, LayoutDashboard,
  AlertTriangle, Activity, Users, CalendarCheck,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Employee { id: string; name: string; startDate: string; active?: boolean; }

type LeaveType = 'annual' | 'sick' | 'family';

interface LeaveEntry {
  id: string; employeeId: string;
  date: string; days: number; type: LeaveType; reason: string;
}

interface OvertimeEntry {
  id: string; employeeId: string;
  date: string; hours: number; reason: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ANNUAL_PER_MONTH = 1.25;  const ANNUAL_MAX   = 15;
const SICK_PER_MONTH   = 0.83;  const SICK_MAX     = 10;
const FAMILY_TOTAL     = 3;     const HOURS_PER_DAY = 8;

const SK_EMPLOYEES = 'leave_employees';
const SK_LEAVE     = 'leave_entries';
const SK_OVERTIME  = 'leave_overtime';

const FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif';

const LEAVE_COLORS: Record<LeaveType, string> = {
  annual: '#4a9eff', sick: '#f59e0b', family: '#10b981',
};

// ── Storage ────────────────────────────────────────────────────────────────────

function load<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; }
  catch { return fallback; }
}
function persist(key: string, val: unknown) { localStorage.setItem(key, JSON.stringify(val)); }

// ── Calc helpers ───────────────────────────────────────────────────────────────

function todayISO() { return new Date().toISOString().slice(0, 10); }
function round2(n: number) { return Math.round(n * 100) / 100; }

function ym(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthLabel(yearMonth: string) {
  const [y, m] = yearMonth.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' });
}
function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function buildMonthRows(startDate: string) {
  const start = new Date(startDate + 'T00:00:00');
  const today = new Date();
  const rows: { yearMonth: string; label: string; annualAccrued: number; sickAccrued: number; monthNum: number }[] = [];
  let cur = new Date(start.getFullYear(), start.getMonth(), 1);
  let mNum = 1;
  while (cur <= today) {
    const dim  = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
    const frac = (mNum === 1 && start.getDate() > 1) ? (dim - start.getDate() + 1) / dim : 1;
    rows.push({ yearMonth: ym(cur), label: monthLabel(ym(cur)), annualAccrued: round2(ANNUAL_PER_MONTH * frac), sickAccrued: round2(SICK_PER_MONTH * frac), monthNum: mNum });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    mNum++;
  }
  return rows;
}

function calcAccruals(rows: ReturnType<typeof buildMonthRows>) {
  return {
    annual: round2(Math.min(rows.reduce((s, r) => s + r.annualAccrued, 0), ANNUAL_MAX)),
    sick:   round2(Math.min(rows.reduce((s, r) => s + r.sickAccrued,   0), SICK_MAX)),
    family: FAMILY_TOTAL,
  };
}

function calcUsed(leaveList: LeaveEntry[], employeeId: string) {
  const el = leaveList.filter(e => e.employeeId === employeeId);
  return {
    annual: round2(el.filter(e => e.type==='annual').reduce((s,e) => s+e.days, 0)),
    sick:   round2(el.filter(e => e.type==='sick')  .reduce((s,e) => s+e.days, 0)),
    family: round2(el.filter(e => e.type==='family').reduce((s,e) => s+e.days, 0)),
  };
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const lbl: React.CSSProperties = {
  display:'block', fontSize:11, fontWeight:700, color:'var(--text-secondary)',
  marginBottom:6, textTransform:'uppercase', letterSpacing:'0.06em',
};
function inp(err = false): React.CSSProperties {
  return { width:'100%', boxSizing:'border-box', padding:'9px 12px', borderRadius:8,
    border:`1px solid ${err ? '#ef4444' : 'var(--border)'}`,
    background:'var(--bg-block-hover)', color:'var(--text-primary)', fontSize:14,
    outline:'none', fontFamily:FONT };
}
const TC: React.CSSProperties = {
  padding:'10px 12px', borderBottom:'1px solid var(--border)',
  fontSize:13, color:'var(--text-primary)', verticalAlign:'top',
};

// ── Mini progress bar ──────────────────────────────────────────────────────────

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ height:4, borderRadius:2, background:'var(--bg-block-hover)', width:'100%', overflow:'hidden' }}>
      <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:2 }} />
    </div>
  );
}

// ── Modal shell ────────────────────────────────────────────────────────────────

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return createPortal(
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:'var(--bg-editor)', borderRadius:16, border:'1px solid var(--border)', boxShadow:'0 24px 64px rgba(0,0,0,0.35)', padding:'28px 28px 24px', width:480, maxWidth:'94vw' }}>
        <div style={{ display:'flex', alignItems:'center', marginBottom:22 }}>
          <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:'var(--text-primary)', flex:1 }}>{title}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-tertiary)', padding:4, borderRadius:6, display:'flex' }}><X size={18}/></button>
        </div>
        {children}
      </div>
    </div>, document.body);
}

// ── Add Employee ───────────────────────────────────────────────────────────────

function AddEmployeeModal({ onAdd, onClose }: { onAdd: (e: Omit<Employee,'id'>) => void; onClose: () => void }) {
  const [name, setName] = useState(''); const [start, setStart] = useState(todayISO()); const [err, setErr] = useState('');
  const submit = () => { if (!name.trim()) { setErr('Name is required'); return; } onAdd({ name: name.trim(), startDate: start }); };
  return (
    <ModalShell title="Add Employee" onClose={onClose}>
      <div style={{ marginBottom:16 }}>
        <label style={lbl}>Full name <span style={{ color:'#ef4444' }}>*</span></label>
        <input autoFocus value={name} onChange={e => { setName(e.target.value); setErr(''); }} onKeyDown={e => { if (e.key==='Enter') submit(); if (e.key==='Escape') onClose(); }} placeholder="e.g. Lebohang Noko" style={inp(!!err)} />
        {err && <p style={{ margin:'4px 0 0', fontSize:12, color:'#ef4444' }}>{err}</p>}
      </div>
      <div style={{ marginBottom:24 }}>
        <label style={lbl}>Employment start date <span style={{ color:'#ef4444' }}>*</span></label>
        <input type="date" lang="en-ZA" value={start} onChange={e => setStart(e.target.value)} style={inp()} />
        <p style={{ margin:'5px 0 0', fontSize:12, color:'var(--text-tertiary)' }}>Leave accrual is calculated from this date.</p>
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
        <button onClick={onClose} style={{ padding:'8px 18px', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', fontSize:14, fontWeight:500, cursor:'pointer' }}>Cancel</button>
        <button onClick={submit} style={{ padding:'8px 22px', borderRadius:8, border:'none', background:'var(--accent)', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer' }}>Add Employee</button>
      </div>
    </ModalShell>
  );
}

// ── Record Leave ───────────────────────────────────────────────────────────────

function RecordLeaveModal({ employee, onAdd, onClose }: { employee: Employee; onAdd: (e: Omit<LeaveEntry,'id'|'employeeId'>) => void; onClose: () => void }) {
  const [date, setDate] = useState(todayISO()); const [type, setType] = useState<LeaveType>('annual');
  const [days, setDays] = useState('1'); const [reason, setReason] = useState('');
  const submit = () => { const d = parseFloat(days); if (!d || d <= 0) return; onAdd({ date, type, days: d, reason: reason.trim() }); };
  const TYPES: { key: LeaveType; label: string }[] = [{ key:'annual', label:'Annual' }, { key:'sick', label:'Sick' }, { key:'family', label:'Family Resp.' }];
  return (
    <ModalShell title={`Record Leave — ${employee.name}`} onClose={onClose}>
      <div style={{ marginBottom:16 }}><label style={lbl}>Date</label><input type="date" lang="en-ZA" value={date} onChange={e => setDate(e.target.value)} style={inp()} /></div>
      <div style={{ marginBottom:16 }}>
        <label style={lbl}>Leave type</label>
        <div style={{ display:'flex', gap:8 }}>
          {TYPES.map(t => <button key={t.key} onClick={() => setType(t.key)} style={{ flex:1, padding:'8px 6px', borderRadius:8, border:`1.5px solid ${type===t.key ? LEAVE_COLORS[t.key] : 'var(--border)'}`, background: type===t.key ? `${LEAVE_COLORS[t.key]}22` : 'transparent', color: type===t.key ? LEAVE_COLORS[t.key] : 'var(--text-secondary)', fontSize:12, fontWeight:600, cursor:'pointer' }}>{t.label}</button>)}
        </div>
      </div>
      <div style={{ marginBottom:16 }}><label style={lbl}>Days (0.25 = 2 h · 0.5 = half day)</label><input type="number" min="0.25" max="30" step="0.25" value={days} onChange={e => setDays(e.target.value)} style={inp()} /></div>
      <div style={{ marginBottom:24 }}><label style={lbl}>Reason <span style={{ fontSize:11, fontWeight:400, textTransform:'none', letterSpacing:0, color:'var(--text-tertiary)' }}>optional</span></label><input value={reason} onChange={e => setReason(e.target.value)} onKeyDown={e => { if (e.key==='Enter') submit(); if (e.key==='Escape') onClose(); }} placeholder="e.g. Personal leave" style={inp()} /></div>
      <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
        <button onClick={onClose} style={{ padding:'8px 18px', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', fontSize:14, fontWeight:500, cursor:'pointer' }}>Cancel</button>
        <button onClick={submit} style={{ padding:'8px 22px', borderRadius:8, border:'none', background:'var(--accent)', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer' }}>Record Leave</button>
      </div>
    </ModalShell>
  );
}

// ── Record Overtime ────────────────────────────────────────────────────────────

function RecordOvertimeModal({ employee, onAdd, onClose }: { employee: Employee; onAdd: (e: Omit<OvertimeEntry,'id'|'employeeId'>) => void; onClose: () => void }) {
  const [date, setDate] = useState(todayISO()); const [hours, setHours] = useState('2'); const [reason, setReason] = useState('');
  const submit = () => { const h = parseFloat(hours); if (!h || h <= 0) return; onAdd({ date, hours: h, reason: reason.trim() }); };
  return (
    <ModalShell title={`Record Overtime — ${employee.name}`} onClose={onClose}>
      <div style={{ marginBottom:16 }}><label style={lbl}>Date</label><input type="date" lang="en-ZA" value={date} onChange={e => setDate(e.target.value)} style={inp()} /></div>
      <div style={{ marginBottom:16 }}><label style={lbl}>Hours worked overtime</label><input type="number" min="0.5" step="0.5" value={hours} onChange={e => setHours(e.target.value)} style={inp()} /><p style={{ margin:'4px 0 0', fontSize:12, color:'var(--text-tertiary)' }}>2 hours = 0.25 day · 8 hours = 1 full day</p></div>
      <div style={{ marginBottom:24 }}><label style={lbl}>Reason</label><input value={reason} onChange={e => setReason(e.target.value)} onKeyDown={e => { if (e.key==='Enter') submit(); if (e.key==='Escape') onClose(); }} placeholder="e.g. Ermelo site visit" style={inp()} /></div>
      <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
        <button onClick={onClose} style={{ padding:'8px 18px', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', fontSize:14, fontWeight:500, cursor:'pointer' }}>Cancel</button>
        <button onClick={submit} style={{ padding:'8px 22px', borderRadius:8, border:'none', background:'var(--accent)', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer' }}>Save Overtime</button>
      </div>
    </ModalShell>
  );
}

// ── Summary card (used in per-employee view) ──────────────────────────────────

function SummaryCard({ label, accrued, used, max, color, note }: { label: string; accrued: number; used: number; max: number; color: string; note?: string }) {
  const balance = round2(accrued - used);
  return (
    <div style={{ background:'var(--bg-editor)', border:'1px solid var(--border)', borderRadius:12, padding:'18px 20px', flex:1, minWidth:0 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-tertiary)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>{label}</div>
      <div style={{ height:6, borderRadius:3, background:'var(--bg-block-hover)', marginBottom:14, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${Math.min((accrued / max) * 100, 100)}%`, borderRadius:3, background:color }} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
        {([{ lbl:'Accrued', val:accrued, c:color }, { lbl:'Used', val:used, c:used>accrued?'#ef4444':'var(--text-secondary)' }, { lbl:'Balance', val:balance, c:balance<0?'#ef4444':balance<2?'#f59e0b':'#10b981' }] as const).map(item => (
          <div key={item.lbl} style={{ textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:700, color:item.c as string, lineHeight:1 }}>{item.val}</div>
            <div style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:3 }}>{item.lbl}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop:10, fontSize:11, color:'var(--text-tertiary)', borderTop:'1px solid var(--border)', paddingTop:8 }}>
        Entitlement: <strong style={{ color:'var(--text-secondary)' }}>{max} days</strong>
        {note && <span style={{ marginLeft:8, color:'var(--accent)' }}>· {note}</span>}
      </div>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────

interface DashboardProps {
  employees: Employee[];
  leaveList: LeaveEntry[];
  overtimeList: OvertimeEntry[];
  onViewEmployee: (id: string) => void;
  onAddEmployee: () => void;
}

function Dashboard({ employees, leaveList, overtimeList, onViewEmployee, onAddEmployee }: DashboardProps) {
  // Per-employee stats
  const empStats = employees.map(emp => {
    const rows     = buildMonthRows(emp.startDate);
    const accruals = calcAccruals(rows);
    const used     = calcUsed(leaveList, emp.id);
    const otHours  = round2(overtimeList.filter(o => o.employeeId === emp.id).reduce((s,o) => s+o.hours, 0));
    const balance  = { annual: round2(accruals.annual - used.annual), sick: round2(accruals.sick - used.sick), family: round2(accruals.family - used.family) };
    return { emp, rows, accruals, used, balance, otHours };
  });

  // Global stats
  const totalLeaveDays = round2(leaveList.reduce((s,e) => s+e.days, 0));
  const totalOTHours   = round2(overtimeList.reduce((s,o) => s+o.hours, 0));
  const lowBalanceEmps = empStats.filter(s => s.balance.annual < 3 && s.accruals.annual > 0);

  // Recent activity (all employees, last 15 entries, newest first)
  const recent = [...leaveList]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 15)
    .map(l => ({ ...l, name: employees.find(e => e.id === l.employeeId)?.name ?? '—' }));

  const STAT_CARD = (icon: React.ReactNode, value: string | number, label: string, color: string) => (
    <div style={{ background:'var(--bg-editor)', border:'1px solid var(--border)', borderRadius:12, padding:'18px 20px', flex:1, minWidth:0, display:'flex', alignItems:'center', gap:14 }}>
      <div style={{ width:44, height:44, borderRadius:10, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize:26, fontWeight:800, color:'var(--text-primary)', lineHeight:1 }}>{value}</div>
        <div style={{ fontSize:12, color:'var(--text-tertiary)', marginTop:3 }}>{label}</div>
      </div>
    </div>
  );

  return (
    <div style={{ flex:1, overflow:'auto', padding:'20px 24px' }}>

      {/* Stats row */}
      <div style={{ display:'flex', gap:12, marginBottom:24, flexWrap:'wrap' }}>
        {STAT_CARD(<Users size={20}/>,       employees.length,    'Employees tracked',   '#4a9eff')}
        {STAT_CARD(<CalendarCheck size={20}/>, totalLeaveDays,    'Total leave days taken', '#f59e0b')}
        {STAT_CARD(<Clock size={20}/>,         totalOTHours + ' h', 'Total overtime hours', '#10b981')}
      </div>

      {/* Low balance alert */}
      {lowBalanceEmps.length > 0 && (
        <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:10, padding:'12px 16px', marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
          <AlertTriangle size={16} style={{ color:'#f59e0b', flexShrink:0 }} />
          <span style={{ fontSize:13, color:'var(--text-primary)' }}>
            <strong>Low annual leave balance:</strong> {lowBalanceEmps.map(s => `${s.emp.name} (${s.balance.annual} days left)`).join(' · ')}
          </span>
        </div>
      )}

      {/* Employee leave balances table */}
      <div style={{ background:'var(--bg-editor)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', marginBottom:24 }}>
        <div style={{ padding:'13px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>Employee Leave Balances</span>
          <button onClick={onAddEmployee} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 11px', borderRadius:7, border:'1px dashed var(--border)', background:'transparent', color:'var(--text-tertiary)', fontSize:12, cursor:'pointer' }}>
            <Plus size={11}/> Add employee
          </button>
        </div>

        {employees.length === 0 ? (
          <div style={{ padding:'24px 16px', textAlign:'center', color:'var(--text-tertiary)', fontSize:13 }}>No employees added yet.</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
              <thead>
                <tr style={{ background:'var(--bg-block-hover)' }}>
                  {['Employee', 'Employed', 'Annual leave', 'Sick leave', 'Family', 'Overtime'].map(h => (
                    <th key={h} style={{ ...TC, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-tertiary)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {empStats.map(({ emp, rows, accruals, used, balance, otHours }) => (
                  <tr key={emp.id} style={{ cursor:'pointer' }} onClick={() => onViewEmployee(emp.id)}>
                    {/* Name */}
                    <td style={{ ...TC, fontWeight:600, opacity: emp.active === false ? 0.5 : 1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ color:'var(--accent)', textDecoration:'underline', textDecorationColor:'transparent', transition:'text-decoration-color 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.textDecorationColor = 'var(--accent)')}
                          onMouseLeave={e => (e.currentTarget.style.textDecorationColor = 'transparent')}>
                          {emp.name}
                        </span>
                        {emp.active === false && (
                          <span style={{ padding:'1px 6px', borderRadius:8, background:'rgba(239,68,68,0.12)', color:'#ef4444', fontSize:10, fontWeight:700, letterSpacing:'0.04em' }}>
                            DEACTIVATED
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Months */}
                    <td style={{ ...TC, color:'var(--text-secondary)', whiteSpace:'nowrap', fontSize:12 }}>
                      {rows.length} month{rows.length !== 1 ? 's' : ''}<br/>
                      <span style={{ fontSize:11, color:'var(--text-tertiary)' }}>{fmtDate(emp.startDate)}</span>
                    </td>

                    {/* Annual */}
                    <td style={{ ...TC, minWidth:160 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{accruals.annual} / {ANNUAL_MAX} accrued</span>
                        <span style={{ fontSize:12, fontWeight:700, color: balance.annual < 3 ? '#f59e0b' : '#10b981' }}>{balance.annual} left</span>
                      </div>
                      <MiniBar value={accruals.annual} max={ANNUAL_MAX} color="#4a9eff" />
                      {used.annual > 0 && <div style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:3 }}>{used.annual} day{used.annual!==1?'s':''} taken</div>}
                    </td>

                    {/* Sick */}
                    <td style={{ ...TC, minWidth:160 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{accruals.sick} / {SICK_MAX} accrued</span>
                        <span style={{ fontSize:12, fontWeight:700, color: balance.sick < 2 ? '#f59e0b' : 'var(--text-secondary)' }}>{balance.sick} left</span>
                      </div>
                      <MiniBar value={accruals.sick} max={SICK_MAX} color="#f59e0b" />
                      {used.sick > 0 && <div style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:3 }}>{used.sick} day{used.sick!==1?'s':''} taken</div>}
                    </td>

                    {/* Family */}
                    <td style={{ ...TC }}>
                      <span style={{ fontWeight:600, color: balance.family <= 0 ? '#ef4444' : '#10b981' }}>{balance.family}</span>
                      <span style={{ fontSize:12, color:'var(--text-tertiary)' }}> / 3 left</span>
                    </td>

                    {/* OT */}
                    <td style={{ ...TC, color:'var(--accent)', fontWeight:600 }}>
                      {otHours > 0 ? `${otHours} h` : <span style={{ color:'var(--text-tertiary)', fontWeight:400 }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div style={{ background:'var(--bg-editor)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        <div style={{ padding:'13px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
          <Activity size={14} style={{ color:'var(--text-tertiary)' }} />
          <span style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>Recent Leave Activity</span>
        </div>

        {recent.length === 0 ? (
          <div style={{ padding:'24px 16px', textAlign:'center', color:'var(--text-tertiary)', fontSize:13 }}>No leave recorded yet.</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'var(--bg-block-hover)' }}>
                  {['Employee','Date','Days','Type','Reason'].map(h => (
                    <th key={h} style={{ ...TC, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map(entry => (
                  <tr key={entry.id}>
                    <td style={{ ...TC, fontWeight:600 }}>
                      <button onClick={() => onViewEmployee(entry.employeeId)} style={{ background:'none', border:'none', padding:0, cursor:'pointer', color:'var(--accent)', fontSize:13, fontWeight:600 }}>{entry.name}</button>
                    </td>
                    <td style={{ ...TC, whiteSpace:'nowrap', color:'var(--text-secondary)' }}>{fmtDate(entry.date)}</td>
                    <td style={{ ...TC, fontWeight:600 }}>{entry.days} day{entry.days !== 1 ? 's' : ''}</td>
                    <td style={{ ...TC }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 8px', borderRadius:12, background:`${LEAVE_COLORS[entry.type]}18`, color:LEAVE_COLORS[entry.type], fontSize:12, fontWeight:600, textTransform:'capitalize' }}>
                        <span style={{ width:6, height:6, borderRadius:'50%', background:LEAVE_COLORS[entry.type], display:'inline-block' }} />
                        {entry.type === 'family' ? 'Family' : entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                      </span>
                    </td>
                    <td style={{ ...TC, color:'var(--text-secondary)' }}>{entry.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Per-employee detail view ───────────────────────────────────────────────────

interface EmployeeDetailProps {
  emp: Employee;
  leaveList: LeaveEntry[];
  overtimeList: OvertimeEntry[];
  onDeleteLeave: (id: string) => void;
  onDeleteOvertime: (id: string) => void;
  onRemoveEmployee: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
}

function EmployeeDetail({ emp, leaveList, overtimeList, onDeleteLeave, onDeleteOvertime, onRemoveEmployee, onToggleActive }: EmployeeDetailProps) {
  const isActive = emp.active !== false;
  const [showOTTable, setShowOTTable] = useState(true);

  const empLeave   = leaveList.filter(e => e.employeeId === emp.id);
  const empOT      = overtimeList.filter(e => e.employeeId === emp.id);
  const monthRows  = buildMonthRows(emp.startDate);
  const accruals   = calcAccruals(monthRows);
  const used       = calcUsed(leaveList, emp.id);

  const totalOTHours = round2(empOT.reduce((s,e) => s+e.hours, 0));
  const totalOTDays  = round2(totalOTHours / HOURS_PER_DAY);

  const leaveByMonth: Record<string, LeaveEntry[]> = {};
  empLeave.forEach(e => { const k = e.date.slice(0,7); if (!leaveByMonth[k]) leaveByMonth[k] = []; leaveByMonth[k].push(e); });

  let runAnnual = 0; let runSick = 0;

  return (
    <div style={{ flex:1, overflow:'auto', padding:'20px 24px' }}>

      {/* Employee info bar */}
      <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20, flexWrap:'wrap' }}>
        <span style={{ fontSize:15, fontWeight:700, color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{emp.name}</span>
        {!isActive && (
          <span style={{ padding:'2px 8px', borderRadius:10, background:'rgba(239,68,68,0.12)', color:'#ef4444', fontSize:11, fontWeight:700, letterSpacing:'0.04em' }}>
            DEACTIVATED
          </span>
        )}
        <span style={{ fontSize:13, color:'var(--text-secondary)' }}>Started <strong>{fmtDate(emp.startDate)}</strong></span>
        <span style={{ fontSize:13, color:'var(--text-secondary)' }}><strong>{monthRows.length}</strong> month{monthRows.length !== 1 ? 's' : ''} employed</span>
        <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
          <button
            onClick={() => {
              const msg = isActive
                ? `Deactivate ${emp.name}? They will no longer be able to log in.`
                : `Reactivate ${emp.name}? They will be able to log in again.`;
              if (window.confirm(msg)) onToggleActive(emp.id, !isActive);
            }}
            style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:6, border:`1px solid ${isActive ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.4)'}`, background:'transparent', color: isActive ? '#f59e0b' : '#10b981', fontSize:12, cursor:'pointer' }}
          >
            {isActive ? '🔒 Deactivate' : '🔓 Reactivate'}
          </button>
          <button onClick={() => { if (window.confirm(`Permanently delete ${emp.name} and all their records?`)) onRemoveEmployee(emp.id); }}
            style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:6, border:'none', background:'transparent', color:'var(--text-tertiary)', fontSize:12, cursor:'pointer' }}>
            <Trash2 size={12}/> Remove
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <SummaryCard label="Annual Leave"          accrued={accruals.annual}  used={used.annual}  max={ANNUAL_MAX}   color="#4a9eff" />
        <SummaryCard label="Sick Leave"            accrued={accruals.sick}    used={used.sick}    max={SICK_MAX}     color="#f59e0b" note="Usable from month 3" />
        <SummaryCard label="Family Responsibility" accrued={FAMILY_TOTAL}     used={used.family}  max={FAMILY_TOTAL} color="#10b981" />
      </div>

      {/* Leave rules reminder */}
      <div style={{ background:'rgba(74,158,255,0.06)', border:'1px solid rgba(74,158,255,0.2)', borderRadius:10, padding:'10px 16px', marginBottom:20, fontSize:12, color:'var(--text-secondary)', lineHeight:1.7 }}>
        <strong style={{ color:'var(--text-primary)' }}>Rules · </strong>
        Annual: 15 days, 1.25/month · Sick: 10 days, 0.83/month (usable from month 3) · Family: 3 days flat &nbsp;|&nbsp; 1 day = 8 h · 0.25 day = 2 h
      </div>

      {/* Month-by-month table */}
      <div style={{ background:'var(--bg-editor)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', marginBottom:20 }}>
        <div style={{ padding:'13px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>Monthly Leave Record</span>
          <span style={{ fontSize:12, color:'var(--text-tertiary)' }}>{monthRows.length} months</span>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:620 }}>
            <thead>
              <tr style={{ background:'var(--bg-block-hover)' }}>
                {['Month','Leave taken','Reason','Annual ↑','Annual total','Sick ↑','Sick total'].map(h => (
                  <th key={h} style={{ ...TC, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-tertiary)', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthRows.map(row => {
                runAnnual = round2(Math.min(runAnnual + row.annualAccrued, ANNUAL_MAX));
                runSick   = round2(Math.min(runSick   + row.sickAccrued,   SICK_MAX));
                const mLeave = leaveByMonth[row.yearMonth] ?? [];
                return (
                  <tr key={row.yearMonth} style={{ background: mLeave.length > 0 ? 'rgba(74,158,255,0.04)' : 'transparent' }}>
                    <td style={{ ...TC, fontWeight:600, whiteSpace:'nowrap', color:'var(--text-secondary)' }}>{row.label}</td>
                    <td style={TC}>
                      {mLeave.length > 0 ? (
                        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                          {mLeave.map(l => (
                            <div key={l.id} style={{ display:'flex', alignItems:'center', gap:5 }}>
                              <span style={{ width:7, height:7, borderRadius:'50%', background:LEAVE_COLORS[l.type], flexShrink:0, display:'inline-block' }} />
                              <span style={{ fontWeight:600, color:LEAVE_COLORS[l.type] }}>{l.days}d</span>
                              <span style={{ fontSize:11, color:'var(--text-tertiary)', textTransform:'capitalize' }}>({l.type})</span>
                              <button onClick={() => onDeleteLeave(l.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-tertiary)', padding:0, display:'flex' }} title="Remove"><Trash2 size={10}/></button>
                            </div>
                          ))}
                        </div>
                      ) : <span style={{ color:'var(--text-tertiary)' }}>—</span>}
                    </td>
                    <td style={TC}>
                      {mLeave.length > 0 ? (
                        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                          {mLeave.map(l => <span key={l.id} style={{ fontSize:12, color:'var(--text-secondary)' }}>{l.reason || '—'}</span>)}
                        </div>
                      ) : <span style={{ color:'var(--text-tertiary)' }}>—</span>}
                    </td>
                    <td style={{ ...TC, color:'#4a9eff', fontWeight:600 }}>+{row.annualAccrued}</td>
                    <td style={{ ...TC, color:'var(--text-secondary)' }}>{runAnnual}</td>
                    <td style={{ ...TC, color:'#f59e0b', fontWeight:600 }}>+{row.sickAccrued}</td>
                    <td style={{ ...TC, color:'var(--text-secondary)' }}>{runSick}</td>
                  </tr>
                );
              })}
              <tr style={{ background:'var(--bg-block-hover)', fontWeight:700 }}>
                <td style={{ ...TC, color:'var(--text-primary)' }}>Totals</td>
                <td style={{ ...TC }}>
                  {used.annual > 0 && <div style={{ color:'#4a9eff' }}>{used.annual} annual</div>}
                  {used.sick   > 0 && <div style={{ color:'#f59e0b' }}>{used.sick} sick</div>}
                  {used.family > 0 && <div style={{ color:'#10b981' }}>{used.family} family</div>}
                  {Object.values(used).every(v => v===0) && <span style={{ color:'var(--text-tertiary)', fontWeight:400 }}>None taken</span>}
                </td>
                <td style={TC} />
                <td colSpan={2} style={{ ...TC, color:'#4a9eff' }}>Annual: {accruals.annual} / {ANNUAL_MAX} days</td>
                <td colSpan={2} style={{ ...TC, color:'#f59e0b' }}>Sick: {accruals.sick} / {SICK_MAX} days</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Overtime */}
      <div style={{ background:'var(--bg-editor)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        <button onClick={() => setShowOTTable(v => !v)} style={{ width:'100%', padding:'13px 16px', border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', textAlign:'left' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>Overtime Hours</span>
            {totalOTHours > 0 && <span style={{ fontSize:12, color:'var(--accent)', fontWeight:600 }}>{totalOTHours} h = {totalOTDays} day{totalOTDays !== 1 ? 's' : ''}</span>}
          </div>
          {showOTTable ? <ChevronUp size={15} style={{ color:'var(--text-tertiary)' }}/> : <ChevronDown size={15} style={{ color:'var(--text-tertiary)' }}/>}
        </button>
        {showOTTable && (
          empOT.length === 0 ? (
            <div style={{ padding:'12px 16px 18px', borderTop:'1px solid var(--border)', fontSize:13, color:'var(--text-tertiary)' }}>No overtime recorded yet.</div>
          ) : (
            <div style={{ borderTop:'1px solid var(--border)', overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'var(--bg-block-hover)' }}>
                    {['Date','Hours','Equivalent','Reason',''].map(h => (
                      <th key={h} style={{ ...TC, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-tertiary)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {empOT.map(ot => (
                    <tr key={ot.id}>
                      <td style={TC}>{fmtDate(ot.date)}</td>
                      <td style={{ ...TC, fontWeight:600, color:'var(--accent)' }}>{ot.hours} h</td>
                      <td style={{ ...TC, color:'var(--text-secondary)' }}>{round2(ot.hours / HOURS_PER_DAY)} day</td>
                      <td style={{ ...TC, color:'var(--text-secondary)' }}>{ot.reason || '—'}</td>
                      <td style={{ ...TC, textAlign:'right' }}>
                        <button onClick={() => onDeleteOvertime(ot.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-tertiary)', padding:4, display:'flex' }} title="Delete"><Trash2 size={12}/></button>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background:'var(--bg-block-hover)', fontWeight:700 }}>
                    <td style={{ ...TC, color:'var(--text-primary)' }}>Total</td>
                    <td style={{ ...TC, color:'var(--accent)' }}>{totalOTHours} h</td>
                    <td style={{ ...TC, color:'var(--accent)' }}>{totalOTDays} day{totalOTDays !== 1 ? 's' : ''}</td>
                    <td colSpan={2} style={TC} />
                  </tr>
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ── Main view ──────────────────────────────────────────────────────────────────

export function ImagineView() {
  const [employees,    setEmployees]    = useState<Employee[]>(() => load(SK_EMPLOYEES, []));
  const [leaveList,    setLeaveList]    = useState<LeaveEntry[]>(() => load(SK_LEAVE, []));
  const [overtimeList, setOvertimeList] = useState<OvertimeEntry[]>(() => load(SK_OVERTIME, []));

  // 'dashboard' | employee-id
  const [view,        setView]       = useState<string>('dashboard');
  const [showAddEmp,  setShowAddEmp] = useState(false);
  const [showLeave,   setShowLeave]  = useState(false);
  const [showOT,      setShowOT]     = useState(false);

  useEffect(() => { persist(SK_EMPLOYEES, employees);    }, [employees]);
  useEffect(() => { persist(SK_LEAVE,     leaveList);    }, [leaveList]);
  useEffect(() => { persist(SK_OVERTIME,  overtimeList); }, [overtimeList]);

  const addEmployee = useCallback((data: Omit<Employee,'id'>) => {
    const emp: Employee = { id: crypto.randomUUID(), ...data };
    setEmployees(p => [...p, emp]);
    setView(emp.id);
    setShowAddEmp(false);
  }, []);

  const removeEmployee = useCallback((id: string) => {
    setEmployees(p => p.filter(e => e.id !== id));
    setLeaveList(p => p.filter(e => e.employeeId !== id));
    setOvertimeList(p => p.filter(e => e.employeeId !== id));
    setView('dashboard');
  }, []);

  const toggleActive = useCallback((id: string, active: boolean) => {
    setEmployees(p => p.map(e => e.id === id ? { ...e, active } : e));
    if (!active) setView('dashboard'); // send to dashboard when deactivating
  }, []);

  const addLeave = useCallback((data: Omit<LeaveEntry,'id'|'employeeId'>) => {
    if (view === 'dashboard') return;
    setLeaveList(p => [...p, { id: crypto.randomUUID(), employeeId: view, ...data }]);
    setShowLeave(false);
  }, [view]);

  const addOvertime = useCallback((data: Omit<OvertimeEntry,'id'|'employeeId'>) => {
    if (view === 'dashboard') return;
    setOvertimeList(p => [...p, { id: crypto.randomUUID(), employeeId: view, ...data }]);
    setShowOT(false);
  }, [view]);

  const activeEmployees  = employees.filter(e => e.active !== false);
  const archivedEmployees = employees.filter(e => e.active === false);

  const activeEmp  = employees.find(e => e.id === view) ?? null;
  const isDashboard = view === 'dashboard';
  const isArchive   = view === 'archive';

  // ── Shared tab nav style ──────────────────────────────────────────────────────

  const tabBtn = (active: boolean): React.CSSProperties => ({
    display:'flex', alignItems:'center', gap:5,
    padding:'5px 12px', borderRadius:8,
    border:`1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'rgba(74,158,255,0.15)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
    fontSize:13, fontWeight:active ? 600 : 400, cursor:'pointer',
  });

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden', background:'var(--bg-app)', fontFamily:FONT }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 24px', borderBottom:'1px solid var(--border)', flexShrink:0, flexWrap:'wrap' }}>
        <ClipboardList size={18} style={{ color:'var(--accent)', flexShrink:0 }} />
        <h1 style={{ fontSize:19, fontWeight:700, color:'var(--text-primary)', margin:'0 8px 0 0' }}>Leave Tracker</h1>

        {/* Navigation tabs */}
        <div style={{ display:'flex', gap:4, flex:1, flexWrap:'wrap' }}>
          <button onClick={() => setView('dashboard')} style={tabBtn(isDashboard)}>
            <LayoutDashboard size={12}/> Dashboard
          </button>
          {activeEmployees.map(emp => (
            <button key={emp.id} onClick={() => setView(emp.id)} style={tabBtn(view === emp.id)}>
              {emp.name}
            </button>
          ))}
          <button onClick={() => setShowAddEmp(true)} style={{ padding:'5px 10px', borderRadius:8, border:'1px dashed var(--border)', background:'transparent', color:'var(--text-tertiary)', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
            <Plus size={12}/> Add
          </button>
          {archivedEmployees.length > 0 && (
            <button onClick={() => setView('archive')} style={{
              ...tabBtn(isArchive),
              borderColor: isArchive ? '#f59e0b' : 'var(--border)',
              background: isArchive ? 'rgba(245,158,11,0.12)' : 'transparent',
              color: isArchive ? '#f59e0b' : 'var(--text-tertiary)',
            }}>
              Archive
              <span style={{ marginLeft:4, padding:'1px 6px', borderRadius:8, background: isArchive ? 'rgba(245,158,11,0.25)' : 'var(--bg-block-hover)', color: isArchive ? '#f59e0b' : 'var(--text-tertiary)', fontSize:11, fontWeight:700 }}>
                {archivedEmployees.length}
              </span>
            </button>
          )}
        </div>

        {/* Action buttons (only for active employee detail view) */}
        {activeEmp && activeEmp.active !== false && (
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            <button onClick={() => setShowLeave(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 13px', borderRadius:8, border:'none', background:'var(--accent)', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              <Plus size={13}/> Record Leave
            </button>
            <button onClick={() => setShowOT(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 13px', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', fontSize:13, fontWeight:500, cursor:'pointer' }}>
              <Clock size={13}/> Overtime
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      {isDashboard ? (
        <Dashboard
          employees={activeEmployees}
          leaveList={leaveList}
          overtimeList={overtimeList}
          onViewEmployee={setView}
          onAddEmployee={() => setShowAddEmp(true)}
        />
      ) : isArchive ? (
        /* Archive view */
        <div style={{ flex:1, overflow:'auto', padding:'20px 24px' }}>
          <div style={{ marginBottom:20 }}>
            <h2 style={{ margin:'0 0 4px', fontSize:18, fontWeight:700, color:'var(--text-primary)' }}>Archive</h2>
            <p style={{ margin:0, fontSize:13, color:'var(--text-secondary)' }}>
              Deactivated accounts — {archivedEmployees.length} employee{archivedEmployees.length !== 1 ? 's' : ''}. Their leave history is preserved and read-only.
            </p>
          </div>
          <div style={{ background:'var(--bg-editor)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'var(--bg-block-hover)' }}>
                  {['Name','Start date','Months employed','Annual leave','Sick leave',''].map(h => (
                    <th key={h} style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-tertiary)', textAlign:'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {archivedEmployees.map(emp => {
                  const rows     = buildMonthRows(emp.startDate);
                  const accruals = calcAccruals(rows);
                  const used     = calcUsed(leaveList, emp.id);
                  return (
                    <tr key={emp.id} style={{ opacity:0.65 }}>
                      <td style={{ padding:'12px 14px', fontWeight:600, color:'var(--text-primary)', fontSize:13 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          {emp.name}
                          <span style={{ padding:'1px 6px', borderRadius:8, background:'rgba(239,68,68,0.12)', color:'#ef4444', fontSize:10, fontWeight:700 }}>ARCHIVED</span>
                        </div>
                      </td>
                      <td style={{ padding:'12px 14px', fontSize:13, color:'var(--text-secondary)' }}>{fmtDate(emp.startDate)}</td>
                      <td style={{ padding:'12px 14px', fontSize:13, color:'var(--text-secondary)' }}>{rows.length} month{rows.length !== 1 ? 's' : ''}</td>
                      <td style={{ padding:'12px 14px', fontSize:13, color:'var(--text-secondary)' }}>{round2(accruals.annual - used.annual)} days left</td>
                      <td style={{ padding:'12px 14px', fontSize:13, color:'var(--text-secondary)' }}>{round2(accruals.sick - used.sick)} days left</td>
                      <td style={{ padding:'12px 14px', textAlign:'right', whiteSpace:'nowrap' }}>
                        <button
                          onClick={() => setView(emp.id)}
                          style={{ padding:'4px 10px', borderRadius:6, border:'1px solid var(--border)', background:'transparent', color:'var(--text-secondary)', fontSize:12, cursor:'pointer', marginRight:6 }}
                        >
                          View record
                        </button>
                        <button
                          onClick={() => { if (window.confirm(`Reactivate ${emp.name}?`)) toggleActive(emp.id, true); }}
                          style={{ padding:'4px 10px', borderRadius:6, border:'1px solid rgba(16,185,129,0.4)', background:'transparent', color:'#10b981', fontSize:12, cursor:'pointer' }}
                        >
                          🔓 Reactivate
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeEmp ? (
        <EmployeeDetail
          emp={activeEmp}
          leaveList={leaveList}
          overtimeList={overtimeList}
          onDeleteLeave={id => setLeaveList(p => p.filter(x => x.id !== id))}
          onDeleteOvertime={id => setOvertimeList(p => p.filter(x => x.id !== id))}
          onRemoveEmployee={removeEmployee}
          onToggleActive={toggleActive}
        />
      ) : (
        /* Fallback: no employees */
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, paddingBottom:80 }}>
          <ClipboardList size={44} style={{ color:'var(--text-tertiary)', opacity:0.35 }} />
          <p style={{ color:'var(--text-tertiary)', fontSize:14, margin:0 }}>Add an employee to start tracking leave.</p>
          <button onClick={() => setShowAddEmp(true)} style={{ padding:'8px 20px', borderRadius:8, background:'var(--bg-sidebar)', border:'1px solid var(--border)', color:'var(--text-primary)', fontSize:13, fontWeight:500, cursor:'pointer' }}>
            Add First Employee
          </button>
        </div>
      )}

      {/* Modals */}
      {showAddEmp && <AddEmployeeModal onAdd={addEmployee} onClose={() => setShowAddEmp(false)} />}
      {showLeave  && activeEmp && <RecordLeaveModal    employee={activeEmp} onAdd={addLeave}    onClose={() => setShowLeave(false)} />}
      {showOT     && activeEmp && <RecordOvertimeModal employee={activeEmp} onAdd={addOvertime} onClose={() => setShowOT(false)}    />}
    </div>
  );
}
