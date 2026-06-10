import { org } from '@/lib/data';
import { buildSavingsReport } from '@/lib/savings';
import { LeakType } from '@/lib/types';
import {
  LEAK_COLOR,
  LEAK_LABEL,
  LEAK_WHY,
  SEVERITY_STYLE,
  pct,
  severityFromShare,
  usd,
} from '@/lib/format';
import Link from 'next/link';
import { LeakDonut, TeamSpendChart, type LeakDatum, type TeamSpendDatum } from './components/charts';
import { Card, CardHint, CardTitle, Eyebrow, NavButtons, PageShell, Stepper } from './components/ui';

export default function Bleed() {
  const report = buildSavingsReport(org);
  const teamName = (id: string) => org.teams.find((t) => t.id === id)?.name ?? id;

  const teams = [...report.byTeam].sort((a, b) => b.recoverable - a.recoverable);

  const teamChartData: TeamSpendDatum[] = teams.map((t) => ({
    name: teamName(t.teamId),
    recoverable: Math.round(t.recoverable),
    remaining: Math.round(t.gross - t.recoverable),
  }));

  const leakOrder: LeakType[] = ['cache-miss', 'model-mismatch', 'prompt-waste'];
  const leakChartData: LeakDatum[] = leakOrder
    .map((leak) => ({ name: LEAK_LABEL[leak], value: Math.round(report.byLeak[leak]), color: LEAK_COLOR[leak] }))
    .filter((d) => d.value > 0);

  return (
    <PageShell>
      <Stepper current={1} />

      {/* Hero — value prop first, case study second */}
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Eyebrow>tokenTriage</Eyebrow>
          <span className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            Live case study · {org.name}
          </span>
        </div>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Find the AI token spend that’s quietly bleeding out — and stop it.
        </h1>
        <p className="mt-3 max-w-2xl text-base font-medium text-zinc-700 dark:text-zinc-300">
          tokenTriage surfaces where token spend leaks, then prescribes targeted fixes — smarter prompts,
          aggressive caching, and cheaper model routes.
        </p>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
          Below: a 30-day audit of {org.name} — {org.teams.length} product teams, {org.engineers} engineers.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href="/solution"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            See how to recover {usd(report.recoverableTotal)}/mo →
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Open the live dashboard
          </Link>
        </div>
      </header>

      {/* Key numbers — immediate KPI blocks */}
      <section className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Gross spend / mo</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums">{usd(report.orgGross)}</div>
          <div className="mt-0.5 text-xs text-zinc-400">current Claude run-rate</div>
        </Card>
        <Card className="border-red-200 dark:border-red-900/60">
          <div className="text-xs font-medium uppercase tracking-wide text-red-600 dark:text-red-400">Bleeding / mo</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums text-red-600 dark:text-red-400">
            {usd(report.recoverableTotal)}
          </div>
          <div className="mt-0.5 text-xs text-red-500/80">{pct(report.recoverablePct)} of gross — recoverable</div>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Annualized leak</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums">{usd(report.recoverableTotal * 12)}</div>
          <div className="mt-0.5 text-xs text-zinc-400">at current run-rate</div>
        </Card>
      </section>

      {/* Visual summary — the waste story in one bar */}
      <section className="mb-8">
        <Card>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Where this month’s {usd(report.orgGross)} goes</span>
            <span className="text-zinc-500">{pct(report.recoverablePct)} recoverable</span>
          </div>
          <div className="mt-3 flex h-7 w-full overflow-hidden rounded-lg">
            <div
              className="flex items-center justify-center bg-emerald-500 text-xs font-semibold text-white"
              style={{ width: `${report.recoverablePct * 100}%` }}
            >
              {pct(report.recoverablePct)}
            </div>
            <div className="flex-1 bg-zinc-300 dark:bg-zinc-700" />
          </div>
          <div className="mt-2 flex items-center gap-6 text-xs text-zinc-500">
            <span className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />
              Recoverable — {usd(report.recoverableTotal)}
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-zinc-300 dark:bg-zinc-700" />
              Unavoidable — {usd(report.orgGross - report.recoverableTotal)}
            </span>
          </div>
        </Card>
      </section>

      {/* How this works — orient the viewer before the deep-dive */}
      <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">How this audit works</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
          {[
            { n: 1, label: 'The bleed', desc: 'See where spend leaks today, and why.' },
            { n: 2, label: 'The fix', desc: 'Targeted fixes — caching, routing, compression.' },
            { n: 3, label: 'Guardrails', desc: 'Caps + training so it doesn’t come back.' },
            { n: 4, label: 'The result', desc: 'The before/after, and model your own.' },
          ].map((s, i) => (
            <div key={s.n} className="flex items-start gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-white dark:text-zinc-900">
                {s.n}
              </span>
              <div>
                <div className="text-sm font-semibold">{s.label}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">{s.desc}</div>
              </div>
              {i < 3 && <span className="ml-auto hidden text-zinc-300 sm:inline dark:text-zinc-700">→</span>}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Already running? The{' '}
          <a href="/dashboard" className="font-medium text-emerald-600 dark:text-emerald-400">
            live dashboard
          </a>{' '}
          monitors usage, budgets, and alerts in real time.
        </p>
      </section>

      {/* The three why's */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Why it bleeds</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {leakOrder.map((leak) => (
            <Link
              key={leak}
              href={`/solution/${leak}`}
              className="group block rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-emerald-300 hover:bg-emerald-50/30 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-900 dark:hover:bg-emerald-950/20"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: LEAK_COLOR[leak] }} />
                  {LEAK_LABEL[leak]}
                </span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: LEAK_COLOR[leak] }}>
                  {usd(report.byLeak[leak])}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{LEAK_WHY[leak]}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 group-hover:gap-2 dark:text-emerald-400">
                See the fix →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Charts */}
      <section className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Spend by team</CardTitle>
          <CardHint>Recoverable (green) vs. unavoidable (grey), stacked to gross spend.</CardHint>
          <div className="mt-4 text-zinc-400 dark:text-zinc-500">
            <TeamSpendChart data={teamChartData} />
          </div>
        </Card>
        <Card>
          <CardTitle>Where the leak is</CardTitle>
          <CardHint>Recoverable spend by failure mode.</CardHint>
          <div className="mt-4">
            <LeakDonut data={leakChartData} />
          </div>
          <ul className="mt-2 space-y-1.5">
            {leakChartData.map((d) => (
              <li key={d.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span className="font-medium tabular-nums">{usd(d.value)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* Team table */}
      <Card>
        <CardTitle>Team breakdown</CardTitle>
        <CardHint>Each team’s workload, its dominant leak, and how much is bleeding.</CardHint>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="py-2 pr-4 font-medium">Team</th>
                <th className="py-2 pr-4 font-medium">Workload</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Top leak</th>
                <th className="py-2 pr-4 text-right font-medium">Gross</th>
                <th className="py-2 text-right font-medium">Bleeding</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => {
                const team = org.teams.find((x) => x.id === t.teamId)!;
                const share = t.gross > 0 ? t.recoverable / t.gross : 0;
                const sev = SEVERITY_STYLE[severityFromShare(share)];
                return (
                  <tr key={t.teamId} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                    <td className="py-3 pr-4 font-medium">{teamName(t.teamId)}</td>
                    <td className="py-3 pr-4 text-zinc-500 dark:text-zinc-400">{team.primaryWorkflow}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${sev.bg} ${sev.text}`}
                      >
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${sev.dot}`} />
                        {sev.label}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-zinc-600 dark:text-zinc-300">
                      {t.topLeak ? LEAK_LABEL[t.topLeak] : '—'}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">{usd(t.gross)}</td>
                    <td className="py-3 text-right font-medium tabular-nums text-red-600 dark:text-red-400">
                      {t.recoverable > 0 ? usd(t.recoverable) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <NavButtons next={{ href: '/solution', label: 'See how we stop the bleed' }} />

      <footer className="mt-10 flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-400 dark:text-zinc-600">
        <span className="rounded-full border border-zinc-200 px-2.5 py-1 dark:border-zinc-800">
          Category · sub-agent &amp; dashboard
        </span>
        <span className="rounded-full border border-zinc-200 px-2.5 py-1 dark:border-zinc-800">
          Track 04 · Optimize the Platform
        </span>
      </footer>
    </PageShell>
  );
}
