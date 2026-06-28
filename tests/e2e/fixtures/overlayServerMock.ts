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
      broadcast();
      json(request, response, 200, { ok: true, snapshot: createSnapshotEnvelope(state) });
      return;
    }

    if (method === 'GET' && url.pathname === '/__e2e/state') {
      json(request, response, 200, { snapshot: createSnapshotEnvelope(state) });
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
    };

    await overlayServer.reset();
    await use(overlayServer);
  }, { auto: true }],
});

if (process.env.PLAYFLOW_E2E_MOCK_SERVER === '1') {
  void startOverlayServerMock();
}
