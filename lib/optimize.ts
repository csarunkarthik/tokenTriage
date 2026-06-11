import type { TaskType } from './models';
import type { ModelRec } from './models';

export type { TaskType };

export interface OptimizeResult {
  optimized: string;
  explanation: string;
  modelReason: string;   // why this task type needs this tier of model
  mode: 'compressed' | 'expanded';
  taskType: TaskType;
  // tokensBefore for 'expanded' includes estimated follow-up tokens so
  // it is always >= tokensAfter, making savings always positive.
  rawTokensBefore: number;
  tokensBefore: number;
  tokensAfter: number;
  tokensSaved: number;  // always >= 0
  pctSaved: number;     // always >= 0
  roundsSaved?: number;
  optimizationCost: number;           // $ cost of the Groq call that generated this
  suggestedModel: ModelRec;           // single best model across all providers
  recommendations: Record<'anthropic' | 'openai' | 'google', ModelRec>;
}

export function estimateTokens(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return Math.max(1, Math.round(t.length / 3.7));
}

// tokensSaved: token count saved per call
// inputPerMTok: model's input price in $ per million tokens
// callsPerMonth: how many times this prompt is called per month
export function dollarsSaved(tokensSaved: number, inputPerMTok: number, callsPerMonth: number) {
  const perCall = tokensSaved * (inputPerMTok / 1_000_000);
  const perMonth = perCall * callsPerMonth;
  return { perCall, perMonth, perYear: perMonth * 12 };
}

export const EXAMPLE_PROMPT = `my app is slow, can you help fix it`;
