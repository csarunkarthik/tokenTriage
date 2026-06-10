import { org } from '@/lib/data';
import { buildSavingsReport, spendByModel } from '@/lib/savings';
import { ModelTier } from '@/lib/types';
import { LEAK_LABEL, pct, usd } from '@/lib/format';
import { LeakDonut, SpendTrendChart, type LeakDatum, type TrendDatum } from '../components/charts';
import { Card, CardHint, CardTitle, Eyebrow, Kpi, PageShell } from '../components/ui';

// "Live" snapshot: today is day 10 of a 30-day period (see currentDate).
const DAY = 10;
const DAYS = 30;
const FRAC = DAY / DAYS;

// A team's budget is its efficient (post-fix) run-rate plus 30% headroom —
// so teams that are bleeding show up as over budget until the fixes land,
// while a clean team comfortably stays on track.
function teamBudget(after: number): number {
  return Math.round((after * 1.3) / 500) * 500;
}

const MODEL_COLOR: Record<ModelTier, string> = {
  'opus-4.8': '#6366f1',
  'sonnet-4.6': '#0ea5e9',
  'haiku-4.5': '#94a3b8',
};
const MODEL_LABEL: Record<ModelTier, string> = {
  'opus-4.8': 'Opus 4.8',
  'sonnet-4.6': 'Sonnet 4.6',
  'haiku-4.5': 'Haiku 4.5',
};

function budgetStatus(ratio: number) {
  if (ratio >= 1) return { label: 'Over budget', cls: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400', bar: 'bg-red-500' };
  if (ratio >= 0.8) return { label: 'At risk', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400', bar: 'bg-amber-500' };
  return { label: 'On track', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400', bar: 'bg-emerald-500' };
}

export default function Dashboard() {
  const report = buildSavingsReport(org);
  const teamName = (id: string) => org.teams.find((t) => t.id === id)?.name ?? id;

  const rows = report.byTeam
    .map((t) => {
      const after = t.gross - t.recoverable;
      const budget = teamBudget(after);
      const mtd = t.gross * FRAC;
      const projected = t.gross;
      const ratio = budget > 0 ? projected / budget : 0;
      return { ...t, name: teamName(t.teamId), budget, mtd, projected, ratio };
    })
    .sort((a, b) => b.ratio - a.ratio);

  const orgBudget = rows.reduce((s, r) => s + r.budget, 0);
  const orgMtd = report.orgGross * FRAC;
  const orgProjected = report.orgGross;
  const orgRatio = orgProjected / orgBudget;
  const alerts = rows.filter((r) => r.ratio >= 0.8);

  // Model mix
  const byModel = spendByModel(org);
  const modelData: LeakDatum[] = (Object.keys(byModel) as ModelTier[])
    .map((m) => ({ name: MODEL_LABEL[m], value: Math.round(byModel[m]), color: MODEL_COLOR[m] }))
    .sort((a, b) => b.value - a.value);

  // 30-day spend trend. From today, two futures: do-nothing (keeps the current
  // burn rate, ends over budget) and with-fixes (rate drops, lands back under
  // budget at the optimized run-rate).
  const actualToday = report.orgGross * FRAC;
  const optimizedMonthEnd = report.afterSpend; // fixes-only run-rate, under budget
  const trend: TrendDatum[] = Array.from({ length: DAYS }, (_, i) => {
    const d = i + 1;
    const budgetCum = orgBudget * (d / DAYS);
    const actualCum = report.orgGross * (d / DAYS);
    const optimizedCum = actualToday + (optimizedMonthEnd - actualToday) * ((d - DAY) / (DAYS - DAY));
    return {
      day: d,
      budget: Math.round(budgetCum),
      actual: d <= DAY ? Math.round(actualCum) : null,
      projected: d >= DAY ? Math.round(actualCum) : null,
      optimized: d >= DAY ? Math.round(optimizedCum) : null,
    };
  });

  return (
    <PageShell>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live usage · {org.name}
          </Eyebrow>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Spend monitor</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Day {DAY} of {DAYS} · {org.teams.length} teams · {org.engineers} engineers
          </p>
        </div>
        <div
          className={`rounded-xl border px-5 py-3 text-right ${
            orgRatio >= 1
              ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40'
              : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40'
          }`}
        >
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Projected vs budget</div>
          <div className={`text-2xl font-semibold tabular-nums ${orgRatio >= 1 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {pct(orgRatio)}
          </div>
          <div className="text-xs text-zinc-500">
            {usd(orgProjected)} of {usd(orgBudget)}
          </div>
        </div>
      </header>

      {/* KPIs */}
      <section className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Spend month-to-date" value={usd(orgMtd)} sub={`day ${DAY} of ${DAYS}`} />
        <Kpi label="Monthly budget" value={usd(orgBudget)} sub="optimized run-rate + 30%" />
        <Kpi
          label="Projected month-end"
          value={usd(orgProjected)}
          sub={`${pct(orgRatio)} of budget`}
          tone={orgRatio >= 1 ? 'bad' : 'good'}
        />
        <Kpi label="Active alerts" value={String(alerts.length)} sub="teams ≥ 80% of budget" tone={alerts.length ? 'bad' : 'good'} />
      </section>

      {/* Trend + model mix */}
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Cumulative spend vs. budget pace</CardTitle>
          <CardHint>
            Solid green is actual to date. From today: red projects month-end at the current rate (over budget);
            green dashed is the path once the fixes land — back under the grey budget line.
          </CardHint>
          <div className="mt-4 text-zinc-400 dark:text-zinc-500">
            <SpendTrendChart data={trend} />
          </div>
        </Card>
        <Card>
          <CardTitle>Spend by model</CardTitle>
          <CardHint>Where the tokens go.</CardHint>
          <div className="mt-4">
            <LeakDonut data={modelData} />
          </div>
          <ul className="mt-2 space-y-1.5">
            {modelData.map((d) => (
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

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/20">
          <CardTitle>⚠ Budget alerts</CardTitle>
          <ul className="mt-3 space-y-2">
            {alerts.map((r) => {
              const crossed = r.ratio >= 1 ? '100%' : '80%';
              return (
                <li key={r.teamId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-zinc-600 dark:text-zinc-300">
                    projected <span className="font-semibold tabular-nums">{usd(r.projected)}</span> ·{' '}
                    <span className={r.ratio >= 1 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}>
                      crossed {crossed} threshold ({pct(r.ratio)})
                    </span>
                    {r.topLeak && <span className="text-zinc-400"> · driver: {LEAK_LABEL[r.topLeak]}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Per-team budget table */}
      <Card>
        <CardTitle>Team budgets</CardTitle>
        <CardHint>Month-to-date and projected spend against each team’s monthly envelope.</CardHint>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="py-2 pr-4 font-medium">Team</th>
                <th className="py-2 pr-4 text-right font-medium">MTD</th>
                <th className="py-2 pr-4 text-right font-medium">Projected</th>
                <th className="py-2 pr-4 text-right font-medium">Budget</th>
                <th className="py-2 pr-4 font-medium">Utilization</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const st = budgetStatus(r.ratio);
                return (
                  <tr key={r.teamId} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                    <td className="py-3 pr-4 font-medium">{r.name}</td>
                    <td className="py-3 pr-4 text-right tabular-nums text-zinc-500">{usd(r.mtd)}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{usd(r.projected)}</td>
                    <td className="py-3 pr-4 text-right tabular-nums text-zinc-500">{usd(r.budget)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                          <div className={`h-full rounded-full ${st.bar}`} style={{ width: `${Math.min(100, r.ratio * 100)}%` }} />
                        </div>
                        <span className="tabular-nums text-xs text-zinc-500">{pct(r.ratio)}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-600">
        Snapshot from sample data · budgets set to the post-optimization run-rate so today’s waste reads as over-budget.
      </p>
    </PageShell>
  );
}
