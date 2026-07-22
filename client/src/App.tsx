import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AppLayout } from './components/layout/AppLayout';
import { SignInPage } from './components/auth/SignInPage';
import { SignUpPage } from './components/auth/SignUpPage';
import { CreateOrgPage } from './components/auth/CreateOrgPage';
import { InviteStubPage } from './components/auth/InviteStubPage';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import { BASE } from './api';

type Screen = 'loading' | 'signin' | 'signup' | 'create-org' | 'invite-stub' | 'app';

export default function App() {
  const { setSession, setProfile, setLoading, clear, role, userName, session } = useAuthStore();
  const [screen, setScreen] = useState<Screen>('loading');

  async function loadProfile(s: Session) {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/me`, {
        headers: { Authorization: `Bearer ${s.access_token}` },
      });
      if (!res.ok) throw new Error('Profile load failed');
      const data = await res.json();
      setProfile(data);
      setScreen(data.orgId ? 'app' : 'create-org');
    } catch {
      await supabase.auth.signOut();
      clear();
      setScreen('signin');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s) {
        setSession(s);
        loadProfile(s);
      } else {
        setLoading(false);
        setScreen('signin');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (s) setSession(s);
      if (event === 'SIGNED_OUT') { clear(); setScreen('signin'); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clear();
    setScreen('signin');
  };

  if (screen === 'loading') return <LoadingScreen />;

  if (screen === 'signin') return (
    <SignInPage
      onSignIn={async (s) => { setSession(s); await loadProfile(s); }}
      onSignUp={() => setScreen('signup')}
      onInviteCode={() => setScreen('invite-stub')}
    />
  );

  if (screen === 'signup') return (
    <SignUpPage
      onSuccess={async (s) => { setSession(s); await loadProfile(s); }}
      onBack={() => setScreen('signin')}
    />
  );

  if (screen === 'create-org') return (
    <CreateOrgPage onSuccess={() => setScreen('app')} />
  );

  if (screen === 'invite-stub') return (
    <InviteStubPage onBack={() => setScreen('signin')} />
  );

  return (
    <AppLayout
      userName={userName ?? undefined}
      role={(role ?? 'manager') as 'manager' | 'intern'}
      onSignOut={handleSignOut}
    />
  );
}

function LoadingScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f1035 0%, #1a1550 35%, #2d1b69 65%, #1a1040 100%)',
    }}>
      <div style={{
        width: 32, height: 32,
        border: '3px solid rgba(255,255,255,0.2)',
        borderTopColor: 'white',
        borderRadius: '50%',
        animation: 'ls-spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes ls-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
