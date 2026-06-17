import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Bug, Lightbulb, CheckCircle } from 'lucide-react';

interface Query {
  id: string;
  type: 'bug' | 'suggestion';
  subject: string;
  description: string;
  author: string;
  date: string;
}

interface Props {
  userName?: string;
  onClose: () => void;
}

const SK_QUERIES = 'craft_queries';
const FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif';

function loadQueries(): Query[] {
  try { return JSON.parse(localStorage.getItem(SK_QUERIES) ?? '[]'); }
  catch { return []; }
}

export function LogQueryModal({ userName, onClose }: Props) {
  const [type,        setType]        = useState<'bug' | 'suggestion'>('bug');
  const [subject,     setSubject]     = useState('');
  const [description, setDescription] = useState('');
  const [descErr,     setDescErr]     = useState(false);
  const [submitted,   setSubmitted]   = useState(false);

  const handleSubmit = () => {
    if (!description.trim()) { setDescErr(true); return; }
    const query: Query = {
      id:          crypto.randomUUID(),
      type,
      subject:     subject.trim(),
      description: description.trim(),
      author:      userName ?? 'Unknown',
      date:        new Date().toISOString(),
    };
    const prev = loadQueries();
    localStorage.setItem(SK_QUERIES, JSON.stringify([...prev, query]));
    setSubmitted(true);
  };

  const handleClose = () => {
    setType('bug');
    setSubject('');
    setDescription('');
    setDescErr(false);
    setSubmitted(false);
    onClose();
  };

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '10px 13px', borderRadius: 9,
    border: '1px solid var(--border)', background: 'var(--bg-block-hover)',
    color: 'var(--text-primary)', fontSize: 14, outline: 'none', fontFamily: FONT,
  };

  return createPortal(
    <div
      style={{ position:'fixed',inset:0,zIndex:500,background:'rgba(0,0,0,0.45)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}
      onMouseDown={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div style={{ background:'var(--bg-editor)',borderRadius:16,border:'1px solid var(--border)',boxShadow:'0 24px 64px rgba(0,0,0,0.35)',padding:'26px 28px 24px',width:480,maxWidth:'96vw',fontFamily:FONT }}>

        {/* Header */}
        <div style={{ display:'flex',alignItems:'center',marginBottom:20 }}>
          <h2 style={{ margin:0,fontSize:17,fontWeight:700,color:'var(--text-primary)',flex:1 }}>Log a Query</h2>
          <button onClick={handleClose} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-tertiary)',padding:4,borderRadius:6,display:'flex' }}>
            <X size={18}/>
          </button>
        </div>

        {submitted ? (
          /* ── Success state ── */
          <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:14,padding:'24px 0 16px' }}>
            <div style={{ width:56,height:56,borderRadius:'50%',background:'rgba(16,185,129,0.12)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <CheckCircle size={28} style={{ color:'#10b981' }}/>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:16,fontWeight:700,color:'var(--text-primary)',marginBottom:6 }}>
                {type === 'bug' ? 'Bug report logged' : 'Suggestion submitted'}
              </div>
              <div style={{ fontSize:13,color:'var(--text-secondary)',lineHeight:1.6 }}>
                Thanks for the feedback{userName ? `, ${userName}` : ''}! It's been saved and will be reviewed.
              </div>
            </div>
            <div style={{ display:'flex',gap:10,marginTop:6 }}>
              <button
                onClick={() => { setSubmitted(false); setType('bug'); setSubject(''); setDescription(''); }}
                style={{ padding:'8px 18px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--text-secondary)',fontSize:13,fontWeight:500,cursor:'pointer' }}
              >
                Log another
              </button>
              <button
                onClick={handleClose}
                style={{ padding:'8px 20px',borderRadius:8,border:'none',background:'var(--accent)',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer' }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* ── Form ── */
          <>
            {/* Type selector */}
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:11,fontWeight:700,color:'var(--text-secondary)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8 }}>Type</div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
                {([
                  { key: 'bug'        as const, label: 'Bug Report',  icon: <Bug size={16}/>,        desc: 'Something isn\'t working right' },
                  { key: 'suggestion' as const, label: 'Suggestion',  icon: <Lightbulb size={16}/>,  desc: 'An idea or improvement request' },
                ] as const).map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setType(opt.key)}
                    style={{
                      display:'flex',flexDirection:'column',alignItems:'flex-start',gap:4,
                      padding:'12px 14px',borderRadius:10,cursor:'pointer',textAlign:'left',
                      border:`1.5px solid ${type===opt.key ? 'var(--accent)' : 'var(--border)'}`,
                      background: type===opt.key ? 'rgba(74,158,255,0.06)' : 'var(--bg-block-hover)',
                    }}
                  >
                    <span style={{ color: type===opt.key ? 'var(--accent)' : 'var(--text-tertiary)', display:'flex' }}>{opt.icon}</span>
                    <span style={{ fontSize:13,fontWeight:600,color: type===opt.key ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{opt.label}</span>
                    <span style={{ fontSize:11,color:'var(--text-tertiary)',lineHeight:1.4 }}>{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block',fontSize:11,fontWeight:700,color:'var(--text-secondary)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6 }}>
                Subject <span style={{ fontWeight:400,textTransform:'none',letterSpacing:0,color:'var(--text-tertiary)' }}>(optional)</span>
              </label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder={type === 'bug' ? 'e.g. Leave balance not updating' : 'e.g. Export to PDF'}
                style={inp}
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom:20 }}>
              <label style={{ display:'block',fontSize:11,fontWeight:700,color:'var(--text-secondary)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6 }}>
                Description *
              </label>
              <textarea
                autoFocus
                value={description}
                onChange={e => { setDescription(e.target.value); setDescErr(false); }}
                placeholder={
                  type === 'bug'
                    ? 'Describe what happened, what you expected, and steps to reproduce it…'
                    : 'Describe your idea — what problem would it solve or what would it improve?'
                }
                rows={5}
                style={{
                  ...inp,
                  resize: 'vertical',
                  lineHeight: 1.6,
                  border: `1px solid ${descErr ? '#ef4444' : 'var(--border)'}`,
                }}
              />
              {descErr && (
                <p style={{ margin:'4px 0 0',fontSize:12,color:'#ef4444' }}>Please describe your {type === 'bug' ? 'bug' : 'suggestion'} before submitting.</p>
              )}
            </div>

            {/* Footer */}
            <div style={{ display:'flex',justifyContent:'flex-end',gap:10 }}>
              <button onClick={handleClose} style={{ padding:'8px 18px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--text-secondary)',fontSize:13,fontWeight:500,cursor:'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSubmit} style={{ padding:'8px 22px',borderRadius:8,border:'none',background:'var(--accent)',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer' }}>
                Submit
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
