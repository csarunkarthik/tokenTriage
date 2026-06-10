import { org } from '@/lib/data';
import { buildSavingsReport } from '@/lib/savings';
import { LeakType } from '@/lib/types';
import {
  LEAK_COLOR,
  LEAK_LABEL,
  SEVERITY_STYLE,
  pct,
  severityFromShare,
  usd,
} from '@/lib/format';
import { LeakDonut, TeamSpendChart, type LeakDatum, type TeamSpendDatum } from './components/charts';

export default function Home() {
  const report = buildSavingsReport(org);
  const teamName = (id: string) => org.teams.find((t) => t.id === id)?.name ?? id;

  // Teams sorted by recoverable spend, biggest opportunity first.
  const teams = [...report.byTeam].sort((a, b) => b.recoverable - a.recoverable);

  const teamChartData: TeamSpendDatum[] = teams.map((t) => ({
    name: teamName(t.teamId),
    recoverable: Math.round(t.recoverable),
    remaining: Math.round(t.gross - t.recoverable),
  }));

  const leakOrder: LeakType[] = ['cache-miss', 'model-mismatch', 'prompt-waste'];
  const leakChartData: LeakDatum[] = leakOrder
    .map((leak) => ({
      name: LEAK_LABEL[leak],
      value: Math.round(report.byLeak[leak]),
      color: LEAK_COLOR[leak],
    }))
    .filter((d) => d.value > 0);

  return (
    <div className="min-h-full bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              TokenTriage
            </div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{org.name}</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Token-spend audit · {org.engineers} engineers · trailing {org.periodDays} days
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-right dark:border-emerald-900 dark:bg-emerald-950/40">
            <div className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              Recoverable / month
            </div>
            <div className="text-2xl font-semibold text-emerald-700 dark:text-emerald-300">
              {usd(report.recoverableTotal)}
            </div>
            <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
              {pct(report.recoverablePct)} of gross spend
            </div>
          </div>
        </header>

        {/* KPI cards */}
        <section className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Kpi label="Gross spend" value={usd(report.orgGross)} sub="current run-rate" />
          <Kpi
            label="After optimization"
            value={usd(report.afterSpend)}
            sub={`${pct(report.recoverablePct)} lower`}
            accent
          />
          <Kpi label="Recoverable" value={usd(report.recoverableTotal)} sub="across all leaks" />
          <Kpi
            label="Batch eligible"
            value={usd(report.batchRecovery)}
            sub="extra via Batch API"
          />
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
            <CardTitle>Recoverable by leak</CardTitle>
            <CardHint>Where the savings come from.</CardHint>
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
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="py-2 pr-4 font-medium">Team</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Top leak</th>
                  <th className="py-2 pr-4 text-right font-medium">Gross</th>
                  <th className="py-2 pr-4 text-right font-medium">Recoverable</th>
                  <th className="py-2 text-right font-medium">% saved</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t) => {
                  const share = t.gross > 0 ? t.recoverable / t.gross : 0;
                  const sev = SEVERITY_STYLE[severityFromShare(share)];
                  return (
                    <tr
                      key={t.teamId}
                      className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60"
                    >
                      <td className="py-3 pr-4 font-medium">{teamName(t.teamId)}</td>
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
                      <td className="py-3 pr-4 text-right font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                        {usd(t.recoverable)}
                      </td>
                      <td className="py-3 text-right tabular-nums text-zinc-600 dark:text-zinc-300">
                        {pct(share)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-zinc-200 font-medium dark:border-zinc-700">
                  <td className="py-3 pr-4" colSpan={3}>
                    Total
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">{usd(report.orgGross)}</td>
                  <td className="py-3 pr-4 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                    {usd(report.recoverableTotal)}
                  </td>
                  <td className="py-3 text-right tabular-nums">{pct(report.recoverablePct)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        <footer className="mt-8 text-center text-xs text-zinc-400 dark:text-zinc-600">
          Estimates based on list pricing · de-duplicated across cache → routing → compression.
        </footer>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent
          ? 'border-emerald-200 bg-white dark:border-emerald-900/60 dark:bg-zinc-900'
          : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
      }`}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{sub}</div>
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold">{children}</h2>;
}

function CardHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{children}</p>;
}
