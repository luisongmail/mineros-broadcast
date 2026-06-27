import { describe, expect, it } from 'vitest';

import { parseCommandRequest, handleCommand } from './commandHandler';

// stateStore es un singleton — los tests se ejecutan en orden y comparten estado.
// El juego arranca en 'scheduled'. StartGame lo pasa a 'live'.

describe('parseCommandRequest', () => {
  it('parsea un comando válido sin value', () => {
    const result = parseCommandRequest({ command: 'GetState' });
    expect(result.command).toBe('GetState');
    expect(result.value).toBeUndefined();
  });

  it('parsea un comando válido con value', () => {
    const result = parseCommandRequest({ command: 'ShowOverlay', value: 'batter' });
    expect(result.command).toBe('ShowOverlay');
    expect(result.value).toBe('batter');
  });

  it('lanza error si el body no es un objeto', () => {
    expect(() => parseCommandRequest(null)).toThrow('Request body must be a JSON object');
    expect(() => parseCommandRequest('string')).toThrow();
    expect(() => parseCommandRequest(42)).toThrow();
  });

  it('lanza error si command está vacío', () => {
    expect(() => parseCommandRequest({ command: '' })).toThrow('command must be a non-empty string');
    expect(() => parseCommandRequest({ command: '   ' })).toThrow();
  });

  it('lanza error si command no es string', () => {
    expect(() => parseCommandRequest({ command: 42 })).toThrow('command must be a non-empty string');
  });

  it('lanza error si value no es string cuando está presente', () => {
    expect(() => parseCommandRequest({ command: 'ShowOverlay', value: 42 })).toThrow('value must be a string');
  });

  it('normaliza espacios en el command', () => {
    const result = parseCommandRequest({ command: '  GetState  ' });
    expect(result.command).toBe('GetState');
  });
});

describe('handleCommand — estado de juego', () => {
  it('GetState retorna el estado del partido con campos obligatorios', () => {
    const response = handleCommand('GetState');
    expect(response.command).toBe('GetState');
    const payload = response.payload as Record<string, unknown>;
    expect(payload).toHaveProperty('gameId');
    expect(payload).toHaveProperty('score');
    expect(payload).toHaveProperty('outs');
    expect(payload).toHaveProperty('bases');
    expect(payload).toHaveProperty('count');
  });

  // stateStore es singleton — StartGame se llama una vez; el juego queda live para el resto
  it('StartGame cambia status a live (primera y única llamada)', () => {
    const before = (handleCommand('GetState').payload as Record<string, unknown>).status;
    if (before !== 'live') {
      handleCommand('StartGame');
    }
    const state = handleCommand('GetState').payload as Record<string, unknown>;
    expect(state.status).toBe('live');
  });

  it('IncrementScore home incrementa el marcador local', () => {
    const before = (handleCommand('GetState').payload as Record<string, unknown>).score as { home: number; away: number };
    handleCommand('IncrementScore', 'home');
    const after = (handleCommand('GetState').payload as Record<string, unknown>).score as { home: number; away: number };
    expect(after.home).toBe(before.home + 1);
  });

  it('IncrementScore away incrementa el marcador visitante', () => {
    const before = (handleCommand('GetState').payload as Record<string, unknown>).score as { home: number; away: number };
    handleCommand('IncrementScore', 'away');
    const after = (handleCommand('GetState').payload as Record<string, unknown>).score as { home: number; away: number };
    expect(after.away).toBe(before.away + 1);
  });

  it('SetScore establece marcador explícito', () => {
    handleCommand('SetScore', 'home:5,away:3');
    const state = handleCommand('GetState').payload as Record<string, unknown>;
    const score = state.score as { home: number; away: number };
    expect(score.home).toBe(5);
    expect(score.away).toBe(3);
  });

  it('SetBase establece una base como ocupada', () => {
    handleCommand('SetBase', 'first:true');
    const state = handleCommand('GetState').payload as Record<string, unknown>;
    const bases = state.bases as { first: unknown; second: unknown; third: unknown };
    expect(bases.first).not.toBeNull();
  });

  it('SetBase asigna responsiblePitcherId al corredor nuevo', () => {
    handleCommand('SetPitcher', 'playerId:player-pitcher-01');
    handleCommand('SetBase', 'second:playerId:runner-01');
    const state = handleCommand('GetState').payload as {
      bases: { second: { id: string; responsiblePitcherId?: string } | null };
    };
    expect(state.bases.second?.id).toBe('runner-01');
    expect(state.bases.second?.responsiblePitcherId).toBe('player-pitcher-01');
  });

  it('AddBall incrementa balls en el conteo', () => {
    handleCommand('ResetCount');
    handleCommand('AddBall');
    const count = (handleCommand('GetState').payload as Record<string, unknown>).count as { balls: number; strikes: number };
    expect(count.balls).toBe(1);
  });

  it('AddStrike incrementa strikes en el conteo', () => {
    handleCommand('ResetCount');
    handleCommand('AddStrike');
    const count = (handleCommand('GetState').payload as Record<string, unknown>).count as { balls: number; strikes: number };
    expect(count.strikes).toBe(1);
  });

  it('ResetCount vuelve conteo a 0-0', () => {
    handleCommand('AddBall');
    handleCommand('AddStrike');
    handleCommand('ResetCount');
    const count = (handleCommand('GetState').payload as Record<string, unknown>).count as { balls: number; strikes: number };
    expect(count.balls).toBe(0);
    expect(count.strikes).toBe(0);
  });

  it('AddOut registra un out sin lanzar excepción', () => {
    expect(() => handleCommand('AddOut')).not.toThrow();
  });

  it('SetBatter establece el bateador actual', () => {
    handleCommand('SetBatter', 'playerId:player-min-04');
    const state = handleCommand('GetState').payload as { currentBatterId?: string };
    expect(state.currentBatterId).toBe('player-min-04');
  });

  it('SetPitcher establece el pitcher actual', () => {
    handleCommand('SetPitcher', 'playerId:player-cai-09');
    const state = handleCommand('GetState').payload as { currentPitcherId?: string };
    expect(state.currentPitcherId).toBe('player-cai-09');
  });

  it('SetPitcher conserva responsiblePitcherId de corredores heredados', () => {
    handleCommand('SetPitcher', 'playerId:player-pitcher-legacy');
    handleCommand('SetBase', 'third:playerId:runner-legacy');
    handleCommand('SetPitcher', 'playerId:player-pitcher-new');
    const state = handleCommand('GetState').payload as {
      currentPitcherId?: string;
      bases: { third: { responsiblePitcherId?: string } | null };
    };
    expect(state.currentPitcherId).toBe('player-pitcher-new');
    expect(state.bases.third?.responsiblePitcherId).toBe('player-pitcher-legacy');
  });

  it('SetLineupHome establece el lineup local', () => {
    handleCommand(
      'SetLineupHome',
      JSON.stringify([
        {
          order: 1,
          playerId: 'player-min-01',
          name: 'Luis Javier Peña',
          number: '2',
          position: 'CF',
          status: 'active',
        },
      ]),
    );
    const state = handleCommand('GetState').payload as { lineup: { home: Array<{ playerId: string }> } };
    expect(state.lineup.home).toHaveLength(1);
    expect(state.lineup.home[0]?.playerId).toBe('player-min-01');
  });

  it('SetLineupAway establece el lineup visitante', () => {
    handleCommand(
      'SetLineupAway',
      JSON.stringify([
        {
          order: 1,
          playerId: 'player-cai-01',
          name: 'Emilio Corporán',
          number: '7',
          position: 'CF',
          status: 'active',
        },
      ]),
    );
    const state = handleCommand('GetState').payload as { lineup: { away: Array<{ playerId: string }> } };
    expect(state.lineup.away).toHaveLength(1);
    expect(state.lineup.away[0]?.playerId).toBe('player-cai-01');
  });

  it('lanza error para comando desconocido', () => {
    expect(() => handleCommand('ComandoInexistente')).toThrow();
  });

  it('IncrementScore lanza error si value no es home/away', () => {
    expect(() => handleCommand('IncrementScore', 'invalido')).toThrow();
  });
});

describe('handleCommand — overlays', () => {
  it('ShowOverlay agrega overlay a visibleOverlays', () => {
    const response = handleCommand('ShowOverlay', 'batter');
    expect(response.command).toBe('ShowOverlay');
    expect(response.value).toBe('batter');
    const payload = response.payload as { visibleOverlays: string[] };
    expect(payload.visibleOverlays).toContain('batter');
  });

  it('HideOverlay remueve overlay de visibleOverlays', () => {
    handleCommand('ShowOverlay', 'pitcher');
    handleCommand('HideOverlay', 'pitcher');
    const payload = handleCommand('ShowOverlay', 'scorebug').payload as { visibleOverlays: string[] };
    expect(payload.visibleOverlays).not.toContain('pitcher');
  });

  it('HideAll limpia todos los overlays', () => {
    handleCommand('ShowOverlay', 'batter');
    handleCommand('ShowOverlay', 'lineup');
    const response = handleCommand('HideAll');
    const payload = response.payload as { visibleOverlays: string[] };
    expect(payload.visibleOverlays).toHaveLength(0);
  });

  it('ShowOverlay lanza error si value está vacío', () => {
    expect(() => handleCommand('ShowOverlay', '')).toThrow();
  });
});


describe('parseCommandRequest', () => {
  it('parsea un comando válido sin value', () => {
    const result = parseCommandRequest({ command: 'GetState' });
    expect(result.command).toBe('GetState');
    expect(result.value).toBeUndefined();
  });

  it('parsea un comando válido con value', () => {
    const result = parseCommandRequest({ command: 'ShowOverlay', value: 'batter' });
    expect(result.command).toBe('ShowOverlay');
    expect(result.value).toBe('batter');
  });

  it('lanza error si el body no es un objeto', () => {
    expect(() => parseCommandRequest(null)).toThrow('Request body must be a JSON object');
    expect(() => parseCommandRequest('string')).toThrow();
    expect(() => parseCommandRequest(42)).toThrow();
  });

  it('lanza error si command está vacío', () => {
    expect(() => parseCommandRequest({ command: '' })).toThrow('command must be a non-empty string');
    expect(() => parseCommandRequest({ command: '   ' })).toThrow();
  });

  it('lanza error si command no es string', () => {
    expect(() => parseCommandRequest({ command: 42 })).toThrow('command must be a non-empty string');
  });

  it('lanza error si value no es string cuando está presente', () => {
    expect(() => parseCommandRequest({ command: 'ShowOverlay', value: 42 })).toThrow('value must be a string');
  });

  it('normaliza espacios en el command', () => {
    const result = parseCommandRequest({ command: '  GetState  ' });
    expect(result.command).toBe('GetState');
  });
});
