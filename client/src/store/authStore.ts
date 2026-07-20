import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  userId: string | null;
  orgId: string | null;
  role: 'manager' | 'intern' | null;
  userName: string | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (data: { userId?: string; orgId: string | null; role: string | null; userName: string | null }) => void;
  setLoading: (v: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  userId: null,
  orgId: null,
  role: null,
  userName: null,
  isLoading: true,
  setSession: (session) => set({ session, userId: session?.user.id ?? null }),
  setProfile: (data) => set({
    ...(data.userId ? { userId: data.userId } : {}),
    orgId: data.orgId,
    role: data.role as 'manager' | 'intern' | null,
    userName: data.userName,
  }),
  setLoading: (isLoading) => set({ isLoading }),
  clear: () => set({ session: null, userId: null, orgId: null, role: null, userName: null, isLoading: false }),
}));
