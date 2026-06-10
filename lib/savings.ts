import { Org, LeakType, ModelTier, ModelSlice, TierPricing, Team } from './types';

export interface SavingsReport {
  orgGross: number;
  recoverableTotal: number;
  recoverablePct: number;
  afterSpend: number;
  byLeak: Record<LeakType, number>;
  byTeam: { teamId: string; gross: number; recoverable: number; topLeak: LeakType | null }[];
  batchRecovery: number;
}

function sliceGross(slice: ModelSlice, pricing: Record<ModelTier, TierPricing>): number {
  const p = pricing[slice.model];
  const { input, output, cacheRead, cacheCreation } = slice.usage;
  return (
    input * p.inputPerTok +
    output * p.outputPerTok +
    cacheRead * 0.1 * p.inputPerTok +
    cacheCreation * 1.25 * p.inputPerTok
  );
}

function cacheMissRecovery(slice: ModelSlice, pricing: Record<ModelTier, TierPricing>): number {
  const p = pricing[slice.model];
  const { cacheRead, cacheCreation } = slice.usage;
  const currentCacheCost =
    cacheCreation * 1.25 * p.inputPerTok + cacheRead * 0.1 * p.inputPerTok;
  const optimalCacheCost =
    cacheCreation * 0.10 * (1.25 * p.inputPerTok) +
    cacheCreation * 0.90 * (0.1 * p.inputPerTok) +
    cacheRead * 0.1 * p.inputPerTok;
  return Math.max(0, currentCacheCost - optimalCacheCost);
}

function modelMismatchRecovery(slice: ModelSlice, pricing: Record<ModelTier, TierPricing>): number {
  if (!slice.downgradeTarget || slice.downgradableShare <= 0) return 0;
  const pFrom = pricing[slice.model];
  const pTo = pricing[slice.downgradeTarget];
  const dIn = pFrom.inputPerTok - pTo.inputPerTok;
  const dOut = pFrom.outputPerTok - pTo.outputPerTok;
  return slice.downgradableShare * (slice.usage.input * dIn + slice.usage.output * dOut);
}

function promptWasteRecovery(slice: ModelSlice, team: Team, pricing: Record<ModelTier, TierPricing>): number {
  const { tokensPerTask, baselineTokensPerTask } = team;
  const wasteFraction = Math.min(
    0.35,
    (tokensPerTask - baselineTokensPerTask) / tokensPerTask
  );
  if (wasteFraction <= 0) return 0;
  const p = pricing[slice.model];
  return (slice.usage.input + slice.usage.cacheCreation) * p.inputPerTok * wasteFraction;
}

export function buildSavingsReport(org: Org): SavingsReport {
  const { pricing, teams } = org;

  let orgGross = 0;
  const byLeakAccum: Record<LeakType, number> = {
    'cache-miss': 0,
    'model-mismatch': 0,
    'prompt-waste': 0,
  };

  let totalRecoverable = 0;
  let totalBatchRecovery = 0;

  const byTeam: SavingsReport['byTeam'] = [];

  for (const team of teams) {
    let teamGross = 0;
    let teamRecoverable = 0;
    const teamLeakAmounts: Record<LeakType, number> = {
      'cache-miss': 0,
      'model-mismatch': 0,
      'prompt-waste': 0,
    };

    for (const slice of team.slices) {
      const gross = sliceGross(slice, pricing);
      teamGross += gross;

      // De-dup ordering: cache -> routing (model-mismatch) -> compression (prompt-waste)
      // Each on spend remaining after the prior

      let remainingInputCost = (slice.usage.input) * pricing[slice.model].inputPerTok;
      const outputCost = slice.usage.output * pricing[slice.model].outputPerTok;
      const cacheReadCost = slice.usage.cacheRead * 0.1 * pricing[slice.model].inputPerTok;
      const cacheCreationCost = slice.usage.cacheCreation * 1.25 * pricing[slice.model].inputPerTok;

      let sliceRecoverable = 0;

      // Step 1: Cache-miss recovery
      if (team.leaks.includes('cache-miss')) {
        const cacheSaving = cacheMissRecovery(slice, pricing);
        sliceRecoverable += cacheSaving;
        teamLeakAmounts['cache-miss'] += cacheSaving;
        // Reduce remaining: cache saving comes from cacheCreation becoming cacheRead
        // Effective input cost reduction is proportional
        remainingInputCost = Math.max(0, remainingInputCost - cacheSaving * 0);
        // Note: cache savings are on cache costs, not raw input
        // For de-dup: track total remaining slice spend after cache fix
      }

      // Step 2: Model-mismatch recovery (on remaining spend)
      if (team.leaks.includes('model-mismatch') && slice.downgradeTarget) {
        // Scale mismatch recovery by fraction of spend remaining
        const grossSliceSpend = gross;
        const afterCacheSpend = grossSliceSpend - teamLeakAmounts['cache-miss'];
        const scaleFactor = grossSliceSpend > 0 ? Math.min(1, afterCacheSpend / grossSliceSpend) : 1;
        const rawMismatch = modelMismatchRecovery(slice, pricing);
        const scaledMismatch = rawMismatch * scaleFactor;
        sliceRecoverable += scaledMismatch;
        teamLeakAmounts['model-mismatch'] += scaledMismatch;
      }

      // Step 3: Prompt-waste recovery (on spend remaining after cache+routing)
      if (team.leaks.includes('prompt-waste')) {
        const grossSliceSpend = gross;
        const afterPrior = grossSliceSpend - teamLeakAmounts['cache-miss'] - teamLeakAmounts['model-mismatch'];
        const scaleFactor = grossSliceSpend > 0 ? Math.min(1, afterPrior / grossSliceSpend) : 1;
        const rawWaste = promptWasteRecovery(slice, team, pricing);
        const scaledWaste = rawWaste * scaleFactor;
        sliceRecoverable += scaledWaste;
        teamLeakAmounts['prompt-waste'] += scaledWaste;
      }

      // Batch kicker (on post-fix slice spend)
      const postFixSpend = gross - sliceRecoverable;
      totalBatchRecovery += team.batchEligibleShare * Math.max(0, postFixSpend) * 0.50;
    }

    teamGross = teamGross;
    teamRecoverable = (teamLeakAmounts['cache-miss'] + teamLeakAmounts['model-mismatch'] + teamLeakAmounts['prompt-waste']);

    byLeakAccum['cache-miss'] += teamLeakAmounts['cache-miss'];
    byLeakAccum['model-mismatch'] += teamLeakAmounts['model-mismatch'];
    byLeakAccum['prompt-waste'] += teamLeakAmounts['prompt-waste'];

    orgGross += teamGross;
    totalRecoverable += teamRecoverable;

    // Determine top leak
    let topLeak: LeakType | null = null;
    if (team.leaks.length > 0) {
      topLeak = team.leaks.reduce((a, b) =>
        teamLeakAmounts[a] >= teamLeakAmounts[b] ? a : b
      );
    }

    byTeam.push({
      teamId: team.id,
      gross: teamGross,
      recoverable: teamRecoverable,
      topLeak,
    });
  }

  const recoverablePct = orgGross > 0 ? totalRecoverable / orgGross : 0;
  const afterSpend = orgGross - totalRecoverable;

  return {
    orgGross,
    recoverableTotal: totalRecoverable,
    recoverablePct,
    afterSpend,
    byLeak: byLeakAccum,
    byTeam,
    batchRecovery: totalBatchRecovery,
  };
}
