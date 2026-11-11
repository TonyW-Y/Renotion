import { motion } from 'motion/react';
import { ArrowRight, Calculator, Info, Printer, RotateCcw, Sparkles } from 'lucide-react';
import { Button, CommitInput, Tooltip } from '@/components/ui';
import { FURNITURE_PREFIX, getMaterial } from '@/core/estimate/defaultCosts';
import { FURNITURE_BY_ID } from '@/core/furniture/catalog';
import { TopView } from '@/features/furniture/TopView';
import type { Estimate, LineItem } from '@/core/estimate/costs';
import { textureUrl } from '@/features/materials/textures';
import { formatMoney, formatMoneyWhole, formatQuantity, parseMoney, perUnit } from '@/lib/format';
import { usePlanStore } from '@/state/planStore';
import { useEstimate } from '@/state/useEstimate';
import { useUiStore } from '@/state/uiStore';

function Swatch({ materialId }: { materialId: string }) {
  const piece = materialId.startsWith(FURNITURE_PREFIX)
    ? FURNITURE_BY_ID.get(materialId.slice(FURNITURE_PREFIX.length))
    : undefined;
  if (piece) {
    return (
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-fg/[0.05] p-0.5">
        <TopView model={piece} className="max-h-full max-w-full" />
      </span>
    );
  }
  const m = getMaterial(materialId);
  if (!m) return <span className="size-7 shrink-0 rounded-lg bg-fg/[0.06]" />;
  return (
    <span
      className="size-7 shrink-0 rounded-lg bg-cover bg-center shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)]"
      style={{
        backgroundColor: m.colorHex ?? 'var(--surface-2)',
        backgroundImage: m.textureSet ? `url(${textureUrl(m.textureSet, 'thumb')})` : undefined,
      }}
    />
  );
}

function PriceCell({ line }: { line: LineItem }) {
  const overrides = usePlanStore((s) => s.project.costOverrides);
  const setCostOverride = usePlanStore((s) => s.setCostOverride);
  const base = getMaterial(line.materialId)?.costPerUnit;
  const overridden = line.materialId in overrides;
  return (
    <div className="flex items-center justify-end gap-1">
      {overridden && (
        <Tooltip content={`Reset to default (${base !== undefined ? formatMoney(base) : '—'})`}>
          <button
            type="button"
            aria-label={`Reset ${line.description} price`}
            className="rounded-md p-1 text-accent hover:bg-accent-soft"
            onClick={() => {
              setCostOverride(line.materialId, null);
            }}
          >
            <RotateCcw className="size-3" />
          </button>
        </Tooltip>
      )}
      <CommitInput
        label={`${line.description} unit price`}
        mono
        className="h-7 w-24 text-right"
        display={formatMoney(line.unitCost)}
        onCommit={(text) => {
          const v = parseMoney(text);
          if (v === null) return false;
          setCostOverride(line.materialId, v === base ? null : v);
          return true;
        }}
      />
    </div>
  );
}

function CategoryBars({ estimate }: { estimate: Estimate }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {estimate.byCategory.map((c, i) => {
        const share = estimate.total > 0 ? c.total / estimate.total : 0;
        return (
          <motion.div
            key={c.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-xl bg-surface p-4 shadow-panel"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-fg-muted">{c.label}</span>
              <span className="tabular text-[11px] text-fg-subtle">{Math.round(share * 100)}%</span>
            </div>
            <p className="tabular mt-1 font-mono text-lg font-semibold text-fg">
              {formatMoneyWhole(c.total)}
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-fg/[0.06]">
              <motion.div
                className="bg-accent-gradient h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${share * 100}%` }}
                transition={{ type: 'spring', bounce: 0, duration: 0.6 }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function RoomTable({ estimate }: { estimate: Estimate }) {
  return (
    <div className="space-y-4">
      {estimate.byRoom.map((room) => {
        const lines = estimate.lines.filter((l) => l.roomKey === room.key);
        return (
          <section
            key={room.key ?? 'ext'}
            className="overflow-hidden rounded-2xl bg-surface shadow-panel"
          >
            <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <h3 className="text-sm font-semibold text-fg">{room.label}</h3>
              <span className="tabular font-mono text-sm font-semibold text-fg">
                {formatMoney(room.total)}
              </span>
            </header>
            <table className="w-full text-sm">
              <thead className="sr-only sm:not-sr-only">
                <tr className="text-left text-[11px] font-semibold tracking-[0.06em] text-fg-subtle uppercase">
                  <th className="py-2 pl-5 font-semibold">Item</th>
                  <th className="hidden py-2 pr-4 text-right font-semibold sm:table-cell">
                    Quantity
                  </th>
                  <th className="py-2 pr-4 text-right font-semibold">Unit price</th>
                  <th className="py-2 pr-5 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr
                    key={l.id}
                    className="border-t border-border/70 transition-colors hover:bg-fg/[0.02]"
                  >
                    <td className="py-3 pl-5">
                      <div className="flex items-center gap-3">
                        <Swatch materialId={l.materialId} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-fg">{l.description}</p>
                          <p className="truncate text-xs text-fg-subtle">
                            <span className="sm:hidden">
                              {formatQuantity(l.quantity, l.unit)} ·{' '}
                            </span>
                            {l.basis}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="tabular hidden py-3 pr-4 text-right font-mono text-xs text-fg-muted sm:table-cell">
                      {formatQuantity(l.quantity, l.unit)}
                    </td>
                    <td className="py-3 pr-4">
                      <PriceCell line={l} />
                      <p className="mt-0.5 text-right text-[10px] text-fg-subtle">
                        {perUnit(l.unit)}
                      </p>
                    </td>
                    <td className="tabular py-3 pr-5 text-right font-mono text-fg">
                      {formatMoney(l.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}

function EmptyCard({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border-strong bg-surface/50 px-6 py-14 text-center">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-2xl bg-accent/25 blur-xl" />
        <div className="relative flex size-12 items-center justify-center rounded-2xl bg-surface shadow-float">
          <Calculator className="size-5 text-accent" />
        </div>
      </div>
      <h2 className="text-base font-semibold text-fg">{title}</h2>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-fg-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function EstimateView() {
  const { estimate, hasPlanned } = useEstimate();
  const hasWalls = usePlanStore((s) => s.project.baseline.walls.length > 0);
  const startPlanning = usePlanStore((s) => s.startPlanning);
  const setSection = useUiStore((s) => s.setSection);

  return (
    <div className="h-full overflow-y-auto" data-testid="estimate-view">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg">Estimate</h1>
            <p className="mt-1 max-w-lg text-sm text-fg-muted">
              Materials for the changes between your current home and the renovation plan. Updates
              live as you design.
            </p>
          </div>
          {hasPlanned && (
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  window.print();
                }}
              >
                <Printer className="size-3.5" /> Print summary
              </Button>
              <div className="rounded-2xl bg-surface px-5 py-4 shadow-panel sm:text-right">
                <p className="text-xs font-medium text-fg-muted">Estimated total</p>
                <motion.p
                  key={estimate.total}
                  initial={{ opacity: 0.4, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-accent-gradient tabular font-mono text-3xl font-semibold"
                  data-testid="estimate-total"
                >
                  {formatMoney(estimate.total)}
                </motion.p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-xl bg-warning/10 px-4 py-3 text-sm text-fg shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--warning)_25%,transparent)]">
          <Info className="mt-0.5 size-4 shrink-0 text-warning" />
          <p>
            <span className="font-medium">Rough estimates, not quotes.</span>{' '}
            <span className="text-fg-muted">
              Default prices are typical Canadian retail prices in CAD and exclude labour. Click any
              unit price to adjust it for this project.
            </span>
          </p>
        </div>

        <div className="mt-8 space-y-8">
          {!hasPlanned ? (
            <EmptyCard
              title="Start planning to see an estimate"
              body="Draw your home as it is today, then click “Start planning” to make a copy you can change. Every change you make is priced here."
              action={
                <Button
                  disabled={!hasWalls}
                  onClick={() => {
                    startPlanning();
                    setSection('design');
                  }}
                >
                  <Sparkles className="size-4" /> Start planning
                </Button>
              }
            />
          ) : estimate.lines.length === 0 ? (
            <EmptyCard
              title="No changes yet"
              body="In the Renovation plan, pick a new floor for a room, paint a wall, or add a door — line items appear here instantly."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSection('design');
                  }}
                >
                  Back to design <ArrowRight className="size-4" />
                </Button>
              }
            />
          ) : (
            <>
              <CategoryBars estimate={estimate} />
              <RoomTable estimate={estimate} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
