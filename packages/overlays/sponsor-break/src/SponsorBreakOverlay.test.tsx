import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SponsorBreakOverlay } from './SponsorBreakOverlay';
import type { SponsorBreakData } from './types';

const VALID_DATA: SponsorBreakData = {
  placement: { type: 'primary', slot: 'between_innings' },
  sponsor: { sponsorId: 'sponsor-001', name: 'Merchise' },
  message: { title: 'Gracias', subtitle: 'Por apoyar a Mineros' },
  cta: { text: 'Siguenos', handle: '@clubmineros' },
  context: { label: 'Entre entradas', durationSeconds: 10 },
};

describe('SponsorBreakOverlay', () => {
  it('renderiza dentro de BroadcastShell', () => {
    const { container } = render(<SponsorBreakOverlay data={VALID_DATA} />);
    expect(container.querySelector('.mb-shell')).toBeTruthy();
  });

  it('muestra el nombre del sponsor', () => {
    render(<SponsorBreakOverlay data={VALID_DATA} />);
    expect(screen.getByText('Merchise')).toBeTruthy();
  });

  it('muestra el label de pausa', () => {
    render(<SponsorBreakOverlay data={VALID_DATA} />);
    expect(screen.getByText('Pausa')).toBeTruthy();
  });

  it('muestra el mensaje cuando existe', () => {
    render(<SponsorBreakOverlay data={VALID_DATA} />);
    expect(screen.getByText('Gracias')).toBeTruthy();
  });

  it('muestra el subtitulo cuando existe', () => {
    render(<SponsorBreakOverlay data={VALID_DATA} />);
    expect(screen.getByText('Por apoyar a Mineros')).toBeTruthy();
  });

  it('oculta el mensaje cuando no existe', () => {
    const data = { ...VALID_DATA, message: undefined };
    render(<SponsorBreakOverlay data={data} />);
    expect(screen.queryByText('Gracias')).toBeNull();
  });

  it('muestra el CTA cuando existe', () => {
    render(<SponsorBreakOverlay data={VALID_DATA} />);
    expect(screen.getByText('@clubmineros')).toBeTruthy();
  });

  it('oculta el CTA cuando no existe', () => {
    const data = { ...VALID_DATA, cta: undefined };
    render(<SponsorBreakOverlay data={data} />);
    expect(screen.queryByText('@clubmineros')).toBeNull();
  });

  it('muestra el contexto de aparicion', () => {
    render(<SponsorBreakOverlay data={VALID_DATA} />);
    expect(screen.getByText('Entre entradas')).toBeTruthy();
  });

  it('renderiza variante logo_only', () => {
    const { container } = render(<SponsorBreakOverlay data={VALID_DATA} variant="logo_only" />);
    expect(container.querySelector('.mb-shell')).toBeTruthy();
  });

  it('muestra error cuando faltan datos requeridos', () => {
    const { container } = render(
      <SponsorBreakOverlay
        data={{ ...VALID_DATA, sponsor: { sponsorId: '', name: '' } }}
      />,
    );
    expect(container.textContent).toContain('incompletos');
  });
});
