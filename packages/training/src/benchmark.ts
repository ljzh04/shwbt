export interface BenchmarkCase<TState, TAction> {
  readonly id: string;
  readonly seed: number;
  readonly state: TState;
  readonly expected: TAction;
}

export interface BenchmarkPolicy<TState, TAction> {
  choose(state: TState, seed: number): TAction;
}

export interface BenchmarkResult<TAction> {
  readonly policyId: string;
  readonly total: number;
  readonly correct: number;
  readonly catastrophicLosses: number;
  readonly accuracy: number;
  readonly catastrophicLossRate: number;
  readonly actions: readonly { caseId: string; action: TAction; correct: boolean }[];
}

export function runBenchmark<TState, TAction>(
  policyId: string,
  policy: BenchmarkPolicy<TState, TAction>,
  cases: readonly BenchmarkCase<TState, TAction>[],
  isCatastrophic: (actual: TAction, expected: TAction) => boolean,
  equal: (left: TAction, right: TAction) => boolean = Object.is,
): BenchmarkResult<TAction> {
  let correct = 0;
  let catastrophicLosses = 0;
  const actions = cases.map((benchmarkCase) => {
    const action = policy.choose(benchmarkCase.state, benchmarkCase.seed);
    const matches = equal(action, benchmarkCase.expected);
    if (matches) correct += 1;
    if (isCatastrophic(action, benchmarkCase.expected)) catastrophicLosses += 1;
    return { caseId: benchmarkCase.id, action, correct: matches };
  });
  return {
    policyId,
    total: cases.length,
    correct,
    catastrophicLosses,
    accuracy: cases.length === 0 ? 0 : correct / cases.length,
    catastrophicLossRate: cases.length === 0 ? 0 : catastrophicLosses / cases.length,
    actions,
  };
}