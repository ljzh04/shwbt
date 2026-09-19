import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { ShowdownBattle } from '../packages/simulator/src/battle-stream.js';
import { DecisionSink } from '../packages/storage/src/decision-sink.js';
import { RawEventWriter } from '../packages/storage/src/raw-event-writer.js';

function option(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function loadTeam(path: string): Promise<string> {
  return readFile(path, 'utf8');
}

async function main(): Promise<void> {
  const p1Team = await loadTeam(option('--p1-team', 'data/teams/ou-stall-whitequeen.json'));
  const p2Team = await loadTeam(option('--p2-team', 'data/teams/ou-balance-pivot.json'));
  const runId = randomUUID();
  const rawPath = option('--raw', 'data/raw/selfplay.ndjson');
  const decisionPath = option('--decisions', 'data/derived/selfplay-decisions.ndjson');
  const writer = new RawEventWriter(rawPath);
  const decisionSink = new DecisionSink(new RawEventWriter(decisionPath));
  const pending = new Map<string, string>();
  let sequence = 0;
  const battleId = runId;
  const battle = new ShowdownBattle('all', async (type, payload) => {
    const event = {
      schema_version: '1.0.0', event_id: randomUUID(), run_id: runId, battle_id: runId, sequence,
      timestamp: new Date().toISOString(), source: 'selfplay' as const,
      simulator_commit: '2ddfa0476f8207e12e204b1c69f7c7683b17633c', format_id: 'gen9customgame',
      agent_version: 'collector-dev', payload_type: 'protocol' as const, payload: { type, message: payload },
    };
    sequence += 1;
    await writer.append(event);
    const decision = await decisionSink.accept(event);
    if (decision) pending.set(decision.actor, decision.decision_id);
  }, async (result) => {
    await writer.append({
      schema_version: '1.0.0', event_id: randomUUID(), run_id: runId, battle_id: battleId, sequence: sequence++,
      timestamp: new Date().toISOString(), source: 'selfplay', simulator_commit: '2ddfa0476f8207e12e204b1c69f7c7683b17633c', format_id: 'gen9customgame', agent_version: 'collector-dev', payload_type: 'outcome', payload: { winner: result.winner, reason: result.reason },
    });
  });

  await battle.start({ formatId: 'gen9customgame', p1Name: 'selfplay-p1', p2Name: 'selfplay-p2', p1Team, p2Team, seed: 1337 });
  for (let turn = 0; turn < 100 && !battle.isFinished(); turn += 1) {
    const [p1, p2] = await Promise.all([battle.choices('p1'), battle.choices('p2')]);
    if (p1.length === 0 || p2.length === 0) break;
    await battle.flush();
    const actions = { p1: p1[0]!, p2: p2[0]! };
    for (const player of ['p1', 'p2'] as const) {
      const decision = pending.get(player);
      if (decision) {
        await decisionSink.finalize(decision, actions[player], { selected_at_turn: battle.snapshot().turn }, {
          winProgress: 0, opponentPPDepletion: 0, forcedSwitchValue: 0, statusPressure: 0, hazardPressure: 0,
          informationGain: 0, structuralIntegrity: 0, decisionBurden: 0, catastrophicRisk: 0, irreversibleResourceLoss: 0,
        });
        pending.delete(player);
      }
    }
    await Promise.all([battle.choose('p1', actions.p1), battle.choose('p2', actions.p2)]);
  }
  await battle.flush();
  console.log(`self-play battle written: ${runId} events ${sequence}`);
}

void main();