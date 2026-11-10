import { MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';
import { TooltipProvider } from '@/components/ui';
import { ThemeSync } from './ThemeSync';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={350} skipDelayDuration={150}>
        <ThemeSync />
        {children}
      </TooltipProvider>
    </MotionConfig>
  );
}
