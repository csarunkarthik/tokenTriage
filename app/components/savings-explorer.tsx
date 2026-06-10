'use client';

import { useState } from 'react';
import { usd } from '@/lib/format';

export interface ExplorerInputs {
  gross: number;
  cacheMiss: number;
  modelMismatch: number;
  promptWaste: number;
  batch: number;
}

const FIXES = [
  { key: 'cacheMiss', label: 'Prompt caching', color: '#ef4444' },
  { key: 'modelMismatch', label: 'Model routing', color: '#6366f1' },
  { key: 'promptWaste', label: 'Context compression', color: '#f59e0b' },
] as const;

export function SavingsExplorer({ inputs }: { inputs: ExplorerInputs }) {
  const [adoption, setAdoption] = useState({ cacheMiss: 100, modelMismatch: 100, promptWaste: 100 });
  const [batchOn, setBatchOn] = useState(true);

  const recovered =
    inputs.cacheMiss * (adoption.cacheMiss / 100) +
    inputs.modelMismatch * (adoption.modelMismatch / 100) +
    inputs.promptWaste * (adoption.promptWaste / 100);
  const batch = batchOn ? inputs.batch : 0;
  const totalSaved = recovered + batch;
  const after = inputs.gross - totalSaved;
  const savedPct = inputs.gross > 0 ? (totalSaved / inputs.gross) * 100 : 0;

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Sliders */}
        <div className="space-y-4">
          {FIXES.map((f) => {
            const v = adoption[f.key];
            return (
              <div key={f.key}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: f.color }} />
                    {f.label}
                  </span>
                  <span className="tabular-nums text-zinc-500">
                    {v}% · {usd((inputs[f.key] * v) / 100)}/mo
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={v}
                  onChange={(e) => setAdoption((p) => ({ ...p, [f.key]: Number(e.target.value) }))}
                  className="mt-1.5 w-full cursor-pointer accent-emerald-500"
                />
              </div>
            );
          })}
          <label className="flex cursor-pointer items-center gap-2 pt-1 text-sm">
            <input
              type="checkbox"
              checked={batchOn}
              onChange={(e) => setBatchOn(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-emerald-500"
            />
            <span className="font-medium">Batch API sweep</span>
            <span className="text-zinc-500">(+{usd(inputs.batch)}/mo)</span>
          </label>
        </div>

        {/* Live result */}
        <div className="flex flex-col justify-center rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Projected monthly spend</div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-3xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {usd(after)}
            </span>
            <span className="text-sm text-zinc-400 line-through tabular-nums">{usd(inputs.gross)}</span>
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${Math.min(100, savedPct)}%` }}
            />
          </div>
          <div className="mt-2 text-sm">
            Saving <span className="font-semibold tabular-nums">{usd(totalSaved)}/mo</span>{' '}
            <span className="text-zinc-500">({savedPct.toFixed(0)}%)</span> ·{' '}
            <span className="font-medium tabular-nums">{usd(totalSaved * 12)}/yr</span>
          </div>
        </div>
      </div>
    </div>
  );
}
