export function benchmarkDue(now: number, lastRun: number | null, intervalMs: number): boolean {
  return intervalMs >= 0 && (lastRun === null || now - lastRun >= intervalMs);
}