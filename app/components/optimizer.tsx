'use client';

import { useState } from 'react';
import { OptimizeResult, dollarsSaved, estimateTokens, EXAMPLE_PROMPT } from '@/lib/optimize';
import { ALL_MODELS, PROVIDER_LABEL, PROVIDER_COLOR, PROVIDER_TEXT, TASK_LABEL, type Provider } from '@/lib/models';
import { usd } from '@/lib/format';

const VOLUMES = [1_000, 100_000, 1_000_000];

function money(n: number): string {
  if (n === 0) return '$0';
  if (n < 0.00001) return `<$0.00001`;
  if (n < 0.01) return `$${n.toFixed(5)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return usd(n);
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

export function Optimizer() {
  const [input, setInput] = useState(EXAMPLE_PROMPT);
  const [selectedModelId, setSelectedModelId] = useState('claude-sonnet-4-6');
  const [calls, setCalls] = useState(100_000);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const estimatedInputTokens = estimateTokens(input);
  const selectedModel = ALL_MODELS.find(m => m.id === selectedModelId) ?? ALL_MODELS[1];

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
    } catch { /* blocked */ }
  };

  const dollars = result
    ? dollarsSaved(result.tokensSaved, selectedModel.inputPerMTok, calls)
    : { perCall: 0, perMonth: 0, perYear: 0 };

  const afterPct = result && result.tokensBefore > 0
    ? Math.min(100, (result.tokensAfter / result.tokensBefore) * 100)
    : 100;

  const netPerMonth = result ? Math.max(0, dollars.perMonth - result.optimizationCost) : 0;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">

      {/* ── Input / Output ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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
            <button type="button" onClick={() => { setInput(EXAMPLE_PROMPT); setResult(null); setError(null); }}
              className="rounded-full border border-zinc-200 px-2.5 py-1 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
              Load example
            </button>
            <button type="button" onClick={() => { setInput(''); setResult(null); setError(null); }}
              className="rounded-full border border-zinc-200 px-2.5 py-1 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
              Clear
            </button>
            <span>~{estimatedInputTokens} tokens</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              Optimized prompt
            </label>
            <button type="button" onClick={copy} disabled={!result}
              className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-medium hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800">
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
              <span className="text-zinc-400">Optimized prompt appears here after you click Optimize</span>
            )}
          </div>
          {result && <div className="mt-2 text-xs text-zinc-500">{result.tokensAfter} tokens (est.)</div>}
        </div>
      </div>

      {/* ── Optimize button ─────────────────────────────────────── */}
      <div className="mt-4 flex justify-center">
        <button type="button" onClick={optimize} disabled={loading || !input.trim()}
          className="rounded-full bg-emerald-600 px-8 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? 'Optimizing…' : 'Optimize prompt'}
        </button>
      </div>

      {result && (
        <>
          {/* ── Token impact bar ──────────────────────────────────── */}
          <div className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
              <span className="font-medium">Token impact</span>
              <span className="whitespace-nowrap tabular-nums text-xs sm:text-sm">
                {compact(result.tokensBefore)} →{' '}
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {compact(result.tokensAfter)}
                </span>{' '}
                <span className="text-zinc-500">
                  (−{compact(result.tokensSaved)}, −{Math.round(result.pctSaved * 100)}%)
                </span>
              </span>
            </div>

            {result.mode === 'expanded' && result.roundsSaved && (
              <p className="mt-1 text-xs text-zinc-400">
                Before = {result.rawTokensBefore} prompt + ~{result.roundsSaved * 150} from{' '}
                {result.roundsSaved} expected follow-up{result.roundsSaved > 1 ? 's' : ''}
              </p>
            )}

            <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${afterPct}%` }} />
              <div className="h-full bg-red-400/70 transition-all" style={{ width: `${100 - afterPct}%` }} />
            </div>
            <div className="mt-1.5 flex items-center gap-5 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" /> optimized
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-400/70" /> eliminated
              </span>
            </div>
          </div>

          {/* ── Reasoning ─────────────────────────────────────────── */}
          <div className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-400">
                Why this saves tokens
              </span>
              {result.taskType && (
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                  {TASK_LABEL[result.taskType]}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {result.explanation}
            </p>
          </div>

          {/* ── Model recommendations ─────────────────────────────── */}
          {result.recommendations && (
            <div className="mt-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Best model for this task
              </div>
              <p className="mt-0.5 text-xs text-zinc-400">
                Cheapest capable option per provider for <em>{TASK_LABEL[result.taskType]}</em>
              </p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {(['anthropic', 'openai', 'google'] as Provider[]).map((p) => {
                  const m = result.recommendations[p];
                  if (!m) return null;
                  return (
                    <div
                      key={p}
                      className={`rounded-xl border p-3 ${PROVIDER_COLOR[p]}`}
                    >
                      <div className={`text-[11px] font-semibold uppercase tracking-wide ${PROVIDER_TEXT[p]}`}>
                        {PROVIDER_LABEL[p]}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-100">{m.name}</span>
                        {m.isReasoning && (
                          <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                            thinking
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        ${m.inputPerMTok} / ${m.outputPerMTok} per MTok
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Dollar impact ─────────────────────────────────────── */}
          <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {/* Model selector — all 10 models, grouped */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-zinc-500">Model</span>
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                >
                  {(['anthropic', 'openai', 'google'] as Provider[]).map((p) => (
                    <optgroup key={p} label={PROVIDER_LABEL[p]}>
                      {ALL_MODELS.filter(m => m.provider === p).map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} (${m.inputPerMTok}/MTok)
                          {result.recommendations?.[p]?.id === m.id ? ' ★' : ''}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Volume selector */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-zinc-500">Calls / mo</span>
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

            {/* 3-stat row — responsive */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <StatBox
                label="Saved / call"
                value={money(dollars.perCall)}
                sub={`${compact(result.tokensSaved)} tokens`}
              />
              <StatBox
                label="Opt. cost"
                value={money(result.optimizationCost)}
                sub="one-time"
                muted
              />
              <StatBox
                label="Net / month"
                value={money(netPerMonth)}
                sub={`at ${compact(calls)} calls`}
                accent
              />
            </div>

            <p className="mt-2 text-xs text-zinc-400">
              Net = (saved/call × {compact(calls)} calls) − optimization cost.
              {result.mode === 'expanded' ? ' Includes avoided follow-up tokens.' : ''}
              {' '}★ = recommended model for this task.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function StatBox({
  label, value, sub, accent, muted,
}: {
  label: string; value: string; sub?: string; accent?: boolean; muted?: boolean;
}) {
  return (
    <div className="flex flex-col rounded-lg border border-zinc-200 bg-white p-2 sm:p-3 dark:border-zinc-700 dark:bg-zinc-800">
      <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:text-[11px]">{label}</div>
      <div className={`mt-0.5 truncate text-base font-semibold tabular-nums sm:text-xl ${
        accent ? 'text-emerald-600 dark:text-emerald-400' : muted ? 'text-zinc-400 dark:text-zinc-500' : ''
      }`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[10px] text-zinc-400">{sub}</div>}
    </div>
  );
}
