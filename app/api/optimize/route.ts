import Groq from 'groq-sdk';
import { NextRequest } from 'next/server';
import { estimateTokens } from '@/lib/optimize';

const SYSTEM = `You are a prompt optimization expert for developers. Your goal is to minimize the TOTAL tokens across an entire AI conversation — including follow-up clarification rounds — not just the first message.

There are two modes:

VAGUE PROMPT → Add specificity. A vague prompt forces the AI to ask clarifying questions, costing far more tokens than adding context upfront. Fill in what you can reasonably infer: language, framework, file/function name, constraints, edge cases, expected output format. A longer first prompt that avoids 2–3 clarification exchanges is a net win.

VERBOSE PROMPT → Compress it. Strip pleasantries, filler words, hedging, and redundant phrasing. Keep all essential constraints and context.

For ALL prompts, the output should:
- State the task in one direct sentence
- Include relevant constraints upfront (language, framework, style, edge cases, file/function if applicable)
- Specify expected output format (function signature, return type, code block, bullet list, etc.)
- Assume a senior developer or AI is reading it — no hand-holding needed

Think like a senior engineer writing a precise GitHub issue or PR comment: every token earns its place. Never ask questions back — make your best inference and write the optimized prompt.

Respond with valid JSON only — no markdown fences:
{"optimized": "<rewritten prompt>", "explanation": "<one or two sentences on what changed and why — note if tokens were added for clarity>"}`;

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
  let explanation: string;
  try {
    const parsed = JSON.parse(raw) as { optimized?: string; explanation?: string };
    optimized = parsed.optimized ?? prompt;
    explanation = parsed.explanation ?? '';
  } catch {
    return Response.json({ error: 'Model returned an unreadable response. Please try again.' }, { status: 500 });
  }

  const tokensBefore = estimateTokens(prompt);
  const tokensAfter = estimateTokens(optimized);
  const tokensSaved = tokensBefore - tokensAfter; // negative = expanded for clarity
  const pctSaved = tokensBefore > 0 ? tokensSaved / tokensBefore : 0;

  return Response.json({ optimized, explanation, tokensBefore, tokensAfter, tokensSaved, pctSaved });
}
