import { motion } from 'motion/react';
import { Box } from 'lucide-react';
import { IsoHouse } from '@/components/brand/IsoHouse';

/** Stand-in for the react-three-fiber scene that lands in Phase 2. */
export function ViewerPlaceholder() {
  return (
    <div
      data-testid="viewer-3d"
      className="relative h-full w-full overflow-hidden bg-[radial-gradient(ellipse_at_50%_20%,var(--surface-2),var(--canvas)_70%)]"
    >
      {/* Perspective floor grid */}
      <div className="pointer-events-none absolute inset-x-[-50%] bottom-[-10%] h-[70%] [perspective:500px]">
        <div className="blueprint-grid h-full w-full origin-bottom [transform:rotateX(62deg)] [mask-image:linear-gradient(to_top,black_10%,transparent_85%)]" />
      </div>

      <div className="absolute inset-0 flex items-center justify-center p-10">
        <motion.div
          className="w-full max-w-md"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <IsoHouse />
        </motion.div>
      </div>

      <div className="absolute inset-x-0 bottom-5 flex justify-center px-4">
        <div className="flex items-center gap-2 rounded-full bg-surface/85 py-1.5 pr-3.5 pl-2 text-xs text-fg-muted shadow-float backdrop-blur-xl">
          <span className="flex size-5 items-center justify-center rounded-full bg-accent-soft">
            <Box className="size-3 text-accent" />
          </span>
          Live 3D view — generated from your plan
          <span className="rounded-md bg-fg/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-fg-subtle">
            Soon
          </span>
        </div>
      </div>
    </div>
  );
}
