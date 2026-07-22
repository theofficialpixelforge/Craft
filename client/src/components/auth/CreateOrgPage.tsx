import React, { useState } from 'react';
import { AuthCard, MoLogo } from './AuthCard';
import { useAuthStore } from '../../store/authStore';
import { BASE } from '../../api';

interface Props {
  onSuccess: () => void;
}

export function CreateOrgPage({ onSuccess }: Props) {
  const { session, setProfile } = useAuthStore();
  const [name,    setName]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE}/organizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Failed to create organization' }));
        throw new Error(body.error || 'Failed to create organization');
      }
      const data = await res.json();
      setProfile({ orgId: data.orgId, role: data.role, userName: data.userName });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard>
      <MoLogo gradId="co-grad" />
      <h1 className="ac-title">Create your organization</h1>
      <p className="ac-subtitle">This is your team's workspace. You can rename it later.</p>

      {error && <div className="ac-error">{error}</div>}

      <form onSubmit={handleSubmit} className="ac-form">
        <input
          type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="Organization name" className="ac-input"
          autoFocus required maxLength={100}
        />
        <button type="submit" disabled={loading || !name.trim()} className="ac-btn">
          {loading ? <span className="ac-spinner" /> : 'Create Organization'}
        </button>
      </form>
    </AuthCard>
  );
}
