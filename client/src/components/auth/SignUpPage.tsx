import React, { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { AuthCard, MoLogo } from './AuthCard';

function guessNames(email: string): [string, string] {
  const local = email.split('@')[0] || '';
  const parts = local.split(/[._\-]/).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());
  return [parts[0] || '', parts[1] || ''];
}

interface Props {
  onSuccess: (session: Session) => void;
  onBack: () => void;
}

export function SignUpPage({ onSuccess, onBack }: Props) {
  const [email,     setEmail]     = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [message,   setMessage]   = useState('');

  const handleEmailBlur = () => {
    if (email && !firstName) {
      const [fn, ln] = guessNames(email);
      setFirstName(fn);
      setLastName(ln);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 6)  { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    setError('');
    const name = `${firstName.trim()} ${lastName.trim()}`.trim() || email.split('@')[0];
    const { data: { session }, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    setLoading(false);
    if (err)     { setError(err.message); return; }
    if (session) { onSuccess(session); return; }
    setMessage('Check your email to confirm your account, then sign in.');
  };

  return (
    <AuthCard>
      <MoLogo gradId="su-grad" />
      <h1 className="ac-title">Create account</h1>
      <p className="ac-subtitle">Set up your manager account</p>

      {error   && <div className="ac-error">{error}</div>}
      {message && <div className="ac-success">{message}</div>}

      {!message && (
        <form onSubmit={handleSubmit} className="ac-form">
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            onBlur={handleEmailBlur} placeholder="Email address"
            className="ac-input" autoFocus required
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
              placeholder="First name" className="ac-input" required
              style={{ flex: 1, width: '50%' }}
            />
            <input
              type="text" value={lastName} onChange={e => setLastName(e.target.value)}
              placeholder="Last name" className="ac-input"
              style={{ flex: 1, width: '50%' }}
            />
          </div>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password (min 6 chars)" className="ac-input" required
          />
          <input
            type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder="Confirm password" className="ac-input" required
          />
          <button type="submit" disabled={loading} className="ac-btn">
            {loading ? <span className="ac-spinner" /> : 'Create Account'}
          </button>
        </form>
      )}

      <button onClick={onBack} className="ac-link-btn" style={{ marginTop: '1.25rem' }}>
        ← Back to sign in
      </button>
    </AuthCard>
  );
}
