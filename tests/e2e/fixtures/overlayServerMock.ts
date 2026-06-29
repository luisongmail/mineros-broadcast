import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash } from 'node:crypto';
import type { Socket } from 'node:net';
import { URL } from 'node:url';

import { test as base } from '@playwright/test';

import {
  createConflictResponse,
  createResponseEnvelope,
  createSnapshotEnvelope,
  getZoneId,
  type MockOverlayId,
  type SnapshotState,
} from './wsMessages';

export type MockOperator = {
  userId: string;
  email: string;
  displayName: string;
  role: string;
  accessToken: string;
  refreshToken: string;
  otp: string;
};

export const primaryOperator: MockOperator = {
  userId: 'operator-1',
  email: 'test@playflow.dev',
  displayName: 'Operador Uno',
  role: 'Director',
  accessToken: 'mock-access-operator-1',
  refreshToken: 'mock-refresh-operator-1',
  otp: '246810',
};

export const secondaryOperator: MockOperator = {
  userId: 'operator-2',
  email: 'conflict@playflow.dev',
  displayName: 'Operador Dos',
  role: 'Director',
  accessToken: 'mock-access-operator-2',
  refreshToken: 'mock-refresh-operator-2',
  otp: '135790',
};

type MutableState = SnapshotState;

type MockLineupEntry = {
  playerId: string;
  order: number;
  number: string;
  name: string;
  position: string;
  status: 'active' | 'substituted';
};

type MockTeamPlayer = {
  id: string;
  name: string;
  number: string;
  position: string;
  bats: string | null;
  throws: string | null;
  status: 'active';
  team_id: string;
};

type MockSubstitutionRecord = {
  id: string;
  substitutionType: string;
  incoming: { playerId: string; name: string };
  outgoing: { playerId: string; name: string };
  battingOrder: number;
  position: string;
  notes?: string;
  createdAt: string;
  operatorId: string;
};

export type MockLineupState = {
  gameId: string;
  inning: number;
  inningHalf: 'top' | 'bottom';
  outs: number;
  count: { balls: number; strikes: number };
  score: { home: number; away: number };
  bases: { first: null; second: null; third: null };
  rules: { hasPitcher: true; sport: 'softball' };
  homeTeam: { id: string; name: string; shortName: string };
  awayTeam: { id: string; name: string; shortName: string };
  currentBatterId: string;
  currentPitcherId: string;
  lineup: {
    home: MockLineupEntry[];
    away: MockLineupEntry[];
  };
  teamPlayers: {
    home: MockTeamPlayer[];
    away: MockTeamPlayer[];
  };
  playerMeta: Record<string, { bats?: string; throws?: string }>;
  history: unknown[];
  pitches: unknown[];
  substitutionHistory: MockSubstitutionRecord[];
  scenarios: {
    emptyBench: boolean;
    failNextSubstitution: boolean;
    failTeamPlayers: boolean;
  };
};

function defaultState(): MutableState {
  return {
    revision: 1,
    previewOverlayId: null,
    programOverlayId: 'scorebug',
    latencyMs: 24,
    connectionStatus: 'connected',
    conflicts: [],
  };
}

function defaultLineupState(): MockLineupState {
  const home = [
    { playerId: 'player-home-01', order: 1, number: '7', name: 'Constanza Aguilera', position: 'SS', status: 'active' as const },
    { playerId: 'player-home-02', order: 2, number: '9', name: 'Florencia Honorato', position: '2B', status: 'active' as const },
    { playerId: 'player-home-03', order: 3, number: '24', name: 'Catalina Guerra', position: 'P', status: 'active' as const },
  ];
  const away = [
    { playerId: 'player-away-01', order: 1, number: '1', name: 'Angélica González', position: 'CF', status: 'active' as const },
    { playerId: 'player-away-02', order: 2, number: '2', name: 'Mariela Diaz', position: '1B', status: 'active' as const },
    { playerId: 'player-away-03', order: 3, number: '3', name: 'María Gabriela', position: 'LF', status: 'active' as const },
  ];
  const homeBench = [
    { id: 'player-home-12', name: 'Vanessa Adams', number: '12', position: 'RF', bats: 'R', throws: 'R', status: 'active' as const, team_id: 'team-home' },
    { id: 'player-home-15', name: 'Cecilia Muñoz', number: '15', position: 'C', bats: 'R', throws: 'R', status: 'active' as const, team_id: 'team-home' },
  ];
  const awayBench = [
    { id: 'player-away-12', name: 'Merly Rodríguez', number: '12', position: 'RF', bats: 'R', throws: 'R', status: 'active' as const, team_id: 'team-away' },
  ];

  return {
    gameId: 'game-001',
    inning: 1,
    inningHalf: 'top',
    outs: 0,
    count: { balls: 0, strikes: 0 },
    score: { home: 0, away: 0 },
    bases: { first: null, second: null, third: null },
    rules: { hasPitcher: true, sport: 'softball' },
    homeTeam: { id: 'team-home', name: 'Mineros', shortName: 'MIN' },
    awayTeam: { id: 'team-away', name: 'Guerreras', shortName: 'GUE' },
    currentBatterId: away[0].playerId,
    currentPitcherId: home[2].playerId,
    lineup: { home, away },
    teamPlayers: {
      home: [
        ...home.map((player) => ({ id: player.playerId, name: player.name, number: player.number, position: player.position, bats: 'R', throws: 'R', status: 'active' as const, team_id: 'team-home' })),
        ...homeBench,
      ],
      away: [
        ...away.map((player) => ({ id: player.playerId, name: player.name, number: player.number, position: player.position, bats: 'R', throws: 'R', status: 'active' as const, team_id: 'team-away' })),
        ...awayBench,
      ],
    },
    playerMeta: Object.fromEntries(
      [
        ...home,
        ...away,
        ...homeBench.map((player) => ({ ...player, playerId: player.id })),
        ...awayBench.map((player) => ({ ...player, playerId: player.id })),
      ].map((player) => [player.playerId, { bats: 'R', throws: 'R' }]),
    ),
    history: [],
    pitches: [],
    substitutionHistory: [],
    scenarios: {
      emptyBench: false,
      failNextSubstitution: false,
      failTeamPlayers: false,
    },
  };
}

function getBattingRole(lineupState: MockLineupState) {
  return lineupState.inningHalf === 'top' ? 'away' : 'home';
}

function getPitchingRole(lineupState: MockLineupState) {
  return getBattingRole(lineupState) === 'home' ? 'away' : 'home';
}

function getOperatorByToken(token: string | null): MockOperator {
  if (token === secondaryOperator.accessToken) {
    return secondaryOperator;
  }

  return primaryOperator;
}

function getOperatorByRefreshToken(token: string | null): MockOperator {
  if (token === secondaryOperator.refreshToken) {
    return secondaryOperator;
  }

  return primaryOperator;
}

function parseRequestBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    request.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>);
      } catch {
        resolve({});
      }
    });
  });
}

function parseCookies(request: IncomingMessage): Record<string, string> {
  const cookieHeader = request.headers.cookie ?? '';
  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.trim().split('=');
    if (key && value) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

function json(
  request: IncomingMessage,
  response: ServerResponse,
  statusCode: number,
  payload: unknown,
  headers: Record<string, string> = {},
) {
  const origin = typeof request.headers.origin === 'string' ? request.headers.origin : 'http://localhost:4173';
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

const MOCK_PORT = Number(process.env.PLAYFLOW_E2E_MOCK_PORT ?? 3101);

export async function startOverlayServerMock(port = MOCK_PORT) {
  const state = defaultState();
  const lineupState = defaultLineupState();
  const server = createServer(async (request, response) => {
    const method = request.method ?? 'GET';
    const url = new URL(request.url ?? '/', `http://localhost:${port}`);

    if (method === 'OPTIONS') {
      json(request, response, 204, {});
      return;
    }

    if (method === 'GET' && url.pathname === '/health') {
      json(request, response, 200, { ok: true });
      return;
    }

    if (method === 'POST' && url.pathname === '/__e2e/reset') {
      Object.assign(state, defaultState());
      Object.assign(lineupState, defaultLineupState());
      broadcast();
      json(request, response, 200, { ok: true, snapshot: createSnapshotEnvelope(state) });
      return;
    }

    if (method === 'GET' && url.pathname === '/__e2e/state') {
      json(request, response, 200, { snapshot: createSnapshotEnvelope(state) });
      return;
    }

    if (method === 'GET' && url.pathname === '/__e2e/lineup/state') {
      json(request, response, 200, { lineupState });
      return;
    }

    if (method === 'POST' && url.pathname === '/__e2e/lineup/scenario') {
      const body = await parseRequestBody(request);
      lineupState.scenarios = {
        ...lineupState.scenarios,
        ...(typeof body.emptyBench === 'boolean' ? { emptyBench: body.emptyBench } : {}),
        ...(typeof body.failNextSubstitution === 'boolean' ? { failNextSubstitution: body.failNextSubstitution } : {}),
        ...(typeof body.failTeamPlayers === 'boolean' ? { failTeamPlayers: body.failTeamPlayers } : {}),
      };
      json(request, response, 200, { ok: true, scenarios: lineupState.scenarios });
      return;
    }

    if (method === 'POST' && url.pathname === '/api/auth/otp/request') {
      const body = await parseRequestBody(request);
      const email = String(body.email ?? '').toLowerCase();
      const operator = email === secondaryOperator.email ? secondaryOperator : primaryOperator;
      json(request, response, 200, {
        message: 'Código OTP generado en modo mock.',
        __dev_otp: operator.otp,
      });
      return;
    }

    if (method === 'POST' && url.pathname === '/api/auth/otp/verify') {
      const body = await parseRequestBody(request);
      const email = String(body.email ?? '').toLowerCase();
      const otp = String(body.otp ?? '');
      const operator = email === secondaryOperator.email ? secondaryOperator : primaryOperator;

      if (otp !== operator.otp) {
        json(request, response, 401, {
          error: {
            code: 'INVALID_OTP',
            message: 'Código inválido o expirado.',
          },
        });
        return;
      }

      json(
        request,
        response,
        200,
        {
          accessToken: operator.accessToken,
          expiresIn: 900,
          tokenType: 'Bearer',
        },
        {
          'Set-Cookie': `pf_refresh=${operator.refreshToken}; Path=/; HttpOnly; SameSite=Lax`,
        },
      );
      return;
    }

    if (method === 'POST' && url.pathname === '/api/auth/token/refresh') {
      const cookies = parseCookies(request);
      const operator = getOperatorByRefreshToken(cookies.pf_refresh ?? null);

      if (!cookies.pf_refresh) {
        json(request, response, 401, {
          error: {
            code: 'REFRESH_TOKEN_EXPIRED',
            message: 'Sesión expirada.',
          },
        });
        return;
      }

      json(request, response, 200, {
        accessToken: operator.accessToken,
        tokenType: 'Bearer',
        expiresIn: 900,
      });
      return;
    }

    if (method === 'GET' && url.pathname === '/api/security/context') {
      const authHeader = request.headers.authorization ?? '';
      const token = authHeader.replace(/^Bearer\s+/i, '');
      const operator = getOperatorByToken(token || null);

      json(request, response, 200, {
        user: {
          userId: operator.userId,
          email: operator.email,
          displayName: operator.displayName,
          authLevel: 'otp',
          sessionId: `session-${operator.userId}`,
          globalRoles: [],
        },
        availableScopes: [
          {
            resourceType: 'Game',
            resourceId: 'game-001',
            name: 'Juego de prueba',
            role: operator.role,
          },
        ],
        securityFlags: {
          requiresStepUpForSensitiveActions: false,
          canViewAudit: true,
          isSysAdmin: false,
        },
      });
      return;
    }

    if (method === 'GET' && url.pathname === '/api/scorer/context') {
      const battingRole = getBattingRole(lineupState);
      const pitchingRole = getPitchingRole(lineupState);
      const battingLineup = lineupState.lineup[battingRole];
      const pitchingLineup = lineupState.lineup[pitchingRole];
      const currentBatter = battingLineup.find((player) => player.playerId === lineupState.currentBatterId) ?? battingLineup[0] ?? null;
      const currentPitcher = pitchingLineup.find((player) => player.playerId === lineupState.currentPitcherId)
        ?? pitchingLineup.find((player) => player.position.toUpperCase() === 'P')
        ?? pitchingLineup[0]
        ?? null;

      json(request, response, 200, {
        result: 'ok',
        payload: {
          gameState: {
            gameId: lineupState.gameId,
            status: 'live',
            inning: lineupState.inning,
            inningHalf: lineupState.inningHalf,
            outs: lineupState.outs,
            count: lineupState.count,
            score: lineupState.score,
            bases: lineupState.bases,
            rules: lineupState.rules,
            homeTeam: lineupState.homeTeam,
            awayTeam: lineupState.awayTeam,
            currentBatterId: lineupState.currentBatterId,
            currentPitcherId: lineupState.currentPitcherId,
            lineup: lineupState.lineup,
          },
          currentInning: lineupState.inning,
          inningHalf: lineupState.inningHalf,
          currentBatter,
          currentPitcher,
          battingLineup,
          pitchingLineup,
          atBatsThisInning: 0,
          pitcherStats: {},
          pitcherChangeLog: [],
          playerMeta: lineupState.playerMeta,
        },
      });
      return;
    }

    if (method === 'GET' && /^\/api\/at-bats\/[^/]+$/.test(url.pathname)) {
      json(request, response, 200, { result: 'ok', payload: lineupState.history });
      return;
    }

    if (method === 'GET' && /^\/api\/pitches\/[^/]+$/.test(url.pathname)) {
      json(request, response, 200, { result: 'ok', payload: lineupState.pitches });
      return;
    }

    const teamPlayersMatch = url.pathname.match(/^\/api\/teams\/([^/]+)\/players$/);
    if (method === 'GET' && teamPlayersMatch) {
      if (lineupState.scenarios.failTeamPlayers) {
        json(request, response, 500, { result: 'error', payload: { message: 'No se pudo cargar el roster' } });
        return;
      }

      const teamId = decodeURIComponent(teamPlayersMatch[1]);
      const players = teamId === lineupState.homeTeam.id
        ? lineupState.scenarios.emptyBench
          ? lineupState.teamPlayers.home.filter((player) => lineupState.lineup.home.some((entry) => entry.playerId === player.id))
          : lineupState.teamPlayers.home
        : lineupState.scenarios.emptyBench
          ? lineupState.teamPlayers.away.filter((player) => lineupState.lineup.away.some((entry) => entry.playerId === player.id))
          : lineupState.teamPlayers.away;
      json(request, response, 200, { result: 'ok', payload: players });
      return;
    }

    const lineupMatch = url.pathname.match(/^\/api\/games\/([^/]+)\/lineup$/);
    if (method === 'GET' && lineupMatch) {
      json(request, response, 200, {
        result: 'ok',
        payload: {
          gameId: decodeURIComponent(lineupMatch[1]),
          lineup: lineupState.lineup,
        },
      });
      return;
    }

    const lineupChangesMatch = url.pathname.match(/^\/api\/games\/([^/]+)\/lineup\/changes$/);
    if (method === 'GET' && lineupChangesMatch) {
      json(request, response, 200, {
        result: 'ok',
        payload: {
          gameId: decodeURIComponent(lineupChangesMatch[1]),
          changes: lineupState.substitutionHistory,
        },
      });
      return;
    }

    const substitutionMatch = url.pathname.match(/^\/api\/scorer\/substitutions\/([^/]+)$/);
    if (method === 'POST' && substitutionMatch) {
      if (lineupState.scenarios.failNextSubstitution) {
        lineupState.scenarios.failNextSubstitution = false;
        json(request, response, 500, { error: 'No se pudo registrar la sustitución' });
        return;
      }

      const body = await parseRequestBody(request);
      const substitutionType = String(body.substitutionType ?? 'defensive_change');
      const incomingPlayerId = String(body.incomingPlayerId ?? '');
      const outgoingPlayerId = String(body.outgoingPlayerId ?? '');
      const requestedPosition = typeof body.position === 'string' ? body.position : null;
      const requestedOrder = typeof body.battingOrder === 'number' ? body.battingOrder : Number.parseInt(String(body.battingOrder ?? ''), 10);
      const battingRole = getBattingRole(lineupState);
      const defensiveRole = getPitchingRole(lineupState);
      const lineupRole = substitutionType === 'pinch_hitter' || substitutionType === 'pinch_runner' ? battingRole : defensiveRole;
      const activeLineup = lineupState.lineup[lineupRole];
      const outgoingIndex = activeLineup.findIndex((entry) => entry.playerId === outgoingPlayerId);

      if (outgoingIndex < 0) {
        json(request, response, 404, { error: 'Jugador saliente no encontrado' });
        return;
      }

      const roster = lineupState.teamPlayers[lineupRole];
      const incomingPlayer = roster.find((player) => player.id === incomingPlayerId);
      if (!incomingPlayer) {
        json(request, response, 404, { error: 'Jugador entrante no encontrado' });
        return;
      }

      const outgoingPlayer = activeLineup[outgoingIndex];
      const nextEntry: MockLineupEntry = {
        playerId: incomingPlayer.id,
        name: incomingPlayer.name,
        number: incomingPlayer.number,
        order: Number.isFinite(requestedOrder) ? requestedOrder : outgoingPlayer.order,
        position: requestedPosition ?? outgoingPlayer.position,
        status: 'active',
      };
      activeLineup.splice(outgoingIndex, 1, nextEntry);
      activeLineup.sort((left, right) => left.order - right.order);

      if (substitutionType === 'pinch_hitter') {
        lineupState.currentBatterId = incomingPlayer.id;
      }
      if (substitutionType === 'pitching_change' || nextEntry.position.toUpperCase() === 'P') {
        lineupState.currentPitcherId = incomingPlayer.id;
      }

      const changeRecord: MockSubstitutionRecord = {
        id: `sub-${lineupState.substitutionHistory.length + 1}`,
        substitutionType,
        incoming: { playerId: incomingPlayer.id, name: incomingPlayer.name },
        outgoing: { playerId: outgoingPlayer.playerId, name: outgoingPlayer.name },
        battingOrder: nextEntry.order,
        position: nextEntry.position,
        ...(typeof body.notes === 'string' && body.notes.trim() ? { notes: body.notes.trim() } : {}),
        createdAt: new Date().toISOString(),
        operatorId: primaryOperator.userId,
      };
      lineupState.substitutionHistory.push(changeRecord);

      json(request, response, 200, {
        result: 'ok',
        payload: {
          gameId: substitutionMatch[1],
          lineup: lineupState.lineup,
          change: changeRecord,
        },
      });
      return;
    }

    if (method === 'GET' && url.pathname === '/api/v1/control/state') {
      json(request, response, 200, createSnapshotEnvelope(state));
      return;
    }

    if (method === 'POST' && url.pathname === '/api/v1/control/actions/preview-overlay') {
      const body = await parseRequestBody(request);
      const payload = (body.payload ?? {}) as Record<string, unknown>;

      state.revision += 1;
      state.previewOverlayId = String(payload.overlayId ?? 'scorebug') as MockOverlayId;
      state.conflicts = [];
      state.latencyMs = nextLatency(state.latencyMs);
      broadcast();

      json(request, response, 200, createResponseEnvelope(state));
      return;
    }

    if (method === 'POST' && url.pathname === '/api/v1/control/actions/take-overlay') {
      const body = await parseRequestBody(request);
      const payload = (body.payload ?? {}) as Record<string, unknown>;
      const operatorId = String(payload.operatorId ?? primaryOperator.userId);
      const overlayId = String(payload.overlayId ?? state.previewOverlayId ?? 'scorebug') as MockOverlayId;

      if (operatorId === secondaryOperator.userId && overlayId === 'game_event' && getZoneId(state.programOverlayId) === 'A') {
        state.revision += 1;
        state.previewOverlayId = 'game_event';
        state.conflicts = [
          {
            overlayId: 'game_event',
            zoneId: 'A',
            code: 'CONFLICT',
            message: 'Error 409 — conflicto de zona con Scorebug en Program.',
          },
        ];
        state.latencyMs = nextLatency(state.latencyMs);
        broadcast();

        json(request, response, 409, createConflictResponse(state));
        return;
      }

      state.revision += 1;
      state.programOverlayId = overlayId;
      state.previewOverlayId = null;
      state.conflicts = [];
      state.latencyMs = nextLatency(state.latencyMs);
      broadcast();

      json(request, response, 200, createResponseEnvelope(state));
      return;
    }

    if (method === 'POST' && url.pathname === '/api/v1/control/actions/hide-all') {
      state.revision += 1;
      state.programOverlayId = 'scorebug';
      state.conflicts = [];
      state.latencyMs = nextLatency(state.latencyMs);
      broadcast();

      json(request, response, 200, createResponseEnvelope(state));
      return;
    }

    if (method === 'POST' && url.pathname === '/api/v1/control/actions/clear-preview') {
      state.revision += 1;
      state.previewOverlayId = null;
      state.conflicts = [];
      state.latencyMs = nextLatency(state.latencyMs);
      broadcast();

      json(request, response, 200, createResponseEnvelope(state));
      return;
    }

    json(request, response, 404, { error: { message: 'Ruta mock no implementada.' } });
  });

  const clients = new Set<Socket>();
  const latencyTimer = setInterval(() => {
    state.latencyMs = nextLatency(state.latencyMs);
    broadcast();
  }, 1200);

  function broadcast() {
    const frame = encodeWebSocketFrame(JSON.stringify(createSnapshotEnvelope(state)));
    for (const client of clients) {
      try {
        client.write(frame);
      } catch {
        clients.delete(client);
      }
    }
  }

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url ?? '/', `http://localhost:${port}`);
    if (url.pathname !== '/ws') {
      socket.destroy();
      return;
    }

    const key = request.headers['sec-websocket-key'];
    if (!key || Array.isArray(key)) {
      socket.destroy();
      return;
    }

    const acceptKey = createHash('sha1')
      .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
      .digest('base64');

    socket.write([
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '\r\n',
    ].join('\r\n'));

    if (head.length > 0) {
      socket.unshift(head);
    }

    clients.add(socket);
    socket.on('close', () => {
      clients.delete(socket);
    });
    socket.on('error', () => {
      clients.delete(socket);
    });
    socket.write(encodeWebSocketFrame(JSON.stringify(createSnapshotEnvelope(state))));
  });

  await new Promise<void>((resolve) => {
    server.listen(port, () => resolve());
  });

  return {
    port,
    close: async () => {
      clearInterval(latencyTimer);
      await new Promise<void>((resolve, reject) => {
        for (const client of clients) {
          try {
            client.destroy();
          } catch {
            // Ignorar sockets ya cerrados.
          }
        }

        server.close((serverError) => {
          if (serverError) {
            reject(serverError);
            return;
          }

          resolve();
        });
      });
    },
  };
}

function nextLatency(current: number): number {
  const next = current + 7;
  return next > 96 ? 18 : next;
}

function encodeWebSocketFrame(payload: string): Buffer {
  const payloadBuffer = Buffer.from(payload);
  const payloadLength = payloadBuffer.length;

  if (payloadLength < 126) {
    return Buffer.concat([
      Buffer.from([0x81, payloadLength]),
      payloadBuffer,
    ]);
  }

  if (payloadLength < 65_536) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payloadLength, 2);
    return Buffer.concat([header, payloadBuffer]);
  }

  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(payloadLength), 2);
  return Buffer.concat([header, payloadBuffer]);
}

export type OverlayServerAdmin = {
  reset: () => Promise<void>;
  readState: () => Promise<SnapshotState>;
  setLineupScenario: (scenario: Partial<MockLineupState['scenarios']>) => Promise<void>;
  readLineupState: () => Promise<MockLineupState>;
};

export const overlayServerTest = base.extend<{ overlayServer: OverlayServerAdmin }>({
  overlayServer: [async ({}, use) => {
    const overlayServer: OverlayServerAdmin = {
      reset: async () => {
        await fetch(`http://localhost:${MOCK_PORT}/__e2e/reset`, {
          method: 'POST',
        });
      },
      readState: async () => {
        const response = await fetch(`http://localhost:${MOCK_PORT}/__e2e/state`);
        const body = (await response.json()) as { snapshot: ReturnType<typeof createSnapshotEnvelope> };
        const payload = body.snapshot.payload;

        return {
          revision: payload.revision,
          previewOverlayId: (payload.previewState?.overlayId ?? null) as MockOverlayId | null,
          programOverlayId: payload.programState.overlayId as MockOverlayId,
          latencyMs: payload.latencyMs,
          connectionStatus: payload.connectionStatus,
          conflicts: payload.conflicts as SnapshotState['conflicts'],
        };
      },
      setLineupScenario: async (scenario) => {
        await fetch(`http://localhost:${MOCK_PORT}/__e2e/lineup/scenario`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scenario),
        });
      },
      readLineupState: async () => {
        const response = await fetch(`http://localhost:${MOCK_PORT}/__e2e/lineup/state`);
        const body = (await response.json()) as { lineupState: MockLineupState };
        return body.lineupState;
      },
    };

    await overlayServer.reset();
    await use(overlayServer);
  }, { auto: true }],
});

if (process.env.PLAYFLOW_E2E_MOCK_SERVER === '1') {
  void startOverlayServerMock();
}
