import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { EstimateView } from '@/features/estimate/EstimateView';
import { FurnitureCatalog } from '@/features/furniture/FurnitureCatalog';
import { ScheduleView } from '@/features/tasks/ScheduleView';
import { BudgetView } from '@/features/budget/BudgetView';
import { PrintSummary } from '@/features/print/PrintSummary';
import { useUiStore } from '@/state/uiStore';
import { useProjectSync } from '@/state/useProjectSync';
import { PropertiesPanel } from './PropertiesPanel';
import { StatusBar } from './StatusBar';
import { ToolRail } from './ToolRail';
import { TopBar } from './TopBar';
import { useEditorShortcuts } from './useEditorShortcuts';
import { Workspace } from './Workspace';

export function EditorShell() {
  // /editor?demo opens a fresh copy of the sample house; the flag is then
  // dropped from the URL so a refresh keeps the visitor's edits.
  const [params, setParams] = useSearchParams();
  useProjectSync(
    undefined,
    params.has('demo')
      ? {
          onLoaded: () => {
            setParams({}, { replace: true });
          },
        }
      : undefined,
  );
  useEditorShortcuts();
  const section = useUiStore((s) => s.section);

  // Start with the properties panel collapsed on small screens.
  useEffect(() => {
    if (window.innerWidth < 1024) useUiStore.getState().setRightPanelOpen(false);
  }, []);

  return (
    <>
      <div className="flex h-dvh flex-col overflow-hidden bg-bg print:hidden">
        <TopBar />
        <div className="relative flex min-h-0 flex-1">
          {section === 'design' ? (
            <>
              <main className="relative min-w-0 flex-1">
                <Workspace />
                <div className="pointer-events-none absolute inset-x-0 bottom-16 z-10 flex justify-center sm:inset-x-auto sm:top-0 sm:bottom-0 sm:left-3 sm:items-center">
                  <ToolRail />
                </div>
                <FurnitureCatalog />
              </main>
              <PropertiesPanel />
            </>
          ) : (
            <main className="min-w-0 flex-1">
              {section === 'estimate' ? (
                <EstimateView />
              ) : section === 'schedule' ? (
                <ScheduleView />
              ) : (
                <BudgetView />
              )}
            </main>
          )}
        </div>
        <StatusBar />
      </div>
      <PrintSummary />
    </>
  );
}
