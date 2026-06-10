import { Card, CardHint, CardTitle, Eyebrow, NavButtons, PageShell, Stepper } from '../components/ui';
import { TrainingExplorer } from '../components/training';

const CONTROLS = [
  {
    title: 'Low default per-engineer cap',
    body: 'Everyone starts at a minimal monthly budget. Enough to build and ship — not enough for a runaway loop to cost five figures unnoticed.',
  },
  {
    title: 'Per-team budgets & chargeback',
    body: 'Each team gets a monthly envelope, with spend attributed back to the team so cost sits next to the people who can change it.',
  },
  {
    title: 'Model-access policy',
    body: 'Opus is gated behind a tier; Haiku and Sonnet are open. The default path is the cheap path.',
  },
  {
    title: '50 / 80 / 100% alerts',
    body: 'Automated threshold alerts fire before a budget is blown, not after the invoice arrives.',
  },
];

export default function Guardrails() {
  return (
    <PageShell>
      <Stepper current={3} />

      <header className="mb-8">
        <Eyebrow>Guardrails · prevent the next bleed</Eyebrow>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Stop it from coming back</h1>
        <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
          Fixing today’s waste is half the job. Enterprises run{' '}
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">3–5× over budget</span> within months
          when there are no guardrails. TokenTriage sets a low default cap for every engineer — and lets them{' '}
          <span className="font-semibold">earn a higher limit by proving they know how to spend efficiently.</span>
        </p>
      </header>

      {/* The four controls */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Cost controls</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CONTROLS.map((c) => (
            <Card key={c.title}>
              <CardTitle>{c.title}</CardTitle>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{c.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* The training-to-unlock mechanism (interactive) */}
      <section className="mb-8">
        <div className="mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Earn your limit — interactive
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            To raise your cap, pass short modules on prompting, caching, and routing — each with a real mock
            question. Answer them below to unlock the tiers live.
          </p>
        </div>
        <TrainingExplorer />
      </section>

      <Card className="bg-zinc-50 dark:bg-zinc-900/60">
        <CardTitle>Why gate limits on training?</CardTitle>
        <CardHint>The research take</CardHint>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          Per-user caps, per-team budgets, model policies, and threshold alerts are the standard FinOps-for-GenAI
          controls. What’s novel here is tying the <em>limit</em> to demonstrated skill: the three leaks on the
          previous screens are almost always caused by engineers who haven’t learned caching, routing, or prompt
          hygiene. Teaching that as the gate to a bigger budget fixes the bleed at its source — and the people who
          most want a higher cap are exactly the ones who most need the lesson.
        </p>
      </Card>

      <NavButtons
        back={{ href: '/solution', label: 'Back to the fix' }}
        next={{ href: '/results', label: 'See the result' }}
      />
    </PageShell>
  );
}
