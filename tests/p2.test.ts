import assert from 'node:assert/strict';
import { behaviorFeatures, brierScore, cvar } from '../packages/agent/src/p2.js';
import { counterTeam, mutateTeam, normalizeSet, roleTags, selectElites } from '../packages/teamlab/src/p2.js';
import type { Team } from '../packages/teamlab/src/types.js';

assert.equal(cvar([-1, 2, 3]), -1);
assert.ok(Math.abs(brierScore([{ probability: 0.8, outcome: true }, { probability: 0.2, outcome: false }]) - 0.04) < 1e-12);
assert.deepEqual(behaviorFeatures([
  { turn: 1, eventType: 'opponent_action', payload: { action: { kind: 'switch', id: '2' } } },
  { turn: 2, eventType: 'opponent_action', payload: { action: { kind: 'move', id: 'toxic' } } },
]), { switchRate: 0.5, stayRate: 0.5, actionEntropy: 1 });
const set = normalizeSet({ species: ' Wall ', ability: null, item: null, nature: null, evs: { hp: 252 }, ivs: {}, moves: ['Toxic', 'toxic'], teraType: null });
assert.deepEqual(set.moves, ['toxic']);
const team: Team = { id: 'team', formatId: 'gen9ou', members: [set], tags: [], source: { kind: 'seed', uri: null, capturedAt: null, sourceHash: null } };
assert.deepEqual(roleTags(team), ['status']);
assert.equal(mutateTeam(team, 0, set).members.length, 1);
assert.equal(counterTeam(team, 'candidate').source.kind, 'adversarial');
assert.equal(selectElites([{ team, fitness: { winRate: 1, annoyance: 0, opponentPPDepletion: 0, forcedSwitches: 0, catastrophicLossRate: 0, matchupVariance: 0 } }], 1).length, 1);
console.log('p2 tests ok');