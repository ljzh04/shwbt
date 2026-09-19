import assert from 'node:assert/strict';
import { calculateDamage } from '../packages/simulator/src/damage.js';

const pikachu = [{ species: 'Pikachu', ability: 'Static', item: 'Light Ball', moves: ['Thunderbolt', 'Quick Attack'] }];
const result = calculateDamage({ formatId: 'gen9customgame', sourceTeam: pikachu, targetTeam: pikachu, move: 'thunderbolt', seed: 1337 });
assert.equal(typeof result.amount, 'number');
assert.equal(result.successful, true);
const immune = calculateDamage({
  formatId: 'gen9customgame', sourceTeam: [{ species: 'Pikachu', ability: 'Static', item: null, moves: ['Thunderbolt'] }],
  targetTeam: [{ species: 'Gligar', ability: 'Hyper Cutter', item: null, moves: ['Roost'] }], move: 'thunderbolt', seed: 1337,
});
assert.equal(immune.immune, true);
assert.throws(() => calculateDamage({ formatId: 'gen9customgame', sourceTeam: [], targetTeam: pikachu, move: 'tackle' }), /non-empty/);
console.log('damage tests ok');