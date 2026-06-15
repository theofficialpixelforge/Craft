import React, { useState } from 'react';

interface Props {
  email: string;
  onContinue: (firstName: string, lastName: string) => void;
}

function CraftLogo() {
  return (
    <div style={{ width: 64, height: 64, marginBottom: -10, marginTop: -32, position: 'relative', zIndex: 1 }}>
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <rect width="64" height="64" rx="14" fill="url(#np-logo-grad)"/>
        <path
          d="M32 12C21.0 12 12 21.0 12 32C12 43.0 21.0 52 32 52C37.8 52 43.0 49.4 46.6 45.2L40.8 39.4C38.6 42.0 35.5 43.6 32 43.6C25.6 43.6 20.4 38.4 20.4 32C20.4 25.6 25.6 20.4 32 20.4C35.5 20.4 38.6 22.0 40.8 24.6L46.6 18.8C43.0 14.6 37.8 12 32 12Z"
          fill="white"
        />
        <defs>
          <linearGradient id="np-logo-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop stopColor="#5B6CF0"/>
            <stop offset="1" stopColor="#8B5CF6"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function guessNames(email: string): [string, string] {
  const local = email.split('@')[0] || '';
  // britney.reginald → ["Britney", "Reginald"]
  const parts = local.split(/[._\-]/).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());
  return [parts[0] || '', parts[1] || ''];
}

export function NamePage({ email, onContinue }: Props) {
  const [guessFirst, guessLast] = guessNames(email);
  const [firstName, setFirstName] = useState(guessFirst);
  const [lastName, setLastName]   = useState(guessLast);
  const [loading, setLoading]     = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onContinue(firstName.trim(), lastName.trim());
    }, 500);
  };

  return (
    <div className="np-root">
      {/* Stars */}
      <div className="np-stars" aria-hidden="true">
        {Array.from({ length: 80 }).map((_, i) => (
          <div
            key={i}
            className="np-star"
            style={{
              left:   `${Math.random() * 100}%`,
              top:    `${Math.random() * 100}%`,
              width:  `${Math.random() * 2 + 1}px`,
              height: `${Math.random() * 2 + 1}px`,
              opacity: Math.random() * 0.6 + 0.1,
              animationDelay:    `${Math.random() * 4}s`,
              animationDuration: `${Math.random() * 3 + 2}s`,
            }}
          />
        ))}
      </div>

      {/* Glow orbs */}
      <div className="np-orb np-orb-left"  aria-hidden="true" />
      <div className="np-orb np-orb-right" aria-hidden="true" />

      {/* Card */}
      <div className="np-card">
        <CraftLogo />

        <h1 className="np-title">What's your name?</h1>

        <form onSubmit={handleSubmit} className="np-form">
          <input
            type="text"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder="First name"
            className="np-input"
            autoFocus
            required
          />
          <input
            type="text"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            placeholder="Last name"
            className="np-input"
          />
          <button
            type="submit"
            disabled={loading || !firstName.trim()}
            className="np-btn"
          >
            {loading ? <span className="np-spinner" /> : 'Continue'}
          </button>
        </form>
      </div>

      <style>{`
        .np-root {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f1035 0%, #1a1550 35%, #2d1b69 65%, #1a1040 100%);
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          z-index: 9999;
        }

        .np-stars { position: absolute; inset: 0; pointer-events: none; }
        .np-star {
          position: absolute;
          background: white;
          border-radius: 50%;
          animation: np-twinkle var(--dur, 3s) ease-in-out infinite;
        }
        @keyframes np-twinkle {
          0%, 100% { opacity: inherit; }
          50% { opacity: 0.05; }
        }

        .np-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }
        .np-orb-left {
          width: 500px; height: 500px;
          left: -150px; bottom: -100px;
          background: radial-gradient(circle, rgba(88,56,200,0.35) 0%, transparent 70%);
        }
        .np-orb-right {
          width: 400px; height: 400px;
          right: -100px; top: 50%; transform: translateY(-50%);
          background: radial-gradient(circle, rgba(60,80,200,0.25) 0%, transparent 70%);
        }

        .np-card {
          position: relative;
          width: 100%;
          max-width: 480px;
          margin: 1rem;
          background: rgba(22, 25, 50, 0.92);
          border-radius: 20px;
          padding: 2rem 2.25rem 2.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: 0 25px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.06);
          overflow: visible;
        }

        .np-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #ffffff;
          margin: 1.25rem 0 1.5rem;
          text-align: center;
          letter-spacing: -0.02em;
        }

        .np-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .np-input {
          width: 100%;
          padding: 0.8rem 1rem;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.06);
          color: #ffffff;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
          box-sizing: border-box;
        }
        .np-input::placeholder { color: #5a5b7a; }
        .np-input:focus {
          border-color: rgba(120,180,255,0.4);
          background: rgba(255,255,255,0.09);
        }

        .np-btn {
          width: 100%;
          margin-top: 0.25rem;
          padding: 0.8rem 1rem;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #4a9eff 0%, #5bb8ff 100%);
          color: #ffffff;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 46px;
          letter-spacing: 0.01em;
        }
        .np-btn:hover:not(:disabled) { opacity: 0.9; }
        .np-btn:active:not(:disabled) { transform: scale(0.99); }
        .np-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .np-spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: white;
          border-radius: 50%;
          animation: np-spin 0.6s linear infinite;
        }
        @keyframes np-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
