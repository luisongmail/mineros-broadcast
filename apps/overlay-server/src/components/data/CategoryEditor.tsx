import { useEffect, useRef, useState } from 'react';

import { generateId, request, toErrorMessage } from './api';
import { mockCategories } from './mockData';
import { SlideDrawer } from './SlideDrawer';
import { EmptyState, Feedback, Field, LoadingState, SectionCard, fieldClass, primaryButtonClass, dangerButtonClass, secondaryButtonClass, tableCellClass, tableHeaderClass } from './shared';
import { normalizeCategory, type Category } from './types';

type Sport = { id: string; name: string; gender: string };

const emptyCategory = (): Category => ({ id: '', name: '', description: '', sportId: 'softball_fast_f', ageMin: null, ageMax: null, active: true });

function ageLabel(min: number | null, max: number | null): string {
  if (min !== null && max !== null) return `${min}–${max} años`;
  if (min !== null) return `${min}+ años`;
  if (max !== null) return `hasta ${max} años`;
  return '—';
}

export function CategoryEditor() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [form, setForm] = useState<Category>(emptyCategory());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const anchorRef = useRef<HTMLTableRowElement | null>(null);

  const sportName = (id: string) => sports.find((s) => s.id === id)?.name ?? id;

  const openNew = () => {
    anchorRef.current = null;
    setForm(emptyCategory());
    setMessage(null);
    setError(null);
    setDrawerOpen(true);
  };

  const openEdit = (category: Category, rowEl: HTMLTableRowElement) => {
    anchorRef.current = rowEl;
    setForm(category);
    setMessage(null);
    setError(null);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setForm(emptyCategory());
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setMessage(null);

      try {
        const [categoriesPayload, sportsPayload] = await Promise.all([
          request<unknown[]>('/api/categories'),
          request<Sport[]>('/api/sports').catch(() => [] as Sport[]),
        ]);
        if (!cancelled) {
          setCategories(categoriesPayload.map(normalizeCategory));
          setSports(sportsPayload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setCategories(mockCategories);
          setError(`${toErrorMessage(loadError, 'No se pudieron cargar las categorías.')} Mostrando datos mock.`);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
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

    const payload = {
      sport_id:    form.sportId,
      name:        form.name,
      description: form.description || null,
      age_min:     form.ageMin ?? null,
      age_max:     form.ageMax ?? null,
      active:      form.active,
    };

    try {
      if (form.id) {
        const updated = normalizeCategory(await request(`/api/categories/${form.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }));
        setCategories((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        setMessage('Categoría actualizada.');
      } else {
        const created = normalizeCategory(await request('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }));
        setCategories((current) => [created, ...current]);
        setMessage('Categoría creada.');
      }
      closeDrawer();
    } catch (submitError) {
      const fallback = form.id || generateId('category');
      const localCategory = { ...form, id: fallback };
      setCategories((current) => (form.id ? current.map((item) => (item.id === fallback ? localCategory : item)) : [localCategory, ...current]));
      setError(toErrorMessage(submitError, 'No se pudo guardar la categoría.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    setMessage(null);

    try {
      await request(`/api/categories/${id}`, { method: 'DELETE' });
      setMessage('Categoría eliminada.');
    } catch (deleteError) {
      setError(`${toErrorMessage(deleteError, 'No se pudo eliminar en backend.')} Eliminada localmente.`);
    }

    setCategories((current) => current.filter((item) => item.id !== id));
    if (form.id === id) closeDrawer();
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-3">
      {error && <Feedback tone="error" message={error} />}
      {message && <Feedback tone="success" message={message} />}

      <SectionCard
        title="Categorías registradas"
        actions={
          <button type="button" className={primaryButtonClass} onClick={openNew}>
            + Nueva categoría
          </button>
        }
      >
        {categories.length === 0 ? (
          <EmptyState message="No hay categorías todavía." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700 text-left">
              <thead>
                <tr>
                  <th className={tableHeaderClass}>Nombre</th>
                  <th className={tableHeaderClass}>Deporte</th>
                  <th className={tableHeaderClass}>Edad</th>
                  <th className={tableHeaderClass}>Estado</th>
                  <th className={tableHeaderClass}>Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-800/40">
                    <td className={tableCellClass}>{category.name}</td>
                    <td className={tableCellClass}>{sportName(category.sportId)}</td>
                    <td className={`${tableCellClass} text-gray-400`}>{ageLabel(category.ageMin, category.ageMax)}</td>
                    <td className={tableCellClass}>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${category.active ? 'bg-green-900/40 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                        {category.active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className={tableCellClass}>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className={secondaryButtonClass}
                          onClick={(e) => { openEdit(category, e.currentTarget.closest('tr') as HTMLTableRowElement); }}
                        >
                          Editar
                        </button>
                        <button type="button" className={dangerButtonClass} onClick={() => { void handleDelete(category.id); }}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Drawer lateral de edición */}
      <SlideDrawer
        open={drawerOpen}
        title={form.id ? `Editar: ${form.name}` : 'Nueva categoría'}
        onClose={closeDrawer}
        anchorRef={anchorRef}
      >
        <form className="space-y-4" onSubmit={(event) => { void handleSubmit(event); }}>
          <Field label="Nombre">
            <input required className={fieldClass} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </Field>
          <Field label="Deporte">
            <select className={fieldClass} value={form.sportId} onChange={(event) => setForm((current) => ({ ...current, sportId: event.target.value }))}>
              {sports.length === 0
                ? <option value={form.sportId}>{form.sportId}</option>
                : sports.map((sport) => <option key={sport.id} value={sport.id}>{sport.name}</option>)
              }
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Edad mínima">
              <input
                className={fieldClass}
                type="number"
                min={0}
                max={99}
                placeholder="ej: 13"
                value={form.ageMin ?? ''}
                onChange={(event) => setForm((current) => ({ ...current, ageMin: event.target.value ? Number(event.target.value) : null }))}
              />
            </Field>
            <Field label="Edad máxima">
              <input
                className={fieldClass}
                type="number"
                min={0}
                max={99}
                placeholder="ej: 18"
                value={form.ageMax ?? ''}
                onChange={(event) => setForm((current) => ({ ...current, ageMax: event.target.value ? Number(event.target.value) : null }))}
              />
            </Field>
          </div>
          <Field label="Descripción">
            <textarea className={`${fieldClass} min-h-20`} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
            Activa
          </label>
          <div className="flex gap-2 border-t border-gray-700 pt-4">
            <button type="submit" disabled={saving} className={primaryButtonClass}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" className={secondaryButtonClass} onClick={closeDrawer}>
              Cancelar
            </button>
          </div>
        </form>
      </SlideDrawer>
    </div>
  );
}
