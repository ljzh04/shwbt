// stallmind: main-world bridge. Runs inside the page before Showdown's client scripts.
// Captures the current battle's own protocol frames (the same text the page displays in
// its battle log) and re-dispatches them for the content script. Observes nothing else:
// no credentials, no cookies, no other rooms, no page data beyond protocol strings.
(() => {
  'use strict';
  if (window.__stallmindBridge) return;
  window.__stallmindBridge = { active: true };

  const OriginalWebSocket = window.WebSocket;
  if (!OriginalWebSocket) return;
  const hooked = typeof WeakSet === 'function' ? new WeakSet() : null;

  const forward = (data) => {
    try {
      if (typeof data === 'string' && data.length > 0) {
        document.dispatchEvent(new CustomEvent('stallmind:frame', { detail: { frame: data } }));
      }
    } catch {
      // page teardown; ignore
    }
  };

  const hook = (socket) => {
    if (hooked && hooked.has(socket)) return;
    if (hooked) hooked.add(socket);
    const originalAdd = socket.addEventListener.bind(socket);
    socket.addEventListener = (type, handler, options) => {
      if (type === 'message' && typeof handler === 'function') {
        originalAdd('message', (event) => {
          forward(event.data);
          return handler.call(this, event);
        }, options);
        return;
      }
      return originalAdd(type, handler, options);
    };
    let handler = null;
    Object.defineProperty(socket, 'onmessage', {
      get: () => handler,
      set: (fn) => {
        handler = fn;
        originalAdd('message', (event) => {
          forward(event.data);
          return typeof handler === 'function' ? handler.call(this, event) : undefined;
        });
      },
      configurable: true,
    });
  };

  window.WebSocket = function (url, protocols) {
    const socket = protocols === undefined
      ? new OriginalWebSocket(url)
      : new OriginalWebSocket(url, protocols);
    hook(socket);
    return socket;
  };
  window.WebSocket.prototype = OriginalWebSocket.prototype;
  window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
  window.WebSocket.OPEN = OriginalWebSocket.OPEN;
  window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
  window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;
})();