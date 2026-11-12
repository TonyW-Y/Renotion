import * as Menu from '@radix-ui/react-dropdown-menu';
import { FolderOpen, LogIn, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui';
import { cloudEnabled } from '@/lib/supabase';
import { useAuthStore } from '@/state/authStore';
import { signOut } from '@/state/projectActions';
import { AuthDialog } from './AuthDialog';

const itemClass =
  'flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-fg-muted outline-none select-none data-[highlighted]:bg-fg/[0.06] data-[highlighted]:text-fg';

/** Sign-in button, or the signed-in user's menu. Hidden when the cloud isn't configured. */
export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const user = useAuthStore((s) => s.user);
  const ready = useAuthStore((s) => s.ready);
  const [authOpen, setAuthOpen] = useState(false);
  const navigate = useNavigate();

  if (!cloudEnabled || !ready) return null;

  if (!user) {
    return (
      <>
        <Button
          variant="secondary"
          size="sm"
          aria-label="Sign in"
          onClick={() => {
            setAuthOpen(true);
          }}
        >
          <LogIn className="size-3.5" />
          <span className={compact ? 'hidden lg:inline' : undefined}>Sign in</span>
        </Button>
        <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      </>
    );
  }

  const email = user.email ?? 'Account';
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Account menu"
        className="bg-accent-gradient flex size-8 items-center justify-center rounded-full text-xs font-semibold text-white uppercase shadow-glow transition-transform outline-none hover:scale-105 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        {email.charAt(0)}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-60 rounded-xl bg-elevated p-1.5 shadow-float"
        >
          <div className="px-2.5 pt-1.5 pb-2">
            <p className="text-[11px] text-fg-subtle">Signed in as</p>
            <p className="truncate text-[13px] font-medium text-fg">{email}</p>
          </div>
          <Menu.Separator className="my-1 h-px bg-border" />
          <Menu.Item
            className={itemClass}
            onSelect={() => {
              void navigate('/projects');
            }}
          >
            <FolderOpen className="size-4" /> My projects
          </Menu.Item>
          <Menu.Item
            className={itemClass}
            onSelect={() => {
              void signOut().then(() => toast('Signed out'));
            }}
          >
            <LogOut className="size-4" /> Sign out
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
