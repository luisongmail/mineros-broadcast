import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AnnouncementOverlay } from './AnnouncementOverlay';
import type { AnnouncementData } from './types';

const VALID: AnnouncementData = {
  announcement: {
    type: 'clinic',
    title: 'Clinica gratuita de bateo',
    subtitle: 'Sabado 10:00',
    detail: 'Cupo limitado',
    place: 'Antupiren',
    date: 'Sabado 14 jun',
    categories: '4 a 16 anos',
    action: 'Inscribete',
    socialHandle: '@clubmineros',
  },
};

describe('AnnouncementOverlay', () => {
  it('renderiza dentro de BroadcastShell', () => {
    const { container } = render(<AnnouncementOverlay data={VALID} />);
    expect(container.querySelector('.mb-shell')).toBeTruthy();
  });
  it('muestra el titulo del anuncio', () => {
    render(<AnnouncementOverlay data={VALID} />);
    expect(screen.getByText('Clinica gratuita de bateo')).toBeTruthy();
  });
  it('muestra el subtitulo cuando existe', () => {
    render(<AnnouncementOverlay data={VALID} />);
    expect(screen.getByText('Sabado 10:00')).toBeTruthy();
  });
  it('muestra la fecha cuando existe', () => {
    render(<AnnouncementOverlay data={VALID} />);
    expect(screen.getByText('Sabado 14 jun')).toBeTruthy();
  });
  it('muestra el lugar cuando existe', () => {
    render(<AnnouncementOverlay data={VALID} />);
    expect(screen.getByText('Antupiren')).toBeTruthy();
  });
  it('muestra las categorias cuando existen', () => {
    render(<AnnouncementOverlay data={VALID} />);
    expect(screen.getByText('4 a 16 anos')).toBeTruthy();
  });
  it('muestra la accion cuando existe', () => {
    render(<AnnouncementOverlay data={VALID} />);
    expect(screen.getByText('Inscribete')).toBeTruthy();
  });
  it('renderiza variante alert', () => {
    const { container } = render(<AnnouncementOverlay data={VALID} variant="alert" />);
    expect(container.querySelector('.mb-shell')).toBeTruthy();
  });
  it('renderiza variante minimal', () => {
    const { container } = render(<AnnouncementOverlay data={VALID} variant="minimal" />);
    expect(container.querySelector('.mb-shell')).toBeTruthy();
  });
  it('renderiza variante clinic_card', () => {
    render(<AnnouncementOverlay data={VALID} variant="clinic_card" />);
    expect(screen.getAllByText('Clinica gratuita de bateo').length).toBeGreaterThan(0);
  });
  it('muestra error cuando faltan datos requeridos', () => {
    const { container } = render(
      <AnnouncementOverlay data={{ announcement: { type: 'manual', title: '' } }} />,
    );
    expect(container.textContent).toContain('incompletos');
  });
});
