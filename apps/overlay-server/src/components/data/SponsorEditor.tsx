import { useEffect, useState } from 'react';

import { generateId, request, toErrorMessage } from './api';
import { mockSponsors } from './mockData';
import { EmptyState, Feedback, Field, LoadingState, SectionCard, dangerButtonClass, fieldClass, primaryButtonClass, secondaryButtonClass, tableCellClass, tableHeaderClass } from './shared';
import { normalizeSponsor, type Sponsor } from './types';

const emptySponsor = (): Sponsor => ({
  id: '',
  name: '',
  brand: '',
  logoAssetId: '',
  priority: 1,
  status: 'draft',
  startDate: '',
  endDate: '',
  active: true,
});

export function SponsorEditor() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [form, setForm] = useState<Sponsor>(emptySponsor());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const payload = await request<unknown[]>('/api/sponsors');
        if (!cancelled) {
          setSponsors(payload.map(normalizeSponsor));
        }
      } catch (loadError) {
        if (!cancelled) {
          setSponsors(mockSponsors);
          setError(`${toErrorMessage(loadError, 'No se pudieron cargar los sponsors.')} Mostrando datos mock.`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    // El backend espera snake_case
    const payload = {
      name:       form.name,
      brand:      form.brand,
      asset_id:   form.logoAssetId || null,
      status:     form.status,
      priority:   form.priority,
      start_date: form.startDate || null,
      end_date:   form.endDate   || null,
      active:     form.active,
    };

    try {
      if (form.id) {
        const updated = normalizeSponsor(await request(`/api/sponsors/${form.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }));
        setSponsors((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        setMessage('Sponsor actualizado.');
      } else {
        const created = normalizeSponsor(await request('/api/sponsors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }));
        setSponsors((current) => [created, ...current]);
        setMessage('Sponsor creado.');
      }
    } catch (submitError) {
      const localSponsor = { ...form, id: form.id || generateId('sponsor') };
      setSponsors((current) => (form.id ? current.map((item) => (item.id === localSponsor.id ? localSponsor : item)) : [localSponsor, ...current]));
      setError(toErrorMessage(submitError, 'No se pudo guardar el sponsor.'));
      setMessage('Cambio aplicado localmente mientras el backend no está disponible.');
    } finally {
      setSaving(false);
      setForm(emptySponsor());
    }
  };

  const handleDelete = async (id: string) => {
    setSponsors((current) => current.filter((item) => item.id !== id));
    if (form.id === id) setForm(emptySponsor());

    try {
      await request(`/api/sponsors/${id}`, { method: 'DELETE' });
      setMessage('Sponsor eliminado.');
      setError(null);
    } catch (deleteError) {
      setError(`${toErrorMessage(deleteError, 'No se pudo eliminar el sponsor.')} Eliminado solo localmente.`);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-3">
      {error && <Feedback tone="error" message={error} />}
      {message && <Feedback tone="success" message={message} />}

      <SectionCard title="Sponsors registrados">
        {sponsors.length === 0 ? (
          <EmptyState message="No hay sponsors registrados." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className={tableHeaderClass}>Nombre</th>
                  <th className={tableHeaderClass}>Logo</th>
                  <th className={tableHeaderClass}>Prioridad</th>
                  <th className={tableHeaderClass}>Status</th>
                  <th className={tableHeaderClass}>Activo</th>
                  <th className={tableHeaderClass}>Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {sponsors.map((sponsor) => (
                  <tr key={sponsor.id}>
                    <td className={tableCellClass}>{sponsor.name}</td>
                    <td className={tableCellClass}>{sponsor.logoAssetId || '—'}</td>
                    <td className={tableCellClass}>{sponsor.priority}</td>
                    <td className={tableCellClass}>{sponsor.status}</td>
                    <td className={tableCellClass}>{sponsor.active ? 'Sí' : 'No'}</td>
                    <td className={tableCellClass}>
                      <div className="flex gap-2">
                        <button type="button" className={secondaryButtonClass} onClick={() => setForm(sponsor)}>Editar</button>
                        <button type="button" className={dangerButtonClass} onClick={() => { void handleDelete(sponsor.id); }}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title={form.id ? 'Editar sponsor' : 'Nuevo sponsor'} actions={<button type="button" className={secondaryButtonClass} onClick={() => setForm(emptySponsor())}>Nuevo</button>}>
        <form className="space-y-3" onSubmit={(event) => { void handleSubmit(event); }}>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Nombre">
              <input required className={fieldClass} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </Field>
            <Field label="Marca">
              <input required className={fieldClass} value={form.brand} onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))} />
            </Field>
            <Field label="Asset ID (logo)">
              <input className={fieldClass} placeholder="ej: teams/logo-mineros" value={form.logoAssetId} onChange={(event) => setForm((current) => ({ ...current, logoAssetId: event.target.value }))} />
            </Field>
            <Field label="Prioridad">
              <input className={fieldClass} type="number" min={1} max={100} value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: Number(event.target.value) || 1 }))} />
            </Field>
            <Field label="Status">
              <select className={fieldClass} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as Sponsor['status'] }))}>
                <option value="draft">draft</option>
                <option value="active">active</option>
                <option value="paused">paused</option>
                <option value="ended">ended</option>
              </select>
            </Field>
            <label className="flex items-center gap-2 rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
              Activo
            </label>
            <Field label="Fecha inicio">
              <input className={fieldClass} type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} />
            </Field>
            <Field label="Fecha fin">
              <input className={fieldClass} type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} />
            </Field>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className={primaryButtonClass}>{saving ? 'Guardando...' : 'Guardar'}</button>
            <button type="button" className={secondaryButtonClass} onClick={() => setForm(emptySponsor())}>Cancelar</button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
