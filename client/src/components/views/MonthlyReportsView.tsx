import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, Filter, FileText } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Employee { id: string; name: string; }

interface MonthlyReport {
  id: string;
  employeeId: string;
  yearMonth: string;     // YYYY-MM
  content: string;
  submittedAt: string;   // ISO timestamp
}

interface Props {
  mode: 'manager' | 'employee';
  employeeId?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SK = 'craft_monthly_reports';
const FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif';

// ── Helpers ────────────────────────────────────────────────────────────────────

function load<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; }
  catch { return fallback; }
}
function persist(key: string, val: unknown) { localStorage.setItem(key, JSON.stringify(val)); }

function currentYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function fmtYM(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function MonthlyReportsView({ mode, employeeId }: Props) {
  const [reports,   setReports]   = useState<MonthlyReport[]>(() => load(SK, []));
  const [content,   setContent]   = useState('');
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const [filterEmp, setFilterEmp] = useState('');
  const [filterYM,  setFilterYM]  = useState('');

  useEffect(() => { persist(SK, reports); }, [reports]);

  const employees = load<Employee[]>('leave_employees', []);
  const thisMonth = currentYM();

  // Load current month's report into the textarea when component mounts
  useEffect(() => {
    if (mode !== 'employee' || !employeeId) return;
    const existing = reports.find(r => r.employeeId === employeeId && r.yearMonth === thisMonth);
    setContent(existing?.content ?? '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, employeeId]);

  const submitReport = useCallback(() => {
    if (!content.trim() || !employeeId) return;
    const existing = reports.find(r => r.employeeId === employeeId && r.yearMonth === thisMonth);
    const now = new Date().toISOString();
    if (existing) {
      setReports(p => p.map(r => r.id === existing.id ? { ...r, content: content.trim(), submittedAt: now } : r));
    } else {
      setReports(p => [...p, { id: crypto.randomUUID(), employeeId: employeeId!, yearMonth: thisMonth, content: content.trim(), submittedAt: now }]);
    }
  }, [content, employeeId, reports, thisMonth]);

  const empName = (id: string) => employees.find(e => e.id === id)?.name ?? 'Unknown';

  // Past months for employee view (exclude current month)
  const pastReports = reports
    .filter(r => r.employeeId === employeeId && r.yearMonth !== thisMonth)
    .sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));

  // Manager view: filtered + sorted
  const allReports = reports
    .filter(r => (!filterEmp || r.employeeId === filterEmp) && (!filterYM || r.yearMonth === filterYM))
    .sort((a, b) => b.yearMonth.localeCompare(a.yearMonth) || b.submittedAt.localeCompare(a.submittedAt));

  // Unique year-months for manager filter
  const allYMs = [...new Set(reports.map(r => r.yearMonth))].sort((a, b) => b.localeCompare(a));

  const currentReport = reports.find(r => r.employeeId === employeeId && r.yearMonth === thisMonth);

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', fontFamily: FONT }}>

      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
            {mode === 'manager' ? 'Monthly Reports' : 'My Monthly Report'}
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
            {mode === 'manager'
              ? `${reports.length} report${reports.length !== 1 ? 's' : ''} submitted`
              : `Write your report for ${fmtYM(thisMonth)}`}
          </p>
        </div>

        {/* Manager filters */}
        {mode === 'manager' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Filter size={13} style={{ color: 'var(--text-tertiary)' }} />
            {employees.length > 0 && (
              <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-block-hover)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                <option value="">All employees</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            )}
            {allYMs.length > 0 && (
              <select value={filterYM} onChange={e => setFilterYM(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-block-hover)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                <option value="">All months</option>
                {allYMs.map(ym => <option key={ym} value={ym}>{fmtYM(ym)}</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      {/* ── EMPLOYEE MODE ──────────────────────────────────────────────────── */}
      {mode === 'employee' && employeeId && (
        <>
          {/* Current month form */}
          <div style={{ background: 'var(--bg-editor)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{fmtYM(thisMonth)}</div>
                {currentReport && (
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    Last saved {fmtDateTime(currentReport.submittedAt)}
                  </div>
                )}
              </div>
              <span style={{ padding: '3px 10px', borderRadius: 12, background: 'rgba(74,158,255,0.12)', color: '#4a9eff', fontSize: 11, fontWeight: 600 }}>
                Current month
              </span>
            </div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Monthly summary
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={`Summarise your work for ${fmtYM(thisMonth)}. Include completed tasks, goals achieved, challenges faced, and plans for next month...`}
              rows={8}
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-block-hover)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', resize: 'vertical', lineHeight: 1.7, fontFamily: FONT }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button
                onClick={submitReport}
                disabled={!content.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, border: 'none', background: content.trim() ? 'var(--accent)' : 'var(--bg-block-hover)', color: content.trim() ? '#fff' : 'var(--text-tertiary)', fontSize: 13, fontWeight: 600, cursor: content.trim() ? 'pointer' : 'not-allowed' }}
              >
                <FileText size={13}/> {currentReport ? 'Update Report' : 'Submit Report'}
              </button>
            </div>
          </div>

          {/* Past months */}
          {pastReports.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Past Reports</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pastReports.map(r => (
                  <div key={r.id} style={{ background: 'var(--bg-editor)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                    <button
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                      style={{ width: '100%', padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{fmtYM(r.yearMonth)}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Submitted {fmtDateTime(r.submittedAt)}</div>
                      </div>
                      {expanded === r.id
                        ? <ChevronUp size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                        : <ChevronDown size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />}
                    </button>
                    {expanded === r.id && (
                      <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{r.content}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── MANAGER MODE ──────────────────────────────────────────────────── */}
      {mode === 'manager' && (
        allReports.length === 0 ? (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>
            No reports submitted yet. Employees will appear here once they submit their monthly reports.
          </div>
        ) : (
          <div style={{ background: 'var(--bg-editor)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-block-hover)' }}>
                  {['Month', 'Employee', 'Preview', 'Submitted', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allReports.map(r => (
                  <React.Fragment key={r.id}>
                    <tr
                      style={{ cursor: 'pointer', borderBottom: expanded === r.id ? 'none' : '1px solid var(--border)' }}
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                    >
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)', fontSize: 13, whiteSpace: 'nowrap' }}>{fmtYM(r.yearMonth)}</td>
                      <td style={{ padding: '12px 14px', fontSize: 13 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                            {empName(r.employeeId).charAt(0).toUpperCase()}
                          </div>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{empName(r.employeeId)}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: 13, maxWidth: 260 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.content.slice(0, 80)}{r.content.length > 80 ? '…' : ''}</div>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-tertiary)', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDateTime(r.submittedAt)}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        {expanded === r.id
                          ? <ChevronUp size={14} style={{ color: 'var(--text-tertiary)' }} />
                          : <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />}
                      </td>
                    </tr>
                    {expanded === r.id && (
                      <tr>
                        <td colSpan={5} style={{ padding: '0 14px 16px', background: 'rgba(74,158,255,0.03)' }}>
                          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{r.content}</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
