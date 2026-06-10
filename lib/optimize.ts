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

export const EXAMPLE_PROMPT = `Hi there, I hope you're doing well! I was really hoping that you could maybe help me out with something I've been thinking through for a while. So basically, what I need is for you to kindly help me think through and plan out a brand new microservices architecture for our platform. We are essentially dealing with around about 10 million events per day and we really need the system to be very highly available and also fault-tolerant at the same time. I would really love it if you could please go over the different components we might want to use, and also just sort of explain how everything would kind of fit together. It would also be super helpful if you could maybe go over some of the potential trade-offs and challenges we might face along the way, if that's not too much trouble. We're currently using a monolith and we basically need to migrate without downtime. Thank you so very much in advance for any help you're able to provide!`;
