import { motion } from 'motion/react';
import { PlanCanvas } from '@/features/editor2d/PlanCanvas';
import { ViewerPlaceholder } from '@/features/viewer3d/ViewerPlaceholder';
import { useUiStore } from '@/state/uiStore';

const pane = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.25 },
};

export function Workspace() {
  const viewMode = useUiStore((s) => s.viewMode);
  const show2d = viewMode !== '3d';
  const show3d = viewMode !== '2d';

  return (
    <div className="flex h-full w-full flex-col md:flex-row">
      {show2d && (
        <motion.section
          key="2d"
          aria-label="2D plan"
          className="relative min-h-0 min-w-0 flex-1"
          {...pane}
        >
          <PlanCanvas />
        </motion.section>
      )}
      {show2d && show3d && <div className="h-px w-full shrink-0 bg-border md:h-full md:w-px" />}
      {show3d && (
        <motion.section
          key="3d"
          aria-label="3D view"
          className="relative min-h-0 min-w-0 flex-1"
          {...pane}
        >
          <ViewerPlaceholder />
        </motion.section>
      )}
    </div>
  );
}
