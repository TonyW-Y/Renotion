import { useEffect } from 'react';
import { useUiStore } from '@/state/uiStore';
import { PropertiesPanel } from './PropertiesPanel';
import { StatusBar } from './StatusBar';
import { ToolRail } from './ToolRail';
import { TopBar } from './TopBar';
import { useEditorShortcuts } from './useEditorShortcuts';
import { Workspace } from './Workspace';

export function EditorShell() {
  useEditorShortcuts();

  // Start with the properties panel collapsed on small screens.
  useEffect(() => {
    if (window.innerWidth < 1024) useUiStore.getState().setRightPanelOpen(false);
  }, []);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg">
      <TopBar />
      <div className="relative flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1">
          <Workspace />
          <div className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center">
            <ToolRail />
          </div>
        </main>
        <PropertiesPanel />
      </div>
      <StatusBar />
    </div>
  );
}
