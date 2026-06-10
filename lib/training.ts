// The budget-cap + training-to-unlock model.
// Research basis: the canonical FinOps-for-GenAI controls are per-user token
// limits, per-team budgets, model-access policies, and 50/80/100% alerts.
// TokenTriage adds a behavioral layer: a low default cap that engineers raise
// by passing short prompting/caching/routing modules — turning cost control
// into enablement instead of a blocker.

export interface BudgetTier {
  id: string;
  name: string;
  monthlyCap: number; // per engineer, USD
  unlock: string;
  perks: string[];
}

export const TIERS: BudgetTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyCap: 150,
    unlock: 'Default for every engineer',
    perks: ['Haiku & Sonnet access', 'Shared team sandbox keys', '50 / 80 / 100% spend alerts'],
  },
  {
    id: 'practitioner',
    name: 'Practitioner',
    monthlyCap: 400,
    unlock: 'Pass Prompt Hygiene + Caching',
    perks: ['Personal API keys', 'Opus access for hard tasks', 'Prompt-cache dashboards'],
  },
  {
    id: 'expert',
    name: 'Expert',
    monthlyCap: 900,
    unlock: 'Pass all modules + manager sign-off',
    perks: ['Raised rate limits', 'Batch API quota', 'Can mint team service keys'],
  },
];

export interface QuizOption {
  text: string;
  correct?: boolean;
}

export interface TrainingModule {
  id: string;
  topic: string;
  minutes: number;
  lesson: string;
  question: string;
  options: QuizOption[];
  explanation: string;
}

export const MODULES: TrainingModule[] = [
  {
    id: 'prompt-hygiene',
    topic: 'Prompt Hygiene',
    minutes: 6,
    lesson:
      'Every token in your prompt is billed on every call. Keep prompts at the task baseline: retrieve only the relevant context, drop stale instructions, and summarize long histories instead of re-sending them.',
    question: 'Your agent re-sends an entire 40-page manual on every turn. What is the cheapest effective fix?',
    options: [
      { text: 'Upgrade to Opus so it reads faster' },
      { text: 'Retrieve and send only the relevant section', correct: true },
      { text: 'Increase max_tokens' },
      { text: 'Add more few-shot examples' },
    ],
    explanation:
      'Sending only the relevant span (RAG) cuts input tokens directly. Upgrading the model costs more, and max_tokens / examples make it worse.',
  },
  {
    id: 'caching',
    topic: 'Prompt Caching',
    minutes: 7,
    lesson:
      'Mark stable prefixes (system prompt, knowledge base) with cache_control so they bill at 0.1× on reads instead of full price every call. Caching is a prefix match — any byte change before the breakpoint invalidates it.',
    question: 'You added cache_control but usage.cache_read_input_tokens is still 0 across identical requests. Most likely cause?',
    options: [
      { text: 'The prefix contains a per-request value like a timestamp', correct: true },
      { text: 'You are using Sonnet instead of Opus' },
      { text: 'max_tokens is set too low' },
      { text: 'Caching is disabled on your account by default' },
    ],
    explanation:
      'A changing byte in the prefix (a Date.now(), a UUID, unsorted JSON keys) invalidates the cache. Caching works on all current models and is on by default.',
  },
  {
    id: 'routing',
    topic: 'Model Routing',
    minutes: 6,
    lesson:
      'Right-size the model to the task. Routine, high-volume, latency-tolerant work belongs on the cheapest tier — and anything non-interactive can run through the Batch API at 50% off.',
    question: 'A nightly job classifies 2M support tickets into 5 buckets. Best model and mode?',
    options: [
      { text: 'Opus, real-time' },
      { text: 'Haiku via the Batch API', correct: true },
      { text: 'Opus via the Batch API' },
      { text: 'Sonnet, real-time' },
    ],
    explanation:
      'Bucket classification is easy enough for Haiku ($1/$5), and a nightly job is non-interactive — Batch API takes another 50% off. Opus would be ~25× the output cost for no quality gain.',
  },
];
