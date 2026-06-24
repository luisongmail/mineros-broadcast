import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CountdownOverlay } from './CountdownOverlay';
import type { CountdownData } from './types';

const futureTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();

const VALID: CountdownData = {
  countdown: { targetTime: futureTime, type: 'game_start', label: 'Inicio' },
  event: {
    title: 'Mineros vs Rivales',
    subtitle: 'Categoria Infantil',
    venue: 'Antupiren',
    status: 'En breve',
  },
};

describe('CountdownOverlay', () => {
  it('renderiza dentro de BroadcastShell', () => {
    const { container } = render(<CountdownOverlay data={VALID} />);
    expect(container.querySelector('.mb-shell')).toBeTruthy();
  });
  it('muestra el label del countdown', () => {
    render(<CountdownOverlay data={VALID} />);
    expect(screen.getByText('Inicio')).toBeTruthy();
  });
  it('muestra el titulo del evento cuando existe', () => {
    render(<CountdownOverlay data={VALID} />);
    expect(screen.getByText('Mineros vs Rivales')).toBeTruthy();
  });
  it('muestra la sede cuando existe', () => {
    render(<CountdownOverlay data={VALID} />);
    expect(screen.getByText('Antupiren')).toBeTruthy();
  });
  it('muestra el estado cuando existe', () => {
    render(<CountdownOverlay data={VALID} />);
    expect(screen.getByText('En breve')).toBeTruthy();
  });
  it('muestra un timer formateado HH:MM:SS', () => {
    render(<CountdownOverlay data={VALID} />);
    expect(screen.getByText(/\d{2}:\d{2}:\d{2}/)).toBeTruthy();
  });
  it('renderiza variante minimal_timer', () => {
    const { container } = render(<CountdownOverlay data={VALID} variant="minimal_timer" />);
    expect(container.querySelector('.mb-shell')).toBeTruthy();
  });
  it('muestra 00:00:00 cuando el tiempo ya paso', () => {
    const past: CountdownData = { ...VALID, countdown: { ...VALID.countdown, targetTime: new Date(Date.now() - 1000).toISOString() } };
    render(<CountdownOverlay data={past} />);
    expect(screen.getByText('00:00:00')).toBeTruthy();
  });
  it('muestra error cuando faltan datos requeridos', () => {
    const { container } = render(
      <CountdownOverlay data={{ countdown: { targetTime: '', type: 'game_start' } }} />,
    );
    expect(container.textContent).toContain('incompletos');
  });
});
