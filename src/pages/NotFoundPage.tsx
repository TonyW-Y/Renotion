import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { buttonClass } from '@/components/ui';

export default function NotFoundPage() {
  return (
    <div className="blueprint-grid flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="font-mono text-sm text-accent">404</p>
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">This room isn’t on the plan.</h1>
      <Link to="/" className={buttonClass('secondary', 'md', 'mt-2')}>
        <ArrowLeft className="size-4" /> Back home
      </Link>
    </div>
  );
}
