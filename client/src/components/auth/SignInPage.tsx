import React, { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { AuthCard, MoLogo } from './AuthCard';

interface Props {
  onSignIn: (session: Session) => void;
  onSignUp: () => void;
  onInviteCode: () => void;
}

export function SignInPage({ onSignIn, onSignUp, onInviteCode }: Props) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { data: { session }, error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    if (session) onSignIn(session);
  };

  return (
    <AuthCard>
      <MoLogo gradId="si-grad" />
      <h1 className="ac-title">Sign in</h1>
      <p className="ac-subtitle">Welcome back to MyOrg</p>

      {error && <div className="ac-error">{error}</div>}

      <form onSubmit={handleSubmit} className="ac-form">
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="Email address" className="ac-input" autoFocus required
        />
        <input
          type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Password" className="ac-input" required
        />
        <button type="submit" disabled={loading || !email || !password} className="ac-btn">
          {loading ? <span className="ac-spinner" /> : 'Sign In'}
        </button>
      </form>

      <div className="ac-divider">
        <div className="ac-divider-line" />
        <span className="ac-divider-text">New here?</span>
        <div className="ac-divider-line" />
      </div>
      <button onClick={onSignUp} className="ac-btn-ghost" style={{ marginTop: '0.25rem' }}>
        Create manager account
      </button>
      <button onClick={onInviteCode} className="ac-link-btn" style={{ marginTop: '1rem' }}>
        I have an invite code
      </button>
    </AuthCard>
  );
}
