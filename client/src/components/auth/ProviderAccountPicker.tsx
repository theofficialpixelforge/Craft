import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, ChevronRight } from 'lucide-react';

export type OAuthProvider = 'google' | 'microsoft' | 'apple';

interface SavedAccount { email: string; firstName: string; lastName: string; }

interface Props {
  provider: OAuthProvider;
  onSelect: (email: string) => void;
  onClose: () => void;
}

function loadAccounts(): SavedAccount[] {
  try { return JSON.parse(localStorage.getItem('craft_accounts') ?? '[]'); }
  catch { return []; }
}

function initials(a: SavedAccount) {
  return ((a.firstName[0] ?? '') + (a.lastName[0] ?? '')).toUpperCase() || a.email[0].toUpperCase();
}

// ── Avatar colours (deterministic) ──────────────────────────────────────────
const AVATAR_COLORS = ['#4285F4','#34A853','#EA4335','#FBBC05','#9334E6','#1a73e8','#0F9D58','#DB4437'];
function avatarColor(email: string) { return AVATAR_COLORS[email.charCodeAt(0) % AVATAR_COLORS.length]; }

// ── Google picker ────────────────────────────────────────────────────────────

function GooglePicker({ accounts, onSelect, onClose }: { accounts: SavedAccount[]; onSelect:(e:string)=>void; onClose:()=>void }) {
  const [addMode, setAddMode] = useState(accounts.length === 0);
  const [newEmail, setNewEmail] = useState('');

  return (
    <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 8px 40px rgba(0,0,0,0.22)', width:360, maxWidth:'94vw', fontFamily:'Google Sans,Roboto,Arial,sans-serif', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'18px 24px 0', borderBottom:'1px solid #e0e0e0' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <svg height="24" viewBox="0 0 74 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M31.64 12.2c0-.637-.057-1.251-.164-1.84H23v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C30.657 17.048 31.64 14.74 31.64 12z" fill="#4285F4"/>
            <path d="M23 20c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711h-3.007v2.332A8.997 8.997 0 0 0 23 20z" fill="#34A853"/>
            <path d="M17.964 12.71A5.41 5.41 0 0 1 17.682 11c0-.593.102-1.17.282-1.71V6.958h-3.007A8.996 8.996 0 0 0 14 11c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M23 5.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C27.463 2.891 25.426 2 23 2A8.997 8.997 0 0 0 14.957 6.958l3.007 2.332C18.672 7.163 20.656 5.58 23 5.58z" fill="#EA4335"/>
            <text x="37" y="18" style={{ font:'700 18px/1 Google Sans,Arial,sans-serif', fill:'#4285f4' }}>G</text>
            <text x="46" y="18" style={{ font:'700 18px/1 Google Sans,Arial,sans-serif', fill:'#ea4335' }}>o</text>
            <text x="55" y="18" style={{ font:'700 18px/1 Google Sans,Arial,sans-serif', fill:'#fbbc05' }}>o</text>
            <text x="64" y="18" style={{ font:'700 18px/1 Google Sans,Arial,sans-serif', fill:'#34a853' }}>g</text>
          </svg>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#5f6368', padding:4, borderRadius:4, display:'flex' }}><X size={18}/></button>
        </div>
        <p style={{ margin:'0 0 14px', fontSize:14, color:'#202124', fontWeight:500 }}>
          {addMode && accounts.length === 0 ? 'Sign in with Google' : 'Choose an account'}
        </p>
        <p style={{ margin:'0 0 14px', fontSize:12, color:'#5f6368' }}>to continue to <strong style={{ color:'#202124' }}>Craft</strong></p>
      </div>

      {/* Account list */}
      {!addMode && (
        <div>
          {accounts.map(acc => (
            <button key={acc.email} onClick={() => onSelect(acc.email)}
              style={{ display:'flex', alignItems:'center', gap:14, width:'100%', padding:'10px 24px', background:'none', border:'none', cursor:'pointer', textAlign:'left', transition:'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fa')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:avatarColor(acc.email), display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:600, color:'#fff', flexShrink:0 }}>
                {initials(acc)}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:500, color:'#202124', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{acc.firstName} {acc.lastName}</div>
                <div style={{ fontSize:12, color:'#5f6368', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{acc.email}</div>
              </div>
              <ChevronRight size={16} style={{ color:'#5f6368', flexShrink:0 }}/>
            </button>
          ))}
          <button onClick={() => setAddMode(true)}
            style={{ display:'flex', alignItems:'center', gap:14, width:'100%', padding:'10px 24px', background:'none', border:'none', cursor:'pointer', textAlign:'left', borderTop:'1px solid #e0e0e0' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f8f9fa')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
            <div style={{ width:36, height:36, borderRadius:'50%', border:'1px solid #dadce0', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Plus size={18} style={{ color:'#5f6368' }}/>
            </div>
            <span style={{ fontSize:14, color:'#202124' }}>Use another account</span>
          </button>
        </div>
      )}

      {/* Add account mode */}
      {addMode && (
        <div style={{ padding:'16px 24px 20px' }}>
          <input
            autoFocus
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newEmail.trim()) onSelect(newEmail.trim()); }}
            placeholder="Email or phone"
            style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px', borderRadius:4, border:'1px solid #dadce0', fontSize:14, color:'#202124', outline:'none', fontFamily:'inherit' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#1a73e8')}
            onBlur={e => (e.currentTarget.style.borderColor = '#dadce0')}
          />
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:20 }}>
            {accounts.length > 0 && (
              <button onClick={() => setAddMode(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#1a73e8', fontSize:14, fontWeight:500, padding:0 }}>
                Back
              </button>
            )}
            <button
              onClick={() => { if (newEmail.trim()) onSelect(newEmail.trim()); }}
              disabled={!newEmail.trim()}
              style={{ marginLeft:'auto', padding:'8px 24px', borderRadius:4, border:'none', background: newEmail.trim() ? '#1a73e8' : '#e0e0e0', color: newEmail.trim() ? '#fff' : '#aaa', fontSize:14, fontWeight:500, cursor: newEmail.trim() ? 'pointer' : 'not-allowed' }}>
              Next
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ padding:'10px 24px 14px', borderTop:'1px solid #e0e0e0', display:'flex', justifyContent:'space-between', fontSize:11, color:'#5f6368' }}>
        <span>Help &nbsp;·&nbsp; Privacy &nbsp;·&nbsp; Terms</span>
        <span>English (US)</span>
      </div>
    </div>
  );
}

// ── Microsoft picker ─────────────────────────────────────────────────────────

function MicrosoftPicker({ accounts, onSelect, onClose }: { accounts: SavedAccount[]; onSelect:(e:string)=>void; onClose:()=>void }) {
  const [addMode, setAddMode] = useState(accounts.length === 0);
  const [newEmail, setNewEmail] = useState('');

  return (
    <div style={{ background:'#fff', width:440, maxWidth:'94vw', fontFamily:'Segoe UI,system-ui,sans-serif', boxShadow:'0 4px 32px rgba(0,0,0,0.2)', borderRadius:4, overflow:'hidden' }}>
      {/* Header bar */}
      <div style={{ background:'#fff', padding:'20px 24px 0' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <svg width="108" height="24" viewBox="0 0 108 24" fill="none">
            <rect x="0" y="0" width="10" height="10" fill="#F25022"/>
            <rect x="12" y="0" width="10" height="10" fill="#7FBA00"/>
            <rect x="0" y="12" width="10" height="10" fill="#00A4EF"/>
            <rect x="12" y="12" width="10" height="10" fill="#FFB900"/>
            <text x="28" y="16" style={{ font:'600 14px/1 Segoe UI,Arial', fill:'#252525' }}>Microsoft</text>
          </svg>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#605e5c', padding:4, display:'flex', borderRadius:2 }}><X size={18}/></button>
        </div>
        <div style={{ fontSize:18, fontWeight:600, color:'#1b1b1b', marginBottom:6 }}>
          {addMode && accounts.length === 0 ? 'Sign in' : 'Pick an account'}
        </div>
        <div style={{ fontSize:13, color:'#605e5c', marginBottom:16 }}>to continue to <strong>Craft</strong></div>
      </div>

      {/* List */}
      {!addMode && (
        <div style={{ borderTop:'1px solid #edebe9' }}>
          {accounts.map(acc => (
            <button key={acc.email} onClick={() => onSelect(acc.email)}
              style={{ display:'flex', alignItems:'center', gap:12, width:'100%', padding:'12px 24px', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f3f2f1')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:'#0078d4', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:600, color:'#fff', flexShrink:0 }}>
                {initials(acc)}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:500, color:'#1b1b1b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{acc.firstName} {acc.lastName}</div>
                <div style={{ fontSize:12, color:'#605e5c', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{acc.email}</div>
              </div>
              <ChevronRight size={14} style={{ color:'#605e5c', flexShrink:0 }}/>
            </button>
          ))}
          <button onClick={() => setAddMode(true)}
            style={{ display:'flex', alignItems:'center', gap:12, width:'100%', padding:'12px 24px', background:'none', border:'none', cursor:'pointer', textAlign:'left', borderTop:'1px solid #edebe9' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f3f2f1')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
            <div style={{ width:32, height:32, borderRadius:'50%', border:'1px solid #8a8886', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Plus size={16} style={{ color:'#605e5c' }}/>
            </div>
            <span style={{ fontSize:14, color:'#1b1b1b' }}>Use another account</span>
          </button>
        </div>
      )}

      {/* Add mode */}
      {addMode && (
        <div style={{ padding:'0 24px 24px' }}>
          <input
            autoFocus
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newEmail.trim()) onSelect(newEmail.trim()); }}
            placeholder="Email, phone, or Skype"
            style={{ width:'100%', boxSizing:'border-box', padding:'8px 0', border:'none', borderBottom:'2px solid #0078d4', fontSize:14, color:'#1b1b1b', outline:'none', fontFamily:'inherit', background:'transparent' }}
          />
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:20 }}>
            {accounts.length > 0 && (
              <button onClick={() => setAddMode(false)} style={{ padding:'8px 20px', border:'1px solid #8a8886', background:'none', color:'#1b1b1b', fontSize:14, fontWeight:600, cursor:'pointer', borderRadius:2 }}>Back</button>
            )}
            <button
              onClick={() => { if (newEmail.trim()) onSelect(newEmail.trim()); }}
              disabled={!newEmail.trim()}
              style={{ padding:'8px 20px', border:'none', background: newEmail.trim() ? '#0078d4' : '#c8c6c4', color:'#fff', fontSize:14, fontWeight:600, cursor: newEmail.trim() ? 'pointer' : 'not-allowed', borderRadius:2 }}>
              Next
            </button>
          </div>
        </div>
      )}

      <div style={{ padding:'10px 24px 14px', borderTop:'1px solid #edebe9', fontSize:11, color:'#605e5c', display:'flex', gap:16 }}>
        <a href="#" style={{ color:'#0078d4', textDecoration:'none' }}>Terms of use</a>
        <a href="#" style={{ color:'#0078d4', textDecoration:'none' }}>Privacy &amp; cookies</a>
      </div>
    </div>
  );
}

// ── Apple picker ─────────────────────────────────────────────────────────────

function ApplePicker({ accounts, onSelect, onClose }: { accounts: SavedAccount[]; onSelect:(e:string)=>void; onClose:()=>void }) {
  const [addMode, setAddMode] = useState(accounts.length === 0);
  const [newEmail, setNewEmail] = useState('');

  return (
    <div style={{ background:'#1c1c1e', borderRadius:14, boxShadow:'0 20px 60px rgba(0,0,0,0.6)', width:360, maxWidth:'94vw', fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'20px 20px 0', textAlign:'center', position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,0.1)', border:'none', cursor:'pointer', color:'#ebebf5', padding:5, borderRadius:'50%', display:'flex', lineHeight:1 }}><X size={14}/></button>
        <svg width="28" height="34" viewBox="0 0 28 34" fill="white" style={{ marginBottom:10 }}>
          <path d="M22.83 17.97c-.04-4.13 3.37-6.13 3.52-6.22-1.92-2.81-4.9-3.19-5.96-3.23-2.54-.26-4.96 1.49-6.25 1.49-1.28 0-3.27-1.45-5.37-1.42-2.76.04-5.32 1.61-6.74 4.09-2.88 4.99-.74 12.39 2.06 16.44 1.37 1.98 3 4.2 5.14 4.12 2.07-.08 2.85-1.33 5.35-1.33 2.49 0 3.2 1.33 5.38 1.28 2.23-.04 3.63-2.01 4.98-3.99a17.5 17.5 0 0 0 2.27-4.61c-.05-.02-4.32-1.65-4.36-6.62zM18.63 5.62c1.12-1.39 1.88-3.28 1.67-5.2-1.61.07-3.63 1.11-4.79 2.46-1.03 1.2-1.95 3.16-1.71 5 1.81.14 3.64-.92 4.83-2.26z"/>
        </svg>
        <div style={{ fontSize:17, fontWeight:600, color:'#fff', marginBottom:4 }}>Sign in with Apple</div>
        <div style={{ fontSize:13, color:'#8e8e93', marginBottom:16 }}>Select an account to continue to <strong style={{ color:'#fff' }}>Craft</strong></div>
      </div>

      {!addMode && (
        <div>
          {accounts.map(acc => (
            <button key={acc.email} onClick={() => onSelect(acc.email)}
              style={{ display:'flex', alignItems:'center', gap:12, width:'100%', padding:'12px 20px', background:'none', border:'none', borderTop:'1px solid rgba(255,255,255,0.08)', cursor:'pointer', textAlign:'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              <div style={{ width:34, height:34, borderRadius:'50%', background:'#636366', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:600, color:'#fff', flexShrink:0 }}>
                {initials(acc)}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:500, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{acc.firstName} {acc.lastName}</div>
                <div style={{ fontSize:12, color:'#8e8e93', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{acc.email}</div>
              </div>
              <ChevronRight size={14} style={{ color:'#636366', flexShrink:0 }}/>
            </button>
          ))}
          <button onClick={() => setAddMode(true)}
            style={{ display:'flex', alignItems:'center', gap:12, width:'100%', padding:'12px 20px', background:'none', border:'none', borderTop:'1px solid rgba(255,255,255,0.08)', cursor:'pointer', textAlign:'left' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
            <div style={{ width:34, height:34, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Plus size={16} style={{ color:'#ebebf5' }}/>
            </div>
            <span style={{ fontSize:14, color:'#fff' }}>Use a different Apple ID</span>
          </button>
        </div>
      )}

      {addMode && (
        <div style={{ padding:'0 20px 20px', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
          <input
            autoFocus
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newEmail.trim()) onSelect(newEmail.trim()); }}
            placeholder="Apple ID (email)"
            style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px', marginTop:16, borderRadius:8, border:'none', background:'rgba(255,255,255,0.08)', color:'#fff', fontSize:14, outline:'none', fontFamily:'inherit' }}
          />
          <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:14 }}>
            {accounts.length > 0 && (
              <button onClick={() => setAddMode(false)} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid rgba(255,255,255,0.2)', background:'none', color:'#fff', fontSize:14, cursor:'pointer' }}>Back</button>
            )}
            <button
              onClick={() => { if (newEmail.trim()) onSelect(newEmail.trim()); }}
              disabled={!newEmail.trim()}
              style={{ padding:'8px 20px', borderRadius:8, border:'none', background: newEmail.trim() ? '#0a84ff' : '#3a3a3c', color:'#fff', fontSize:14, fontWeight:600, cursor: newEmail.trim() ? 'pointer' : 'not-allowed' }}>
              Continue
            </button>
          </div>
        </div>
      )}

      <div style={{ padding:'12px 20px', borderTop:'1px solid rgba(255,255,255,0.08)', fontSize:11, color:'#636366', textAlign:'center' }}>
        <a href="#" style={{ color:'#0a84ff', textDecoration:'none', marginRight:16 }}>Privacy Policy</a>
        <a href="#" style={{ color:'#0a84ff', textDecoration:'none' }}>Terms of Use</a>
      </div>
    </div>
  );
}

// ── Shell ────────────────────────────────────────────────────────────────────

export function ProviderAccountPicker({ provider, onSelect, onClose }: Props) {
  const accounts = loadAccounts();

  const handleSelect = (email: string) => {
    onClose();
    onSelect(email);
  };

  return createPortal(
    <div
      style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {provider === 'google'    && <GooglePicker    accounts={accounts} onSelect={handleSelect} onClose={onClose}/>}
      {provider === 'microsoft' && <MicrosoftPicker accounts={accounts} onSelect={handleSelect} onClose={onClose}/>}
      {provider === 'apple'     && <ApplePicker     accounts={accounts} onSelect={handleSelect} onClose={onClose}/>}
    </div>,
    document.body
  );
}
