import { MotionConfig } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui';
import { startAuth } from '@/state/authStore';
import { useUiStore } from '@/state/uiStore';
import { ThemeSync } from './ThemeSync';

export function AppProviders({ children }: { children: ReactNode }) {
  const theme = useUiStore((s) => s.theme);
  useEffect(() => {
    startAuth();
  }, []);
  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={350} skipDelayDuration={150}>
        <ThemeSync />
        {children}
        <Toaster
          theme={theme}
          position="bottom-center"
          toastOptions={{
            className:
              '!rounded-xl !border-border !bg-elevated !text-fg !shadow-float [&_[data-description]]:!text-fg-muted',
          }}
        />
      </TooltipProvider>
    </MotionConfig>
  );
}
