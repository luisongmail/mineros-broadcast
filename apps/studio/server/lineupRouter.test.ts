import http from 'node:http';

import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type MockPool = {
  query: ReturnType<typeof vi.fn>;
  getConnection: ReturnType<typeof vi.fn>;
};

const { stateStoreMock, mockState } = vi.hoisted(() => ({
  mockState: {
    pool: undefined as MockPool | undefined,
  },
  stateStoreMock: {
    getState: vi.fn(() => ({
      gameId: 'game-123',
      inning: 3,
      inningHalf: 'top',
      currentBatterId: 'player-away-01',
      currentPitcherId: 'player-home-09',
      outs: 1,
      score: { home: 2, away: 1 },
    })),
    sendCommand: vi.fn(),
    broadcast: vi.fn(),
  },
}));

let mockPool: MockPool | undefined;

vi.mock('./db', () => ({
  get pool() {
    return mockState.pool;
  },
}));

vi.mock('./stateStore', () => ({
  stateStore: stateStoreMock,
}));

import { lineupRouter } from './lineupRouter';
import { signToken } from './auth/jwtService';

function buildAuthHeader() {
  return {
    Authorization: `Bearer ${signToken({
      sub: 'usr_qa_001',
      sid: 'sess_qa_001',
      email: 'qa@playflow.dev',
      authLevel: 'otp',
    })}`,
  };
}

async function withServer(run: (baseUrl: string) => Promise<void>) {
  const app = express();
  app.use(express.json());
  app.use('/api', lineupRouter);

  const server = await new Promise<http.Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('No se pudo resolver el puerto de prueba');
  }

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

function createMockConnection() {
  return {
    beginTransaction: vi.fn(),
    query: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    release: vi.fn(),
  };
}

beforeEach(() => {
  process.env.JWT_SECRET = 'test_secret_64bytes_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  process.env.JWT_ISSUER = 'playflow';
  process.env.JWT_AUDIENCE = 'playflow-app';
  process.env.JWT_ACCESS_TOKEN_MINUTES = '15';

  mockPool = {
    query: vi.fn(),
    getConnection: vi.fn(),
  };
  mockState.pool = mockPool;

  stateStoreMock.getState.mockClear();
  stateStoreMock.getState.mockReturnValue({
    gameId: 'game-123',
    inning: 3,
    inningHalf: 'top',
    currentBatterId: 'player-away-01',
    currentPitcherId: 'player-home-09',
    outs: 1,
    score: { home: 2, away: 1 },
  });
  stateStoreMock.sendCommand.mockClear();
  stateStoreMock.broadcast.mockClear();
});

afterEach(() => {
  mockPool = undefined;
  mockState.pool = undefined;
});

describe('lineupRouter', () => {
  it('GET /api/games/:id/lineup returns the active lineup', async () => {
    mockPool!.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM games')) {
        return [[{ home_team_id: 'team-home', away_team_id: 'team-away' }]];
      }

      if (sql.includes('FROM game_lineups gl')) {
        return [[
          { team_id: 'team-home', player_id: 'player-home-01', batting_order: 1, position: 'SS', defensive_position: 'SS', p_name: 'Home Lead', p_number: '7', p_photo_asset_id: null },
          { team_id: 'team-away', player_id: 'player-away-01', batting_order: 1, position: 'CF', defensive_position: 'CF', p_name: 'Away Lead', p_number: '1', p_photo_asset_id: null },
        ]];
      }

      throw new Error(`Unexpected query: ${sql}`);
    });

    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/games/game-123/lineup`, {
        headers: buildAuthHeader(),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.result).toBe('ok');
      expect(body.payload.gameId).toBe('game-123');
      expect(body.payload.lineup.home).toHaveLength(1);
      expect(body.payload.lineup.home[0].playerId).toBe('player-home-01');
      expect(body.payload.lineup.away[0].playerId).toBe('player-away-01');
    });
  });

  it('POST /api/games/:id/lineup creates a lineup and returns 201', async () => {
    const connection = createMockConnection();
    mockPool!.getConnection.mockResolvedValue(connection);
    mockPool!.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM games')) {
        return [[{ home_team_id: 'team-home', away_team_id: 'team-away' }]];
      }

      if (sql.includes('FROM game_lineups gl')) {
        return [[
          { team_id: 'team-home', player_id: 'player-home-01', batting_order: 1, position: 'SS', defensive_position: 'SS', p_name: 'Home Lead', p_number: '7', p_photo_asset_id: null },
          { team_id: 'team-away', player_id: 'player-away-01', batting_order: 1, position: 'CF', defensive_position: 'CF', p_name: 'Away Lead', p_number: '1', p_photo_asset_id: null },
        ]];
      }

      throw new Error(`Unexpected query: ${sql}`);
    });

    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/games/game-123/lineup`, {
        method: 'POST',
        headers: {
          ...buildAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          home: [{ playerId: 'player-home-01', order: 1, position: 'SS' }],
          away: [{ playerId: 'player-away-01', order: 1, position: 'CF' }],
        }),
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.payload.createdCount).toBe(2);
      expect(connection.beginTransaction).toHaveBeenCalledOnce();
      expect(connection.commit).toHaveBeenCalledOnce();
      expect(stateStoreMock.sendCommand).toHaveBeenCalledWith('SetLineupHome', expect.any(String));
      expect(stateStoreMock.sendCommand).toHaveBeenCalledWith('SetLineupAway', expect.any(String));
    });
  });

  it('POST /api/games/:id/lineup/change applies a substitution', async () => {
    const connection = createMockConnection();
    mockPool!.getConnection.mockResolvedValue(connection);
    mockPool!.query.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes('FROM games')) {
        return [[{ home_team_id: 'team-home', away_team_id: 'team-away' }]];
      }

      if (sql.includes('FROM game_lineups gl') && sql.includes('LIMIT 1')) {
        return [[
          {
            team_id: 'team-home',
            player_id: 'player-home-01',
            batting_order: 1,
            position: 'SS',
            defensive_position: 'SS',
            p_name: 'Home Lead',
            p_number: '7',
            p_photo_asset_id: null,
          },
        ]];
      }

      if (sql.includes('FROM players')) {
        return [[{ id: 'player-home-12', team_id: 'team-home', name: 'Bench Player', number: '12', position: '2B', photo_asset_id: null }]];
      }

      if (sql.includes('FROM game_lineups gl')) {
        if (params?.[0] === 'game-123') {
          return [[
            { team_id: 'team-home', player_id: 'player-home-12', batting_order: 1, position: '2B', defensive_position: '2B', p_name: 'Bench Player', p_number: '12', p_photo_asset_id: null },
            { team_id: 'team-away', player_id: 'player-away-01', batting_order: 1, position: 'CF', defensive_position: 'CF', p_name: 'Away Lead', p_number: '1', p_photo_asset_id: null },
          ]];
        }
      }

      if (sql.includes('FROM game_events')) {
        return [[{
          id: 'evt-123',
          inning: 3,
          inning_half: 'top',
          payload: JSON.stringify({
            substitutionType: 'defensive_change',
            incoming: { playerId: 'player-home-12', name: 'Bench Player' },
            outgoing: { playerId: 'player-home-01', name: 'Home Lead' },
            battingOrder: 1,
            position: '2B',
          }),
          created_at: '2026-06-29T16:00:00.000Z',
          operator_id: 'usr_qa_001',
        }]];
      }

      throw new Error(`Unexpected query: ${sql}`);
    });

    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/games/game-123/lineup/change`, {
        method: 'POST',
        headers: {
          ...buildAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          outgoingPlayerId: 'player-home-01',
          incomingPlayerId: 'player-home-12',
          position: '2B',
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.payload.lineup.home[0].playerId).toBe('player-home-12');
      expect(body.payload.change.incoming.playerId).toBe('player-home-12');
      expect(connection.commit).toHaveBeenCalledOnce();
    });
  });

  it('GET /api/games/:id/lineup/changes returns substitution history', async () => {
    mockPool!.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM games')) {
        return [[{ home_team_id: 'team-home', away_team_id: 'team-away' }]];
      }

      if (sql.includes('FROM game_events')) {
        return [[{
          id: 'evt-123',
          inning: 5,
          inning_half: 'bottom',
          payload: JSON.stringify({
            substitutionType: 'pinch_hitter',
            incoming: { playerId: 'player-home-12', name: 'Bench Player' },
            outgoing: { playerId: 'player-home-05', name: 'Starter' },
          }),
          created_at: '2026-06-29T16:00:00.000Z',
          operator_id: 'usr_qa_001',
        }]];
      }

      throw new Error(`Unexpected query: ${sql}`);
    });

    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/games/game-123/lineup/changes`, {
        headers: buildAuthHeader(),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.payload.changes).toHaveLength(1);
      expect(body.payload.changes[0].substitutionType).toBe('pinch_hitter');
    });
  });

  it('returns 404 when the game does not exist', async () => {
    mockPool!.query.mockResolvedValue([[]]);

    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/games/game-missing/lineup`, {
        headers: buildAuthHeader(),
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.result).toBe('error');
    });
  });

  it('returns 401 when auth fails', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/games/game-123/lineup`);
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error.code).toBe('UNAUTHENTICATED');
    });
  });
});
