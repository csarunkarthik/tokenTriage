import { LeakType } from './types';

export interface PlaybookStep {
  title: string;
  body: string;
}

export interface Playbook {
  leak: LeakType;
  fixTitle: string;
  tagline: string;
  // The mechanism, in plain terms.
  how: string;
  // Concrete before / after, with a short code or config sketch.
  beforeLabel: string;
  before: string;
  afterLabel: string;
  after: string;
  codeBefore: string;
  codeAfter: string;
  // What actually moves the number, and the gotchas.
  steps: PlaybookStep[];
  watchOuts: string[];
  // The pricing fact that makes the savings real.
  economics: string;
}

export const PLAYBOOKS: Record<LeakType, Playbook> = {
  'cache-miss': {
    leak: 'cache-miss',
    fixTitle: 'Prompt caching & cache-aware routing',
    tagline: 'Stop paying full input price for the same context on every call.',
    how: 'RAG and assistant calls re-send the same system prompt and retrieved context on every request. With prompt caching you mark the stable prefix as a cache breakpoint: the first request writes it (billed at 1.25× input), and every request after reads it at 0.1× input — roughly a 90% discount on the repeated tokens.',
    beforeLabel: 'Before — uncached',
    before: 'A 20K-token knowledge base + system prompt is sent fresh on all 50M monthly calls. Every token is billed at full input price, every time.',
    afterLabel: 'After — cached prefix',
    after: 'The 20K-token prefix is written to cache once, then read at 0.1× on subsequent calls. Only the per-request user question is billed at full price.',
    codeBefore: `// Every call re-bills the full prefix at 1x
await client.messages.create({
  model: "claude-sonnet-4-6",
  system: KNOWLEDGE_BASE,          // 20K tokens, billed 1x every call
  messages: [{ role: "user", content: question }],
});`,
    codeAfter: `// Stable prefix cached: write 1.25x once, read 0.1x after
await client.messages.create({
  model: "claude-sonnet-4-6",
  system: [{
    type: "text",
    text: KNOWLEDGE_BASE,
    cache_control: { type: "ephemeral" },   // <- breakpoint
  }],
  messages: [{ role: "user", content: question }],
});`,
    steps: [
      { title: 'Find the stable prefix', body: 'Identify the bytes that are identical across requests — system prompt, tool definitions, retrieved docs — and move all volatile content (timestamps, IDs, the user turn) after it.' },
      { title: 'Add the breakpoint', body: 'Put cache_control: { type: "ephemeral" } on the last stable block. The 5-minute TTL pays off after just two requests on the same prefix.' },
      { title: 'Verify the hit rate', body: 'Check usage.cache_read_input_tokens on the response. If it stays zero across identical requests, a silent invalidator is changing the prefix.' },
    ],
    watchOuts: [
      'Caching is a prefix match — a single changed byte (a Date.now() in the system prompt, unsorted JSON keys, a varying tool list) invalidates everything after it.',
      'Minimum cacheable prefix is ~2,048 tokens on Sonnet and ~4,096 on Opus; shorter prefixes silently won’t cache.',
      'Switching model or reordering tools mid-conversation drops the whole cache.',
    ],
    economics: 'Cache reads cost ~0.1× of base input price; writes cost 1.25× (5-min TTL). For a hot prefix read thousands of times a day, that is the difference between paying for it once and paying for it every call.',
  },
  'model-mismatch': {
    leak: 'model-mismatch',
    fixTitle: 'Smart model routing',
    tagline: 'Right-size every call to the cheapest tier that still clears the quality bar.',
    how: 'Premium tiers get used by default for work a cheaper tier handles identically. Classify each request by complexity and route it: routine calls to Sonnet or Haiku, hard calls to Opus, escalating only when a cheap-tier answer fails a quality check. Long agentic loops can keep the main thread on one model and spin up Haiku sub-agents for sub-tasks.',
    beforeLabel: 'Before — one premium default',
    before: 'Opus 4.8 ($5 in / $25 out per MTok) is the default for the whole workload, including boilerplate, classification, and short lookups that Sonnet or Haiku answer just as well.',
    afterLabel: 'After — tiered routing',
    after: 'A lightweight classifier sends routine traffic to Sonnet ($3/$15) or Haiku ($1/$5) and reserves Opus for genuinely hard tasks. Same outputs, a fraction of the per-token cost.',
    codeBefore: `// Everything pays Opus rates ($5 in / $25 out)
const model = "claude-opus-4-8";
await client.messages.create({ model, max_tokens, messages });`,
    codeAfter: `// Route by task complexity
const model =
  complexity === "hard"   ? "claude-opus-4-8"     // $5 / $25
  : complexity === "med"  ? "claude-sonnet-4-6"   // $3 / $15
  :                         "claude-haiku-4-5";   // $1 / $5
await client.messages.create({ model, max_tokens, messages });`,
    steps: [
      { title: 'Classify before you call', body: 'Score each request’s difficulty (heuristics, a Haiku pre-classifier, or task type) and pick the lowest tier that meets the bar.' },
      { title: 'Escalate on failure, not by default', body: 'Run the cheap tier first; only fall back to Opus when a validator or confidence check rejects the answer.' },
      { title: 'Use cheap sub-agents', body: 'In agentic loops keep the orchestrator on one model and delegate parallel sub-tasks (search, extraction) to Haiku threads.' },
    ],
    watchOuts: [
      'Switching models invalidates the prompt cache — route at task boundaries, not mid-conversation.',
      'Measure quality per route; an over-aggressive downgrade trades dollars for re-work.',
      'Output tokens dominate cost (5× input) — the biggest routing wins come from output-heavy calls.',
    ],
    economics: 'Opus→Sonnet drops output from $25 to $15 per MTok; Sonnet→Haiku from $15 to $5. On output-heavy workloads, routing is usually the single largest lever — which is why it is the biggest leak here.',
  },
  'prompt-waste': {
    leak: 'prompt-waste',
    fixTitle: 'Context compression',
    tagline: 'Trim every prompt back toward the tokens the task actually needs.',
    how: 'Prompts drift well above their task baseline — stale instructions, duplicated context, verbose scaffolding, whole documents pasted when a section would do. Compression brings each request back toward baseline: dedupe context, drop dead instructions, summarize history, and fetch only the relevant span. It only touches input-side tokens, so it stacks cleanly on top of caching and routing.',
    beforeLabel: 'Before — bloated context',
    before: 'Tasks average 48K tokens against a 30K baseline — 18K of every call is stale system text, repeated context, and scaffolding that adds no quality.',
    afterLabel: 'After — compressed',
    after: 'Context is pruned to the working set: the live instruction, a summary of history, and only the retrieved spans that matter. Input-side tokens drop toward baseline.',
    codeBefore: `// 48K-token prompt: whole docs + full history every turn
const messages = [
  ...entireConversation,           // grows unbounded
  { role: "user", content: fullDocs + question },
];`,
    codeAfter: `// ~30K: summarized history + only relevant spans
const messages = [
  { role: "user", content: summarize(olderTurns) },
  ...recentTurns,
  { role: "user", content: retrieveRelevant(docs, question) + question },
];`,
    steps: [
      { title: 'Baseline the task', body: 'Measure tokens-per-task with count_tokens and set the floor a well-scoped version of the task actually needs.' },
      { title: 'Cut the top sources of bloat', body: 'Dedupe repeated context, delete stale instructions, retrieve spans instead of whole documents, and summarize old turns.' },
      { title: 'Compress without breaking cache', body: 'Keep the stable cached prefix intact; do the trimming in the volatile, per-request portion after the breakpoint.' },
    ],
    watchOuts: [
      'Over-compression drops context the task needs — track answer quality as you trim.',
      'Compression saves input tokens, not output; it won’t shrink long generations.',
      'Use count_tokens (not a tiktoken estimate) to baseline — it under-counts Claude tokens.',
    ],
    economics: 'Every trimmed input token is billed at the model’s input rate ($1–$5 per MTok). Capping waste at the task baseline recovers up to ~35% of input-side spend on the worst-offending teams.',
  },
};
