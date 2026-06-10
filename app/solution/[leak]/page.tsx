import { notFound } from 'next/navigation';
import { PLAYBOOKS } from '@/lib/playbook';
import { org } from '@/lib/data';
import { buildSavingsReport } from '@/lib/savings';
import { LEAK_COLOR, LEAK_LABEL, LeakTypeGuard, usd } from '@/lib/format';
import { LeakType } from '@/lib/types';
import { Card, CardTitle, Eyebrow, NavButtons, PageShell, Stepper } from '../../components/ui';

export function generateStaticParams() {
  return (Object.keys(PLAYBOOKS) as LeakType[]).map((leak) => ({ leak }));
}

export default async function FixDetail({ params }: { params: Promise<{ leak: string }> }) {
  const { leak } = await params;
  if (!LeakTypeGuard(leak)) notFound();

  const pb = PLAYBOOKS[leak];
  const report = buildSavingsReport(org);
  const amount = report.byLeak[leak];
  const color = LEAK_COLOR[leak];
  const teamName = (id: string) => org.teams.find((t) => t.id === id)?.name ?? id;
  const targetTeams = report.byTeam.filter((t) => t.topLeak === leak).map((t) => teamName(t.teamId));

  return (
    <PageShell>
      <Stepper current={2} />

      <header className="mb-8">
        <Eyebrow>
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
          Fixing {LEAK_LABEL[leak].toLowerCase()}
        </Eyebrow>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">{pb.fixTitle}</h1>
        <p className="mt-2 max-w-2xl text-base font-medium text-zinc-700 dark:text-zinc-300">{pb.tagline}</p>
        <div className="mt-4 inline-flex items-baseline gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 dark:border-emerald-900 dark:bg-emerald-950/40">
          <span className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Recovers
          </span>
          <span className="text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
            {usd(amount)}/mo
          </span>
          {targetTeams.length > 0 && (
            <span className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
              · biggest wins: {targetTeams.join(', ')}
            </span>
          )}
        </div>
      </header>

      {/* How it works */}
      <Card className="mb-4">
        <CardTitle>How it works</CardTitle>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{pb.how}</p>
      </Card>

      {/* Before / after */}
      <section className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-red-200 dark:border-red-900/50">
          <div className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
            {pb.beforeLabel}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{pb.before}</p>
          <CodeBlock code={pb.codeBefore} tone="bad" />
        </Card>
        <Card className="border-emerald-200 dark:border-emerald-900/50">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            {pb.afterLabel}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{pb.after}</p>
          <CodeBlock code={pb.codeAfter} tone="good" />
        </Card>
      </section>

      {/* Steps */}
      <Card className="mb-4">
        <CardTitle>How to roll it out</CardTitle>
        <ol className="mt-3 space-y-3">
          {pb.steps.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: color }}
              >
                {i + 1}
              </span>
              <div>
                <div className="text-sm font-semibold">{s.title}</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">{s.body}</div>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      {/* Watch-outs + economics */}
      <section className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Watch-outs</CardTitle>
          <ul className="mt-3 space-y-2">
            {pb.watchOuts.map((w) => (
              <li key={w} className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <span className="text-amber-500">⚠</span>
                {w}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="bg-zinc-50 dark:bg-zinc-900/60">
          <CardTitle>Why the math works</CardTitle>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{pb.economics}</p>
        </Card>
      </section>

      <NavButtons
        back={{ href: '/solution', label: 'Back to all fixes' }}
        next={{ href: '/guardrails', label: 'Keep it from coming back' }}
      />
    </PageShell>
  );
}

function CodeBlock({ code, tone }: { code: string; tone: 'good' | 'bad' }) {
  const accent = tone === 'good' ? 'border-l-emerald-400' : 'border-l-red-400';
  return (
    <pre
      className={`mt-3 overflow-x-auto rounded-lg border border-l-2 ${accent} border-zinc-200 bg-zinc-950 p-3 text-xs leading-relaxed text-zinc-100 dark:border-zinc-800`}
    >
      <code>{code}</code>
    </pre>
  );
}
