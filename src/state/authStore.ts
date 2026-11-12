import type { User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  /** False until the saved session (if any) has been restored. */
  ready: boolean;
}

export const useAuthStore = create<AuthState>(() => ({ user: null, ready: supabase === null }));

let started = false;
let resolveReady: () => void = () => undefined;
const readyPromise = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

/** Restores the session and follows sign-in / sign-out. Safe to call repeatedly. */
export function startAuth(): void {
  if (started) return;
  started = true;
  if (!supabase) {
    resolveReady();
    return;
  }
  void supabase.auth.getSession().then(({ data }) => {
    useAuthStore.setState({ user: data.session?.user ?? null, ready: true });
    resolveReady();
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.setState({ user: session?.user ?? null, ready: true });
    resolveReady();
  });
}

/** Resolves once the saved session (if any) is known. */
export function whenAuthReady(): Promise<void> {
  startAuth();
  return readyPromise;
}
