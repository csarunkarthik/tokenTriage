import { org } from '@/lib/data';
import { buildSavingsReport } from '@/lib/savings';
import { LeakType } from '@/lib/types';
import Link from 'next/link';
import { LEAK_COLOR, LEAK_FIX, LEAK_LABEL, pct, usd } from '@/lib/format';
import { Card, Eyebrow, NavButtons, PageShell, Stepper } from '../components/ui';

export default function Solution() {
  const report = buildSavingsReport(org);
  const teamName = (id: string) => org.teams.find((t) => t.id === id)?.name ?? id;

  const leakOrder: LeakType[] = ['cache-miss', 'model-mismatch', 'prompt-waste'];

  // Which teams each fix targets (teams whose top leak is this one).
  const teamsByLeak = (leak: LeakType) =>
    report.byTeam.filter((t) => t.topLeak === leak).map((t) => teamName(t.teamId));

  const steps = [
    { n: 1, leak: 'cache-miss' as const },
    { n: 2, leak: 'model-mismatch' as const },
    { n: 3, leak: 'prompt-waste' as const },
  ];

  return (
    <PageShell>
      <Stepper current={2} />

      <header className="mb-8">
        <Eyebrow>The fix · de-duplicated, applied in order</Eyebrow>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">How TokenTriage stops the bleed</h1>
        <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
          Four fixes, applied in sequence —{' '}
          <span className="font-medium">cache → route → compress</span>, then a batch sweep for async
          workloads — so savings never double-count.
        </p>
      </header>

      {/* Fix steps */}
      <section className="mb-8 space-y-4">
        {steps.map(({ n, leak }) => {
          const fix = LEAK_FIX[leak];
          const amount = report.byLeak[leak];
          const targetTeams = teamsByLeak(leak);
          return (
            <Link
              key={leak}
              href={`/solution/${leak}`}
              className="group block rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-emerald-300 hover:bg-emerald-50/30 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-900 dark:hover:bg-emerald-950/20"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
                  style={{ background: LEAK_COLOR[leak] }}
                >
                  {n}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="text-lg font-semibold">{fix.title}</h3>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ background: `${LEAK_COLOR[leak]}1a`, color: LEAK_COLOR[leak] }}
                    >
                      fixes {LEAK_LABEL[leak].toLowerCase()}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{fix.body}</p>
                  {targetTeams.length > 0 && (
                    <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                      Biggest wins: {targetTeams.join(', ')}
                    </p>
                  )}
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-600 group-hover:gap-2 dark:text-emerald-400">
                    View detailed approach →
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">Recovers</div>
                  <div className="text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {usd(amount)}
                  </div>
                  <div className="text-xs text-zinc-400">/ mo</div>
                </div>
              </div>
            </Link>
          );
        })}

        {/* Batch sweep */}
        <Card className="border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-base font-bold text-white">
              4
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold">Batch API sweep</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Non-interactive workloads — Element’s catalog enrichment, Walmart Connect’s offline creative —
                run through the Batch API at <span className="font-medium">50% off</span>, on top of the fixes above.
              </p>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">Recovers</div>
              <div className="text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {usd(report.batchRecovery)}
              </div>
              <div className="text-xs text-zinc-400">/ mo</div>
            </div>
          </div>
        </Card>
      </section>

      {/* Total */}
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-zinc-500">Total addressable, per month</div>
          <div className="text-xs text-zinc-400">
            {pct(report.recoverablePct)} of gross from the first three fixes, plus the batch sweep
          </div>
        </div>
        <div className="text-3xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
          {usd(report.recoverableTotal + report.batchRecovery)}
        </div>
      </Card>

      <NavButtons
        back={{ href: '/audit', label: 'Back to the audit' }}
        next={{ href: '/guardrails', label: 'Keep it from coming back' }}
      />
    </PageShell>
  );
}
