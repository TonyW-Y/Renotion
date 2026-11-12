import { Mail } from 'lucide-react';
import { useState, type SyntheticEvent } from 'react';
import { Button, Dialog, SegmentedControl, TextField, type SegmentOption } from '@/components/ui';
import { supabase } from '@/lib/supabase';

type Mode = 'signIn' | 'signUp';

const MODES: readonly SegmentOption<Mode>[] = [
  { value: 'signIn', label: 'Sign in' },
  { value: 'signUp', label: 'Create account' },
];

/** Email + password sign-in / sign-up, or a one-time magic link. */
export function AuthDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reset = () => {
    setError(null);
    setNotice(null);
  };

  const submit = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!supabase) return;
    reset();
    setBusy(true);
    try {
      if (mode === 'signIn') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        onOpenChange(false);
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/projects` },
        });
        if (err) throw err;
        if (data.session) onOpenChange(false);
        else setNotice('Check your email to confirm your account, then sign in.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const magicLink = async () => {
    if (!supabase) return;
    reset();
    if (!email.includes('@')) {
      setError('Enter your email first.');
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/projects` },
    });
    setBusy(false);
    if (err) setError(err.message);
    else setNotice(`We sent a sign-in link to ${email}.`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
      title={mode === 'signIn' ? 'Welcome back' : 'Create your account'}
      description="Save projects to the cloud and open them on any device. Your plans stay private to you."
    >
      <SegmentedControl
        ariaLabel="Sign in or create account"
        value={mode}
        className="mb-4 w-full [&>*]:flex-1"
        options={MODES}
        onChange={(m) => {
          setMode(m);
          reset();
        }}
      />
      <form onSubmit={(e) => void submit(e)} className="space-y-3">
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
          placeholder="you@example.com"
        />
        <TextField
          label="Password"
          type="password"
          autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
          required
          minLength={6}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
          placeholder={mode === 'signUp' ? 'At least 6 characters' : ''}
        />
        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-xs text-success">
            {notice}
          </p>
        )}
        <Button type="submit" disabled={busy} className="w-full">
          {mode === 'signIn' ? 'Sign in' : 'Create account'}
        </Button>
      </form>
      <div className="my-4 flex items-center gap-3 text-[11px] text-fg-subtle">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button
        variant="secondary"
        className="w-full"
        disabled={busy}
        onClick={() => void magicLink()}
      >
        <Mail className="size-4" />
        Email me a sign-in link
      </Button>
    </Dialog>
  );
}
