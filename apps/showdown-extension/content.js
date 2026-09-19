// stallmind: content script. Injects the main-world bridge, relays protocol frames to
// the background worker, which posts them to the local analysis server.
'use strict';

const script = document.createElement('script');
script.src = browser.runtime.getURL('bridge.js');
script.onload = () => script.remove();
(document.head || document.documentElement).appendChild(script);

const battleId = () => {
  const match = location.hash.match(/#(battle-[a-zA-Z0-9-]+)/);
  return match ? match[1] : 'live';
};

document.addEventListener('stallmind:frame', (event) => {
  const frame = event.detail && event.detail.frame;
  if (typeof frame !== 'string') return;
  browser.runtime.sendMessage({ type: 'stallmind:frame', battleId: battleId(), frame }).catch(() => {});
});