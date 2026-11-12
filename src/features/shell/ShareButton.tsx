import { Link2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Tooltip } from '@/components/ui';
import { usePlanStore } from '@/state/planStore';
import { shareLink } from '@/state/projectActions';

/** Copies a read-only link to the open cloud project. */
export function ShareButton() {
  const location = usePlanStore((s) => s.location);
  const projectId = usePlanStore((s) => s.project.id);
  const [busy, setBusy] = useState(false);
  if (location !== 'cloud') return null;

  const share = async () => {
    setBusy(true);
    try {
      const url = await shareLink(projectId);
      await navigator.clipboard.writeText(url).catch(() => undefined);
      toast.success('Share link copied', {
        description:
          'Anyone with the link can open a copy of this project. Your original stays private.',
      });
    } catch {
      toast.error('Only the project owner can share it.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Tooltip content="Copy a link others can open">
      <Button variant="secondary" size="sm" disabled={busy} onClick={() => void share()}>
        <Link2 className="size-3.5" />
        <span className="hidden xl:inline">Share</span>
      </Button>
    </Tooltip>
  );
}
