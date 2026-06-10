import { ModelTier } from './types';
import { PRICING } from './data';

// Deterministic, in-browser prompt compression. No model call — a curated set
// of rules strips politeness, filler, and wordy phrasing, then tidies spacing.
// Token counts are estimates (Claude ≈ 3.7 chars/token for English prose).

export interface AppliedEdit {
  category: 'Politeness' | 'Filler' | 'Wordy phrase';
  from: string;
  to: string;
  count: number;
}

export interface OptimizeResult {
  optimized: string;
  edits: AppliedEdit[];
  tokensBefore: number;
  tokensAfter: number;
  tokensSaved: number;
  pctSaved: number;
}

interface Rule {
  category: AppliedEdit['category'];
  // Matched case-insensitively with word boundaries where sensible.
  pattern: RegExp;
  to: string;
  label: string;
}

// Order matters: longer phrases first so they win before their substrings.
const RULES: Rule[] = [
  // Politeness / preamble
  { category: 'Politeness', pattern: /\bi was wondering if you could\b/gi, to: '', label: 'I was wondering if you could' },
  { category: 'Politeness', pattern: /\bif it'?s not too much trouble\b/gi, to: '', label: "if it's not too much trouble" },
  { category: 'Politeness', pattern: /\bat your earliest convenience\b/gi, to: '', label: 'at your earliest convenience' },
  { category: 'Politeness', pattern: /\bthank you (so much )?in advance\b/gi, to: '', label: 'thank you in advance' },
  { category: 'Politeness', pattern: /\bthanks in advance\b/gi, to: '', label: 'thanks in advance' },
  { category: 'Politeness', pattern: /\b(could|would|can)\s+you\s+(please|kindly)\b/gi, to: '', label: 'could you please' },
  { category: 'Politeness', pattern: /\bi(?:'d| would) (?:really )?(?:like|love) (?:you )?to\b/gi, to: '', label: 'I would like you to' },
  { category: 'Politeness', pattern: /\bi (?:need|want) you to\b/gi, to: '', label: 'I need you to' },
  { category: 'Politeness', pattern: /\bplease kindly\b/gi, to: '', label: 'please kindly' },
  { category: 'Politeness', pattern: /\b(please|kindly)\b/gi, to: '', label: 'please / kindly' },
  { category: 'Politeness', pattern: /\bthank you\b/gi, to: '', label: 'thank you' },
  { category: 'Politeness', pattern: /\bthanks\b/gi, to: '', label: 'thanks' },
  { category: 'Politeness', pattern: /\bif possible\b/gi, to: '', label: 'if possible' },
  { category: 'Politeness', pattern: /\bfor me\b/gi, to: '', label: 'for me' },

  // Wordy phrases → shorter equivalents
  { category: 'Wordy phrase', pattern: /\bdue to the fact that\b/gi, to: 'because', label: 'due to the fact that → because' },
  { category: 'Wordy phrase', pattern: /\bin spite of the fact that\b/gi, to: 'although', label: 'in spite of the fact that → although' },
  { category: 'Wordy phrase', pattern: /\bin the event that\b/gi, to: 'if', label: 'in the event that → if' },
  { category: 'Wordy phrase', pattern: /\bat this (point in time|moment in time)\b/gi, to: 'now', label: 'at this point in time → now' },
  { category: 'Wordy phrase', pattern: /\bin order to\b/gi, to: 'to', label: 'in order to → to' },
  { category: 'Wordy phrase', pattern: /\ba large number of\b/gi, to: 'many', label: 'a large number of → many' },
  { category: 'Wordy phrase', pattern: /\bthe majority of\b/gi, to: 'most of', label: 'the majority of → most of' },
  { category: 'Wordy phrase', pattern: /\bwith regard(?:s)? to\b/gi, to: 'about', label: 'with regard to → about' },
  { category: 'Wordy phrase', pattern: /\bin terms of\b/gi, to: '', label: 'in terms of' },
  { category: 'Wordy phrase', pattern: /\bmake sure (?:to|that you)\b/gi, to: '', label: 'make sure to' },
  { category: 'Wordy phrase', pattern: /\bbe sure to\b/gi, to: '', label: 'be sure to' },

  // Filler words
  { category: 'Filler', pattern: /\b(just|really|very|actually|basically|simply|literally|essentially)\b/gi, to: '', label: 'just / really / very / actually / basically …' },
  { category: 'Filler', pattern: /\b(as you know|needless to say|it goes without saying|that being said)\b/gi, to: '', label: 'as you know / needless to say …' },
];

export function estimateTokens(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return Math.max(1, Math.round(t.length / 3.7));
}

function tidy(text: string): string {
  let t = text;
  // Drop a leading greeting ("Hi there!", "Hello,", "Hey —").
  t = t.replace(/^\s*(hi|hello|hey|greetings)\b[^.!?\n]*[.!?,—-]?\s*/i, '');
  // Collapse runs of spaces.
  t = t.replace(/[ \t]{2,}/g, ' ');
  // Remove spaces before punctuation.
  t = t.replace(/\s+([,.;:!?])/g, '$1');
  // A comma/semicolon/colon left dangling before a terminator → just the terminator.
  t = t.replace(/[,;:]+(\s*[.!?])/g, '$1');
  // Collapse repeated terminators (".!", "!!", "?.") → the first.
  t = t.replace(/([.!?])[.!?]+/g, '$1');
  // Collapse repeated commas.
  t = t.replace(/(,\s*){2,}/g, ', ');
  // Ensure one space after punctuation when a letter follows.
  t = t.replace(/([,.;:!?])([A-Za-z])/g, '$1 $2');
  // Remove orphaned punctuation at the start of a line or after a newline.
  t = t.replace(/(^|\n)\s*[,.;:!?]+\s*/g, '$1');
  // Tidy whitespace around newlines and collapse blank lines.
  t = t.replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n');
  t = t
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
  // Re-capitalize the first letter of each sentence / line.
  t = t.replace(/(^|[.!?]\s+|\n)([a-z])/g, (_m, lead: string, ch: string) => lead + ch.toUpperCase());
  return t;
}

export function optimizePrompt(input: string): OptimizeResult {
  const tokensBefore = estimateTokens(input);
  let text = input;
  const edits: AppliedEdit[] = [];

  for (const rule of RULES) {
    const matches = text.match(rule.pattern);
    if (matches && matches.length > 0) {
      text = text.replace(rule.pattern, rule.to);
      edits.push({ category: rule.category, from: rule.label, to: rule.to || '∅', count: matches.length });
    }
  }

  const optimized = tidy(text);
  const tokensAfter = estimateTokens(optimized);
  const tokensSaved = Math.max(0, tokensBefore - tokensAfter);
  const pctSaved = tokensBefore > 0 ? tokensSaved / tokensBefore : 0;

  return { optimized, edits, tokensBefore, tokensAfter, tokensSaved, pctSaved };
}

export function dollarsSaved(tokensSaved: number, model: ModelTier, callsPerMonth: number) {
  const perTok = PRICING[model].inputPerTok;
  const perCall = tokensSaved * perTok;
  const perMonth = perCall * callsPerMonth;
  return { perCall, perMonth, perYear: perMonth * 12 };
}

export const EXAMPLE_PROMPT = `Hi there! I was wondering if you could please help me out with something. I would really like you to basically just write a short and very concise summary of the article below for me, if it's not too much trouble. In order to make sure that you capture the majority of the key points, please be sure to read it carefully. Thank you so much in advance!

[paste article here]`;
