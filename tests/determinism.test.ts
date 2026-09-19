import assert from 'node:assert/strict';
import { ShowdownBattle } from '../packages/simulator/src/battle-stream.js';
import { hashBattleState } from '../packages/simulator/src/state-hash.js';

async function run(): Promise<readonly string[]> {
  const team = JSON.stringify([{ species: 'Pikachu', ability: 'Static', item: 'Light Ball', moves: ['Thunderbolt', 'Quick Attack'] }]);
  const battle = new ShowdownBattle('all');
  await battle.start({ formatId: 'gen9customgame', p1Name: 'p1', p2Name: 'p2', p1Team: team, p2Team: team, seed: 1337 });
  const hashes: string[] = [];
  for (let turn = 0; turn < 3 && !battle.isFinished(); turn += 1) {
    const [choices, opponentChoices] = await Promise.all([battle.choices('p1'), battle.choices('p2')]);
    await battle.flush();
    hashes.push(hashBattleState(battle.snapshot()));
    if (choices.length === 0) break;
    await battle.choose('p1', choices[0]!);
    if (opponentChoices.length > 0) await battle.choose('p2', opponentChoices[0]!);
  }
  await battle.flush();
  return hashes;
}

async function main(): Promise<void> {
  assert.deepEqual(await run(), await run());
  console.log('determinism tests ok');
}

void main();