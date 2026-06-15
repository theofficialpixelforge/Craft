import React, { useState } from 'react';

export type Role = 'manager' | 'intern';

interface Employee { id: string; name: string; active?: boolean; }

interface Props {
  firstName: string;
  onContinue: (role: Role, employeeId?: string) => void;
}

const FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif';

const ROLES: { key: Role; label: string; desc: string; icon: string }[] = [
  { key: 'manager',  label: 'Manager',  icon: '🏢', desc: 'Full access — manage employees, view all leave, updates & reports.' },
  { key: 'intern',   label: 'Intern',   icon: '🎓', desc: 'View your leave balance, submit daily updates & monthly reports.' },
];

export function RolePage({ firstName, onContinue }: Props) {
  const [role, setRole] = useState<Role | null>(null);
  const [employeeId, setEmployeeId] = useState('');

  const employees: Employee[] = (() => {
    try {
      const all: Employee[] = JSON.parse(localStorage.getItem('leave_employees') ?? '[]') ?? [];
      return all.filter(e => e.active !== false);
    }
    catch { return []; }
  })();

  const needsPicker = role === 'intern';
  const canContinue = role !== null && (!needsPicker || employeeId !== '');

  const handleContinue = () => {
    if (!role || !canContinue) return;
    onContinue(role, needsPicker ? employeeId : undefined);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f1035 0%, #1a1550 35%, #2d1b69 65%, #1a1040 100%)',
      fontFamily: FONT, overflow: 'hidden', zIndex: 9999,
    }}>
      {/* Stars */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {Array.from({ length: 60 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${(i * 17.3) % 100}%`, top: `${(i * 13.7) % 100}%`,
            width: `${(i % 3) + 1}px`, height: `${(i % 3) + 1}px`,
            background: 'white', borderRadius: '50%',
            opacity: 0.1 + (i % 7) * 0.08,
          }} />
        ))}
      </div>

      {/* Glow orbs */}
      <div style={{ position: 'absolute', width: 500, height: 500, left: -150, bottom: -100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(88,56,200,0.35) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 400, height: 400, right: -100, top: '50%', transform: 'translateY(-50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(60,80,200,0.25) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />

      {/* Card */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: 520, margin: '1rem',
        background: 'rgba(22,25,50,0.92)', borderRadius: 20, padding: '2.5rem 2.25rem 2rem',
        boxShadow: '0 25px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 13, background: 'linear-gradient(135deg,#5B6CF0,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
            🗂️
          </div>
        </div>

        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', margin: '0 0 0.4rem', textAlign: 'center', letterSpacing: '-0.02em' }}>
          Hi {firstName}, what's your role?
        </h1>
        <p style={{ fontSize: '0.88rem', color: '#9899b3', textAlign: 'center', margin: '0 0 1.75rem', lineHeight: 1.5 }}>
          Choose how you'll use this workspace
        </p>

        {/* Role cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {ROLES.map(r => (
            <button
              key={r.key}
              onClick={() => { setRole(r.key); setEmployeeId(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12,
                border: `1.5px solid ${role === r.key ? 'rgba(120,130,255,0.6)' : 'rgba(255,255,255,0.08)'}`,
                background: role === r.key ? 'rgba(90,100,220,0.18)' : 'rgba(255,255,255,0.03)',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 28, flexShrink: 0 }}>{r.icon}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: role === r.key ? '#c0c8ff' : '#d0d4e8', marginBottom: 3 }}>{r.label}</div>
                <div style={{ fontSize: 12, color: '#6a6b8a', lineHeight: 1.4 }}>{r.desc}</div>
              </div>
              {role === r.key && (
                <div style={{ marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%', background: 'rgba(120,130,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="11" height="8" viewBox="0 0 11 8" fill="none"><path d="M1 3.5L4.5 7L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Employee picker */}
        {needsPicker && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#9899b3', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Select your profile
            </div>
            {employees.length === 0 ? (
              <div style={{ padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.06)', color: '#f59e0b', fontSize: 13, lineHeight: 1.5 }}>
                ⚠️ No employees have been added yet. Ask your manager to add you in the Leave Tracker first, then come back and sign in.
              </div>
            ) : (
              <select
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${employeeId ? 'rgba(120,130,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  background: 'rgba(255,255,255,0.05)', color: employeeId ? '#ffffff' : '#5a5b7a',
                  fontSize: 14, outline: 'none', cursor: 'pointer', appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%235a5b7a' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
                  paddingRight: 36,
                }}
              >
                <option value="" style={{ background: '#1a1a3a' }}>— Select your name —</option>
                {employees.map((e: Employee) => (
                  <option key={e.id} value={e.id} style={{ background: '#1a1a3a' }}>{e.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Continue button */}
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          style={{
            width: '100%', padding: '0.8rem 1rem', borderRadius: 10, border: 'none',
            background: canContinue ? 'linear-gradient(135deg,#5B6CF0,#8B5CF6)' : '#4a567a',
            color: canContinue ? '#fff' : '#9899b3',
            fontSize: '0.95rem', fontWeight: 600, cursor: canContinue ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
