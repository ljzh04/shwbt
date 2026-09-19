import assert from 'node:assert/strict';
import { FrequencyActionPredictor } from '../packages/training/src/action-predictor.js';
import { passesHardPromotionGate } from '../packages/training/src/promotion.js';

const move = (id: string) => ({ kind: 'move' as const, id });
const predictor = new FrequencyActionPredictor();
predictor.fit([{ legalActions: [move('recover'), move('toxic')], chosenAction: move('toxic') }, { legalActions: [move('toxic')], chosenAction: move('toxic') }]);
const predictions = predictor.predict([move('recover'), move('toxic')]);
assert.equal(predictions[0]?.action.id, 'toxic');
assert.equal(predictions.reduce((sum, prediction) => sum + prediction.probability, 0), 1);
assert.equal(predictor.predict([]).length, 0);
assert.equal(passesHardPromotionGate({ controlMetric: 0.5, candidateMetric: 0.55, controlCatastrophicLossRate: 0.1, candidateCatastrophicLossRate: 0.1, candidateBattles: 100 }, { minimumBattles: 100, minimumMetricDelta: 0.02, maximumCatastrophicRegression: 0 }), true);
assert.equal(passesHardPromotionGate({ controlMetric: 0.5, candidateMetric: 0.55, controlCatastrophicLossRate: 0.1, candidateCatastrophicLossRate: 0.2, candidateBattles: 100 }, { minimumBattles: 100, minimumMetricDelta: 0.02, maximumCatastrophicRegression: 0 }), false);
console.log('training tests ok');