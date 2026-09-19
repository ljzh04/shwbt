import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { PlayerId } from '../../engine/src/types.js';
import type { PredictionSnapshot } from './analysis-snapshot.js';

export type SnapshotLoader = () => Promise<readonly PredictionSnapshot[]>;

export interface LiveFrameFeed {
  readonly battleId: string;
  readonly frames: readonly string[];
  readonly perspective?: PlayerId;
}

export interface LiveIngest {
  accept(feed: LiveFrameFeed): Promise<number>;
}

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
  response.end(JSON.stringify(body));
}

export interface PanelOptions {
  readonly panelHtml: string | null;
}

function html(response: ServerResponse, body: string): void {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(body);
}

async function readJson(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk: Buffer | string) => {
      body += chunk.toString('utf8');
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

async function handle(request: IncomingMessage, response: ServerResponse, load: SnapshotLoader, panel: PanelOptions, ingest: LiveIngest | null): Promise<void> {
  const url = new URL(request.url ?? '/', 'http://localhost');
  if (url.pathname === '/ingest') {
    if (!ingest) {
      json(response, 404, { error: 'ingest not configured' });
      return;
    }
    if (request.method !== 'POST') {
      json(response, 405, { error: 'POST required' });
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(await readJson(request));
    } catch {
      json(response, 400, { error: 'invalid JSON body' });
      return;
    }
    const feed = parsed as Partial<LiveFrameFeed>;
    const frames = Array.isArray(feed.frames) ? feed.frames.filter((frame) => typeof frame === 'string') : [];
    if (typeof feed.battleId !== 'string' || feed.battleId.length === 0) {
      json(response, 400, { error: 'battleId string required' });
      return;
    }
    const perspective = feed.perspective === 'p2' ? 'p2' : 'p1';
    const accepted = await ingest.accept({ battleId: feed.battleId, frames, perspective });
    json(response, 202, { accepted });
    return;
  }
  if (url.pathname === '/health') {
    json(response, 200, { status: 'ok' });
    return;
  }
  if (url.pathname === '/') {
    if (!panel.panelHtml) {
      json(response, 404, { error: 'panel not configured' });
      return;
    }
    html(response, panel.panelHtml);
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
  if (url.pathname === '/timeline') {
    const battleId = url.searchParams.get('battleId');
    if (!battleId) {
      json(response, 400, { error: 'battleId query parameter required' });
      return;
    }
    const matches = (await load())
      .filter((snapshot) => snapshot.battleId === battleId)
      .sort((left, right) => left.turn - right.turn);
    json(response, 200, { battleId, turns: matches.map((snapshot) => snapshot.turn), snapshots: matches });
    return;
  }
  json(response, 404, { error: 'not found' });
}

export function createAnalysisServer(load: SnapshotLoader, panel: PanelOptions = { panelHtml: null }, ingest: LiveIngest | null = null): Server {
  return createServer((request, response) => {
    handle(request, response, load, panel, ingest).catch(() => {
      if (!response.headersSent) json(response, 500, { error: 'internal error' });
    });
  });
}
