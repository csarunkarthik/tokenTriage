import Groq from 'groq-sdk';
import { NextRequest } from 'next/server';
import { estimateTokens } from '@/lib/optimize';

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

Respond with valid JSON only — no markdown fences:
{
  "optimized": "<rewritten prompt>",
  "mode": "compressed" | "expanded",
  "roundsSaved": <integer 0–3, only meaningful when mode is "expanded" — estimate how many clarification follow-up rounds this avoids>,
  "reason": "<one or two sentences explaining specifically why the new prompt reduces total tokens — what it avoids or removes>"
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
  let reason: string;
  try {
    const parsed = JSON.parse(raw) as {
      optimized?: string;
      mode?: string;
      roundsSaved?: number;
      reason?: string;
    };
    optimized = parsed.optimized ?? prompt;
    mode = parsed.mode === 'expanded' ? 'expanded' : 'compressed';
    roundsSaved = typeof parsed.roundsSaved === 'number' ? Math.max(0, Math.min(3, parsed.roundsSaved)) : 1;
    reason = parsed.reason ?? '';
  } catch {
    return Response.json({ error: 'Model returned an unreadable response. Please try again.' }, { status: 500 });
  }

  const rawTokensBefore = estimateTokens(prompt);
  const tokensAfter = estimateTokens(optimized);

  // For expanded prompts, the effective "before" cost includes the follow-up
  // exchanges that a vague prompt would force. Each clarification round ≈ 150 tokens.
  // This ensures tokensBefore is always ≥ tokensAfter so the comparison is meaningful.
  const AVG_CLARIFICATION = 150;
  const tokensBefore =
    mode === 'expanded'
      ? rawTokensBefore + roundsSaved * AVG_CLARIFICATION
      : rawTokensBefore;

  const tokensSaved = Math.max(0, tokensBefore - tokensAfter);
  const pctSaved = tokensBefore > 0 ? tokensSaved / tokensBefore : 0;

  return Response.json({
    optimized,
    explanation: reason,
    mode,
    roundsSaved: mode === 'expanded' ? roundsSaved : undefined,
    rawTokensBefore,
    tokensBefore,
    tokensAfter,
    tokensSaved,
    pctSaved,
  });
}
