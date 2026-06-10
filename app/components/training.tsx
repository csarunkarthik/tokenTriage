'use client';

import { useMemo, useState } from 'react';
import { MODULES, TIERS } from '@/lib/training';
import { usd } from '@/lib/format';

export function TrainingExplorer() {
  // answered[moduleId] = index of chosen option (or undefined)
  const [answered, setAnswered] = useState<Record<string, number>>({});

  const passed = useMemo(
    () =>
      MODULES.filter((m) => {
        const choice = answered[m.id];
        return choice !== undefined && m.options[choice]?.correct;
      }).length,
    [answered],
  );

  // Tier unlock: 0 passed → Starter, 2 → Practitioner, 3 → Expert.
  const unlockedIndex = passed >= 3 ? 2 : passed >= 2 ? 1 : 0;
  const currentCap = TIERS[unlockedIndex].monthlyCap;

  return (
    <div>
      {/* Tier ladder */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {TIERS.map((tier, i) => {
          const unlocked = i <= unlockedIndex;
          return (
            <div
              key={tier.id}
              className={`relative rounded-xl border p-4 transition-colors ${
                unlocked
                  ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30'
                  : 'border-zinc-200 bg-white opacity-70 dark:border-zinc-800 dark:bg-zinc-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{tier.name}</span>
                <span
                  className={`text-xs font-medium ${
                    unlocked ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'
                  }`}
                >
                  {unlocked ? '✓ unlocked' : '🔒 locked'}
                </span>
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">
                {usd(tier.monthlyCap)}
                <span className="text-sm font-normal text-zinc-400">/mo</span>
              </div>
              <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{tier.unlock}</div>
              <ul className="mt-2 space-y-1">
                {tier.perks.map((p) => (
                  <li key={p} className="flex items-start gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                    <span className="text-emerald-500">·</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Live status */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="text-sm">
          <span className="font-medium">{passed} / {MODULES.length}</span> modules passed —{' '}
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {TIERS[unlockedIndex].name}
          </span>{' '}
          tier, cap <span className="font-semibold tabular-nums">{usd(currentCap)}/mo</span>
        </div>
        <div className="h-2 w-40 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${(passed / MODULES.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Modules */}
      <div className="space-y-4">
        {MODULES.map((m) => {
          const choice = answered[m.id];
          const isAnswered = choice !== undefined;
          const isCorrect = isAnswered && m.options[choice]?.correct;
          return (
            <div key={m.id} className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">{m.topic}</h3>
                <span className="flex items-center gap-2 text-xs text-zinc-400">
                  {m.minutes} min
                  {isAnswered &&
                    (isCorrect ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                        Passed
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700 dark:bg-red-950/60 dark:text-red-400">
                        Try again
                      </span>
                    ))}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{m.lesson}</p>

              <div className="mt-4 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                <div className="text-sm font-medium">{m.question}</div>
                <div className="mt-2 space-y-1.5">
                  {m.options.map((opt, i) => {
                    const chosen = choice === i;
                    let cls =
                      'border-zinc-200 hover:border-emerald-300 dark:border-zinc-700 dark:hover:border-emerald-700';
                    if (isAnswered) {
                      if (opt.correct) cls = 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40';
                      else if (chosen) cls = 'border-red-400 bg-red-50 dark:bg-red-950/40';
                      else cls = 'border-zinc-200 opacity-60 dark:border-zinc-700';
                    }
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setAnswered((prev) => ({ ...prev, [m.id]: i }))}
                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${cls}`}
                      >
                        <span>{opt.text}</span>
                        {isAnswered && opt.correct && <span className="text-emerald-600">✓</span>}
                        {isAnswered && chosen && !opt.correct && <span className="text-red-600">✕</span>}
                      </button>
                    );
                  })}
                </div>
                {isAnswered && (
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {isCorrect ? '✓ ' : ''}
                    {m.explanation}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {passed === MODULES.length && (
        <div className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50 p-5 text-center dark:border-emerald-800 dark:bg-emerald-950/40">
          <div className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
            🎉 Expert tier unlocked — cap raised to {usd(TIERS[2].monthlyCap)}/mo
          </div>
          <p className="mt-1 text-sm text-emerald-600/90 dark:text-emerald-400/90">
            Engineers who understand caching, routing, and prompt hygiene earn higher limits — and bleed far less.
          </p>
        </div>
      )}
    </div>
  );
}
