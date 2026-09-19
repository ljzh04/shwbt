import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { PredictionSnapshot } from './analysis-snapshot.js';

export type SnapshotLoader = () => Promise<readonly PredictionSnapshot[]>;

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

async function handle(request: IncomingMessage, response: ServerResponse, load: SnapshotLoader): Promise<void> {
  const url = new URL(request.url ?? '/', 'http://localhost');
  if (url.pathname === '/health') {
    json(response, 200, { status: 'ok' });
    return;
  }
  if (url.pathname === '/snapshot') {
    const battleId = url.searchParams.get('battleId');
    if (!battleId) {
      json(response, 400, { error: 'battleId query parameter required' });
      return;
    }
    const turnParam = url.searchParams.get('turn');
    const turn = turnParam === null ? null : Number(turnParam);
    if (turnParam !== null && !Number.isInteger(turn)) {
      json(response, 400, { error: 'turn must be an integer' });
      return;
    }
    const matches = (await load()).filter((snapshot) => snapshot.battleId === battleId);
    const selected = turn === null
      ? matches.reduce<PredictionSnapshot | null>((latest, snapshot) => !latest || snapshot.turn > latest.turn ? snapshot : latest, null)
      : matches.find((snapshot) => snapshot.turn === turn) ?? null;
    if (!selected) {
      json(response, 404, { error: 'no snapshot for battleId' });
      return;
    }
    json(response, 200, selected);
    return;
  }
  json(response, 404, { error: 'not found' });
}

export function createAnalysisServer(load: SnapshotLoader): Server {
  return createServer((request, response) => {
    handle(request, response, load).catch(() => {
      if (!response.headersSent) json(response, 500, { error: 'internal error' });
    });
  });
}
