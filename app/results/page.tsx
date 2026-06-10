import { org } from '@/lib/data';
import { buildSavingsReport } from '@/lib/savings';
import { pct, usd } from '@/lib/format';
import { BeforeAfterChart, type BeforeAfterDatum } from '../components/charts';
import { SavingsExplorer } from '../components/savings-explorer';
import { Card, CardHint, CardTitle, Eyebrow, Kpi, NavButtons, PageShell, Stepper } from '../components/ui';

export default function Results() {
  const report = buildSavingsReport(org);
  const teamName = (id: string) => org.teams.find((t) => t.id === id)?.name ?? id;

  const afterAll = report.afterSpend - report.batchRecovery;
  const totalSaved = report.recoverableTotal + report.batchRecovery;
  const totalPct = report.orgGross > 0 ? totalSaved / report.orgGross : 0;

  const teams = [...report.byTeam].sort((a, b) => b.gross - a.gross);
  const chartData: BeforeAfterDatum[] = teams.map((t) => ({
    name: teamName(t.teamId),
    before: Math.round(t.gross),
    after: Math.round(t.gross - t.recoverable),
  }));

  return (
    <PageShell>
      <Stepper current={4} />

      <header className="mb-8">
        <Eyebrow>The result · after rollout</Eyebrow>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">What it looks like fixed</h1>
        <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
          With the three fixes plus the batch sweep live, {org.name}’s monthly Claude spend drops from{' '}
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{usd(report.orgGross)}</span> to{' '}
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{usd(afterAll)}</span> —
          a <span className="font-semibold">{pct(totalPct)}</span> cut, same workloads.
        </p>
      </header>

      {/* Before / after headline */}
      <section className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Before / mo" value={usd(report.orgGross)} sub="original run-rate" tone="bad" />
        <Kpi label="After / mo" value={usd(afterAll)} sub="fixes + batch sweep" tone="good" />
        <Kpi label="Saved / mo" value={usd(totalSaved)} sub={`${pct(totalPct)} lower`} tone="good" />
        <Kpi label="Saved / yr" value={usd(totalSaved * 12)} sub="at current run-rate" tone="good" />
      </section>

      {/* Per-team before/after */}
      <Card>
        <CardTitle>Spend per team — before vs. after</CardTitle>
        <CardHint>Grey is today’s spend; green is the optimized run-rate.</CardHint>
        <div className="mt-4">
          <BeforeAfterChart data={chartData} />
        </div>
        <div className="mt-3 flex items-center gap-6 text-xs text-zinc-500">
          <span className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-300" /> Before
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" /> After
          </span>
        </div>
      </Card>

      {/* Detail table */}
      <Card className="mt-4">
        <CardTitle>Team-by-team</CardTitle>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="py-2 pr-4 font-medium">Team</th>
                <th className="py-2 pr-4 text-right font-medium">Before</th>
                <th className="py-2 pr-4 text-right font-medium">After</th>
                <th className="py-2 text-right font-medium">Reduction</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => {
                const after = t.gross - t.recoverable;
                const red = t.gross > 0 ? t.recoverable / t.gross : 0;
                return (
                  <tr key={t.teamId} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                    <td className="py-3 pr-4 font-medium">{teamName(t.teamId)}</td>
                    <td className="py-3 pr-4 text-right tabular-nums text-zinc-500">{usd(t.gross)}</td>
                    <td className="py-3 pr-4 text-right font-medium tabular-nums">{usd(after)}</td>
                    <td className="py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                      {red > 0 ? `−${pct(red)}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-200 font-medium dark:border-zinc-700">
                <td className="py-3 pr-4">Total (fixes only)</td>
                <td className="py-3 pr-4 text-right tabular-nums text-zinc-500">{usd(report.orgGross)}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{usd(report.afterSpend)}</td>
                <td className="py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                  −{pct(report.recoverablePct)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          Batch sweep adds a further {usd(report.batchRecovery)}/mo on top, landing the org at {usd(afterAll)}/mo.
        </p>
      </Card>

      {/* Interactive: model your own rollout */}
      <Card className="mt-4">
        <CardTitle>Model your own rollout</CardTitle>
        <CardHint>Drag each fix’s adoption to see the projected spend update live.</CardHint>
        <div className="mt-4">
          <SavingsExplorer
            inputs={{
              gross: report.orgGross,
              cacheMiss: report.byLeak['cache-miss'],
              modelMismatch: report.byLeak['model-mismatch'],
              promptWaste: report.byLeak['prompt-waste'],
              batch: report.batchRecovery,
            }}
          />
        </div>
      </Card>

      <NavButtons
        back={{ href: '/guardrails', label: 'Back to guardrails' }}
        next={{ href: '/audit', label: 'Start over' }}
      />
    </PageShell>
  );
}
