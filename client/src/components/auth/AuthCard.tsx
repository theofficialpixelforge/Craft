import React from 'react';

// Stable star positions (computed once, not on every render)
const STARS = Array.from({ length: 80 }, (_, i) => ({
  left: `${(i * 17.3) % 100}%`,
  top: `${(i * 31.7) % 100}%`,
  width: `${1 + (i % 3)}px`,
  height: `${1 + (i % 3)}px`,
  opacity: 0.1 + (i % 6) * 0.08,
  animationDelay: `${(i % 4)}s`,
  animationDuration: `${2 + (i % 3)}s`,
}));

export function MoLogo({ gradId = 'ac-grad' }: { gradId?: string }) {
  return (
    <div style={{ width: 64, height: 64, marginBottom: -10, marginTop: -32, position: 'relative', zIndex: 1 }}>
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <rect width="64" height="64" rx="14" fill={`url(#${gradId})`} />
        <text x="32" y="40" textAnchor="middle" fill="white"
          fontFamily="-apple-system,BlinkMacSystemFont,sans-serif" fontWeight="700" fontSize="20">MO</text>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop stopColor="#5B6CF0" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

interface Props {
  children: React.ReactNode;
}

export function AuthCard({ children }: Props) {
  return (
    <div className="ac-root">
      <div className="ac-stars" aria-hidden="true">
        {STARS.map((s, i) => <div key={i} className="ac-star" style={s} />)}
      </div>
      <div className="ac-orb ac-orb-left" aria-hidden="true" />
      <div className="ac-orb ac-orb-right" aria-hidden="true" />
      <div className="ac-card">
        {children}
      </div>
      <style>{STYLES}</style>
    </div>
  );
}

const STYLES = `
  .ac-root {
    position: fixed; inset: 0;
    display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #0f1035 0%, #1a1550 35%, #2d1b69 65%, #1a1040 100%);
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    z-index: 9999;
  }
  .ac-stars { position: absolute; inset: 0; pointer-events: none; }
  .ac-star {
    position: absolute; background: white; border-radius: 50%;
    animation: ac-twinkle var(--dur, 3s) ease-in-out infinite;
  }
  @keyframes ac-twinkle { 0%, 100% { opacity: inherit; } 50% { opacity: 0.05; } }
  .ac-orb {
    position: absolute; border-radius: 50%;
    filter: blur(80px); pointer-events: none;
  }
  .ac-orb-left {
    width: 500px; height: 500px; left: -150px; bottom: -100px;
    background: radial-gradient(circle, rgba(88,56,200,0.35) 0%, transparent 70%);
  }
  .ac-orb-right {
    width: 400px; height: 400px; right: -100px; top: 50%; transform: translateY(-50%);
    background: radial-gradient(circle, rgba(60,80,200,0.25) 0%, transparent 70%);
  }
  .ac-card {
    position: relative; width: 100%; max-width: 480px; margin: 1rem;
    background: rgba(22, 25, 50, 0.92); border-radius: 20px;
    padding: 2rem 2.25rem 2.5rem;
    display: flex; flex-direction: column; align-items: center;
    box-shadow: 0 25px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.06);
    overflow: visible;
  }
  .ac-title {
    font-size: 1.5rem; font-weight: 700; color: #ffffff;
    margin: 1.25rem 0 0.25rem; text-align: center; letter-spacing: -0.02em;
  }
  .ac-subtitle { font-size: 0.875rem; color: #5a5b7a; margin: 0 0 1.5rem; text-align: center; }
  .ac-form { width: 100%; display: flex; flex-direction: column; gap: 0.6rem; }
  .ac-input {
    width: 100%; padding: 0.8rem 1rem; border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.06);
    color: #ffffff; font-size: 0.95rem; outline: none;
    transition: border-color 0.2s, background 0.2s; box-sizing: border-box;
  }
  .ac-input::placeholder { color: #5a5b7a; }
  .ac-input:focus { border-color: rgba(120,180,255,0.4); background: rgba(255,255,255,0.09); }
  .ac-btn {
    width: 100%; margin-top: 0.25rem; padding: 0.8rem 1rem; border-radius: 10px;
    border: none; background: linear-gradient(135deg, #4a9eff 0%, #5bb8ff 100%);
    color: #ffffff; font-size: 0.95rem; font-weight: 600; cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
    display: flex; align-items: center; justify-content: center; min-height: 46px;
    letter-spacing: 0.01em;
  }
  .ac-btn:hover:not(:disabled) { opacity: 0.9; }
  .ac-btn:active:not(:disabled) { transform: scale(0.99); }
  .ac-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .ac-btn-ghost {
    width: 100%; padding: 0.7rem 1rem; border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.1); background: transparent;
    color: rgba(255,255,255,0.6); font-size: 0.9rem; font-weight: 500; cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .ac-btn-ghost:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.18); }
  .ac-error {
    width: 100%; box-sizing: border-box;
    padding: 0.65rem 0.9rem; border-radius: 8px; margin-bottom: 0.5rem;
    background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25);
    color: #fca5a5; font-size: 0.875rem;
  }
  .ac-success {
    width: 100%; box-sizing: border-box;
    padding: 0.65rem 0.9rem; border-radius: 8px; margin-bottom: 0.5rem;
    background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.2);
    color: #86efac; font-size: 0.875rem;
  }
  .ac-divider { display: flex; align-items: center; gap: 0.75rem; width: 100%; margin: 0.5rem 0 0; }
  .ac-divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.08); }
  .ac-divider-text { font-size: 0.75rem; color: #5a5b7a; white-space: nowrap; }
  .ac-spinner {
    width: 18px; height: 18px;
    border: 2px solid rgba(255,255,255,0.35); border-top-color: white;
    border-radius: 50%; animation: ac-spin 0.6s linear infinite;
  }
  @keyframes ac-spin { to { transform: rotate(360deg); } }
  .ac-link-btn {
    background: none; border: none; color: rgba(100,160,255,0.9);
    font-size: 0.875rem; cursor: pointer; text-decoration: underline;
    padding: 0; text-underline-offset: 2px;
  }
  .ac-link-btn:hover { color: rgba(130,185,255,1); }
`;
