export type Provider = 'anthropic' | 'openai' | 'google';

export type TaskType =
  | 'planning'
  | 'coding'
  | 'creative'
  | 'analysis'
  | 'extraction'
  | 'summarization'
  | 'qa'
  | 'agentic';

export const TASK_LABEL: Record<TaskType, string> = {
  planning:      'Planning / strategy',
  coding:        'Coding / debugging',
  creative:      'Creative writing',
  analysis:      'Analysis / review',
  extraction:    'Extraction / classification',
  summarization: 'Summarization',
  qa:            'Q&A / factual lookup',
  agentic:       'Agentic / tool use',
};

export const PROVIDER_LABEL: Record<Provider, string> = {
  anthropic: 'Anthropic',
  openai:    'OpenAI',
  google:    'Google',
};

export const PROVIDER_COLOR: Record<Provider, string> = {
  anthropic: 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900/50',
  openai:    'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50',
  google:    'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/50',
};

export const PROVIDER_TEXT: Record<Provider, string> = {
  anthropic: 'text-orange-700 dark:text-orange-400',
  openai:    'text-emerald-700 dark:text-emerald-400',
  google:    'text-blue-700 dark:text-blue-400',
};

export interface ModelRec {
  id: string;
  name: string;
  provider: Provider;
  inputPerMTok: number;   // $ per million input tokens
  outputPerMTok: number;
  isReasoning: boolean;
  bestFor: TaskType[];
}

// Prices sourced from provider docs. Updated ~2026-06.
export const ALL_MODELS: ModelRec[] = [
  // ── Anthropic ──────────────────────────────────────────────────
  {
    id: 'claude-haiku-4-5',   name: 'Haiku 4.5',   provider: 'anthropic',
    inputPerMTok: 1,   outputPerMTok: 5,
    isReasoning: false, bestFor: ['extraction', 'summarization', 'qa'],
  },
  {
    id: 'claude-sonnet-4-6',  name: 'Sonnet 4.6',  provider: 'anthropic',
    inputPerMTok: 3,   outputPerMTok: 15,
    isReasoning: false, bestFor: ['coding', 'analysis', 'creative'],
  },
  {
    id: 'claude-opus-4-8',    name: 'Opus 4.8',    provider: 'anthropic',
    inputPerMTok: 5,   outputPerMTok: 25,
    isReasoning: true,  bestFor: ['planning', 'agentic', 'creative'],
  },
  // ── OpenAI ─────────────────────────────────────────────────────
  {
    id: 'gpt-4o-mini',        name: 'GPT-4o mini', provider: 'openai',
    inputPerMTok: 0.15, outputPerMTok: 0.60,
    isReasoning: false, bestFor: ['extraction', 'summarization', 'qa'],
  },
  {
    id: 'gpt-4o',             name: 'GPT-4o',      provider: 'openai',
    inputPerMTok: 2.50, outputPerMTok: 10,
    isReasoning: false, bestFor: ['coding', 'analysis', 'creative'],
  },
  {
    id: 'o4-mini',            name: 'o4-mini',     provider: 'openai',
    inputPerMTok: 1.10, outputPerMTok: 4.40,
    isReasoning: true,  bestFor: ['planning', 'coding'],
  },
  {
    id: 'o3',                 name: 'o3',          provider: 'openai',
    inputPerMTok: 10,   outputPerMTok: 40,
    isReasoning: true,  bestFor: ['planning', 'agentic'],
  },
  // ── Google ─────────────────────────────────────────────────────
  {
    id: 'gemini-2.0-flash',   name: 'Gemini 2.0 Flash',   provider: 'google',
    inputPerMTok: 0.10, outputPerMTok: 0.40,
    isReasoning: false, bestFor: ['extraction', 'summarization', 'qa'],
  },
  {
    id: 'gemini-2.5-flash',   name: 'Gemini 2.5 Flash',   provider: 'google',
    inputPerMTok: 0.30, outputPerMTok: 2.50,
    isReasoning: false, bestFor: ['coding', 'analysis'],
  },
  {
    id: 'gemini-2.5-pro',     name: 'Gemini 2.5 Pro',     provider: 'google',
    inputPerMTok: 1.25, outputPerMTok: 10,
    isReasoning: true,  bestFor: ['planning', 'creative', 'agentic'],
  },
];

// Per-provider: cheapest model that handles the task type.
export function recommendedModels(taskType: TaskType): Record<Provider, ModelRec> {
  const pick = (p: Provider): ModelRec => {
    const fits = ALL_MODELS
      .filter(m => m.provider === p && m.bestFor.includes(taskType))
      .sort((a, b) => a.inputPerMTok - b.inputPerMTok);
    return fits[0] ?? ALL_MODELS.filter(m => m.provider === p)[1];
  };
  return { anthropic: pick('anthropic'), openai: pick('openai'), google: pick('google') };
}

// Single best suggestion: cheapest capable model across ALL providers.
export function suggestModel(taskType: TaskType): ModelRec {
  const fits = ALL_MODELS
    .filter(m => m.bestFor.includes(taskType))
    .sort((a, b) => a.inputPerMTok - b.inputPerMTok);
  return fits[0] ?? ALL_MODELS[0];
}
