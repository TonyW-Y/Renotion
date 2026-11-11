import { ArrowRight } from 'lucide-react';
import { PanelSection } from '@/components/ui';
import { formatMoney, formatMoneyWhole } from '@/lib/format';
import { useEstimate } from '@/state/useEstimate';
import { useUiStore } from '@/state/uiStore';

/** Compact live estimate for the properties panel. */
export function EstimateSummary() {
  const { estimate, hasPlanned } = useEstimate();
  const setSection = useUiStore((s) => s.setSection);
  if (!hasPlanned) return null;
  return (
    <PanelSection
      title="Estimate"
      action={
        <button
          type="button"
          onClick={() => {
            setSection('estimate');
          }}
          className="flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
        >
          Details <ArrowRight className="size-3" />
        </button>
      }
    >
      <p
        className="text-accent-gradient tabular font-mono text-2xl font-semibold"
        data-testid="estimate-summary-total"
      >
        {formatMoney(estimate.total)}
      </p>
      <div className="mt-3 space-y-1.5">
        {estimate.byCategory.slice(0, 4).map((c) => (
          <div key={c.key} className="flex items-center justify-between text-xs">
            <span className="text-fg-muted">{c.label}</span>
            <span className="tabular font-mono text-fg">{formatMoneyWhole(c.total)}</span>
          </div>
        ))}
        {estimate.lines.length === 0 && <p className="text-xs text-fg-subtle">No changes yet.</p>}
      </div>
    </PanelSection>
  );
}
