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
