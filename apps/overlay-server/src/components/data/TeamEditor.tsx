import { useEffect, useMemo, useState } from 'react';

import { generateId, request, toErrorMessage } from './api';
import { MasterDetail } from './MasterDetail';
import { mockCategories, mockTeams } from './mockData';
import { Feedback, Field, fieldClass, primaryButtonClass, secondaryButtonClass, dangerButtonClass, LoadingState } from './shared';
import { normalizeCategory, normalizeTeam, type Category, type Team } from './types';

const emptyTeam = (): Team => ({
  id: '',
  fullName: '',
  shortName: '',
  abbreviation: '',
  city: '',
  country: 'DO',
  primaryColor: '#D71920',
  secondaryColor: '#1B2F5B',
  logoAssetId: '',
  categoryIds: [],
});

function TeamListItem({ team, selected, onClick }: { team: Team; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 border-b border-white/5 transition ${
        selected ? 'bg-mineros-gold/15 border-l-2 border-l-mineros-gold' : 'hover:bg-white/5'
      }`}
    >
      <div
        className="h-7 w-7 shrink-0 rounded flex items-center justify-center text-[10px] font-bold text-white"
        style={{ backgroundColor: team.primaryColor || '#1B2F5B' }}
      >
        {team.abbreviation || team.fullName.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className={`truncate text-xs font-semibold ${selected ? 'text-mineros-gold' : 'text-white/90'}`}>
          {team.fullName}
        </p>
        <p className="truncate text-[10px] text-white/40">{team.city || '—'}</p>
      </div>
    </button>
  );
}

export function TeamEditor() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<Team | null>(null);
  const [form, setForm] = useState<Team>(emptyTeam());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      request<unknown[]>('/api/teams'),
      request<unknown[]>('/api/categories'),
    ])
      .then(([teamPayload, categoryPayload]) => {
        if (cancelled) return;
        const teamsArr = Array.isArray(teamPayload) ? teamPayload : [];
        const catsArr = Array.isArray(categoryPayload) ? categoryPayload : [];
        setTeams(teamsArr.map(normalizeTeam));
        setCategories(catsArr.map(normalizeCategory));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setTeams(mockTeams);
        setCategories(mockCategories);
        setError(`${toErrorMessage(err, 'Servidor no disponible.')} Mostrando datos de ejemplo.`);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const selectTeam = (team: Team) => {
    setSelected(team);
    setForm({ ...team });
    setMessage(null);
    setError(null);
  };

  const startNew = () => {
    setSelected(null);
    setForm(emptyTeam());
    setMessage(null);
    setError(null);
  };

  const toggleCategory = (id: string) =>
    setForm((f) => ({
      ...f,
      categoryIds: f.categoryIds.includes(id)
        ? f.categoryIds.filter((x) => x !== id)
        : [...f.categoryIds, id],
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = { ...form, category_ids: form.categoryIds };
      if (form.id) {
        const updated = normalizeTeam(await request(`/api/teams/${form.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }));
        setTeams((ts) => ts.map((t) => (t.id === updated.id ? updated : t)));
        setMessage('✅ Equipo actualizado.');
      } else {
        const created = normalizeTeam(await request('/api/teams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }));
        setTeams((ts) => [created, ...ts]);
        setMessage('✅ Equipo creado.');
        setSelected(created);
        setForm(created);
      }
    } catch (err) {
      const localTeam = { ...form, id: form.id || generateId('team') };
      setTeams((ts) => (form.id ? ts.map((t) => (t.id === localTeam.id ? localTeam : t)) : [localTeam, ...ts]));
      setError(toErrorMessage(err, 'No se pudo guardar.') + ' (guardado local)');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setTeams((ts) => ts.filter((t) => t.id !== id));
    if (selected?.id === id) { setSelected(null); setForm(emptyTeam()); }
    try {
      await request(`/api/teams/${id}`, { method: 'DELETE' });
      setMessage('✅ Equipo eliminado.');
    } catch (err) {
      setError(toErrorMessage(err, 'No se pudo eliminar.') + ' (eliminado local)');
    }
  };

  if (loading) return <LoadingState />;

  const list = (
    <>
      <div className="p-2 border-b border-white/10">
        <button type="button" onClick={startNew} className={`w-full text-xs ${secondaryButtonClass}`}>
          + Nuevo equipo
        </button>
      </div>
      {teams.length === 0 ? (
        <p className="px-3 py-4 text-xs text-white/35">Sin equipos registrados.</p>
      ) : (
        teams.map((team) => (
          <TeamListItem key={team.id} team={team} selected={selected?.id === team.id} onClick={() => selectTeam(team)} />
        ))
      )}
    </>
  );

  const detail = (
    <div className="space-y-3 max-w-2xl">
      {error && <Feedback tone="error" message={error} />}
      {message && <Feedback tone="success" message={message} />}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          {form.id ? `Editando: ${form.fullName || '—'}` : 'Nuevo equipo'}
        </h3>
        {form.id && (
          <button type="button" onClick={() => { void handleDelete(form.id); }} className={dangerButtonClass}>
            Eliminar
          </button>
        )}
      </div>

      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre completo">
            <input required className={fieldClass} value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
          </Field>
          <Field label="Nombre corto">
            <input className={fieldClass} value={form.shortName} onChange={(e) => setForm((f) => ({ ...f, shortName: e.target.value }))} />
          </Field>
          <Field label="Abreviatura (máx 4)">
            <input required maxLength={4} className={fieldClass} value={form.abbreviation} onChange={(e) => setForm((f) => ({ ...f, abbreviation: e.target.value.toUpperCase() }))} />
          </Field>
          <Field label="Logo asset ID">
            <input className={fieldClass} placeholder="teams/logo-mineros" value={form.logoAssetId} onChange={(e) => setForm((f) => ({ ...f, logoAssetId: e.target.value }))} />
          </Field>
          <Field label="Ciudad">
            <input className={fieldClass} value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
          </Field>
          <Field label="País">
            <input className={fieldClass} value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
          </Field>
          <Field label="Color primario">
            <div className="flex gap-2">
              <input type="color" className="h-10 w-12 shrink-0 rounded border border-white/10 bg-black p-0.5 cursor-pointer" value={form.primaryColor} onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))} />
              <input className={fieldClass} value={form.primaryColor} onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))} />
            </div>
          </Field>
          <Field label="Color secundario">
            <div className="flex gap-2">
              <input type="color" className="h-10 w-12 shrink-0 rounded border border-white/10 bg-black p-0.5 cursor-pointer" value={form.secondaryColor} onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))} />
              <input className={fieldClass} value={form.secondaryColor} onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))} />
            </div>
          </Field>
        </div>

        {categories.length > 0 && (
          <Field label="Categorías">
            <div className="flex flex-wrap gap-2 mt-1">
              {categories.map((cat) => {
                const on = form.categoryIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${on ? 'bg-mineros-gold text-broadcast-black' : 'border border-white/15 bg-white/5 text-white/60 hover:bg-white/10'}`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        {/* Vista previa del badge */}
        {(form.fullName || form.abbreviation) && (
          <div className="flex items-center gap-3 rounded border border-white/10 bg-white/5 p-3">
            <div className="h-10 w-10 rounded flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: form.primaryColor || '#1B2F5B' }}>
              {form.abbreviation || form.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{form.fullName}</p>
              <p className="text-xs text-white/40">{form.categoryIds.map((id) => categoryMap.get(id) ?? id).join(' · ') || 'Sin categoría'}</p>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={saving} className={primaryButtonClass}>
            {saving ? 'Guardando...' : form.id ? 'Actualizar equipo' : 'Crear equipo'}
          </button>
          <button type="button" className={secondaryButtonClass} onClick={startNew}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );

  return <MasterDetail listTitle={`${teams.length} equipo${teams.length !== 1 ? 's' : ''}`} listContent={list} detailTitle={form.id ? 'Editar equipo' : 'Nuevo equipo'} detailContent={detail} />;
}
