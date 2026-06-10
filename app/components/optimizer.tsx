'use client';

import { useState } from 'react';
import { ModelTier } from '@/lib/types';
import { OptimizeResult, dollarsSaved, estimateTokens, EXAMPLE_PROMPT } from '@/lib/optimize';
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
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const estimatedInputTokens = estimateTokens(input);

  const optimize = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
      } else {
        setResult(data as OptimizeResult);
      }
    } catch {
      setError('Network error — could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.optimized);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked; ignore */
    }
  };

  const expanded = result?.mode === 'expanded';
  const dollars = result ? dollarsSaved(result.tokensSaved, model, calls) : { perCall: 0, perMonth: 0, perYear: 0 };
  const afterPct = result && result.tokensBefore > 0
    ? Math.min(100, (result.tokensAfter / result.tokensBefore) * 100)
    : 100;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Input */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Your prompt</label>
          <textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); setResult(null); setError(null); }}
            spellCheck={false}
            className="mt-1.5 h-56 w-full resize-y rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-sm leading-relaxed text-zinc-800 outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            placeholder="Paste a prompt to optimize…"
          />
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <button
              type="button"
              onClick={() => { setInput(EXAMPLE_PROMPT); setResult(null); setError(null); }}
              className="rounded-full border border-zinc-200 px-2.5 py-1 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Load example
            </button>
            <button
              type="button"
              onClick={() => { setInput(''); setResult(null); setError(null); }}
              className="rounded-full border border-zinc-200 px-2.5 py-1 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Clear
            </button>
            <span>~{estimatedInputTokens} tokens</span>
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
              disabled={!result}
              className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-medium hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
          <div className="mt-1.5 h-56 w-full overflow-auto rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 font-mono text-sm leading-relaxed text-zinc-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-zinc-100">
            {loading ? (
              <span className="flex items-center gap-2 text-zinc-400">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
                Optimizing…
              </span>
            ) : error ? (
              <span className="text-red-500">{error}</span>
            ) : result ? (
              result.optimized
            ) : (
              <span className="text-zinc-400">Optimized prompt appears here after you click Optimize →</span>
            )}
          </div>
          {result && (
            <div className="mt-2 text-xs text-zinc-500">{result.tokensAfter} tokens (est.)</div>
          )}
        </div>
      </div>

      {/* Optimize button */}
      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={optimize}
          disabled={loading || !input.trim()}
          className="rounded-full bg-emerald-600 px-8 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Optimizing…' : 'Optimize prompt'}
        </button>
      </div>

      {/* Token impact — only after a result */}
      {result && (
        <div className="mt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Token impact</span>
            <span className="tabular-nums">
              {result.tokensBefore} →{' '}
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{result.tokensAfter}</span>{' '}
              <span className="text-zinc-500">(−{result.tokensSaved}, −{Math.round(result.pctSaved * 100)}%)</span>
            </span>
          </div>

          {/* For expanded prompts, show what makes up the "before" cost */}
          {expanded && result.roundsSaved && (
            <p className="mt-1 text-xs text-zinc-400">
              Before = {result.rawTokensBefore} prompt tokens + ~{result.roundsSaved * 150} from{' '}
              {result.roundsSaved} expected follow-up{result.roundsSaved > 1 ? 's' : ''} the vague prompt would trigger.
            </p>
          )}

          <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${afterPct}%` }} />
            <div className="h-full bg-red-400/70 transition-all" style={{ width: `${100 - afterPct}%` }} />
          </div>
          <div className="mt-1.5 flex items-center gap-5 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" /> optimized</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-400/70" /> eliminated</span>
          </div>

          {/* Why this saves tokens */}
          {result.explanation && (
            <p className="mt-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              <span className="font-medium text-zinc-800 dark:text-zinc-200">Why this saves tokens: </span>
              {result.explanation}
            </p>
          )}
        </div>
      )}

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
          <Stat label="Saved / call" value={result ? money(dollars.perCall) : '—'} />
          <Stat label="Saved / month" value={result ? money(dollars.perMonth) : '—'} accent />
          <Stat label="Saved / year" value={result ? money(dollars.perYear) : '—'} accent />
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          {result
            ? `${result.tokensSaved} tokens saved per call × ${calls.toLocaleString()} calls, at ${MODELS.find((m) => m.v === model)?.rate}.${expanded ? ' Includes follow-up avoidance.' : ''}`
            : 'Optimize a prompt to see the dollar impact at scale.'}
        </p>
      </div>
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
