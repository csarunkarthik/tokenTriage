import { LeakType, Severity } from './types';

export function usd(n: number): string {
  if (Math.abs(n) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(n);
}

export function pct(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}

export const LEAK_LABEL: Record<LeakType, string> = {
  'prompt-waste': 'Prompt waste',
  'cache-miss': 'Cache miss',
  'model-mismatch': 'Model mismatch',
};

export const LEAK_COLOR: Record<LeakType, string> = {
  'prompt-waste': '#f59e0b', // amber
  'cache-miss': '#ef4444', // red
  'model-mismatch': '#6366f1', // indigo
};

// Narrative copy for the walkthrough: why each leak bleeds tokens, and the fix.
export const LEAK_WHY: Record<LeakType, string> = {
  'cache-miss':
    'Repeated system prompts and retrieved context are re-sent uncached on every call, so the same tokens are billed at full input price again and again.',
  'model-mismatch':
    'High-tier models (Opus / Sonnet) are used for routine work that a cheaper tier handles just as well — paying premium per-token rates for no quality gain.',
  'prompt-waste':
    'Bloated prompts carry stale instructions, duplicated context, and verbose scaffolding far above the task baseline — every extra token is billed.',
};

export const LEAK_FIX: Record<LeakType, { title: string; body: string }> = {
  'cache-miss': {
    title: 'Prompt caching & cache-aware routing',
    body: 'Mark stable prefixes (system prompts, knowledge) as cache breakpoints so reads bill at 10% of input. TokenTriage flags hot paths that should be cached and shapes requests to maximize cache hits.',
  },
  'model-mismatch': {
    title: 'Smart model routing',
    body: 'Right-size each request to the cheapest tier that meets the quality bar — auto-downgrade routine calls from Opus→Sonnet and Sonnet→Haiku, escalating only when needed.',
  },
  'prompt-waste': {
    title: 'Context compression',
    body: 'Trim prompts back toward their task baseline: dedupe context, drop stale instructions, and compress scaffolding before the call is made.',
  },
};

// Severity by share of a team's gross spend that is recoverable.
export function severityFromShare(recoverableShare: number): Severity {
  if (recoverableShare >= 0.4) return 'critical';
  if (recoverableShare >= 0.15) return 'warning';
  return 'healthy';
}

export const SEVERITY_STYLE: Record<Severity, { label: string; dot: string; text: string; bg: string }> = {
  critical: { label: 'Critical', dot: 'bg-red-500', text: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/40' },
  warning: { label: 'Warning', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' },
  healthy: { label: 'Healthy', dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
};
