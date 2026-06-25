import { useEffect, useState } from 'react';

import { generateId, request, toErrorMessage } from './api';
import { mockCategories } from './mockData';
import { EmptyState, Feedback, Field, LoadingState, SectionCard, fieldClass, primaryButtonClass, secondaryButtonClass, tableCellClass, tableHeaderClass } from './shared';
import { normalizeCategory, type Category } from './types';

type Sport = { id: string; name: string; gender: string };

const emptyCategory = (): Category => ({ id: '', name: '', description: '', sportId: 'softball_fast_f', active: true });

export function CategoryEditor() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [form, setForm] = useState<Category>(emptyCategory());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

    // El backend espera snake_case — limpiar camelCase del spread
    const payload = {
      sport_id:    form.sportId,
      name:        form.name,
      description: form.description || null,
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
    } catch (submitError) {
      const fallback = form.id || generateId('category');
      const localCategory = { ...form, id: fallback };
      setCategories((current) => (form.id ? current.map((item) => (item.id === fallback ? localCategory : item)) : [localCategory, ...current]));
      setMessage('Backend no disponible: cambio aplicado solo en memoria.');
      setError(toErrorMessage(submitError, 'No se pudo guardar la categoría.'));
    } finally {
      setSaving(false);
      setForm(emptyCategory());
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
    if (form.id === id) {
      setForm(emptyCategory());
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-3">
      {error && <Feedback tone="error" message={error} />}
      {message && <Feedback tone="success" message={message} />}

      <SectionCard title="Categorías registradas">
        {categories.length === 0 ? (
          <EmptyState message="No hay categorías todavía." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700 text-left">
              <thead>
                <tr>
                  <th className={tableHeaderClass}>Nombre</th>
                  <th className={tableHeaderClass}>Deporte</th>
                  <th className={tableHeaderClass}>Estado</th>
                  <th className={tableHeaderClass}>Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td className={tableCellClass}>{category.name}</td>
                    <td className={tableCellClass}>{category.sportId}</td>
                    <td className={tableCellClass}>{category.active ? 'Activa' : 'Inactiva'}</td>
                    <td className={tableCellClass}>
                      <div className="flex gap-2">
                        <button type="button" className={secondaryButtonClass} onClick={() => setForm(category)}>
                          Editar
                        </button>
                        <button type="button" className="text-xs font-semibold text-red-300 hover:text-red-200" onClick={() => { void handleDelete(category.id); }}>
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

      <SectionCard
        title={form.id ? 'Editar categoría' : 'Nueva categoría'}
        actions={<button type="button" className={secondaryButtonClass} onClick={() => setForm(emptyCategory())}>Nuevo</button>}
      >
        <form className="space-y-3" onSubmit={(event) => { void handleSubmit(event); }}>
          <div className="grid gap-3 md:grid-cols-2">
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
            <div className="md:col-span-2">
              <Field label="Descripción">
                <textarea className={`${fieldClass} min-h-24`} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
              Activa
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className={primaryButtonClass}>{saving ? 'Guardando...' : 'Guardar'}</button>
            <button type="button" className={secondaryButtonClass} onClick={() => setForm(emptyCategory())}>Cancelar</button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
