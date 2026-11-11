import { Redo2, Undo2 } from 'lucide-react';
import { IconButton, Tooltip } from '@/components/ui';
import { MOD } from '@/lib/platform';
import {
  selectCanRedo,
  selectCanUndo,
  selectRedoLabel,
  selectUndoLabel,
  usePlanStore,
} from '@/state/planStore';

export function UndoRedo() {
  const canUndo = usePlanStore(selectCanUndo);
  const canRedo = usePlanStore(selectCanRedo);
  const undoLabel = usePlanStore(selectUndoLabel);
  const redoLabel = usePlanStore(selectRedoLabel);
  const undo = usePlanStore((s) => s.undo);
  const redo = usePlanStore((s) => s.redo);

  return (
    <div className="flex items-center">
      <Tooltip
        content={undoLabel ? `Undo ${undoLabel.toLowerCase()}` : 'Undo'}
        shortcut={`${MOD}Z`}
      >
        <span className="inline-flex">
          <IconButton label="Undo" disabled={!canUndo} onClick={undo}>
            <Undo2 className="size-4" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip
        content={redoLabel ? `Redo ${redoLabel.toLowerCase()}` : 'Redo'}
        shortcut={`${MOD}⇧Z`}
      >
        <span className="inline-flex">
          <IconButton label="Redo" disabled={!canRedo} onClick={redo}>
            <Redo2 className="size-4" />
          </IconButton>
        </span>
      </Tooltip>
    </div>
  );
}
