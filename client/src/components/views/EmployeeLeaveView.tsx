/**
 * Employee's personal leave view — read-only.
 * Shows their accrued/used/balance for Annual, Sick, Family leave
 * plus a month-by-month history table.
 */

import React from 'react';
import { ClipboardList } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Employee { id: string; name: string; startDate: string; }
type LeaveType = 'annual' | 'sick' | 'family';
interface LeaveEntry { id: string; employeeId: string; date: string; days: number; type: LeaveType; reason: string; }

// ── Constants ─────────────────────────────────────────────────────────────────

const ANNUAL_PER_MONTH = 1.25;  const ANNUAL_MAX = 15;
const SICK_PER_MONTH   = 0.83;  const SICK_MAX   = 10;
const FAMILY_TOTAL     = 3;

const LEAVE_COLORS: Record<LeaveType, string> = { annual: '#4a9eff', sick: '#f59e0b', family: '#10b981' };
const FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif';

// ── Helpers ────────────────────────────────────────────────────────────────────

function round2(n: number) { return Math.round(n * 100) / 100; }
function ym(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
function monthLabel(yearMonth: string) {
  const [y, m] = yearMonth.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' });
}
function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}
function loadLS<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; }
  catch { return fallback; }
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
    annual: round2(el.filter(e => e.type === 'annual').reduce((s, e) => s + e.days, 0)),
    sick:   round2(el.filter(e => e.type === 'sick').reduce((s, e) => s + e.days, 0)),
    family: round2(el.filter(e => e.type === 'family').reduce((s, e) => s + e.days, 0)),
  };
}

// ── Summary Card ──────────────────────────────────────────────────────────────

function SummaryCard({ label, accrued, used, max, color, note }: { label: string; accrued: number; used: number; max: number; color: string; note?: string }) {
  const balance = round2(accrued - used);
  return (
    <div style={{ background: 'var(--bg-editor)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{label}</div>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-block-hover)', marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min((accrued / max) * 100, 100)}%`, borderRadius: 3, background: color }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[{ lbl: 'Accrued', val: accrued, c: color }, { lbl: 'Used', val: used, c: used > accrued ? '#ef4444' : 'var(--text-secondary)' }, { lbl: 'Balance', val: balance, c: balance < 0 ? '#ef4444' : balance < 2 ? '#f59e0b' : '#10b981' }].map(item => (
          <div key={item.lbl} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: item.c, lineHeight: 1 }}>{item.val}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3 }}>{item.lbl}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-tertiary)', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        Entitlement: <strong style={{ color: 'var(--text-secondary)' }}>{max} days</strong>
        {note && <span style={{ marginLeft: 8, color: 'var(--accent)' }}>· {note}</span>}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

const TC: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text-primary)', verticalAlign: 'top' };

export function EmployeeLeaveView({ employeeId }: { employeeId: string }) {
  const employees = loadLS<Employee[]>('leave_employees', []);
  const leaveList = loadLS<LeaveEntry[]>('leave_entries', []);

  const emp = employees.find(e => e.id === employeeId);

  if (!emp) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, flexDirection: 'column', gap: 12 }}>
        <ClipboardList size={40} style={{ color: 'var(--text-tertiary)', opacity: 0.35 }} />
        <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>Your employee record could not be found. Please contact your manager.</p>
      </div>
    );
  }

  const monthRows  = buildMonthRows(emp.startDate);
  const accruals   = calcAccruals(monthRows);
  const used       = calcUsed(leaveList, emp.id);

  const empLeave = leaveList.filter(e => e.employeeId === emp.id);
  const leaveByMonth: Record<string, LeaveEntry[]> = {};
  empLeave.forEach(e => { const k = e.date.slice(0, 7); if (!leaveByMonth[k]) leaveByMonth[k] = []; leaveByMonth[k].push(e); });

  let runAnnual = 0; let runSick = 0;

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', fontFamily: FONT }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>My Leave</h2>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
          Started <strong>{fmtDate(emp.startDate)}</strong> · {monthRows.length} month{monthRows.length !== 1 ? 's' : ''} employed
        </p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <SummaryCard label="Annual Leave"          accrued={accruals.annual}  used={used.annual}  max={ANNUAL_MAX}   color="#4a9eff" />
        <SummaryCard label="Sick Leave"            accrued={accruals.sick}    used={used.sick}    max={SICK_MAX}     color="#f59e0b" note="Usable from month 3" />
        <SummaryCard label="Family Responsibility" accrued={FAMILY_TOTAL}     used={used.family}  max={FAMILY_TOTAL} color="#10b981" />
      </div>

      {/* Rules reminder */}
      <div style={{ background: 'rgba(74,158,255,0.06)', border: '1px solid rgba(74,158,255,0.2)', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--text-primary)' }}>Leave rules · </strong>
        Annual: 15 days, 1.25/month · Sick: 10 days, 0.83/month (usable from month 3) · Family: 3 days flat &nbsp;|&nbsp; 1 day = 8 h
      </div>

      {/* Month-by-month table */}
      <div style={{ background: 'var(--bg-editor)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Monthly Leave Record</span>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{monthRows.length} months</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr style={{ background: 'var(--bg-block-hover)' }}>
                {['Month', 'Leave taken', 'Reason', 'Annual ↑', 'Annual total', 'Sick ↑', 'Sick total'].map(h => (
                  <th key={h} style={{ ...TC, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{h}</th>
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
                    <td style={{ ...TC, fontWeight: 600, whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{row.label}</td>
                    <td style={TC}>
                      {mLeave.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {mLeave.map(l => (
                            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: LEAVE_COLORS[l.type], flexShrink: 0, display: 'inline-block' }} />
                              <span style={{ fontWeight: 600, color: LEAVE_COLORS[l.type] }}>{l.days}d</span>
                              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>({l.type})</span>
                            </div>
                          ))}
                        </div>
                      ) : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                    </td>
                    <td style={TC}>
                      {mLeave.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {mLeave.map(l => <span key={l.id} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{l.reason || '—'}</span>)}
                        </div>
                      ) : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                    </td>
                    <td style={{ ...TC, color: '#4a9eff', fontWeight: 600 }}>+{row.annualAccrued}</td>
                    <td style={{ ...TC, color: 'var(--text-secondary)' }}>{runAnnual}</td>
                    <td style={{ ...TC, color: '#f59e0b', fontWeight: 600 }}>+{row.sickAccrued}</td>
                    <td style={{ ...TC, color: 'var(--text-secondary)' }}>{runSick}</td>
                  </tr>
                );
              })}
              <tr style={{ background: 'var(--bg-block-hover)', fontWeight: 700 }}>
                <td style={{ ...TC, color: 'var(--text-primary)' }}>Totals</td>
                <td style={TC}>
                  {used.annual > 0 && <div style={{ color: '#4a9eff' }}>{used.annual} annual</div>}
                  {used.sick   > 0 && <div style={{ color: '#f59e0b' }}>{used.sick} sick</div>}
                  {used.family > 0 && <div style={{ color: '#10b981' }}>{used.family} family</div>}
                  {Object.values(used).every(v => v === 0) && <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>None taken</span>}
                </td>
                <td style={TC} />
                <td colSpan={2} style={{ ...TC, color: '#4a9eff' }}>Annual: {accruals.annual} / {ANNUAL_MAX} days</td>
                <td colSpan={2} style={{ ...TC, color: '#f59e0b' }}>Sick: {accruals.sick} / {SICK_MAX} days</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
