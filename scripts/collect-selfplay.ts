import { randomUUID } from 'node:crypto';
import { ShowdownBattle } from '../packages/simulator/src/battle-stream.js';
import { DecisionSink } from '../packages/storage/src/decision-sink.js';
import { RawEventWriter } from '../packages/storage/src/raw-event-writer.js';

function option(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

async function main(): Promise<void> {
  const team = JSON.stringify([{ species: 'Pikachu', ability: 'Static', item: 'Light Ball', moves: ['Thunderbolt', 'Quick Attack'] }]);
  const runId = randomUUID();
  const rawPath = option('--raw', 'data/raw/selfplay.ndjson');
  const decisionPath = option('--decisions', 'data/derived/selfplay-decisions.ndjson');
  const writer = new RawEventWriter(rawPath);
  const decisionSink = new DecisionSink(new RawEventWriter(decisionPath));
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
    await decisionSink.accept(event);
  }, async (result) => {
    await writer.append({
      schema_version: '1.0.0', event_id: randomUUID(), run_id: runId, battle_id: battleId, sequence: sequence++,
      timestamp: new Date().toISOString(), source: 'selfplay', simulator_commit: '2ddfa0476f8207e12e204b1c69f7c7683b17633c', format_id: 'gen9customgame', agent_version: 'collector-dev', payload_type: 'outcome', payload: { winner: result.winner, reason: result.reason },
    });
  });

  await battle.start({ formatId: 'gen9customgame', p1Name: 'selfplay-p1', p2Name: 'selfplay-p2', p1Team: team, p2Team: team, seed: 1337 });
  for (let turn = 0; turn < 100 && !battle.isFinished(); turn += 1) {
    const [p1, p2] = await Promise.all([battle.choices('p1'), battle.choices('p2')]);
    if (p1.length === 0 || p2.length === 0) break;
    await Promise.all([battle.choose('p1', p1[0]!), battle.choose('p2', p2[0]!)]);
  }
  await battle.flush();
  console.log(`self-play battle written: ${runId} events ${sequence}`);
}

void main();