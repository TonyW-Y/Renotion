import { Calculator, CalendarRange, PencilRuler, Wallet } from 'lucide-react';
import { SegmentedControl, type SegmentOption } from '@/components/ui';
import { useUiStore, type Section } from '@/state/uiStore';

const icon = 'size-3.5';

const SECTIONS: readonly SegmentOption<Section>[] = [
  {
    value: 'design',
    label: (
      <>
        <PencilRuler className={icon} />
        <span className="hidden md:inline">Design</span>
      </>
    ),
    ariaLabel: 'Design',
  },
  {
    value: 'estimate',
    label: (
      <>
        <Calculator className={icon} />
        <span className="hidden md:inline">Estimate</span>
      </>
    ),
    ariaLabel: 'Estimate',
  },
  {
    value: 'schedule',
    label: (
      <>
        <CalendarRange className={icon} />
        <span className="hidden md:inline">Schedule</span>
      </>
    ),
    ariaLabel: 'Schedule',
  },
  {
    value: 'budget',
    label: (
      <>
        <Wallet className={icon} />
        <span className="hidden md:inline">Budget</span>
      </>
    ),
    ariaLabel: 'Budget',
  },
];

export function SectionTabs() {
  const section = useUiStore((s) => s.section);
  const setSection = useUiStore((s) => s.setSection);
  return (
    <SegmentedControl
      ariaLabel="Section"
      value={section}
      onChange={setSection}
      options={SECTIONS}
    />
  );
}
