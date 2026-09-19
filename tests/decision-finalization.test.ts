import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DecisionSink } from '../packages/storage/src/decision-sink.js';
import { RawEventWriter, type RawEvent } from '../packages/storage/src/raw-event-writer.js';

async function main(): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'stall-ai-finalize-'));
  const sink = new DecisionSink(new RawEventWriter(join(root, 'decisions.ndjson')));
  const request = JSON.stringify({ active: [{ moves: [{ id: 'recover', disabled: false }] }], side: { pokemon: [{ ident: 'p1: Wall', active: true, condition: '100/100' }] } });
  const event: RawEvent = {
    schema_version: '1.0.0', event_id: 'event-0', run_id: 'run-1', battle_id: 'battle-1', sequence: 0,
    timestamp: '2026-09-19T00:00:00.000Z', source: 'selfplay', simulator_commit: 'a'.repeat(40), format_id: 'gen9customgame', agent_version: 'test', payload_type: 'protocol', payload: { type: 'sideupdate', message: `p1\n|turn|1\n|request|${request}` },
  };
  const pending = await sink.accept(event);
  assert.ok(pending);
  const drift: RawEvent = {
    ...event, event_id: 'event-1', sequence: 1,
    payload: { type: 'sideupdate', message: `p1\n|-sidestart|p2: Wall|Stealth Rock\n|request|${request}` },
  };
  assert.ok(await sink.accept(drift));
  const finalized = await sink.finalize(pending.decision_id, { kind: 'move', id: 'recover' }, { next_state_hash: 'next' }, {
    winProgress: 0, opponentPPDepletion: 0, forcedSwitchValue: 0, statusPressure: 0, hazardPressure: 0,
    informationGain: 0, structuralIntegrity: 0, decisionBurden: 0, catastrophicRisk: 0, irreversibleResourceLoss: 0,
  });
  assert.equal(finalized, true);
  assert.equal(await sink.finalize(pending.decision_id, { kind: 'move', id: 'recover' }, {}, {} as never), false);
  const records = (await readFile(join(root, 'decisions.ndjson'), 'utf8')).trim().split('\n').map((line) => JSON.parse(line) as { payload_type: string; payload: { chosen_action?: unknown; objective_delta?: { hazardPressure: number } } });
  assert.equal(records.length, 5);
  assert.equal(records[1]?.payload_type, 'analysis');
  const fin = records[4]?.payload;
  assert.ok(fin?.chosen_action);
  assert.ok((fin?.objective_delta?.hazardPressure ?? 0) > 0);
  console.log('decision finalization tests ok');
}

void main();