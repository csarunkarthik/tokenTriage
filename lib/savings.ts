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

      // De-dup: fixes are applied in order (cache -> routing -> compression) and
      // each later fix only acts on the spend the prior fixes left behind. We
      // approximate that by scaling each raw recovery by the share of this
      // slice's gross spend still remaining when the fix is applied.
      let sliceRecoverable = 0;
      const remainingShare = () =>
        gross > 0 ? Math.max(0, Math.min(1, (gross - sliceRecoverable) / gross)) : 1;

      // Step 1: Cache-miss — re-creating cache that should be read-cached.
      if (team.leaks.includes('cache-miss')) {
        const cacheSaving = cacheMissRecovery(slice, pricing);
        sliceRecoverable += cacheSaving;
        teamLeakAmounts['cache-miss'] += cacheSaving;
      }

      // Step 2: Model-mismatch — over-tiered calls, on spend remaining after caching.
      if (team.leaks.includes('model-mismatch') && slice.downgradeTarget) {
        const scaledMismatch = modelMismatchRecovery(slice, pricing) * remainingShare();
        sliceRecoverable += scaledMismatch;
        teamLeakAmounts['model-mismatch'] += scaledMismatch;
      }

      // Step 3: Prompt-waste — bloated context, on spend remaining after cache + routing.
      if (team.leaks.includes('prompt-waste')) {
        const scaledWaste = promptWasteRecovery(slice, team, pricing) * remainingShare();
        sliceRecoverable += scaledWaste;
        teamLeakAmounts['prompt-waste'] += scaledWaste;
      }

      // Batch kicker: eligible async share of the post-fix spend, at 50% off.
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
