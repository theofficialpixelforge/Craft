import React, { useState } from 'react';
import { ProviderAccountPicker, OAuthProvider } from './ProviderAccountPicker';
import { loadGIS, requestGoogleSignIn } from '../../services/googleCalendar';

interface Props {
  onSignIn: (email: string, googleProfile?: { firstName?: string; lastName?: string }) => void;
}

// ── SVG Logos ──────────────────────────────────────────────────────────────
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg width="17" height="20" viewBox="0 0 17 20" fill="white">
      <path d="M13.994 10.819c-.02-2.065 1.683-3.063 1.76-3.112-0.96-1.403-2.452-1.595-2.981-1.617-1.267-.128-2.48.747-3.123.747-.643 0-1.634-.727-2.688-.708-1.382.02-2.664.806-3.374 2.047-1.44 2.497-.368 6.195 1.03 8.222.686.988 1.5 2.1 2.572 2.059 1.033-.04 1.423-.664 2.672-.664 1.248 0 1.6.664 2.69.642 1.113-.02 1.816-1.006 2.49-1.997a9.8 9.8 0 0 0 1.134-2.302c-0.027-.01-2.16-.827-2.182-3.317zM11.957 4.02c.558-.694.938-1.64.833-2.601-.806.035-1.815.553-2.394 1.231-.516.6-.974 1.578-.854 2.5.904.07 1.82-.459 2.415-1.13z"/>
    </svg>
  );
}

function MicrosoftLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="0" y="0" width="8.5" height="8.5" fill="#F25022"/>
      <rect x="9.5" y="0" width="8.5" height="8.5" fill="#7FBA00"/>
      <rect x="0" y="9.5" width="8.5" height="8.5" fill="#00A4EF"/>
      <rect x="9.5" y="9.5" width="8.5" height="8.5" fill="#FFB900"/>
    </svg>
  );
}

// ── My Org Logo Icon ──────────────────────────────────────────────────────
function MyOrgLogo() {
  return (
    <div className="relative w-16 h-16 mb-6">
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="64" height="64" rx="14" fill="url(#logo-grad)"/>
        <text x="32" y="40" textAnchor="middle" fill="white" fontFamily="-apple-system,BlinkMacSystemFont,sans-serif" fontWeight="700" fontSize="20">MO</text>
        <defs>
          <linearGradient id="logo-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop stopColor="#5B6CF0"/>
            <stop offset="1" stopColor="#8B5CF6"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function SignInPage({ onSignIn }: Props) {
  const [email,         setEmail]         = useState('');
  const [loading,       setLoading]       = useState(false);
  const [picker,        setPicker]        = useState<OAuthProvider | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); onSignIn(email); }, 600);
  };

  const handleOAuth = async (provider: OAuthProvider) => {
    if (provider === 'google') {
      setGoogleLoading(true);
      try {
        await loadGIS();
        const profile = await requestGoogleSignIn();
        onSignIn(profile.email, { firstName: profile.firstName, lastName: profile.lastName });
      } catch {
        // User cancelled or error — do nothing
      } finally {
        setGoogleLoading(false);
      }
    } else {
      setPicker(provider);
    }
  };

  const handlePickerSelect = (selectedEmail: string) => {
    setPicker(null);
    onSignIn(selectedEmail);
  };

  return (
    <div className="signin-root">
      {/* Star field */}
      <div className="stars" aria-hidden="true">
        {Array.from({ length: 80 }).map((_, i) => (
          <div
            key={i}
            className="star"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 2 + 1}px`,
              height: `${Math.random() * 2 + 1}px`,
              opacity: Math.random() * 0.7 + 0.1,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${Math.random() * 3 + 2}s`,
            }}
          />
        ))}
      </div>

      {/* Glow orbs */}
      <div className="orb orb-left" aria-hidden="true" />
      <div className="orb orb-right" aria-hidden="true" />

      {/* Card */}
      <div className="signin-card">
        <MyOrgLogo />

        <h1 className="signin-title">Welcome to My Org</h1>
        <p className="signin-subtitle">
          Please confirm your email to continue or{' '}
          <button className="sso-link" onClick={() => onSignIn(email)}>continue with SSO</button>
        </p>

        {/* Email form */}
        <form onSubmit={handleContinue} className="signin-form">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Your Email"
            className="signin-input"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading}
            className="signin-btn-primary"
          >
            {loading ? <span className="spinner" /> : 'Continue'}
          </button>
        </form>

        {/* Divider */}
        <div className="signin-divider">
          <div className="divider-line" />
          <span className="divider-text">or</span>
          <div className="divider-line" />
        </div>

        {/* OAuth buttons */}
        <div className="oauth-buttons">
          <button className="oauth-btn" onClick={() => handleOAuth('google')} disabled={googleLoading}>
            {googleLoading ? <span className="spinner" style={{ borderColor:'rgba(255,255,255,0.3)', borderTopColor:'white' }}/> : <GoogleLogo />}
            <span>{googleLoading ? 'Connecting…' : 'Continue with Google'}</span>
          </button>
          <button className="oauth-btn" onClick={() => handleOAuth('apple')}>
            <AppleLogo />
            <span>Continue with Apple</span>
          </button>
          <button className="oauth-btn" onClick={() => handleOAuth('microsoft')}>
            <MicrosoftLogo />
            <span>Continue with Microsoft</span>
          </button>
        </div>

        {picker && (
          <ProviderAccountPicker
            provider={picker}
            onSelect={handlePickerSelect}
            onClose={() => setPicker(null)}
          />
        )}

        {/* Footer */}
        <p className="signin-footer">
          By clicking continue, you accept our{' '}
          <a href="#" className="footer-link">Terms and Conditions</a>
          {' '}and{' '}
          <a href="#" className="footer-link">Privacy Policy</a>
        </p>
        <p className="signin-footer">
          This site is protected by reCAPTCHA and the Google{' '}
          <a href="#" className="footer-link">Terms and Conditions</a>
          {' '}and{' '}
          <a href="#" className="footer-link">Privacy Policy</a>
          {' '}apply
        </p>
      </div>

      <style>{`
        .signin-root {
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

        /* Stars */
        .stars { position: absolute; inset: 0; pointer-events: none; }
        .star {
          position: absolute;
          background: white;
          border-radius: 50%;
          animation: twinkle var(--dur, 3s) ease-in-out infinite;
        }
        @keyframes twinkle {
          0%, 100% { opacity: var(--op, 0.4); }
          50% { opacity: 0.05; }
        }

        /* Glow orbs */
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }
        .orb-left {
          width: 500px; height: 500px;
          left: -150px; bottom: -100px;
          background: radial-gradient(circle, rgba(88, 56, 200, 0.35) 0%, transparent 70%);
        }
        .orb-right {
          width: 400px; height: 400px;
          right: -100px; top: 50%;
          transform: translateY(-50%);
          background: radial-gradient(circle, rgba(60, 80, 200, 0.25) 0%, transparent 70%);
        }

        /* Card */
        .signin-card {
          position: relative;
          width: 100%;
          max-width: 480px;
          margin: 1rem;
          background: rgba(22, 25, 50, 0.92);
          border-radius: 20px;
          padding: 2.5rem 2.25rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: 0 25px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.06);
        }

        .signin-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 0.6rem;
          text-align: center;
          letter-spacing: -0.02em;
        }

        .signin-subtitle {
          font-size: 0.9rem;
          color: #9899b3;
          text-align: center;
          margin: 0 0 1.75rem;
          line-height: 1.5;
        }

        .sso-link {
          color: #9899b3;
          text-decoration: underline;
          background: none;
          border: none;
          cursor: pointer;
          font-size: inherit;
          padding: 0;
        }
        .sso-link:hover { color: #c0c0d8; }

        /* Form */
        .signin-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          margin-bottom: 1.25rem;
        }

        .signin-input {
          width: 100%;
          padding: 0.8rem 1rem;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: #ffffff;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .signin-input::placeholder { color: #5a5b7a; }
        .signin-input:focus { border-color: rgba(120,130,255,0.5); background: rgba(255,255,255,0.07); }

        .signin-btn-primary {
          width: 100%;
          padding: 0.8rem 1rem;
          border-radius: 10px;
          border: none;
          background: #4a567a;
          color: #d0d4e8;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 46px;
        }
        .signin-btn-primary:hover:not(:disabled) { background: #5a6890; }
        .signin-btn-primary:active:not(:disabled) { transform: scale(0.99); }
        .signin-btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

        /* Spinner */
        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Divider */
        .signin-divider {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .divider-line {
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.1);
        }
        .divider-text {
          color: #5a5b7a;
          font-size: 0.85rem;
          white-space: nowrap;
        }

        /* OAuth buttons */
        .oauth-buttons {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .oauth-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.65rem;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          color: #d0d4e8;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, transform 0.1s;
        }
        .oauth-btn:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.18);
        }
        .oauth-btn:active { transform: scale(0.99); }

        /* Footer */
        .signin-footer {
          font-size: 0.75rem;
          color: #5a5b7a;
          text-align: center;
          margin: 0 0 0.35rem;
          line-height: 1.5;
        }
        .footer-link {
          color: #7a7b9a;
          text-decoration: underline;
        }
        .footer-link:hover { color: #a0a0c0; }
      `}</style>
    </div>
  );
}
