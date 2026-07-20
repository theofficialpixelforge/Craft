import React from 'react';
import { AuthCard, MoLogo } from './AuthCard';

interface Props {
  onBack: () => void;
}

export function InviteStubPage({ onBack }: Props) {
  return (
    <AuthCard>
      <MoLogo gradId="is-grad" />
      <h1 className="ac-title">Join with invite</h1>
      <p className="ac-subtitle">Invite-based onboarding is coming soon</p>

      <div style={{
        width: '100%', boxSizing: 'border-box',
        padding: '1rem', borderRadius: 10,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem',
        lineHeight: 1.6, textAlign: 'center',
        marginBottom: '0.5rem',
      }}>
        Ask your manager for access. Invite code support will be available in the next release.
      </div>

      <button onClick={onBack} className="ac-link-btn" style={{ marginTop: '1rem' }}>
        ← Back to sign in
      </button>
    </AuthCard>
  );
}
