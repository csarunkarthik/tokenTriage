import { ModelTier } from './types';
import { PRICING } from './data';

export interface OptimizeResult {
  optimized: string;
  explanation: string;
  mode: 'compressed' | 'expanded';
  // For 'expanded': tokensBefore includes estimated follow-up exchange tokens
  // so the comparison is always original > optimized.
  rawTokensBefore: number;
  tokensBefore: number;
  tokensAfter: number;
  tokensSaved: number; // always ≥ 0
  pctSaved: number;    // always ≥ 0
  roundsSaved?: number;
}

export function estimateTokens(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return Math.max(1, Math.round(t.length / 3.7));
}

export function dollarsSaved(tokensSaved: number, model: ModelTier, callsPerMonth: number) {
  const perTok = PRICING[model].inputPerTok;
  const perCall = tokensSaved * perTok;
  const perMonth = perCall * callsPerMonth;
  return { perCall, perMonth, perYear: perMonth * 12 };
}

export const EXAMPLE_PROMPT = `Hi there! I was wondering if you could please help me out with something. I would really like you to basically just write a short and very concise summary of the article below for me, if it's not too much trouble. In order to make sure that you capture the majority of the key points, please be sure to read it carefully. Thank you so much in advance!

[paste article here]`;
