import Groq from 'groq-sdk';
import { NextRequest } from 'next/server';
import { estimateTokens } from '@/lib/optimize';
import { recommendedModels, suggestModel, type TaskType } from '@/lib/models';

// Approximate token count of the SYSTEM prompt below.
const SYSTEM_TOKENS = 380;

// Groq Llama 3.3 70B paid-tier pricing ($ per million tokens).
// Free-tier users pay $0, but we show the cost for transparency.
const GROQ_INPUT_PER_MTOK  = 0.59;
const GROQ_OUTPUT_PER_MTOK = 0.79;

const SYSTEM = `You are a prompt optimization expert for developers. Your goal is to minimize TOTAL tokens across an entire AI conversation — including follow-up clarification rounds — not just the first message.

There are two modes. Choose the right one:

MODE: "compressed"
Use when the prompt is verbose, filled with filler words, pleasantries, or redundant phrasing.
Action: Strip the noise. Keep all essential constraints, context, and requirements. Be direct.

MODE: "expanded"
Use when the prompt is vague or underspecified — the AI would need follow-up questions to complete the task.
Action: Add the missing specifics: language, framework, file/function name, constraints, edge cases, expected output format. A longer upfront prompt that avoids 2–3 clarification exchanges saves far more tokens than it adds.

Output rules for ALL prompts:
- State the task in one direct sentence
- Include constraints and output format upfront
- Assume a senior developer is reading — no hand-holding
- Never ask questions back — make your best reasonable inference

Also classify the task type and estimate follow-up rounds.

Respond with valid JSON only — no markdown fences:
{
  "optimized": "<rewritten prompt>",
  "mode": "compressed" | "expanded",
  "roundsSaved": <integer 0–3, only meaningful when mode is "expanded">,
  "taskType": <one of: planning | coding | creative | analysis | extraction | summarization | qa | agentic>,
  "reason": "<2-3 sentences: what specifically changed and why it reduces total tokens — be concrete about what was removed or added>",
  "modelReason": "<1 sentence: why this task type needs this tier of model — e.g. reasoning models for multi-step planning, fast cheap models for simple extraction>"
}`;

export async function POST(req: NextRequest) {
  const { prompt } = (await req.json()) as { prompt?: string };

  if (!prompt?.trim()) {
    return Response.json({ error: 'No prompt provided' }, { status: 400 });
  }

  if (!process.env.GROQ_API_KEY) {
    return Response.json(
      { error: 'GROQ_API_KEY is not set on this server. Add it to your .env.local file.' },
      { status: 503 },
    );
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 2048,
  });

  const raw = completion.choices[0]?.message?.content ?? '';

  let optimized: string;
  let mode: 'compressed' | 'expanded';
  let roundsSaved: number;
  let taskType: TaskType;
  let reason: string;
  let modelReason: string;
  try {
    const parsed = JSON.parse(raw) as {
      optimized?: string;
      mode?: string;
      roundsSaved?: number;
      taskType?: string;
      reason?: string;
      modelReason?: string;
    };
    optimized    = parsed.optimized ?? prompt;
    mode         = parsed.mode === 'expanded' ? 'expanded' : 'compressed';
    roundsSaved  = typeof parsed.roundsSaved === 'number' ? Math.max(0, Math.min(3, parsed.roundsSaved)) : 1;
    taskType     = (parsed.taskType as TaskType) ?? 'qa';
    reason       = parsed.reason ?? '';
    modelReason  = parsed.modelReason ?? '';
  } catch {
    return Response.json({ error: 'Model returned an unreadable response. Please try again.' }, { status: 500 });
  }

  const rawTokensBefore = estimateTokens(prompt);
  const tokensAfter     = estimateTokens(optimized);

  // For expanded prompts, include estimated follow-up tokens in "before" so
  // tokensBefore is always >= tokensAfter and savings are always positive.
  const AVG_CLARIFICATION = 150;
  const tokensBefore =
    mode === 'expanded'
      ? rawTokensBefore + roundsSaved * AVG_CLARIFICATION
      : rawTokensBefore;

  const tokensSaved = Math.max(0, tokensBefore - tokensAfter);
  const pctSaved    = tokensBefore > 0 ? tokensSaved / tokensBefore : 0;

  // Cost of this Groq optimization call (at paid-tier rates).
  const groqInputTokens  = SYSTEM_TOKENS + rawTokensBefore;
  const groqOutputTokens = tokensAfter + 80; // optimized + JSON overhead
  const optimizationCost =
    (groqInputTokens * GROQ_INPUT_PER_MTOK + groqOutputTokens * GROQ_OUTPUT_PER_MTOK) / 1_000_000;

  const recommendations = recommendedModels(taskType);
  const suggested       = suggestModel(taskType);

  return Response.json({
    optimized,
    explanation: reason,
    modelReason,
    mode,
    taskType,
    roundsSaved: mode === 'expanded' ? roundsSaved : undefined,
    rawTokensBefore,
    tokensBefore,
    tokensAfter,
    tokensSaved,
    pctSaved,
    optimizationCost,
    suggestedModel: suggested,
    recommendations,
  });
}
