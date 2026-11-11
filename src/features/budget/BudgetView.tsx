import { AlertTriangle, Plus, Trash2, Wallet } from 'lucide-react';
import { useMemo, useState, type SyntheticEvent } from 'react';
import { Button, IconButton, Tooltip } from '@/components/ui';
import { CATEGORY_LABELS } from '@/core/estimate/costs';
import type { ExpenseCategory } from '@/core/project';
import { createId } from '@/lib/id';
import { cn } from '@/lib/cn';
import { formatMoney, formatMoneyWhole, parseMoney } from '@/lib/format';
import { usePlanStore } from '@/state/planStore';
import { useDerivedPlan } from '@/state/useDerivedPlan';
import { useEstimate } from '@/state/useEstimate';
import { todayIso } from '@/state/useSchedule';

const CATEGORIES: Record<ExpenseCategory, string> = {
  ...CATEGORY_LABELS,
  labour: 'Labour',
  other: 'Other',
};

const field =
  'h-9 rounded-lg bg-fg/[0.04] px-2.5 text-sm text-fg shadow-[inset_0_0_0_1px_var(--border)] outline-none placeholder:text-fg-subtle focus:shadow-[inset_0_0_0_1.5px_var(--accent)]';

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'over' | undefined }) {
  return (
    <div className="rounded-2xl bg-surface px-5 py-4 shadow-panel">
      <p className="text-xs font-medium text-fg-muted">{label}</p>
      <p
        className={cn(
          'tabular mt-0.5 font-mono text-2xl font-semibold',
          tone === 'over' ? 'text-danger' : 'text-fg',
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function BudgetView() {
  const { estimate } = useEstimate();
  const expenses = usePlanStore((s) => s.project.expenses);
  const addExpense = usePlanStore((s) => s.addExpense);
  const removeExpense = usePlanStore((s) => s.removeExpense);
  const planned = usePlanStore((s) => s.project.planned ?? s.project.baseline);
  const { rooms } = useDerivedPlan(planned);

  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('flooring');
  const [roomKey, setRoomKey] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const spent = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = estimate.total - spent;

  /** Estimated vs spent per category (only categories with either). */
  const rows = useMemo(() => {
    const est = new Map(estimate.byCategory.map((c) => [c.key as ExpenseCategory, c.total]));
    const act = new Map<ExpenseCategory, number>();
    for (const e of expenses) act.set(e.category, (act.get(e.category) ?? 0) + e.amount);
    const keys = (Object.keys(CATEGORIES) as ExpenseCategory[]).filter(
      (k) => est.has(k) || act.has(k),
    );
    return keys.map((k) => ({
      key: k,
      label: CATEGORIES[k],
      estimated: est.get(k) ?? 0,
      spent: act.get(k) ?? 0,
    }));
  }, [estimate.byCategory, expenses]);
  const max = Math.max(1, ...rows.flatMap((r) => [r.estimated, r.spent]));

  const submit = (e: SyntheticEvent) => {
    e.preventDefault();
    const value = parseMoney(amount);
    if (!description.trim()) {
      setError('Add a short description.');
      return;
    }
    if (value === null || value === 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    addExpense({
      id: createId(),
      spentOn: date,
      description: description.trim(),
      category,
      roomKey: roomKey || null,
      amount: value,
    });
    setDescription('');
    setAmount('');
    setError(null);
  };

  const roomName = (key: string | null) =>
    key ? (rooms.find((r) => r.key === key)?.name ?? 'Removed room') : '—';

  return (
    <div className="h-full overflow-y-auto" data-testid="budget-view">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg">Budget</h1>
        <p className="mt-1 max-w-lg text-sm text-fg-muted">
          Log what you actually spend and compare it with the estimate.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label="Estimated" value={formatMoney(estimate.total)} />
          <Stat label="Spent" value={formatMoney(spent)} />
          <Stat
            label={remaining < 0 ? 'Over budget' : 'Remaining'}
            value={formatMoney(Math.abs(remaining))}
            tone={remaining < 0 ? 'over' : undefined}
          />
        </div>

        {/* Estimated vs spent, per category */}
        <section
          className="mt-6 rounded-2xl bg-surface p-5 shadow-panel"
          aria-labelledby="by-category"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="by-category" className="text-sm font-semibold text-fg">
              Estimated vs spent by category
            </h2>
            <div className="flex items-center gap-4 text-[11px] text-fg-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-4 rounded-sm bg-fg-subtle/35" /> Estimated
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-4 rounded-sm bg-accent" /> Spent
              </span>
            </div>
          </div>
          {rows.length === 0 ? (
            <p className="mt-6 text-sm text-fg-subtle">Nothing estimated or spent yet.</p>
          ) : (
            <div className="mt-5 space-y-4">
              {rows.map((r) => {
                const over = r.spent > r.estimated && r.estimated > 0;
                return (
                  <Tooltip
                    key={r.key}
                    content={`${r.label}: ${formatMoney(r.spent)} spent of ${formatMoney(r.estimated)} estimated`}
                  >
                    <div className="grid grid-cols-[96px_1fr_auto] items-center gap-3">
                      <span className="truncate text-xs text-fg-muted">{r.label}</span>
                      <div className="relative h-5">
                        {/* Estimate: neutral reference track */}
                        <div
                          className="absolute inset-y-0 left-0 rounded-[4px] bg-fg-subtle/25"
                          style={{ width: `${(r.estimated / max) * 100}%` }}
                        />
                        {/* Spent: accent bar, inset 2px so the track edge stays visible */}
                        <div
                          className="absolute top-[4px] bottom-[4px] left-0 rounded-[3px] bg-accent transition-[width] duration-500"
                          style={{ width: `${(r.spent / max) * 100}%` }}
                        />
                      </div>
                      <span className="tabular flex min-w-[150px] items-center justify-end gap-1.5 font-mono text-xs text-fg">
                        {over && (
                          <span className="flex items-center gap-1 text-danger">
                            <AlertTriangle className="size-3" />
                            <span className="font-sans text-[10px] font-medium">Over</span>
                          </span>
                        )}
                        {formatMoneyWhole(r.spent)}
                        <span className="text-fg-subtle">/ {formatMoneyWhole(r.estimated)}</span>
                      </span>
                    </div>
                  </Tooltip>
                );
              })}
            </div>
          )}
        </section>

        {/* Expenses */}
        <section
          className="mt-6 overflow-hidden rounded-2xl bg-surface shadow-panel"
          aria-labelledby="expenses"
        >
          <header className="border-b border-border px-5 py-3.5">
            <h2 id="expenses" className="text-sm font-semibold text-fg">
              Expenses
            </h2>
          </header>
          <form
            onSubmit={submit}
            className="grid gap-2 border-b border-border p-4 sm:grid-cols-[130px_1fr_130px_130px_110px_auto]"
          >
            <input
              type="date"
              aria-label="Date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
              }}
              className={cn(field, 'font-mono text-xs')}
            />
            <input
              aria-label="Description"
              placeholder="What did you buy?"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
              }}
              className={field}
            />
            <select
              aria-label="Category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as ExpenseCategory);
              }}
              className={field}
            >
              {(Object.keys(CATEGORIES) as ExpenseCategory[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORIES[c]}
                </option>
              ))}
            </select>
            <select
              aria-label="Room"
              value={roomKey}
              onChange={(e) => {
                setRoomKey(e.target.value);
              }}
              className={field}
            >
              <option value="">No room</option>
              {rooms.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.name}
                </option>
              ))}
            </select>
            <input
              aria-label="Amount"
              inputMode="decimal"
              placeholder="$0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
              }}
              className={cn(field, 'text-right font-mono')}
            />
            <Button type="submit">
              <Plus className="size-4" /> Add
            </Button>
            {error && <p className="text-xs text-danger sm:col-span-6">{error}</p>}
          </form>
          {expenses.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <Wallet className="size-5 text-fg-subtle" />
              <p className="mt-2 text-sm text-fg-muted">
                No expenses yet — add receipts as you go.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold tracking-[0.06em] text-fg-subtle uppercase">
                  <th className="py-2 pl-5">Date</th>
                  <th className="py-2">Description</th>
                  <th className="hidden py-2 sm:table-cell">Category</th>
                  <th className="hidden py-2 md:table-cell">Room</th>
                  <th className="py-2 pr-2 text-right">Amount</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {[...expenses]
                  .sort((a, b) => b.spentOn.localeCompare(a.spentOn))
                  .map((e) => (
                    <tr key={e.id} className="border-t border-border/70">
                      <td className="py-2.5 pl-5 font-mono text-xs text-fg-muted">{e.spentOn}</td>
                      <td className="py-2.5 text-fg">{e.description}</td>
                      <td className="hidden py-2.5 text-fg-muted sm:table-cell">
                        {CATEGORIES[e.category]}
                      </td>
                      <td className="hidden py-2.5 text-fg-muted md:table-cell">
                        {roomName(e.roomKey)}
                      </td>
                      <td className="tabular py-2.5 pr-2 text-right font-mono text-fg">
                        {formatMoney(e.amount)}
                      </td>
                      <td className="pr-3">
                        <IconButton
                          size="sm"
                          label={`Delete ${e.description}`}
                          onClick={() => {
                            removeExpense(e.id);
                          }}
                          className="hover:text-danger"
                        >
                          <Trash2 className="size-3.5" />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
