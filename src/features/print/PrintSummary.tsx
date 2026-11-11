import { CATEGORY_LABELS } from '@/core/estimate/costs';
import { PlanSnapshot } from '@/features/projects/PlanSnapshot';
import { PRINT_PALETTE } from '@/features/projects/snapshotPalette';
import { formatMoney, formatQuantity } from '@/lib/format';
import { usePlanStore } from '@/state/planStore';
import { useEstimate } from '@/state/useEstimate';
import { useSchedule } from '@/state/useSchedule';

/** Print-only project summary (plan + estimate + schedule). Use the browser's “Save as PDF”. */
export function PrintSummary() {
  const project = usePlanStore((s) => s.project);
  const { estimate } = useEstimate();
  const { schedule } = useSchedule();
  const plan = project.planned ?? project.baseline;

  return (
    <div className="hidden bg-white p-10 text-[12px] text-black print:block">
      <header className="flex items-end justify-between border-b border-black/20 pb-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.12em] text-black/50 uppercase">
            Renotion · Project summary
          </p>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
        </div>
        <p className="text-black/60">
          {new Date().toLocaleDateString('en-CA', { dateStyle: 'long' })}
        </p>
      </header>

      <section className="mt-6 break-inside-avoid">
        <h2 className="mb-2 text-sm font-semibold">
          {project.planned ? 'Renovation plan' : 'Floor plan'}
        </h2>
        <PlanSnapshot
          plan={plan}
          labels
          palette={PRINT_PALETTE}
          className="mx-auto max-h-[340px] w-full"
        />
      </section>

      <section className="mt-6 break-inside-avoid">
        <h2 className="mb-2 text-sm font-semibold">Estimate — {formatMoney(estimate.total)}</h2>
        <p className="mb-2 text-[10px] text-black/60">
          Rough material estimates in CAD, not quotes. Labour excluded.
        </p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-black/20 text-left">
              <th className="py-1">Room</th>
              <th>Item</th>
              <th>Category</th>
              <th className="text-right">Quantity</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {estimate.lines.map((l) => (
              <tr key={l.id} className="border-b border-black/10">
                <td className="py-1">{l.roomName}</td>
                <td>{l.description}</td>
                <td>{CATEGORY_LABELS[l.category]}</td>
                <td className="text-right">{formatQuantity(l.quantity, l.unit)}</td>
                <td className="text-right">{formatMoney(l.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {schedule && schedule.items.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold">
            Schedule — {schedule.startDate} to {schedule.endDate} ({schedule.totalDays} working
            days)
          </h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-black/20 text-left">
                <th className="py-1">Task</th>
                <th>Room</th>
                <th>Start</th>
                <th>End</th>
                <th className="text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {schedule.items.map((i) => (
                <tr key={i.task.key} className="border-b border-black/10">
                  <td className="py-1">{i.task.title}</td>
                  <td>{i.task.roomName}</td>
                  <td>{i.startDate}</td>
                  <td>{i.endDate}</td>
                  <td className="text-right">{i.task.status.replace('_', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
