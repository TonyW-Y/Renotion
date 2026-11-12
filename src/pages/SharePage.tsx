import { Link2Off, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { buttonClass } from '@/components/ui';
import { openSharedCopy } from '@/state/projectActions';

/** /share/:token: opens a copy of a shared project on this device. */
export default function SharePage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const valid = /^[0-9a-f-]{36}$/i.test(token);
    (valid ? openSharedCopy(token) : Promise.resolve(null))
      .then((copy) => {
        if (!alive) return;
        if (!copy) {
          setFailed(true);
          return;
        }
        toast.success(`Opened a copy of “${copy.name}”`, {
          description: 'It’s saved in this browser; the original stays with its owner.',
        });
        void navigate('/editor', { replace: true });
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [token, navigate]);

  return (
    <div className="blueprint-grid flex min-h-dvh items-center justify-center px-6">
      <div className="max-w-sm rounded-2xl bg-surface/90 p-8 text-center shadow-float backdrop-blur">
        {failed ? (
          <>
            <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-fg/[0.05]">
              <Link2Off className="size-5 text-fg-muted" />
            </span>
            <h1 className="text-lg font-semibold text-fg">This link doesn’t work</h1>
            <p className="mt-1.5 text-sm text-fg-muted">
              It may have been revoked, or the project was deleted.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Link to="/editor?demo" className={buttonClass('secondary', 'md')}>
                Try the demo
              </Link>
              <Link to="/" className={buttonClass('primary', 'md')}>
                Go home
              </Link>
            </div>
          </>
        ) : (
          <>
            <LoaderCircle className="mx-auto mb-4 size-6 animate-spin text-accent" />
            <h1 className="text-lg font-semibold text-fg">Opening shared project…</h1>
          </>
        )}
      </div>
    </div>
  );
}
