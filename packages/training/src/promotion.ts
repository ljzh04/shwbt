export interface PromotionGateInput {
  readonly controlMetric: number;
  readonly candidateMetric: number;
  readonly controlCatastrophicLossRate: number;
  readonly candidateCatastrophicLossRate: number;
  readonly candidateBattles: number;
}

export interface PromotionThresholds {
  readonly minimumBattles: number;
  readonly minimumMetricDelta: number;
  readonly maximumCatastrophicRegression: number;
}

/**
 * Conservative first-pass gate. Statistical testing should wrap this before
 * production promotion; this function only encodes hard safety thresholds.
 */
export function passesHardPromotionGate(
  input: PromotionGateInput,
  thresholds: PromotionThresholds,
): boolean {
  if (input.candidateBattles < thresholds.minimumBattles) return false;
  if (input.candidateMetric - input.controlMetric < thresholds.minimumMetricDelta) {
    return false;
  }
  if (
    input.candidateCatastrophicLossRate - input.controlCatastrophicLossRate >
    thresholds.maximumCatastrophicRegression
  ) {
    return false;
  }
  return true;
}
