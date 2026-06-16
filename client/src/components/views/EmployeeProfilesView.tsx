import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Users, Plus, X, Trash2, Edit2, ChevronDown,
  Mail, Phone, MapPin, AlertTriangle, FileX,
  Clock, CalendarCheck, Activity,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface EmployeeProfile {
  id: string;
  name: string;
  startDate: string;
  active?: boolean;            // kept for Leave Tracker backward-compat
  email?: string;
  jobTitle?: string;
  department?: string;
  employmentType?: 'intern' | 'full-time' | 'contractor';
  appRole?: 'manager' | 'intern';
  status?: 'active' | 'on-leave' | 'deactivated';
  phone?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
}

type LeaveType = 'annual' | 'sick' | 'family';
interface LeaveEntry  { id: string; employeeId: string; date: string; days: number; type: LeaveType; reason: string; }
interface OvertimeEntry { id: string; employeeId: string; date: string; hours: number; reason: string; }
type ProfileTab = 'overview' | 'leave' | 'contact' | 'notes' | 'documents';

// ── Constants ─────────────────────────────────────────────────────────────────

const SK_EMPLOYEES = 'leave_employees';
const SK_LEAVE     = 'leave_entries';
const SK_OVERTIME  = 'leave_overtime';

const ANNUAL_PER_MONTH = 1.25; const ANNUAL_MAX = 15;
const SICK_PER_MONTH   = 0.83; const SICK_MAX   = 10;
const FAMILY_TOTAL     = 3;
const HOURS_PER_DAY    = 8;

const FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif';
const LEAVE_COLORS: Record<LeaveType, string> = { annual: '#4a9eff', sick: '#f59e0b', family: '#10b981' };
const AVATAR_COLORS = ['#5B6CF0','#8B5CF6','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#14b8a6'];

// ── Storage helpers ────────────────────────────────────────────────────────────

function load<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; }
  catch { return fallback; }
}
function persist(key: string, val: unknown) { localStorage.setItem(key, JSON.stringify(val)); }

// ── Leave calc helpers ─────────────────────────────────────────────────────────

function round2(n: number) { return Math.round(n * 100) / 100; }
function ym(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function monthLabel(ym: string) {
  const [y,m] = ym.split('-').map(Number);
  return new Date(y,m-1,1).toLocaleDateString('en-ZA',{month:'short',year:'2-digit'});
}
function fmtDate(iso: string) {
  return new Date(iso+'T12:00:00').toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'});
}
function todayISO() { return new Date().toISOString().slice(0,10); }

function buildMonthRows(startDate: string) {
  const start = new Date(startDate+'T00:00:00');
  const today = new Date();
  const rows: { yearMonth:string; label:string; annualAccrued:number; sickAccrued:number }[] = [];
  let cur = new Date(start.getFullYear(), start.getMonth(), 1);
  let mNum = 1;
  while (cur <= today) {
    const dim  = new Date(cur.getFullYear(), cur.getMonth()+1, 0).getDate();
    const frac = (mNum===1 && start.getDate()>1) ? (dim-start.getDate()+1)/dim : 1;
    rows.push({ yearMonth:ym(cur), label:monthLabel(ym(cur)), annualAccrued:round2(ANNUAL_PER_MONTH*frac), sickAccrued:round2(SICK_PER_MONTH*frac) });
    cur = new Date(cur.getFullYear(), cur.getMonth()+1, 1);
    mNum++;
  }
  return rows;
}
function calcAccruals(rows: ReturnType<typeof buildMonthRows>) {
  return {
    annual: round2(Math.min(rows.reduce((s,r)=>s+r.annualAccrued,0), ANNUAL_MAX)),
    sick:   round2(Math.min(rows.reduce((s,r)=>s+r.sickAccrued,  0), SICK_MAX)),
    family: FAMILY_TOTAL,
  };
}
function calcUsed(leaveList: LeaveEntry[], employeeId: string) {
  const el = leaveList.filter(e=>e.employeeId===employeeId);
  return {
    annual: round2(el.filter(e=>e.type==='annual').reduce((s,e)=>s+e.days,0)),
    sick:   round2(el.filter(e=>e.type==='sick')  .reduce((s,e)=>s+e.days,0)),
    family: round2(el.filter(e=>e.type==='family').reduce((s,e)=>s+e.days,0)),
  };
}

// ── Shared style helpers ───────────────────────────────────────────────────────

const lbl: React.CSSProperties = {
  display:'block', fontSize:11, fontWeight:700, color:'var(--text-secondary)',
  marginBottom:5, textTransform:'uppercase', letterSpacing:'0.06em',
};
function inp(err=false): React.CSSProperties {
  return { width:'100%', boxSizing:'border-box', padding:'9px 12px', borderRadius:8,
    border:`1px solid ${err?'#ef4444':'var(--border)'}`, background:'var(--bg-block-hover)',
    color:'var(--text-primary)', fontSize:14, outline:'none', fontFamily:FONT };
}
function sel(): React.CSSProperties {
  return { ...inp(), cursor:'pointer', appearance:'none' as const,
    backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%235a5b7a' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat:'no-repeat', backgroundPosition:'right 12px center', paddingRight:32 };
}

// ── Avatar ─────────────────────────────────────────────────────────────────────

function avatarColor(id: string) {
  const i = id.charCodeAt(0) + id.charCodeAt(id.length-1);
  return AVATAR_COLORS[i % AVATAR_COLORS.length];
}
function AvatarCircle({ name, id, size=40 }: { name:string; id:string; size?:number }) {
  const initials = name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:avatarColor(id),
      display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.35,
      fontWeight:700, color:'#fff', flexShrink:0 }}>
      {initials}
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: EmployeeProfile['status'] }) {
  const s = status ?? 'active';
  const map = {
    active:      { label:'Active',      bg:'rgba(16,185,129,0.12)',  color:'#10b981' },
    'on-leave':  { label:'On Leave',    bg:'rgba(245,158,11,0.12)',  color:'#f59e0b' },
    deactivated: { label:'Deactivated', bg:'rgba(239,68,68,0.12)',   color:'#ef4444' },
  };
  const { label, bg, color } = map[s];
  return (
    <span style={{ padding:'2px 9px', borderRadius:10, background:bg, color, fontSize:11, fontWeight:700, letterSpacing:'0.04em' }}>
      {label}
    </span>
  );
}

// ── Modal shell ────────────────────────────────────────────────────────────────

function ModalShell({ title, onClose, children, wide=false }: { title:string; onClose:()=>void; children:React.ReactNode; wide?:boolean }) {
  return createPortal(
    <div style={{ position:'fixed',inset:0,zIndex:500,background:'rgba(0,0,0,0.45)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'16px' }}
      onMouseDown={e=>{ if (e.target===e.currentTarget) onClose(); }}>
      <div style={{ background:'var(--bg-editor)',borderRadius:16,border:'1px solid var(--border)',boxShadow:'0 24px 64px rgba(0,0,0,0.35)',padding:'26px 28px 24px',width:wide?680:480,maxWidth:'96vw',maxHeight:'90vh',display:'flex',flexDirection:'column' }}>
        <div style={{ display:'flex',alignItems:'center',marginBottom:20,flexShrink:0 }}>
          <h2 style={{ margin:0,fontSize:17,fontWeight:700,color:'var(--text-primary)',flex:1 }}>{title}</h2>
          <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-tertiary)',padding:4,borderRadius:6,display:'flex' }}><X size={18}/></button>
        </div>
        <div style={{ overflowY:'auto',flex:1 }}>{children}</div>
      </div>
    </div>, document.body);
}

// ── Add / Edit modal ───────────────────────────────────────────────────────────

function AddEditModal({ employee, onSave, onClose }: { employee?: EmployeeProfile; onSave:(p:EmployeeProfile)=>void; onClose:()=>void }) {
  const isEdit = !!employee;
  const [name,   setName]   = useState(employee?.name ?? '');
  const [email,  setEmail]  = useState(employee?.email ?? '');
  const [title,  setTitle]  = useState(employee?.jobTitle ?? '');
  const [dept,   setDept]   = useState(employee?.department ?? '');
  const [start,  setStart]  = useState(employee?.startDate ?? todayISO());
  const [empType,setEmpType]= useState<EmployeeProfile['employmentType']>(employee?.employmentType ?? 'full-time');
  const [appRole,setAppRole]= useState<EmployeeProfile['appRole']>(employee?.appRole ?? 'intern');
  const [phone,  setPhone]  = useState(employee?.phone ?? '');
  const [addr,   setAddr]   = useState(employee?.address ?? '');
  const [ecName, setEcName] = useState(employee?.emergencyContactName ?? '');
  const [ecPhone,setEcPhone]= useState(employee?.emergencyContactPhone ?? '');
  const [nameErr,setNameErr]= useState(false);

  const submit = () => {
    if (!name.trim()) { setNameErr(true); return; }
    const status: EmployeeProfile['status'] = employee?.status ?? 'active';
    onSave({
      id:        employee?.id ?? crypto.randomUUID(),
      name:      name.trim(),
      startDate: start,
      active:    status !== 'deactivated',
      email:     email.trim() || undefined,
      jobTitle:  title.trim() || undefined,
      department:dept.trim() || undefined,
      employmentType: empType,
      appRole,
      status,
      phone:     phone.trim() || undefined,
      address:   addr.trim() || undefined,
      emergencyContactName:  ecName.trim() || undefined,
      emergencyContactPhone: ecPhone.trim() || undefined,
      notes:     employee?.notes,
    });
  };

  const row2: React.CSSProperties = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 };
  const field = (label: string, node: React.ReactNode) => (
    <div><label style={lbl}>{label}</label>{node}</div>
  );

  return (
    <ModalShell title={isEdit ? `Edit — ${employee.name}` : 'Add Employee'} onClose={onClose} wide>
      <div style={{ display:'flex',flexDirection:'column',gap:0 }}>

        <div style={{ marginBottom:14, padding:'0 0 14px', borderBottom:'1px solid var(--border)', fontSize:11, fontWeight:700, color:'var(--text-tertiary)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Identity &amp; Employment</div>

        <div style={row2}>
          {field('Full name *',
            <><input autoFocus value={name} onChange={e=>{setName(e.target.value);setNameErr(false);}} style={inp(nameErr)} placeholder="e.g. Lebohang Noko"/>
            {nameErr && <p style={{margin:'3px 0 0',fontSize:11,color:'#ef4444'}}>Name is required</p>}</>
          )}
          {field('Email', <input value={email} onChange={e=>setEmail(e.target.value)} style={inp()} placeholder="e.g. lebo@company.com"/>)}
        </div>
        <div style={row2}>
          {field('Job title', <input value={title} onChange={e=>setTitle(e.target.value)} style={inp()} placeholder="e.g. Software Engineer"/>)}
          {field('Department', <input value={dept} onChange={e=>setDept(e.target.value)} style={inp()} placeholder="e.g. Engineering"/>)}
        </div>
        <div style={row2}>
          {field('Start date *', <input type="date" lang="en-ZA" value={start} onChange={e=>setStart(e.target.value)} style={inp()}/>)}
          {field('Employment type',
            <select value={empType} onChange={e=>setEmpType(e.target.value as EmployeeProfile['employmentType'])} style={sel()}>
              <option value="intern">Intern</option>
              <option value="full-time">Full-time</option>
              <option value="contractor">Contractor</option>
            </select>
          )}
        </div>
        {field('App login role',
          <select value={appRole} onChange={e=>setAppRole(e.target.value as EmployeeProfile['appRole'])} style={{ ...sel(), marginBottom:14 }}>
            <option value="intern">Intern — personal leave view only</option>
            <option value="manager">Manager — full access</option>
          </select>
        )}

        <div style={{ margin:'6px 0 14px', padding:'14px 0 0', borderTop:'1px solid var(--border)', fontSize:11, fontWeight:700, color:'var(--text-tertiary)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Contact &amp; Emergency</div>

        <div style={row2}>
          {field('Phone', <input value={phone} onChange={e=>setPhone(e.target.value)} style={inp()} placeholder="e.g. +27 82 000 0000"/>)}
          {field('Address', <input value={addr} onChange={e=>setAddr(e.target.value)} style={inp()} placeholder="e.g. 12 Main St, Joburg"/>)}
        </div>
        <div style={row2}>
          {field('Emergency contact name', <input value={ecName} onChange={e=>setEcName(e.target.value)} style={inp()} placeholder="e.g. Sarah Noko"/>)}
          {field('Emergency contact phone', <input value={ecPhone} onChange={e=>setEcPhone(e.target.value)} style={inp()} placeholder="e.g. +27 83 000 0000"/>)}
        </div>

        <div style={{ display:'flex',justifyContent:'flex-end',gap:10,marginTop:8,paddingTop:16,borderTop:'1px solid var(--border)' }}>
          <button onClick={onClose} style={{ padding:'8px 18px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--text-secondary)',fontSize:14,fontWeight:500,cursor:'pointer' }}>Cancel</button>
          <button onClick={submit} style={{ padding:'8px 24px',borderRadius:8,border:'none',background:'var(--accent)',color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer' }}>
            {isEdit ? 'Save Changes' : 'Add Employee'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Leave tab ──────────────────────────────────────────────────────────────────

function LeaveTab({ emp, leaveList, overtimeList }: { emp:EmployeeProfile; leaveList:LeaveEntry[]; overtimeList:OvertimeEntry[] }) {
  const rows      = buildMonthRows(emp.startDate);
  const accruals  = calcAccruals(rows);
  const used      = calcUsed(leaveList, emp.id);
  const empLeave  = [...leaveList.filter(e=>e.employeeId===emp.id)].sort((a,b)=>b.date.localeCompare(a.date));
  const empOT     = overtimeList.filter(e=>e.employeeId===emp.id);
  const totalOTH  = round2(empOT.reduce((s,o)=>s+o.hours,0));

  const Card = ({ label, accrued, used: u, max, color, note }: { label:string; accrued:number; used:number; max:number; color:string; note?:string }) => {
    const bal = round2(accrued-u);
    return (
      <div style={{ background:'var(--bg-block-hover)',borderRadius:10,padding:'14px 16px',flex:1,minWidth:0 }}>
        <div style={{ fontSize:10,fontWeight:700,color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8 }}>{label}</div>
        <div style={{ height:4,borderRadius:2,background:'var(--border)',marginBottom:10,overflow:'hidden' }}>
          <div style={{ height:'100%',width:`${Math.min((accrued/max)*100,100)}%`,background:color,borderRadius:2 }}/>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,textAlign:'center' }}>
          {[{l:'Accrued',v:accrued,c:color},{l:'Used',v:u,c:u>accrued?'#ef4444':'var(--text-secondary)'},{l:'Balance',v:bal,c:bal<0?'#ef4444':bal<2?'#f59e0b':'#10b981'}].map(x=>(
            <div key={x.l}><div style={{ fontSize:20,fontWeight:700,color:x.c,lineHeight:1 }}>{x.v}</div><div style={{ fontSize:10,color:'var(--text-tertiary)',marginTop:2 }}>{x.l}</div></div>
          ))}
        </div>
        {note && <div style={{ marginTop:8,fontSize:10,color:'var(--text-tertiary)',borderTop:'1px solid var(--border)',paddingTop:6 }}>· {note}</div>}
      </div>
    );
  };

  const TC: React.CSSProperties = { padding:'8px 12px', borderBottom:'1px solid var(--border)', fontSize:12, color:'var(--text-primary)', verticalAlign:'top' };

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
      {/* Summary */}
      <div style={{ display:'flex',gap:10,flexWrap:'wrap' }}>
        <Card label="Annual Leave" accrued={accruals.annual} used={used.annual} max={ANNUAL_MAX} color="#4a9eff"/>
        <Card label="Sick Leave" accrued={accruals.sick} used={used.sick} max={SICK_MAX} color="#f59e0b" note="Usable from month 3"/>
        <Card label="Family Resp." accrued={FAMILY_TOTAL} used={used.family} max={FAMILY_TOTAL} color="#10b981"/>
      </div>

      {/* Overtime summary chip */}
      {totalOTH > 0 && (
        <div style={{ display:'inline-flex',alignItems:'center',gap:8,padding:'6px 12px',borderRadius:8,background:'rgba(74,158,255,0.08)',border:'1px solid rgba(74,158,255,0.2)',fontSize:12,color:'var(--text-secondary)' }}>
          <Clock size={12} style={{ color:'var(--accent)' }}/>
          <strong style={{ color:'var(--accent)' }}>{totalOTH} h</strong> overtime ({round2(totalOTH/HOURS_PER_DAY)} days)
        </div>
      )}

      {/* Leave history */}
      <div style={{ background:'var(--bg-editor)',border:'1px solid var(--border)',borderRadius:10,overflow:'hidden' }}>
        <div style={{ padding:'10px 14px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:8 }}>
          <Activity size={13} style={{ color:'var(--text-tertiary)' }}/>
          <span style={{ fontSize:13,fontWeight:700,color:'var(--text-primary)' }}>Leave History</span>
          <span style={{ marginLeft:'auto',fontSize:11,color:'var(--text-tertiary)' }}>{empLeave.length} entries</span>
        </div>
        {empLeave.length === 0 ? (
          <div style={{ padding:'16px',fontSize:12,color:'var(--text-tertiary)',textAlign:'center' }}>No leave recorded yet.</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse',minWidth:400 }}>
              <thead>
                <tr style={{ background:'var(--bg-block-hover)' }}>
                  {['Date','Days','Type','Reason'].map(h=>(
                    <th key={h} style={{ ...TC,fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',color:'var(--text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {empLeave.slice(0,20).map(entry=>(
                  <tr key={entry.id}>
                    <td style={{ ...TC,whiteSpace:'nowrap',color:'var(--text-secondary)' }}>{fmtDate(entry.date)}</td>
                    <td style={{ ...TC,fontWeight:600 }}>{entry.days}d</td>
                    <td style={TC}>
                      <span style={{ display:'inline-flex',alignItems:'center',gap:4,padding:'1px 7px',borderRadius:10,background:`${LEAVE_COLORS[entry.type]}18`,color:LEAVE_COLORS[entry.type],fontSize:11,fontWeight:600,textTransform:'capitalize' }}>
                        <span style={{ width:5,height:5,borderRadius:'50%',background:LEAVE_COLORS[entry.type],display:'inline-block' }}/>
                        {entry.type}
                      </span>
                    </td>
                    <td style={{ ...TC,color:'var(--text-secondary)' }}>{entry.reason||'—'}</td>
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

// ── Main view ──────────────────────────────────────────────────────────────────

export function EmployeeProfilesView() {
  const [employees, setEmployees] = useState<EmployeeProfile[]>(() => load(SK_EMPLOYEES, []));
  const [leaveList]   = useState<LeaveEntry[]>(()   => load(SK_LEAVE,    []));
  const [overtimeList]= useState<OvertimeEntry[]>(()=> load(SK_OVERTIME, []));

  const [selectedId, setSelectedId]   = useState<string | null>(() => load<EmployeeProfile[]>(SK_EMPLOYEES, [])[0]?.id ?? null);
  const [tab, setTab]                 = useState<ProfileTab>('overview');
  const [search, setSearch]           = useState('');
  const [showAdd,  setShowAdd]        = useState(false);
  const [editEmp,  setEditEmp]        = useState<EmployeeProfile | null>(null);
  const [menuOpen, setMenuOpen]       = useState(false);
  const [notes, setNotes]             = useState('');

  const saveEmployees = useCallback((next: EmployeeProfile[]) => {
    setEmployees(next);
    persist(SK_EMPLOYEES, next);
  }, []);

  const handleSave = useCallback((profile: EmployeeProfile) => {
    setEmployees(prev => {
      const exists = prev.find(e=>e.id===profile.id);
      const next   = exists ? prev.map(e=>e.id===profile.id?profile:e) : [...prev, profile];
      persist(SK_EMPLOYEES, next);
      return next;
    });
    setSelectedId(profile.id);
    setShowAdd(false);
    setEditEmp(null);
  }, []);

  const handleRemove = (id: string) => {
    if (!window.confirm('Permanently delete this employee and all their records from profiles? Leave Tracker data is kept.')) return;
    const next = employees.filter(e=>e.id!==id);
    saveEmployees(next);
    setSelectedId(next[0]?.id ?? null);
    setMenuOpen(false);
  };

  const handleStatusChange = (id: string, status: EmployeeProfile['status']) => {
    const next = employees.map(e=>e.id===id ? { ...e, status, active: status!=='deactivated' } : e);
    saveEmployees(next);
    setMenuOpen(false);
  };

  const handleNotesBlur = () => {
    const next = employees.map(e=>e.id===selected?.id ? { ...e, notes } : e);
    saveEmployees(next);
  };

  const filtered   = employees.filter(e=>e.name.toLowerCase().includes(search.toLowerCase().trim()));
  const selected   = employees.find(e=>e.id===selectedId) ?? null;
  const isDeactivated = selected?.status === 'deactivated';

  // Sync notes field when selection changes
  React.useEffect(() => { setNotes(selected?.notes ?? ''); setTab('overview'); }, [selectedId]);

  const tabStyle = (t: ProfileTab): React.CSSProperties => ({
    padding:'6px 14px', borderRadius:7, border:'none', cursor:'pointer', fontSize:13,
    fontWeight: tab===t ? 600 : 400,
    background: tab===t ? 'var(--bg-block-hover)' : 'transparent',
    color: tab===t ? 'var(--text-primary)' : 'var(--text-tertiary)',
  });

  const InfoRow = ({ icon, label, value }: { icon:React.ReactNode; label:string; value?:string }) => (
    value ? (
      <div style={{ display:'flex',alignItems:'flex-start',gap:10,padding:'10px 0',borderBottom:'1px solid var(--border)' }}>
        <span style={{ color:'var(--text-tertiary)',display:'flex',marginTop:1,flexShrink:0 }}>{icon}</span>
        <div>
          <div style={{ fontSize:11,fontWeight:700,color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:2 }}>{label}</div>
          <div style={{ fontSize:14,color:'var(--text-primary)' }}>{value}</div>
        </div>
      </div>
    ) : null
  );

  return (
    <div style={{ display:'flex',flex:1,overflow:'hidden',background:'var(--bg-app)',fontFamily:FONT }}>

      {/* ── Left panel: employee list ──────────────────────────────────── */}
      <div style={{ width:260,flexShrink:0,display:'flex',flexDirection:'column',borderRight:'1px solid var(--border)',background:'var(--bg-sidebar)',overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:'14px 14px 10px',flexShrink:0 }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
            <span style={{ fontSize:13,fontWeight:700,color:'var(--text-primary)' }}>Employees <span style={{ fontWeight:400,color:'var(--text-tertiary)' }}>({employees.length})</span></span>
            <button onClick={()=>setShowAdd(true)} style={{ display:'flex',alignItems:'center',gap:4,padding:'4px 9px',borderRadius:7,border:'1px dashed var(--border)',background:'transparent',color:'var(--text-tertiary)',fontSize:12,cursor:'pointer' }}>
              <Plus size={11}/> Add
            </button>
          </div>
          <input
            value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search employees…"
            style={{ width:'100%',boxSizing:'border-box',padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg-block-hover)',color:'var(--text-primary)',fontSize:12,outline:'none' }}
          />
        </div>

        {/* List */}
        <div style={{ flex:1,overflowY:'auto',padding:'4px 8px 12px' }}>
          {filtered.length === 0 && (
            <div style={{ padding:'24px 8px',textAlign:'center',fontSize:12,color:'var(--text-tertiary)',fontStyle:'italic' }}>
              {search ? 'No match' : 'No employees yet.'}
            </div>
          )}
          {filtered.map(emp => {
            const isActive = selectedId === emp.id;
            return (
              <button key={emp.id} onClick={()=>setSelectedId(emp.id)} style={{ display:'flex',alignItems:'center',gap:10,width:'100%',padding:'9px 10px',borderRadius:9,border:'none',cursor:'pointer',textAlign:'left',background: isActive ? 'var(--bg-block-hover)' : 'transparent',marginBottom:2 }}>
                <AvatarCircle name={emp.name} id={emp.id} size={34}/>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:13,fontWeight:isActive?600:400,color: emp.status==='deactivated' ? 'var(--text-tertiary)' : 'var(--text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{emp.name}</div>
                  <div style={{ fontSize:11,color:'var(--text-tertiary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginTop:1 }}>{emp.jobTitle || emp.employmentType || 'Employee'}</div>
                </div>
                {emp.status && emp.status !== 'active' && (
                  <span style={{ fontSize:9,fontWeight:700,padding:'1px 5px',borderRadius:6,background: emp.status==='on-leave'?'rgba(245,158,11,0.15)':'rgba(239,68,68,0.12)',color: emp.status==='on-leave'?'#f59e0b':'#ef4444',flexShrink:0 }}>
                    {emp.status==='on-leave'?'LEAVE':'OFF'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right panel: profile detail ────────────────────────────────── */}
      {selected ? (
        <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>

          {/* Profile header */}
          <div style={{ padding:'20px 24px 0',flexShrink:0,borderBottom:'1px solid var(--border)',background:'var(--bg-editor)' }}>
            <div style={{ display:'flex',alignItems:'flex-start',gap:16,marginBottom:16 }}>
              <AvatarCircle name={selected.name} id={selected.id} size={56}/>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:4 }}>
                  <h2 style={{ margin:0,fontSize:20,fontWeight:700,color: isDeactivated?'var(--text-tertiary)':'var(--text-primary)' }}>{selected.name}</h2>
                  <StatusBadge status={selected.status}/>
                </div>
                <div style={{ fontSize:13,color:'var(--text-secondary)' }}>
                  {[selected.jobTitle, selected.department].filter(Boolean).join(' · ') || 'No title set'}
                </div>
                {selected.email && (
                  <div style={{ display:'flex',alignItems:'center',gap:5,marginTop:4,fontSize:12,color:'var(--text-tertiary)' }}>
                    <Mail size={11}/>{selected.email}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display:'flex',gap:8,flexShrink:0,alignItems:'center' }}>
                <button onClick={()=>setEditEmp(selected)} style={{ display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--text-secondary)',fontSize:12,cursor:'pointer' }}>
                  <Edit2 size={12}/> Edit
                </button>
                <div style={{ position:'relative' }}>
                  <button onClick={()=>setMenuOpen(v=>!v)} style={{ display:'flex',alignItems:'center',gap:3,padding:'6px 10px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--text-secondary)',fontSize:12,cursor:'pointer' }}>
                    More <ChevronDown size={11}/>
                  </button>
                  {menuOpen && (
                    <div onMouseLeave={()=>setMenuOpen(false)} style={{ position:'absolute',right:0,top:'calc(100% + 4px)',zIndex:200,background:'var(--bg-editor)',border:'1px solid var(--border)',borderRadius:10,padding:4,minWidth:190,boxShadow:'0 8px 24px rgba(0,0,0,0.3)' }}>
                      {selected.status !== 'on-leave' && selected.status !== 'deactivated' && (
                        <MenuItem label="Mark as On Leave" color="#f59e0b" onClick={()=>handleStatusChange(selected.id,'on-leave')}/>
                      )}
                      {selected.status === 'on-leave' && (
                        <MenuItem label="Mark as Active" color="#10b981" onClick={()=>handleStatusChange(selected.id,'active')}/>
                      )}
                      {selected.status !== 'deactivated' ? (
                        <MenuItem label="Deactivate" color="#f59e0b" onClick={()=>{ if (window.confirm(`Deactivate ${selected.name}?`)) handleStatusChange(selected.id,'deactivated'); }}/>
                      ) : (
                        <MenuItem label="Reactivate" color="#10b981" onClick={()=>handleStatusChange(selected.id,'active')}/>
                      )}
                      <div style={{ height:1,background:'var(--border)',margin:'4px 0' }}/>
                      <MenuItem label="Delete employee" color="#ef4444" icon={<Trash2 size={12}/>} onClick={()=>handleRemove(selected.id)}/>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tab bar */}
            <div style={{ display:'flex',gap:2,marginBottom:0 }}>
              {(['overview','leave','contact','notes','documents'] as ProfileTab[]).map(t=>(
                <button key={t} onClick={()=>setTab(t)} style={tabStyle(t)}>
                  {t.charAt(0).toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div style={{ flex:1,overflowY:'auto',padding:'20px 24px' }}>

            {tab === 'overview' && (
              <div style={{ maxWidth:600 }}>
                <InfoRow icon={<Mail size={14}/>}          label="Email"           value={selected.email}/>
                <InfoRow icon={<CalendarCheck size={14}/>} label="Start date"      value={selected.startDate ? fmtDate(selected.startDate) : undefined}/>
                <InfoRow icon={<Users size={14}/>}         label="Employment type" value={selected.employmentType ? { intern:'Intern', 'full-time':'Full-time', contractor:'Contractor' }[selected.employmentType] : undefined}/>
                <InfoRow icon={<Users size={14}/>}         label="App role"        value={selected.appRole ? { manager:'Manager', intern:'Intern' }[selected.appRole] : undefined}/>
                <InfoRow icon={<Activity size={14}/>}      label="Department"      value={selected.department}/>

                {selected.startDate && (() => {
                  const months = buildMonthRows(selected.startDate).length;
                  return (
                    <div style={{ marginTop:14,padding:'12px 16px',borderRadius:9,background:'var(--bg-block-hover)',fontSize:13,color:'var(--text-secondary)' }}>
                      <strong style={{ color:'var(--text-primary)' }}>{months}</strong> month{months!==1?'s':''} employed
                    </div>
                  );
                })()}

                {!selected.email && !selected.jobTitle && !selected.department && (
                  <div style={{ marginTop:16,padding:'16px',borderRadius:9,border:'1px dashed var(--border)',textAlign:'center',fontSize:13,color:'var(--text-tertiary)' }}>
                    Fill in more details by clicking <strong>Edit</strong> above.
                  </div>
                )}
              </div>
            )}

            {tab === 'leave' && (
              <LeaveTab emp={selected} leaveList={leaveList} overtimeList={overtimeList}/>
            )}

            {tab === 'contact' && (
              <div style={{ maxWidth:600 }}>
                <div style={{ marginBottom:18 }}>
                  <div style={{ fontSize:12,fontWeight:700,color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10 }}>Contact</div>
                  <InfoRow icon={<Phone size={14}/>}   label="Phone"   value={selected.phone}/>
                  <InfoRow icon={<MapPin size={14}/>}  label="Address" value={selected.address}/>
                  {!selected.phone && !selected.address && (
                    <div style={{ padding:'14px',borderRadius:9,border:'1px dashed var(--border)',textAlign:'center',fontSize:13,color:'var(--text-tertiary)' }}>No contact info — click Edit to add.</div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize:12,fontWeight:700,color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10,marginTop:8,paddingTop:12,borderTop:'1px solid var(--border)' }}>Emergency Contact</div>
                  <InfoRow icon={<Users size={14}/>} label="Name"  value={selected.emergencyContactName}/>
                  <InfoRow icon={<Phone size={14}/>} label="Phone" value={selected.emergencyContactPhone}/>
                  {!selected.emergencyContactName && !selected.emergencyContactPhone && (
                    <div style={{ padding:'14px',borderRadius:9,border:'1px dashed var(--border)',textAlign:'center',fontSize:13,color:'var(--text-tertiary)' }}>No emergency contact — click Edit to add.</div>
                  )}
                </div>
              </div>
            )}

            {tab === 'notes' && (
              <div style={{ maxWidth:640 }}>
                <div style={{ fontSize:11,fontWeight:700,color:'var(--text-tertiary)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8 }}>Manager notes</div>
                <textarea
                  value={notes}
                  onChange={e=>setNotes(e.target.value)}
                  onBlur={handleNotesBlur}
                  placeholder="Performance notes, conversations, reminders… Visible to managers only. Auto-saved on blur."
                  style={{ width:'100%',boxSizing:'border-box',minHeight:260,padding:'12px 14px',borderRadius:10,border:'1px solid var(--border)',background:'var(--bg-block-hover)',color:'var(--text-primary)',fontSize:14,outline:'none',resize:'vertical',fontFamily:FONT,lineHeight:1.6 }}
                />
                <div style={{ marginTop:6,fontSize:11,color:'var(--text-tertiary)' }}>Saved automatically when you click away.</div>
              </div>
            )}

            {tab === 'documents' && (
              <div style={{ maxWidth:560,display:'flex',flexDirection:'column',alignItems:'center',gap:16,paddingTop:40 }}>
                <div style={{ width:56,height:56,borderRadius:14,background:'rgba(239,68,68,0.08)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <FileX size={26} style={{ color:'#ef4444',opacity:0.6 }}/>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:15,fontWeight:700,color:'var(--text-primary)',marginBottom:8 }}>Employee Documents — Deferred</div>
                  <div style={{ fontSize:13,color:'var(--text-secondary)',lineHeight:1.7,maxWidth:420 }}>
                    File uploads (contracts, NDAs, ID copies, signed policies) are <strong>explicitly not built yet</strong>.
                    This feature requires encrypted-at-rest storage, signed download URLs, access logging, and
                    per-document permissions — none of which exist in the current stack.
                  </div>
                </div>
                <div style={{ padding:'12px 16px',borderRadius:9,border:'1px solid rgba(245,158,11,0.3)',background:'rgba(245,158,11,0.06)',fontSize:12,color:'var(--text-secondary)',lineHeight:1.7 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:4 }}><AlertTriangle size={12} style={{ color:'#f59e0b',flexShrink:0 }}/><strong style={{ color:'var(--text-primary)' }}>Gating conditions (all three required):</strong></div>
                  <ol style={{ margin:'0 0 0 16px',padding:0 }}>
                    <li>A paying client has specifically requested it.</li>
                    <li>Phase 7 (multi-tenancy) has shipped — per-org isolation &amp; RLS must be in place first.</li>
                    <li>Phase 8 bulk file storage path has shipped — document storage rides those same primitives.</li>
                  </ol>
                </div>
                <div style={{ fontSize:11,color:'var(--text-tertiary)' }}>See <code>docs/BUILD_PLAN.md → Deferred → Employee Documents</code> for full details.</div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty state */
        <div style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16 }}>
          <Users size={48} style={{ color:'var(--text-tertiary)',opacity:0.3 }}/>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:15,fontWeight:600,color:'var(--text-primary)',marginBottom:6 }}>No employee selected</div>
            <div style={{ fontSize:13,color:'var(--text-tertiary)' }}>
              {employees.length===0 ? 'Add your first employee to get started.' : 'Select an employee from the list.'}
            </div>
          </div>
          {employees.length===0 && (
            <button onClick={()=>setShowAdd(true)} style={{ padding:'8px 20px',borderRadius:8,border:'none',background:'var(--accent)',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer' }}>
              Add First Employee
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      {showAdd   && <AddEditModal onSave={handleSave} onClose={()=>setShowAdd(false)}/>}
      {editEmp   && <AddEditModal employee={editEmp} onSave={handleSave} onClose={()=>setEditEmp(null)}/>}
    </div>
  );
}

// ── Menu item helper ───────────────────────────────────────────────────────────

function MenuItem({ label, color, icon, onClick }: { label:string; color:string; icon?:React.ReactNode; onClick:()=>void }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ display:'flex',alignItems:'center',gap:8,width:'100%',padding:'7px 12px',background:hov?'var(--bg-block-hover)':'none',border:'none',color,fontSize:12,cursor:'pointer',borderRadius:7,textAlign:'left' }}>
      {icon}{label}
    </button>
  );
}
