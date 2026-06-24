import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SubstitutionOverlay } from './SubstitutionOverlay';
import type { SubstitutionData } from './types';

const VALID: SubstitutionData = {
  gameId: 'game-001',
  substitution: { type: 'pitcher_change', label: 'Cambio de lanzadora', reason: 'Relevo' },
  playerOut: { playerId: 'p-031', number: '31', name: 'L. Soto', position: 'P', detail: '3.2 IP 54 PIT' },
  playerIn: { playerId: 'p-007', number: '07', name: 'M. Castro', position: 'P' },
  inning: 5,
};

describe('SubstitutionOverlay', () => {
  it('renderiza dentro de BroadcastShell', () => {
    const { container } = render(<SubstitutionOverlay data={VALID} />);
    expect(container.querySelector('.mb-shell')).toBeTruthy();
  });
  it('muestra el nombre de quien sale', () => {
    render(<SubstitutionOverlay data={VALID} />);
    expect(screen.getByText('L. Soto')).toBeTruthy();
  });
  it('muestra el nombre de quien entra', () => {
    render(<SubstitutionOverlay data={VALID} />);
    expect(screen.getByText('M. Castro')).toBeTruthy();
  });
  it('muestra la etiqueta de cambio', () => {
    render(<SubstitutionOverlay data={VALID} />);
    expect(screen.getByText('Cambio de lanzadora')).toBeTruthy();
  });
  it('muestra el motivo cuando existe', () => {
    render(<SubstitutionOverlay data={VALID} />);
    expect(screen.getByText('Relevo')).toBeTruthy();
  });
  it('muestra el numero de quien sale', () => {
    render(<SubstitutionOverlay data={VALID} />);
    expect(screen.getByText('#31')).toBeTruthy();
  });
  it('muestra el numero de quien entra', () => {
    render(<SubstitutionOverlay data={VALID} />);
    expect(screen.getByText('#07')).toBeTruthy();
  });
  it('muestra el detalle de quien sale', () => {
    render(<SubstitutionOverlay data={VALID} />);
    expect(screen.getByText('3.2 IP 54 PIT')).toBeTruthy();
  });
  it('renderiza variante minimal', () => {
    const { container } = render(<SubstitutionOverlay data={VALID} variant="minimal" />);
    expect(container.querySelector('.mb-shell')).toBeTruthy();
  });
  it('muestra error cuando faltan datos requeridos', () => {
    const { container } = render(
      <SubstitutionOverlay data={{ ...VALID, gameId: '' }} />,
    );
    expect(container.textContent).toContain('incompletos');
  });
  it('oculta el numero si no existe', () => {
    const data = { ...VALID, playerOut: { ...VALID.playerOut, number: undefined } };
    render(<SubstitutionOverlay data={data} />);
    expect(screen.queryByText('#31')).toBeNull();
  });
});
