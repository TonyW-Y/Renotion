import * as Menu from '@radix-ui/react-dropdown-menu';
import { motion } from 'motion/react';
import {
  Cloud,
  CloudUpload,
  Copy,
  HardDrive,
  Link2,
  Moon,
  MoreHorizontal,
  PencilLine,
  Plus,
  Sparkles,
  Sun,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Wordmark } from '@/components/brand/Logo';
import { Button, buttonClass, Dialog, IconButton, TextField } from '@/components/ui';
import { AccountMenu } from '@/features/account/AccountMenu';
import { AuthDialog } from '@/features/account/AuthDialog';
import { cloudEnabled } from '@/lib/supabase';
import { useAuthStore } from '@/state/authStore';
import { cloudRepository } from '@/state/cloud';
import { getRepository, type ProjectRef, type ProjectSummary } from '@/state/persistence';
import { usePlanStore } from '@/state/planStore';
import {
  createNewProject,
  deleteProject,
  duplicateProject,
  moveToCloud,
  openProject,
  renameProject,
  shareLink,
} from '@/state/projectActions';
import { useUiStore } from '@/state/uiStore';

interface Row extends ProjectSummary {
  ref: ProjectRef;
  owner: boolean;
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
function ago(iso: string): string {
  const secs = (new Date(iso).getTime() - Date.now()) / 1000;
  const steps: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [30, 'day'],
    [12, 'month'],
  ];
  let value = secs;
  for (const [size, unit] of steps) {
    if (Math.abs(value) < size) return relative.format(Math.round(value), unit);
    value /= size;
  }
  return relative.format(Math.round(value), 'year');
}

const itemClass =
  'flex cursor-default items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-fg-muted outline-none select-none data-[highlighted]:bg-fg/[0.06] data-[highlighted]:text-fg';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.ready);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const openId = usePlanStore((s) => (s.ready ? `${s.location}:${s.project.id}` : null));

  const [cloud, setCloud] = useState<Row[] | null>(null);
  const [local, setLocal] = useState<Row[] | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [renaming, setRenaming] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [name, setName] = useState('');

  const refresh = useCallback(async () => {
    const mine = await getRepository().list();
    setLocal(mine.map((p) => ({ ...p, ref: { id: p.id, location: 'local' }, owner: true })));
    if (cloudRepository && useAuthStore.getState().user) {
      try {
        const rows = await cloudRepository.list();
        setCloud(
          rows.map((p) => ({
            ...p,
            ref: { id: p.id, location: 'cloud' },
            owner: p.role === 'owner',
          })),
        );
      } catch {
        setCloud([]);
        toast.error('Could not load your cloud projects.');
      }
    } else {
      setCloud(null);
    }
  }, []);

  useEffect(() => {
    if (authReady) void refresh();
  }, [authReady, user, refresh]);

  const run = async (label: string, task: () => Promise<unknown>) => {
    try {
      await task();
      await refresh();
    } catch (err) {
      toast.error(label, { description: err instanceof Error ? err.message : undefined });
    }
  };

  const open = async (row: Row) => {
    if (await openProject(row.ref)) void navigate('/editor');
    else toast.error('That project no longer exists.');
  };

  const create = async () => {
    await createNewProject(user && cloudRepository ? 'cloud' : 'local');
    void navigate('/editor');
  };

  const submitRename = (e: SyntheticEvent) => {
    e.preventDefault();
    const row = renaming;
    if (!row) return;
    setRenaming(null);
    void run('Could not rename the project.', () => renameProject(row.ref, name));
  };

  const card = (row: Row, i: number) => (
    <motion.li
      key={`${row.ref.location}:${row.id}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i, 8) * 0.03, duration: 0.25 }}
      className="group relative"
    >
      <button
        type="button"
        onClick={() => void open(row)}
        className="flex w-full flex-col rounded-2xl bg-surface p-4 text-left shadow-panel transition-all hover:-translate-y-0.5 hover:shadow-float"
      >
        <div className="blueprint-grid mb-4 flex h-24 items-center justify-center rounded-xl">
          <span className="rounded-full bg-surface/80 px-2.5 py-1 font-mono text-[11px] text-fg-muted shadow-panel backdrop-blur">
            {row.wallCount} {row.wallCount === 1 ? 'wall' : 'walls'}
          </span>
        </div>
        <span className="flex items-center gap-2 pr-8">
          <span className="truncate text-sm font-semibold text-fg">{row.name}</span>
          {openId === `${row.ref.location}:${row.id}` && (
            <span className="shrink-0 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent">
              Open
            </span>
          )}
        </span>
        <span className="mt-0.5 text-xs text-fg-subtle">
          Edited {ago(row.updatedAt)}
          {!row.owner && ' · shared with you'}
        </span>
      </button>
      <Menu.Root>
        <Menu.Trigger
          aria-label={`Actions for ${row.name}`}
          className="absolute top-[124px] right-3 rounded-lg p-1.5 text-fg-subtle transition-colors outline-none hover:bg-fg/[0.06] hover:text-fg focus-visible:ring-2 focus-visible:ring-accent"
        >
          <MoreHorizontal className="size-4" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content
            align="end"
            sideOffset={4}
            className="z-50 w-52 rounded-xl bg-elevated p-1.5 shadow-float"
          >
            <Menu.Item
              className={itemClass}
              onSelect={() => {
                setName(row.name);
                setRenaming(row);
              }}
            >
              <PencilLine className="size-4" /> Rename
            </Menu.Item>
            <Menu.Item
              className={itemClass}
              onSelect={() => {
                void run('Could not duplicate the project.', () => duplicateProject(row.ref));
              }}
            >
              <Copy className="size-4" /> Duplicate
            </Menu.Item>
            {row.ref.location === 'local' && user && cloudRepository && (
              <Menu.Item
                className={itemClass}
                onSelect={() => {
                  void run('Could not move the project to the cloud.', async () => {
                    await moveToCloud(row.id);
                    toast.success(`“${row.name}” is now in the cloud`);
                  });
                }}
              >
                <CloudUpload className="size-4" /> Move to cloud
              </Menu.Item>
            )}
            {row.ref.location === 'cloud' && row.owner && (
              <Menu.Item
                className={itemClass}
                onSelect={() => {
                  void run('Could not create a share link.', async () => {
                    const url = await shareLink(row.id);
                    await navigator.clipboard.writeText(url).catch(() => undefined);
                    toast.success('Share link copied', { description: url });
                  });
                }}
              >
                <Link2 className="size-4" /> Copy share link
              </Menu.Item>
            )}
            {row.owner && (
              <>
                <Menu.Separator className="my-1 h-px bg-border" />
                <Menu.Item
                  className={`${itemClass} data-[highlighted]:bg-danger/10 data-[highlighted]:text-danger`}
                  onSelect={() => {
                    setDeleting(row);
                  }}
                >
                  <Trash2 className="size-4" /> Delete
                </Menu.Item>
              </>
            )}
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
    </motion.li>
  );

  const section = (
    title: string,
    icon: React.ReactNode,
    rows: Row[] | null,
    empty: string,
    testId: string,
  ) => (
    <section className="mt-10" data-testid={testId}>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-fg">
        {icon}
        {title}
        {rows && <span className="font-normal text-fg-subtle">· {rows.length}</span>}
      </h2>
      {rows === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[178px] animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-strong px-5 py-8 text-center text-sm text-fg-muted">
          {empty}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rows.map(card)}</ul>
      )}
    </section>
  );

  return (
    <div className="min-h-dvh bg-bg">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link to="/" aria-label="Renotion home">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-1.5">
          <IconButton label="Toggle theme" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </IconButton>
          <AccountMenu />
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-5 pt-8 pb-20 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-fg">Projects</h1>
            <p className="mt-1.5 text-sm text-fg-muted">
              {user
                ? 'New projects are saved to your account and open on any device.'
                : 'Projects are saved in this browser. Sign in to keep them in the cloud.'}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/editor?demo" className={buttonClass('secondary', 'md')}>
              <Sparkles className="size-4 text-accent" /> Demo
            </Link>
            <Button onClick={() => void create()}>
              <Plus className="size-4" /> New project
            </Button>
          </div>
        </div>

        {cloudEnabled && authReady && !user && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface px-5 py-4 shadow-panel">
            <div className="flex items-center gap-3">
              <span className="bg-accent-gradient flex size-9 items-center justify-center rounded-xl text-white shadow-glow">
                <Cloud className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-fg">Keep your projects safe in the cloud</p>
                <p className="text-xs text-fg-muted">
                  Free account · open them anywhere · share read-only links
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setAuthOpen(true);
              }}
            >
              Sign in or create account
            </Button>
          </div>
        )}

        {user &&
          cloudRepository &&
          section(
            'In the cloud',
            <Cloud className="size-4 text-accent" />,
            cloud,
            'No cloud projects yet. Create one, or move a project from this device.',
            'cloud-projects',
          )}
        {section(
          'On this device',
          <HardDrive className="size-4 text-fg-muted" />,
          local,
          'Nothing saved in this browser yet.',
          'local-projects',
        )}
      </main>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />

      <Dialog
        open={renaming !== null}
        onOpenChange={(o) => {
          if (!o) setRenaming(null);
        }}
        title="Rename project"
      >
        <form onSubmit={submitRename} className="space-y-4">
          <TextField
            label="Name"
            autoFocus
            value={name}
            maxLength={120}
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
          <Button type="submit" className="w-full">
            Save
          </Button>
        </form>
      </Dialog>

      <Dialog
        open={deleting !== null}
        onOpenChange={(o) => {
          if (!o) setDeleting(null);
        }}
        title="Delete project?"
        description={
          deleting
            ? `“${deleting.name}” will be deleted${deleting.ref.location === 'cloud' ? ' from your account, along with its share links' : ' from this browser'}. This can’t be undone.`
            : undefined
        }
      >
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              setDeleting(null);
            }}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-danger !bg-none !shadow-none"
            onClick={() => {
              const row = deleting;
              setDeleting(null);
              if (row) void run('Could not delete the project.', () => deleteProject(row.ref));
            }}
          >
            <Trash2 className="size-4" /> Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
