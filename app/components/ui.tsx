import Link from 'next/link';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold">{children}</h2>;
}

export function CardHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{children}</p>;
}

export function Kpi({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'good' | 'bad';
}) {
  const valueTone =
    tone === 'good'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'bad'
        ? 'text-red-600 dark:text-red-400'
        : '';
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${valueTone}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{sub}</div>}
    </div>
  );
}

const STEPS = [
  { n: 1, href: '/', label: 'The bleed' },
  { n: 2, href: '/solution', label: 'The fix' },
  { n: 3, href: '/guardrails', label: 'Guardrails' },
  { n: 4, href: '/results', label: 'The result' },
] as const;

export function Stepper({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <nav className="mb-8 flex items-center gap-2 text-sm">
      {STEPS.map((s, i) => {
        const active = s.n === current;
        const done = s.n < current;
        return (
          <div key={s.n} className="flex items-center gap-2">
            <Link
              href={s.href}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors ${
                active
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                  : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
                  active
                    ? 'bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white'
                    : done
                      ? 'bg-emerald-500 text-white'
                      : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                }`}
              >
                {done ? '✓' : s.n}
              </span>
              <span className="font-medium">{s.label}</span>
            </Link>
            {i < STEPS.length - 1 && <span className="text-zinc-300 dark:text-zinc-700">→</span>}
          </div>
        );
      })}
    </nav>
  );
}

export function NavButtons({
  back,
  next,
}: {
  back?: { href: string; label: string };
  next?: { href: string; label: string };
}) {
  return (
    <div className="mt-10 flex items-center justify-between gap-4">
      {back ? (
        <Link
          href={back.href}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          ← {back.label}
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link
          href={next.href}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
        >
          {next.label} →
        </Link>
      )}
    </div>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">{children}</div>
    </div>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
      {children}
    </div>
  );
}
