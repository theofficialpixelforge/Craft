import React, { useState } from 'react';

export type Role = 'manager' | 'intern';

interface Employee { id: string; name: string; active?: boolean; password?: string; }

interface Props {
  firstName: string;
  onContinue: (role: Role, employeeId?: string) => void;
}

const FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif';
const MANAGER_PW_KEY = 'craft_manager_password';

const ROLES: { key: Role; label: string; desc: string; icon: string }[] = [
  { key: 'manager', label: 'Manager', icon: '🏢', desc: 'Full access — manage employees, view all leave, updates & reports.' },
  { key: 'intern',  label: 'Intern',  icon: '🎓', desc: 'View your leave balance, submit daily updates & monthly reports.' },
];

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

const bg = {
  wrapper: {
    position: 'fixed' as const, inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f1035 0%, #1a1550 35%, #2d1b69 65%, #1a1040 100%)',
    fontFamily: FONT, overflow: 'hidden', zIndex: 9999,
  },
  card: {
    position: 'relative' as const, width: '100%', maxWidth: 520, margin: '1rem',
    background: 'rgba(22,25,50,0.92)', borderRadius: 20, padding: '2.5rem 2.25rem 2rem',
    boxShadow: '0 25px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
    backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.06)',
  },
};

export function RolePage({ firstName, onContinue }: Props) {
  const [role,       setRole]       = useState<Role | null>(null);
  const [employeeId, setEmployeeId] = useState('');
  const [phase,      setPhase]      = useState<'select' | 'password'>('select');
  const [password,   setPassword]   = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [showConfirm,setShowConfirm]= useState(false);
  const [pwError,    setPwError]    = useState('');

  const employees: Employee[] = (() => {
    try {
      const all: Employee[] = JSON.parse(localStorage.getItem('leave_employees') ?? '[]') ?? [];
      return all.filter(e => e.active !== false);
    } catch { return []; }
  })();

  const needsPicker  = role === 'intern';
  const canProceed   = role !== null && (!needsPicker || employeeId !== '');

  const storedPassword = (): string | null => {
    if (role === 'manager') return localStorage.getItem(MANAGER_PW_KEY);
    const emp = employees.find(e => e.id === employeeId);
    return emp?.password ?? null;
  };

  const isFirstTime = phase === 'password' && storedPassword() === null;

  const handleRoleNext = () => {
    if (!canProceed) return;
    setPhase('password');
    setPassword('');
    setConfirmPw('');
    setPwError('');
    setShowPw(false);
    setShowConfirm(false);
  };

  const handleBack = () => {
    setPhase('select');
    setPwError('');
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const stored = storedPassword();

    if (stored === null) {
      // First-time: create password
      if (password.length < 4) { setPwError('Password must be at least 4 characters.'); return; }
      if (password !== confirmPw) { setPwError('Passwords do not match.'); return; }
      if (role === 'manager') {
        localStorage.setItem(MANAGER_PW_KEY, password);
      } else {
        const all: Employee[] = JSON.parse(localStorage.getItem('leave_employees') ?? '[]');
        localStorage.setItem('leave_employees', JSON.stringify(
          all.map(emp => emp.id === employeeId ? { ...emp, password } : emp)
        ));
      }
      onContinue(role!, needsPicker ? employeeId : undefined);
    } else {
      // Returning: verify
      if (password !== stored) { setPwError('Incorrect password. Try again.'); return; }
      onContinue(role!, needsPicker ? employeeId : undefined);
    }
  };

  const selectedEmp = employees.find(e => e.id === employeeId);

  const Stars = () => (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {Array.from({ length: 60 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${(i * 17.3) % 100}%`, top: `${(i * 13.7) % 100}%`,
          width: `${(i % 3) + 1}px`, height: `${(i % 3) + 1}px`,
          background: 'white', borderRadius: '50%',
          opacity: 0.1 + (i % 7) * 0.08,
        }}/>
      ))}
    </div>
  );

  const inputStyle = (err = false): React.CSSProperties => ({
    width: '100%', boxSizing: 'border-box' as const,
    padding: '11px 40px 11px 14px', borderRadius: 10,
    border: `1.5px solid ${err ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
    background: 'rgba(255,255,255,0.05)', color: '#fff',
    fontSize: 15, outline: 'none', fontFamily: FONT,
  });

  // ── Password phase ──────────────────────────────────────────────────────────

  if (phase === 'password') {
    const label = isFirstTime ? 'Create a password' : 'Enter your password';
    const sub   = isFirstTime
      ? `Set a password for your ${role} account${selectedEmp ? ` (${selectedEmp.name})` : ''}.`
      : `Welcome back${selectedEmp ? `, ${selectedEmp.name}` : ''}. Enter your password to continue.`;

    return (
      <div style={bg.wrapper}>
        <Stars/>
        <div style={{ position:'absolute',width:500,height:500,left:-150,bottom:-100,borderRadius:'50%',background:'radial-gradient(circle,rgba(88,56,200,0.35) 0%,transparent 70%)',filter:'blur(80px)',pointerEvents:'none' }}/>
        <div style={{ position:'absolute',width:400,height:400,right:-100,top:'50%',transform:'translateY(-50%)',borderRadius:'50%',background:'radial-gradient(circle,rgba(60,80,200,0.25) 0%,transparent 70%)',filter:'blur(80px)',pointerEvents:'none' }}/>

        <div style={bg.card}>
          {/* Logo */}
          <div style={{ display:'flex',justifyContent:'center',marginBottom:20 }}>
            <div style={{ width:52,height:52,borderRadius:13,background:'linear-gradient(135deg,#5B6CF0,#8B5CF6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22 }}>
              🔒
            </div>
          </div>

          <h1 style={{ fontSize:'1.5rem',fontWeight:700,color:'#fff',margin:'0 0 0.35rem',textAlign:'center',letterSpacing:'-0.02em' }}>
            {label}
          </h1>
          <p style={{ fontSize:'0.88rem',color:'#9899b3',textAlign:'center',margin:'0 0 1.75rem',lineHeight:1.5 }}>
            {sub}
          </p>

          <form onSubmit={handlePasswordSubmit} style={{ display:'flex',flexDirection:'column',gap:14 }}>
            {/* Password field */}
            <div style={{ position:'relative' }}>
              <input
                autoFocus
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setPwError(''); }}
                placeholder={isFirstTime ? 'New password (min 4 characters)' : 'Your password'}
                style={inputStyle(!!pwError)}
              />
              <button type="button" onClick={() => setShowPw(v=>!v)}
                style={{ position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'#6a6b8a',cursor:'pointer',display:'flex',padding:2 }}>
                <EyeIcon open={showPw}/>
              </button>
            </div>

            {/* Confirm field (first-time only) */}
            {isFirstTime && (
              <div style={{ position:'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={e => { setConfirmPw(e.target.value); setPwError(''); }}
                  placeholder="Confirm password"
                  style={inputStyle(!!pwError && password !== confirmPw)}
                />
                <button type="button" onClick={() => setShowConfirm(v=>!v)}
                  style={{ position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'#6a6b8a',cursor:'pointer',display:'flex',padding:2 }}>
                  <EyeIcon open={showConfirm}/>
                </button>
              </div>
            )}

            {/* Error */}
            {pwError && (
              <div style={{ padding:'8px 12px',borderRadius:8,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.25)',color:'#f87171',fontSize:13 }}>
                {pwError}
              </div>
            )}

            <button type="submit" style={{
              width:'100%',padding:'0.8rem 1rem',borderRadius:10,border:'none',marginTop:2,
              background:'linear-gradient(135deg,#5B6CF0,#8B5CF6)',
              color:'#fff',fontSize:'0.95rem',fontWeight:600,cursor:'pointer',
            }}>
              {isFirstTime ? 'Set Password & Continue' : 'Continue →'}
            </button>
          </form>

          <button onClick={handleBack}
            style={{ display:'block',width:'100%',marginTop:14,background:'none',border:'none',color:'#6a6b8a',fontSize:13,cursor:'pointer',textAlign:'center' }}>
            ← Back to role selection
          </button>
        </div>
      </div>
    );
  }

  // ── Role selection phase ────────────────────────────────────────────────────

  return (
    <div style={bg.wrapper}>
      <Stars/>
      <div style={{ position:'absolute',width:500,height:500,left:-150,bottom:-100,borderRadius:'50%',background:'radial-gradient(circle,rgba(88,56,200,0.35) 0%,transparent 70%)',filter:'blur(80px)',pointerEvents:'none' }}/>
      <div style={{ position:'absolute',width:400,height:400,right:-100,top:'50%',transform:'translateY(-50%)',borderRadius:'50%',background:'radial-gradient(circle,rgba(60,80,200,0.25) 0%,transparent 70%)',filter:'blur(80px)',pointerEvents:'none' }}/>

      <div style={bg.card}>
        {/* Logo */}
        <div style={{ display:'flex',justifyContent:'center',marginBottom:20 }}>
          <div style={{ width:52,height:52,borderRadius:13,background:'linear-gradient(135deg,#5B6CF0,#8B5CF6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22 }}>
            🗂️
          </div>
        </div>

        <h1 style={{ fontSize:'1.6rem',fontWeight:700,color:'#fff',margin:'0 0 0.4rem',textAlign:'center',letterSpacing:'-0.02em' }}>
          Hi {firstName}, what's your role?
        </h1>
        <p style={{ fontSize:'0.88rem',color:'#9899b3',textAlign:'center',margin:'0 0 1.75rem',lineHeight:1.5 }}>
          Choose how you'll use this workspace
        </p>

        {/* Role cards */}
        <div style={{ display:'flex',flexDirection:'column',gap:10,marginBottom:20 }}>
          {ROLES.map(r => (
            <button key={r.key} onClick={() => { setRole(r.key); setEmployeeId(''); }}
              style={{
                display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderRadius:12,
                border:`1.5px solid ${role===r.key ? 'rgba(120,130,255,0.6)' : 'rgba(255,255,255,0.08)'}`,
                background:role===r.key ? 'rgba(90,100,220,0.18)' : 'rgba(255,255,255,0.03)',
                cursor:'pointer',textAlign:'left',transition:'all 0.15s',
              }}>
              <span style={{ fontSize:28,flexShrink:0 }}>{r.icon}</span>
              <div>
                <div style={{ fontSize:15,fontWeight:600,color:role===r.key?'#c0c8ff':'#d0d4e8',marginBottom:3 }}>{r.label}</div>
                <div style={{ fontSize:12,color:'#6a6b8a',lineHeight:1.4 }}>{r.desc}</div>
              </div>
              {role===r.key && (
                <div style={{ marginLeft:'auto',width:20,height:20,borderRadius:'50%',background:'rgba(120,130,255,0.8)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                  <svg width="11" height="8" viewBox="0 0 11 8" fill="none"><path d="M1 3.5L4.5 7L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Employee picker */}
        {needsPicker && (
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:12,fontWeight:600,color:'#9899b3',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8 }}>
              Select your profile
            </div>
            {employees.length === 0 ? (
              <div style={{ padding:'14px 16px',borderRadius:10,border:'1px solid rgba(245,158,11,0.25)',background:'rgba(245,158,11,0.06)',color:'#f59e0b',fontSize:13,lineHeight:1.5 }}>
                ⚠️ No employees have been added yet. Ask your manager to add you in the Leave Tracker first, then come back and sign in.
              </div>
            ) : (
              <select value={employeeId} onChange={e => setEmployeeId(e.target.value)}
                style={{
                  width:'100%',padding:'10px 14px',borderRadius:10,
                  border:`1.5px solid ${employeeId ? 'rgba(120,130,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  background:'rgba(255,255,255,0.05)',color:employeeId?'#ffffff':'#5a5b7a',
                  fontSize:14,outline:'none',cursor:'pointer',appearance:'none',
                  backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%235a5b7a' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat:'no-repeat',backgroundPosition:'right 14px center',paddingRight:36,
                }}>
                <option value="" style={{ background:'#1a1a3a' }}>— Select your name —</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id} style={{ background:'#1a1a3a' }}>{e.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        <button onClick={handleRoleNext} disabled={!canProceed}
          style={{
            width:'100%',padding:'0.8rem 1rem',borderRadius:10,border:'none',
            background:canProceed ? 'linear-gradient(135deg,#5B6CF0,#8B5CF6)' : '#4a567a',
            color:canProceed?'#fff':'#9899b3',
            fontSize:'0.95rem',fontWeight:600,cursor:canProceed?'pointer':'not-allowed',
            transition:'all 0.2s',
          }}>
          Continue →
        </button>
      </div>
    </div>
  );
}
