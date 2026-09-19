// stallmind: background worker. Batches protocol frames per battle and posts them to the
// local analysis server (http://127.0.0.1:3100/ingest). Fails silently when the server is off.
'use strict';

const INGEST = 'http://127.0.0.1:3100/ingest';
const batches = new Map();
const timers = new Map();

const flush = (battleId) => {
  const frames = batches.get(battleId) || [];
  batches.delete(battleId);
  timers.delete(battleId);
  if (frames.length === 0) return;
  fetch(INGEST, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ battleId, frames }),
  }).catch(() => {});
};

browser.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== 'stallmind:frame' || typeof message.frame !== 'string') return;
  const frames = batches.get(message.battleId) || [];
  frames.push(message.frame);
  batches.set(message.battleId, frames);
  if (!timers.has(message.battleId)) {
    timers.set(message.battleId, setTimeout(() => flush(message.battleId), 250));
  }
});