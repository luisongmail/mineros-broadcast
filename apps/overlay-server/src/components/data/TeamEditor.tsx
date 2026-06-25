import { useEffect, useMemo, useState } from 'react';

import { generateId, request, toErrorMessage } from './api';
import { mockCategories, mockTeams } from './mockData';
import { EmptyState, Feedback, Field, LoadingState, SectionCard, dangerButtonClass, fieldClass, primaryButtonClass, secondaryButtonClass, tableCellClass, tableHeaderClass } from './shared';
import { normalizeCategory, normalizeTeam, type Category, type Team } from './types';

const emptyTeam = (): Team => ({
  id: '',
  fullName: '',
  shortName: '',
  abbreviation: '',
  city: '',
  country: '',
  primaryColor: '#D71920',
  secondaryColor: '#1B2F5B',
  logoAssetId: '',
  categoryIds: [],
});

export function TeamEditor() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<Team>(emptyTeam());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [teamPayload, categoryPayload] = await Promise.all([
          request<unknown[]>('/api/teams'),
          request<unknown[]>('/api/categories'),
        ]);

        if (!cancelled) {
          setTeams(teamPayload.map(normalizeTeam));
          setCategories(categoryPayload.map(normalizeCategory));
        }
      } catch (loadError) {
        if (!cancelled) {
          setTeams(mockTeams);
          setCategories(mockCategories);
          setError(`${toErrorMessage(loadError, 'No se pudieron cargar los equipos.')} Mostrando datos mock.`);
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

  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);

  const toggleCategory = (categoryId: string) => {
    setForm((current) => ({
      ...current,
      categoryIds: current.categoryIds.includes(categoryId)
        ? current.categoryIds.filter((value) => value !== categoryId)
        : [...current.categoryIds, categoryId],
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        ...form,
        category_ids: form.categoryIds,
      };

      if (form.id) {
        const updated = normalizeTeam(await request(`/api/teams/${form.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }));
        setTeams((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        setMessage('Equipo actualizado.');
      } else {
        const created = normalizeTeam(await request('/api/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }));
        setTeams((current) => [created, ...current]);
        setMessage('Equipo creado.');
      }
    } catch (submitError) {
      const localTeam = { ...form, id: form.id || generateId('team') };
      setTeams((current) => (form.id ? current.map((item) => (item.id === localTeam.id ? localTeam : item)) : [localTeam, ...current]));
      setError(toErrorMessage(submitError, 'No se pudo guardar el equipo.'));
      setMessage('Cambio aplicado localmente mientras el backend no está disponible.');
    } finally {
      setSaving(false);
      setForm(emptyTeam());
    }
  };

  const handleDelete = async (id: string) => {
    setTeams((current) => current.filter((item) => item.id !== id));
    if (form.id === id) setForm(emptyTeam());

    try {
      await request(`/api/teams/${id}`, { method: 'DELETE' });
      setMessage('Equipo eliminado.');
      setError(null);
    } catch (deleteError) {
      setError(`${toErrorMessage(deleteError, 'No se pudo eliminar el equipo.')} Eliminado solo localmente.`);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-3">
      {error && <Feedback tone="error" message={error} />}
      {message && <Feedback tone="success" message={message} />}

      <SectionCard title="Equipos existentes" actions={<button type="button" className={secondaryButtonClass} onClick={() => setForm(emptyTeam())}>Nuevo</button>}>
        {teams.length === 0 ? (
          <EmptyState message="No hay equipos registrados." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className={tableHeaderClass}>Logo</th>
                  <th className={tableHeaderClass}>Nombre</th>
                  <th className={tableHeaderClass}>Abr.</th>
                  <th className={tableHeaderClass}>Categorías</th>
                  <th className={tableHeaderClass}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {teams.map((team) => (
                  <tr key={team.id}>
                    <td className={tableCellClass}>
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-700 bg-gray-800 text-[10px] text-gray-400">
                        {team.logoAssetId ? 'Logo' : '—'}
                      </div>
                    </td>
                    <td className={tableCellClass}>
                      <p className="font-semibold text-white">{team.fullName}</p>
                      <p className="text-xs text-gray-400">{team.city}{team.country ? `, ${team.country}` : ''}</p>
                    </td>
                    <td className={tableCellClass}>{team.abbreviation || '—'}</td>
                    <td className={tableCellClass}>{team.categoryIds.map((id) => categoryMap.get(id) ?? id).join(', ') || '—'}</td>
                    <td className={tableCellClass}>
                      <div className="flex gap-2">
                        <button type="button" className={secondaryButtonClass} onClick={() => setForm(team)}>Editar</button>
                        <button type="button" className={dangerButtonClass} onClick={() => { void handleDelete(team.id); }}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title={form.id ? 'Editar equipo' : 'Nuevo equipo'}>
        <form className="space-y-3" onSubmit={(event) => { void handleSubmit(event); }}>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Nombre completo">
              <input required className={fieldClass} value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />
            </Field>
            <Field label="Nombre corto">
              <input className={fieldClass} value={form.shortName} onChange={(event) => setForm((current) => ({ ...current, shortName: event.target.value }))} />
            </Field>
            <Field label="Abreviatura">
              <input required maxLength={4} className={fieldClass} value={form.abbreviation} onChange={(event) => setForm((current) => ({ ...current, abbreviation: event.target.value.toUpperCase() }))} />
            </Field>
            <Field label="Logo asset ID">
              <input className={fieldClass} placeholder="ej: teams/logo-mineros" value={form.logoAssetId} onChange={(event) => setForm((current) => ({ ...current, logoAssetId: event.target.value }))} />
            </Field>
            <Field label="Ciudad">
              <input className={fieldClass} value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} />
            </Field>
            <Field label="País">
              <input className={fieldClass} value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} />
            </Field>
            <Field label="Color primario">
              <div className="flex gap-2">
                <input className="h-10 w-14 rounded-md border border-gray-700 bg-gray-800 p-1" type="color" value={form.primaryColor} onChange={(event) => setForm((current) => ({ ...current, primaryColor: event.target.value }))} />
                <input className={fieldClass} value={form.primaryColor} onChange={(event) => setForm((current) => ({ ...current, primaryColor: event.target.value }))} />
              </div>
            </Field>
            <Field label="Color secundario">
              <div className="flex gap-2">
                <input className="h-10 w-14 rounded-md border border-gray-700 bg-gray-800 p-1" type="color" value={form.secondaryColor} onChange={(event) => setForm((current) => ({ ...current, secondaryColor: event.target.value }))} />
                <input className={fieldClass} value={form.secondaryColor} onChange={(event) => setForm((current) => ({ ...current, secondaryColor: event.target.value }))} />
              </div>
            </Field>
            <div className="md:col-span-2">
              <Field label="Categorías asignadas">
                <div className="grid gap-2 rounded-md border border-gray-700 bg-gray-800 p-3 sm:grid-cols-2">
                  {categories.map((category) => (
                    <label key={category.id} className="flex items-center gap-2 text-sm text-gray-200">
                      <input type="checkbox" checked={form.categoryIds.includes(category.id)} onChange={() => toggleCategory(category.id)} />
                      {category.name}
                    </label>
                  ))}
                </div>
              </Field>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className={primaryButtonClass}>{saving ? 'Guardando...' : 'Guardar'}</button>
            <button type="button" className={secondaryButtonClass} onClick={() => setForm(emptyTeam())}>Cancelar</button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
