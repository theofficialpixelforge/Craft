import React, { useState } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { SignInPage } from './components/auth/SignInPage';
import { NamePage } from './components/auth/NamePage';
import { RolePage } from './components/auth/RolePage';
import type { Role } from './components/auth/RolePage';

type AuthStep = 'signin' | 'name' | 'role' | 'app';

interface AuthData {
  step: AuthStep;
  email: string;
  firstName: string;
  lastName: string;
  role: Role | null;
  employeeId: string | null;
}

// ── Saved accounts (email → name) ─────────────────────────────────────────────

const SK_ACCOUNTS = 'craft_accounts';
interface SavedAccount { email: string; firstName: string; lastName: string; }

function findAccount(email: string): SavedAccount | null {
  try {
    const list: SavedAccount[] = JSON.parse(localStorage.getItem(SK_ACCOUNTS) ?? '[]');
    return list.find(a => a.email.toLowerCase() === email.toLowerCase()) ?? null;
  } catch { return null; }
}

function upsertAccount(email: string, firstName: string, lastName: string) {
  try {
    const list: SavedAccount[] = JSON.parse(localStorage.getItem(SK_ACCOUNTS) ?? '[]');
    const idx = list.findIndex(a => a.email.toLowerCase() === email.toLowerCase());
    if (idx >= 0) list[idx] = { email, firstName, lastName };
    else list.push({ email, firstName, lastName });
    localStorage.setItem(SK_ACCOUNTS, JSON.stringify(list));
  } catch {}
}

// ── Session restore ───────────────────────────────────────────────────────────

function loadAuthState(): AuthData {
  try {
    const raw = localStorage.getItem('craft_auth');
    if (raw) {
      const data = JSON.parse(raw);
      if (data.firstName && data.role) return { step: 'app',    ...data };
      if (data.firstName)              return { step: 'role',   ...data, role: null, employeeId: null };
      if (data.email)                  return { step: 'name',   ...data, firstName: '', lastName: '', role: null, employeeId: null };
    }
  } catch {}
  return { step: 'signin', email: '', firstName: '', lastName: '', role: null, employeeId: null };
}

export default function App() {
  const initial = loadAuthState();
  const [step,       setStep]       = useState<AuthStep>(initial.step);
  const [email,      setEmail]      = useState(initial.email);
  const [firstName,  setFirstName]  = useState(initial.firstName);
  const [lastName,   setLastName]   = useState(initial.lastName);
  const [role,       setRole]       = useState<Role | null>(initial.role);
  const [employeeId, setEmployeeId] = useState<string | null>(initial.employeeId);

  const handleSignIn = (signedInEmail: string) => {
    const e = signedInEmail || email;
    const saved = findAccount(e);
    if (saved) {
      // Returning user — skip the name step entirely
      setEmail(e);
      setFirstName(saved.firstName);
      setLastName(saved.lastName);
      localStorage.setItem('craft_auth', JSON.stringify({ email: e, firstName: saved.firstName, lastName: saved.lastName }));
      setStep('role');
    } else {
      localStorage.setItem('craft_auth', JSON.stringify({ email: e }));
      setEmail(e);
      setStep('name');
    }
  };

  const handleName = (first: string, last: string) => {
    setFirstName(first);
    setLastName(last);
    localStorage.setItem('craft_auth', JSON.stringify({ email, firstName: first, lastName: last }));
    upsertAccount(email, first, last);
    setStep('role');
  };

  const handleRole = (selectedRole: Role, selectedEmployeeId?: string) => {
    setRole(selectedRole);
    setEmployeeId(selectedEmployeeId ?? null);
    localStorage.setItem('craft_auth', JSON.stringify({
      email, firstName, lastName,
      role: selectedRole,
      employeeId: selectedEmployeeId ?? null,
    }));
    setStep('app');
  };

  const handleBackToSignIn = () => {
    localStorage.removeItem('craft_auth');
    setStep('signin');
    setEmail('');
    setFirstName('');
    setLastName('');
    setRole(null);
    setEmployeeId(null);
  };

  const handleSignOut = () => {
    localStorage.removeItem('craft_auth');
    setStep('signin');
    setEmail('');
    setFirstName('');
    setLastName('');
    setRole(null);
    setEmployeeId(null);
  };

  if (step === 'signin') return <SignInPage onSignIn={handleSignIn} />;
  if (step === 'name')   return <NamePage email={email} onContinue={handleName} />;
  if (step === 'role')   return <RolePage firstName={firstName} onContinue={handleRole} onBack={handleBackToSignIn} />;

  return (
    <AppLayout
      userName={firstName}
      role={role ?? 'manager'}
      employeeId={employeeId ?? undefined}
      onSignOut={handleSignOut}
    />
  );
}
