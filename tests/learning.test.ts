import assert from 'node:assert/strict';
import { generateCounterfactuals, HiddenSetClassifier, mineHardExamples, PositionValueModel } from '../packages/training/src/learning.js';

const classifier = new HiddenSetClassifier();
classifier.fit([{ features: ['item:leftovers'], setId: 'wall' }, { features: ['move:recover'], setId: 'wall' }, { features: [], setId: 'sweeper' }]);
assert.equal(classifier.predict()[0]?.setId, 'wall');
const values = new PositionValueModel();
values.fit([{ stateHash: 'a', value: 1 }, { stateHash: 'a', value: 3 }]);
assert.equal(values.predict('a'), 2);
assert.equal(mineHardExamples([{ state: {} as never, loss: 1, regret: 0 }, { state: {} as never, loss: 0, regret: 2 }], 1)[0]?.regret, 2);
assert.equal(generateCounterfactuals({} as never, [{ kind: 'move', id: 'recover' }])[0]?.outcomeSource, 'simulated');
console.log('learning tests ok');