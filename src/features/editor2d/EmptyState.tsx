import { AnimatePresence, motion } from 'motion/react';
import { BrickWall, MousePointerClick, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { Button, Kbd } from '@/components/ui';
import { useUiStore } from '@/state/uiStore';

export function EmptyState() {
  const tool = useUiStore((s) => s.tool);
  const setTool = useUiStore((s) => s.setTool);
  const drawing = tool === 'wall';

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 pb-24 sm:px-24 sm:pb-6">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={drawing ? 'drawing' : 'idle'}
          initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="flex max-w-sm flex-col items-center text-center"
        >
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-2xl bg-accent/30 blur-xl" />
            <div className="relative flex size-14 items-center justify-center rounded-2xl bg-surface shadow-float">
              {drawing ? (
                <MousePointerClick className="size-6 text-accent" />
              ) : (
                <BrickWall className="size-6 text-accent" />
              )}
            </div>
          </div>
          {drawing ? (
            <>
              <h2 className="text-lg font-semibold tracking-[-0.01em] text-fg">
                Click to place your first corner
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                Keep clicking to chain walls. Hold <Kbd>Shift</Kbd> to free the angle, press{' '}
                <Kbd>Esc</Kbd> to finish.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold tracking-[-0.01em] text-fg">
                Start with your first wall
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                Sketch your home as it is today. Rooms, areas and the 3D view are generated
                automatically.
              </p>
              <Button
                className="pointer-events-auto mt-5"
                onClick={() => {
                  setTool('wall');
                }}
              >
                <BrickWall className="size-4" />
                Draw walls
                <Kbd className="border-white/30 bg-black/15 text-[11px] font-semibold text-white shadow-none">
                  W
                </Kbd>
              </Button>
              <Link
                to="/editor?demo"
                className="pointer-events-auto mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted transition-colors hover:text-accent"
              >
                <Sparkles className="size-3.5" />
                or explore a finished demo house
              </Link>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
