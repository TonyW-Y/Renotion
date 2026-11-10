import { motion, stagger, type Variants } from 'motion/react';
import { ArrowRight, Box, Calculator, CalendarRange, Moon, PenLine, Sun } from 'lucide-react';
import { Link } from 'react-router';
import { IsoHouse } from '@/components/brand/IsoHouse';
import { Wordmark } from '@/components/brand/Logo';
import { buttonClass, IconButton } from '@/components/ui';
import { useUiStore } from '@/state/uiStore';

const ease = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { delayChildren: stagger(0.08, { startDelay: 0.05 }) } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease } },
};

const FEATURES = [
  {
    icon: PenLine,
    title: 'Draw in 2D',
    body: 'Snap walls, doors and windows into place. Rooms and areas are detected automatically.',
  },
  {
    icon: Box,
    title: 'Walk through in 3D',
    body: 'Your plan becomes a live 3D model. Orbit it or explore at eye level.',
  },
  {
    icon: Calculator,
    title: 'Know the cost',
    body: 'Paint, flooring and trim quantities, priced line by line as you design.',
  },
  {
    icon: CalendarRange,
    title: 'Plan the work',
    body: 'An ordered task list and timeline, generated from what you change.',
  },
] as const;

function Chip({
  className,
  delay,
  label,
  value,
}: {
  className: string;
  delay: number;
  label: string;
  value: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.6, ease }}
      className={`absolute rounded-xl bg-surface/90 px-3 py-2 shadow-float backdrop-blur-xl ${className}`}
    >
      <p className="text-[10px] font-medium tracking-[0.06em] text-fg-subtle uppercase">{label}</p>
      <p className="tabular mt-0.5 font-mono text-[13px] font-medium text-fg">{value}</p>
    </motion.div>
  );
}

export default function LandingPage() {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-bg">
      {/* Backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="blueprint-grid absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_60%_30%,black,transparent)]" />
        <div className="absolute -top-40 right-[-10%] h-[520px] w-[720px] rounded-full bg-accent/20 blur-[120px]" />
        <div className="absolute top-60 left-[-15%] h-[380px] w-[520px] rounded-full bg-accent-2/10 blur-[120px]" />
      </div>

      <div className="relative">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Wordmark />
          <div className="flex items-center gap-1.5">
            <IconButton label="Toggle theme" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </IconButton>
            <Link to="/editor" className={buttonClass('secondary', 'sm')}>
              Open editor
            </Link>
          </div>
        </nav>

        <main className="mx-auto grid max-w-6xl items-center gap-14 px-5 pt-14 pb-20 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
          <motion.div variants={container} initial="hidden" animate="show">
            <motion.div
              variants={item}
              className="inline-flex items-center gap-2 rounded-full bg-surface/70 py-1 pr-3 pl-1.5 text-xs text-fg-muted shadow-panel backdrop-blur"
            >
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                Free
              </span>
              Open source · runs entirely in your browser
            </motion.div>

            <motion.h1
              variants={item}
              className="mt-6 text-[2.75rem] leading-[1.02] font-semibold tracking-[-0.045em] text-balance text-fg sm:text-6xl lg:text-[4.25rem]"
            >
              Plan your renovation
              <br />
              <span className="text-gradient">before the first nail.</span>
            </motion.h1>

            <motion.p
              variants={item}
              className="mt-6 max-w-lg text-[17px] leading-relaxed text-pretty text-fg-muted"
            >
              Draw your home in 2D, see it in 3D instantly, and get material quantities, costs and a
              task timeline, all generated from your plan.
            </motion.p>

            <motion.div variants={item} className="mt-9 flex flex-wrap items-center gap-3">
              <Link to="/editor" className={buttonClass('primary', 'lg', 'group')}>
                Start planning
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              <a href="#features" className={buttonClass('ghost', 'lg')}>
                How it works
              </a>
            </motion.div>

            <motion.ul
              variants={item}
              className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-fg-subtle"
            >
              {['No sign-up', 'Works offline', 'Metric & imperial'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="size-1 rounded-full bg-accent" />
                  {t}
                </li>
              ))}
            </motion.ul>
          </motion.div>

          {/* Hero visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-[28px] bg-surface/60 p-8 shadow-float backdrop-blur-sm sm:p-12">
              <div className="blueprint-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)] opacity-60" />
              <IsoHouse delay={0.4} className="relative" />
            </div>
            <Chip
              className="top-6 -left-3 sm:-left-6"
              delay={2.0}
              label="Living room"
              value="22.7 m²"
            />
            <Chip
              className="top-1/2 -right-2 sm:-right-6"
              delay={2.2}
              label="Oak flooring"
              value="$1,840"
            />
            <Chip
              className="-bottom-5 left-1/2 -translate-x-1/2 sm:left-1/3"
              delay={2.4}
              label="Timeline"
              value="6 tasks · 9 days"
            />
          </motion.div>
        </main>

        <section id="features" className="mx-auto max-w-6xl scroll-mt-8 px-5 pb-24 sm:px-8">
          <div className="grid gap-px overflow-hidden rounded-2xl bg-border shadow-panel sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <motion.article
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.07, duration: 0.6, ease }}
                className="group bg-surface p-6 transition-colors hover:bg-surface-2"
              >
                <div className="mb-5 flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent transition-transform duration-300 group-hover:-translate-y-0.5">
                  <f.icon className="size-[18px]" />
                </div>
                <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{f.body}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-5 py-6 text-xs text-fg-subtle sm:flex-row sm:items-center sm:px-8">
            <span>© {new Date().getFullYear()} Renotion</span>
            <span>Built with React, three.js and Supabase · All assets CC0</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
