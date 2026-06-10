export type ModelTier = 'haiku-4.5' | 'sonnet-4.6' | 'opus-4.8';
export type LeakType = 'prompt-waste' | 'cache-miss' | 'model-mismatch';
export type Severity = 'critical' | 'warning' | 'healthy';

export interface TierPricing {
  inputPerTok: number;
  outputPerTok: number;
}

export interface TokenUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
}

export interface ModelSlice {
  model: ModelTier;
  usage: TokenUsage;
  downgradableShare: number;
  downgradeTarget: ModelTier | null;
}

export interface Team {
  id: string;
  name: string;
  primaryWorkflow: string;
  querySource: string;
  engineers: number;
  slices: ModelSlice[];
  tokensPerTask: number;
  baselineTokensPerTask: number;
  leaks: LeakType[];
  batchEligibleShare: number;
}

export interface Org {
  name: string;
  periodDays: number;
  engineers: number;
  pricing: Record<ModelTier, TierPricing>;
  teams: Team[];
}
