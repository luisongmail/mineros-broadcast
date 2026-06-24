import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GameEventOverlay } from './GameEventOverlay';
import type { GameEventData } from './types';

const VALID: GameEventData = {
  gameId: 'game-001',
  event: { type: 'double', label: 'DOBLE', description: 'Doble al jardin derecho', direction: 'Jardin derecho' },
  player: { playerId: 'p-012', number: '12', name: 'C. Jara', position: '2B', stat: '2B . RBI 1' },
  scoreImpact: { team: 'MIN', change: 1, label: 'Empata' },
  bases: { label: 'En 2B' },
};

describe('GameEventOverlay', () => {
  it('renderiza dentro de BroadcastShell', () => {
    const { container } = render(<GameEventOverlay data={VALID} />);
    expect(container.querySelector('.mb-shell')).toBeTruthy();
  });
  it('muestra el label del evento', () => {
    render(<GameEventOverlay data={VALID} />);
    expect(screen.getByText('DOBLE')).toBeTruthy();
  });
  it('muestra la direccion del evento', () => {
    render(<GameEventOverlay data={VALID} />);
    expect(screen.getByText('Jardin derecho')).toBeTruthy();
  });
  it('muestra el nombre de la bateadora', () => {
    render(<GameEventOverlay data={VALID} />);
    expect(screen.getByText('C. Jara')).toBeTruthy();
  });
  it('muestra el numero de la bateadora', () => {
    render(<GameEventOverlay data={VALID} />);
    expect(screen.getByText('#12')).toBeTruthy();
  });
  it('muestra el stat de la bateadora', () => {
    render(<GameEventOverlay data={VALID} />);
    expect(screen.getByText('2B . RBI 1')).toBeTruthy();
  });
  it('muestra el impacto en marcador cuando existe', () => {
    render(<GameEventOverlay data={VALID} />);
    expect(screen.getByText('MIN +1')).toBeTruthy();
  });
  it('muestra el estado de bases cuando existe', () => {
    render(<GameEventOverlay data={VALID} />);
    expect(screen.getByText('En 2B')).toBeTruthy();
  });
  it('renderiza variante minimal', () => {
    const { container } = render(<GameEventOverlay data={VALID} variant="minimal" />);
    expect(container.querySelector('.mb-shell')).toBeTruthy();
  });
  it('muestra error cuando faltan datos requeridos', () => {
    const { container } = render(
      <GameEventOverlay data={{ ...VALID, gameId: '' }} />,
    );
    expect(container.textContent).toContain('incompletos');
  });
  it('oculta impacto en marcador cuando no existe', () => {
    const data = { ...VALID, scoreImpact: undefined };
    render(<GameEventOverlay data={data} />);
    expect(screen.queryByText('MIN +1')).toBeNull();
  });
});
