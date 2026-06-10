import Groq from 'groq-sdk';
import { NextRequest } from 'next/server';
import { estimateTokens } from '@/lib/optimize';

const SYSTEM = `You are a prompt optimization expert. Rewrite the user's prompt to be clear, direct, and token-efficient so that an AI model can process it without inferring intent or re-reading context multiple times.

Guidelines:
- Make the request explicit and well-structured
- Remove pleasantries, filler words, and redundant phrasing
- Keep ALL essential context, constraints, requirements, and examples — never lose meaning
- If the prompt references prior conversation, surface the key facts inline instead of relying on context carry-over
- If the prompt is already concise, change as little as possible

Respond with valid JSON only — no markdown fences:
{"optimized": "<rewritten prompt>", "explanation": "<one or two sentences summarizing the key changes>"}`;

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
  const tokensSaved = Math.max(0, tokensBefore - tokensAfter);
  const pctSaved = tokensBefore > 0 ? tokensSaved / tokensBefore : 0;

  return Response.json({ optimized, explanation, tokensBefore, tokensAfter, tokensSaved, pctSaved });
}
