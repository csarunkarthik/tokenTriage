'use client';

import { useMemo, useState } from 'react';
import { ModelTier } from '@/lib/types';
import { optimizePrompt, dollarsSaved, EXAMPLE_PROMPT } from '@/lib/optimize';
import { usd } from '@/lib/format';

const MODELS: { v: ModelTier; l: string; rate: string }[] = [
  { v: 'haiku-4.5', l: 'Haiku 4.5', rate: '$1 / MTok in' },
  { v: 'sonnet-4.6', l: 'Sonnet 4.6', rate: '$3 / MTok in' },
  { v: 'opus-4.8', l: 'Opus 4.8', rate: '$5 / MTok in' },
];

const VOLUMES = [1_000, 100_000, 1_000_000];

function money(n: number): string {
  if (n === 0) return '$0';
  if (n < 0.01) return `$${n.toFixed(5)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return usd(n);
}

export function Optimizer() {
  const [input, setInput] = useState(EXAMPLE_PROMPT);
  const [model, setModel] = useState<ModelTier>('sonnet-4.6');
  const [calls, setCalls] = useState(100_000);
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => optimizePrompt(input), [input]);
  const dollars = useMemo(
    () => dollarsSaved(result.tokensSaved, model, calls),
    [result.tokensSaved, model, calls],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.optimized);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked; ignore */
    }
  };

  const beforePct = result.tokensBefore > 0 ? (result.tokensAfter / result.tokensBefore) * 100 : 0;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Input */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Your prompt</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            className="mt-1.5 h-56 w-full resize-y rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-sm leading-relaxed text-zinc-800 outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            placeholder="Paste a prompt to trim…"
          />
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <button
              type="button"
              onClick={() => setInput(EXAMPLE_PROMPT)}
              className="rounded-full border border-zinc-200 px-2.5 py-1 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Load example
            </button>
            <button
              type="button"
              onClick={() => setInput('')}
              className="rounded-full border border-zinc-200 px-2.5 py-1 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Clear
            </button>
            <span>{result.tokensBefore} tokens (est.)</span>
          </div>
        </div>

        {/* Output */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              Optimized prompt
            </label>
            <button
              type="button"
              onClick={copy}
              disabled={!result.optimized}
              className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-medium hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
          <div className="mt-1.5 h-56 w-full overflow-auto rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 font-mono text-sm leading-relaxed text-zinc-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-zinc-100">
            {result.optimized || <span className="text-zinc-400">Optimized prompt appears here…</span>}
          </div>
          <div className="mt-2 text-xs text-zinc-500">{result.tokensAfter} tokens (est.)</div>
        </div>
      </div>

      {/* Token bar */}
      <div className="mt-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Token reduction</span>
          <span className="tabular-nums">
            {result.tokensBefore} → <span className="font-semibold text-emerald-600 dark:text-emerald-400">{result.tokensAfter}</span>{' '}
            <span className="text-zinc-500">(−{result.tokensSaved}, {(result.pctSaved * 100).toFixed(0)}%)</span>
          </span>
        </div>
        <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${beforePct}%` }} />
          <div className="h-full bg-red-400/70 transition-all" style={{ width: `${100 - beforePct}%` }} />
        </div>
        <div className="mt-1.5 flex items-center gap-5 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" /> kept</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-400/70" /> trimmed</span>
        </div>
      </div>

      {/* Dollar impact */}
      <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500">Model</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as ModelTier)}
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            >
              {MODELS.map((m) => (
                <option key={m.v} value={m.v}>{m.l} ({m.rate})</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500">Calls / month</span>
            <div className="flex gap-1">
              {VOLUMES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setCalls(v)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    calls === v
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                      : 'border border-zinc-200 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800'
                  }`}
                >
                  {v >= 1_000_000 ? `${v / 1_000_000}M` : `${v / 1000}k`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="Saved / call" value={money(dollars.perCall)} />
          <Stat label="Saved / month" value={money(dollars.perMonth)} accent />
          <Stat label="Saved / year" value={money(dollars.perYear)} accent />
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          {result.tokensSaved} input tokens saved per call × {calls.toLocaleString()} calls, at {MODELS.find((m) => m.v === model)?.rate}. Estimates.
        </p>
      </div>

      {/* What changed */}
      {result.edits.length > 0 && (
        <div className="mt-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">What changed</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {result.edits.map((e, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
              >
                <span className="text-zinc-400">{e.category}</span>
                <span className="font-medium">{e.from}</span>
                {e.count > 1 && <span className="text-zinc-400">×{e.count}</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800">
      <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-0.5 text-xl font-semibold tabular-nums ${accent ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
        {value}
      </div>
    </div>
  );
}
