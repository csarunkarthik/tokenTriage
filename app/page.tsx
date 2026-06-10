import Link from 'next/link';
import { org } from '@/lib/data';
import { buildSavingsReport } from '@/lib/savings';
import { usd, pct } from '@/lib/format';
import { Optimizer } from './components/optimizer';
import { Card, Eyebrow, PageShell } from './components/ui';

export default function Home() {
  const report = buildSavingsReport(org);

  return (
    <PageShell>
      {/* Hero — the tool is the product */}
      <header className="mb-6 text-center">
        <div className="flex justify-center">
          <Eyebrow>tokenTriage</Eyebrow>
        </div>
        <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Trim any prompt. See the tokens — and dollars — you save.
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-zinc-600 dark:text-zinc-400">
          Paste a prompt. tokenTriage rewrites it leaner — stripping filler, politeness, and wordy phrasing —
          then shows exactly how many tokens and how much money you’ve saved. No API key, runs in your browser.
        </p>
      </header>

      {/* The tool */}
      <Optimizer />

      {/* Why it matters — supporting case study */}
      <section className="mt-10">
        <div className="mb-3 text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">This isn’t just one prompt</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            The same waste compounds across every team. We audited {org.name} to show what it costs at scale.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Gross spend / mo</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{usd(report.orgGross)}</div>
          </Card>
          <Card className="border-red-200 dark:border-red-900/60">
            <div className="text-xs font-medium uppercase tracking-wide text-red-600 dark:text-red-400">Bleeding / mo</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums text-red-600 dark:text-red-400">
              {usd(report.recoverableTotal)}
            </div>
            <div className="mt-0.5 text-xs text-red-500/80">{pct(report.recoverablePct)} recoverable</div>
          </Card>
          <Card>
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Annualized</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{usd(report.recoverableTotal * 12)}</div>
          </Card>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/audit"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            See the full case study →
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Open the live dashboard
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
