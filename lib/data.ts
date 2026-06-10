import { Org, TierPricing, ModelTier } from './types';

const M = 1_000_000;

export const PRICING: Record<ModelTier, TierPricing> = {
  'haiku-4.5':  { inputPerTok: 1 / M, outputPerTok: 5 / M },
  'sonnet-4.6': { inputPerTok: 3 / M, outputPerTok: 15 / M },
  'opus-4.8':   { inputPerTok: 5 / M, outputPerTok: 25 / M },
};

// Realized: orgGross ~$186k, recoverable ~44%
// Platform ~$52k, Support-AI ~$38k, Data-Eng ~$34k, Growth ~$28k, Mobile ~$28k, Docs-AI ~$6k
export const org: Org = {
  name: 'Acme Corp',
  periodDays: 30,
  engineers: 400,
  pricing: PRICING,
  teams: [
    // Platform: model-mismatch + prompt-waste ~$52k
    {
      id: 'platform',
      name: 'Platform',
      primaryWorkflow: 'Coding assistant (Claude Code)',
      querySource: 'claude_code',
      engineers: 90,
      tokensPerTask: 48_000,
      baselineTokensPerTask: 30_000,
      leaks: ['prompt-waste', 'model-mismatch'],
      batchEligibleShare: 0.05,
      slices: [
        {
          model: 'opus-4.8',
          usage: { input: 5_330_000_000, output: 530_000_000, cacheRead: 1_330_000_000, cacheCreation: 270_000_000 },
          downgradableShare: 0.85,
          downgradeTarget: 'sonnet-4.6',
        },
        {
          model: 'sonnet-4.6',
          usage: { input: 2_000_000_000, output: 200_000_000, cacheRead: 670_000_000, cacheCreation: 130_000_000 },
          downgradableShare: 0.68,
          downgradeTarget: 'haiku-4.5',
        },
      ],
    },
    // Support-AI: cache-miss poster child ~$38k
    {
      id: 'support-ai',
      name: 'Support-AI',
      primaryWorkflow: 'RAG support bot',
      querySource: 'sdk',
      engineers: 60,
      tokensPerTask: 22_000,
      baselineTokensPerTask: 20_000,
      leaks: ['cache-miss'],
      batchEligibleShare: 0.45,
      slices: [
        {
          model: 'sonnet-4.6',
          usage: { input: 2_770_000_000, output: 230_000_000, cacheRead: 60_000_000, cacheCreation: 6_450_000_000 },
          downgradableShare: 0.10,
          downgradeTarget: 'haiku-4.5',
        },
        {
          model: 'haiku-4.5',
          usage: { input: 860_000_000, output: 90_000_000, cacheRead: 30_000_000, cacheCreation: 580_000_000 },
          downgradableShare: 0,
          downgradeTarget: null,
        },
      ],
    },
    // Data-Eng: model-mismatch, batch-heavy, Sonnet-heavy ~$34k
    {
      id: 'data-eng',
      name: 'Data-Eng',
      primaryWorkflow: 'Batch data pipeline enrichment',
      querySource: 'batch',
      engineers: 55,
      tokensPerTask: 32_000,
      baselineTokensPerTask: 30_000,
      leaks: ['model-mismatch'],
      batchEligibleShare: 0.70,
      slices: [
        {
          model: 'sonnet-4.6',
          usage: { input: 6_130_000_000, output: 610_000_000, cacheRead: 2_450_000_000, cacheCreation: 610_000_000 },
          downgradableShare: 0.85,
          downgradeTarget: 'haiku-4.5',
        },
        {
          model: 'haiku-4.5',
          usage: { input: 2_040_000_000, output: 200_000_000, cacheRead: 820_000_000, cacheCreation: 200_000_000 },
          downgradableShare: 0,
          downgradeTarget: null,
        },
      ],
    },
    // Growth: prompt-waste + model-mismatch, mixed Sonnet/Haiku ~$28k
    {
      id: 'growth',
      name: 'Growth',
      primaryWorkflow: 'Marketing copy & A/B generation',
      querySource: 'sdk',
      engineers: 45,
      tokensPerTask: 40_000,
      baselineTokensPerTask: 24_000,
      leaks: ['prompt-waste', 'model-mismatch'],
      batchEligibleShare: 0.30,
      slices: [
        {
          model: 'sonnet-4.6',
          usage: { input: 4_470_000_000, output: 450_000_000, cacheRead: 750_000_000, cacheCreation: 560_000_000 },
          downgradableShare: 0.74,
          downgradeTarget: 'haiku-4.5',
        },
        {
          model: 'haiku-4.5',
          usage: { input: 3_350_000_000, output: 340_000_000, cacheRead: 560_000_000, cacheCreation: 370_000_000 },
          downgradableShare: 0,
          downgradeTarget: null,
        },
      ],
    },
    // Mobile: cache-miss + prompt-waste, smaller Opus footprint ~$28k
    {
      id: 'mobile',
      name: 'Mobile',
      primaryWorkflow: 'In-app coding assistant',
      querySource: 'claude_code',
      engineers: 40,
      tokensPerTask: 36_000,
      baselineTokensPerTask: 26_000,
      leaks: ['cache-miss', 'prompt-waste'],
      batchEligibleShare: 0.10,
      slices: [
        {
          model: 'opus-4.8',
          usage: { input: 1_490_000_000, output: 150_000_000, cacheRead: 90_000_000, cacheCreation: 1_310_000_000 },
          downgradableShare: 0.62,
          downgradeTarget: 'sonnet-4.6',
        },
        {
          model: 'sonnet-4.6',
          usage: { input: 1_120_000_000, output: 110_000_000, cacheRead: 70_000_000, cacheCreation: 930_000_000 },
          downgradableShare: 0.52,
          downgradeTarget: 'haiku-4.5',
        },
      ],
    },
    // Docs-AI: healthy team, no leaks ~$6k
    {
      id: 'docs-ai',
      name: 'Docs-AI',
      primaryWorkflow: 'Documentation generation & search',
      querySource: 'sdk',
      engineers: 10,
      tokensPerTask: 18_000,
      baselineTokensPerTask: 18_000,
      leaks: [],
      batchEligibleShare: 0.60,
      slices: [
        {
          model: 'haiku-4.5',
          usage: { input: 1_360_000_000, output: 140_000_000, cacheRead: 1_020_000_000, cacheCreation: 200_000_000 },
          downgradableShare: 0,
          downgradeTarget: null,
        },
        {
          model: 'sonnet-4.6',
          usage: { input: 680_000_000, output: 70_000_000, cacheRead: 510_000_000, cacheCreation: 100_000_000 },
          downgradableShare: 0,
          downgradeTarget: null,
        },
      ],
    },
  ],
};
