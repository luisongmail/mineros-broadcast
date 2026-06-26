import { useEffect, useMemo, useRef, useState } from 'react';

import { SlideDrawer } from './data/SlideDrawer';
import {
  AssetImage,
  ConfirmDialog,
  dangerButtonClass,
  Feedback,
  fieldClass,
  primaryButtonClass,
  RowDeleteButton,
  searchInputClass,
  selectedRowStyle,
  secondaryButtonClass,
  tableBodyClass,
  tableClass,
  tableHeadRowClass,
  tableHeaderClass,
  tableRowClass,
  tableCellClass,
  type DialogState,
} from './data/shared';

const API = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

// ── Tipos ──────────────────────────────────────────────────────────────────

interface VenueAddress {
  line1:         string;
  line2:         string;
  city:          string;
  stateProvince: string;
  postalCode:    string;
  country:       string;
  countryCode:   string;
}

interface VenueGoogle {
  placeId:   string;
  latitude:  string;
  longitude: string;
}

interface Venue {
  id:           string;
  name:         string;
  photoAssetId: string;
  address:      VenueAddress;
  google:       VenueGoogle;
  capacity:     string;
  notes:        string;
}

function emptyVenue(): Venue {
  return {
    id:           '',
    name:         '',
    photoAssetId: '',
    address: { line1: '', line2: '', city: '', stateProvince: '', postalCode: '', country: '', countryCode: '' },
    google:  { placeId: '', latitude: '', longitude: '' },
    capacity: '',
    notes:    '',
  };
}

function normalizeVenue(raw: Record<string, unknown>): Venue {
  const addr = (raw.address ?? {}) as Record<string, unknown>;
  const goog = (raw.google  ?? {}) as Record<string, unknown>;
  return {
    id:           String(raw.id   ?? ''),
    name:         String(raw.name ?? ''),
    photoAssetId: String(raw.photoAssetId ?? ''),
    address: {
      line1:         String(addr.line1         ?? ''),
      line2:         String(addr.line2         ?? ''),
      city:          String(addr.city          ?? ''),
      stateProvince: String(addr.stateProvince ?? ''),
      postalCode:    String(addr.postalCode    ?? ''),
      country:       String(addr.country       ?? ''),
      countryCode:   String(addr.countryCode   ?? ''),
    },
    google: {
      placeId:   String(goog.placeId   ?? ''),
      latitude:  goog.latitude  != null ? String(goog.latitude)  : '',
      longitude: goog.longitude != null ? String(goog.longitude) : '',
    },
    capacity: raw.capacity != null ? String(raw.capacity) : '',
    notes:    String(raw.notes ?? ''),
  };
}

/** Construye la dirección formateada como string para Google Maps */
function formatAddress(a: VenueAddress): string {
  return [a.line1, a.line2, a.city, a.stateProvince, a.postalCode, a.country]
    .filter(Boolean).join(', ');
}

/** URL de Google Maps para la dirección o coordenadas */
function mapsUrl(v: Venue): string {
  const { placeId, latitude, longitude } = v.google;
  if (placeId) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.name)}&query_place_id=${encodeURIComponent(placeId)}`;
  }
  if (latitude && longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }
  const addr = formatAddress(v.address);
  if (addr) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
  return '';
}

// ── Helpers UI ─────────────────────────────────────────────────────────────

const labelClass = 'text-[10px] font-semibold uppercase tracking-widest text-white/40';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[9px] font-semibold uppercase tracking-widest text-white/25 pt-2 pb-0.5 border-t border-white/8 mt-1">{children}</p>;
}

// ── Componente principal ───────────────────────────────────────────────────

export function VenuesTab({ embedded = false }: { embedded?: boolean }) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<Venue>(emptyVenue());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [filterName, setFilterName] = useState('');

  const filtered = useMemo(() =>
    venues.filter((v) => !filterName || v.name.toLowerCase().includes(filterName.toLowerCase())),
    [venues, filterName],
  );
  const anchorRef = useRef<HTMLElement | null>(null);
  const editingId = useRef<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/venues`)
      .then((r) => r.json() as Promise<{ result?: string; payload?: unknown[] }>)
      .then((body) => setVenues((body.payload ?? []).map((v) => normalizeVenue(v as Record<string, unknown>))))
      .catch(() => setVenues([]))
      .finally(() => setLoading(false));
  }, []);

  function openNew() {
    editingId.current = null;
    anchorRef.current = null;
    setForm(emptyVenue());
    setSaved(false);
    setError(null);
    setDrawerOpen(true);
  }

  function openEdit(v: Venue, row: HTMLTableRowElement) {
    editingId.current = v.id;
    anchorRef.current = row as HTMLElement;
    setForm({ ...v });
    setSaved(false);
    setError(null);
    setDrawerOpen(true);
  }

  function setAddr(key: keyof VenueAddress, value: string) {
    setForm((f) => ({ ...f, address: { ...f.address, [key]: value } }));
  }

  function setGoogle(key: keyof VenueGoogle, value: string) {
    setForm((f) => ({ ...f, google: { ...f.google, [key]: value } }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name:         form.name,
        photoAssetId: form.photoAssetId || null,
        address: {
          line1:         form.address.line1         || null,
          line2:         form.address.line2         || null,
          city:          form.address.city          || null,
          stateProvince: form.address.stateProvince || null,
          postalCode:    form.address.postalCode    || null,
          country:       form.address.country       || null,
          countryCode:   form.address.countryCode   ? form.address.countryCode.toUpperCase() : null,
        },
        google: {
          placeId:   form.google.placeId   || null,
          latitude:  form.google.latitude  ? Number(form.google.latitude)  : null,
          longitude: form.google.longitude ? Number(form.google.longitude) : null,
        },
        capacity: form.capacity ? Number(form.capacity) : null,
        notes:    form.notes    || null,
      };

      const isEdit = Boolean(editingId.current);
      const url    = isEdit ? `${API}/venues/${editingId.current}` : `${API}/venues`;
      const method = isEdit ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body   = await res.json() as { result?: string; payload?: unknown; error?: string };
      if (!res.ok || body.result === 'error') throw new Error((body.error as string | undefined) ?? `HTTP ${res.status}`);

      const saved_ = normalizeVenue(body.payload as Record<string, unknown>);
      if (isEdit) {
        setVenues((prev) => prev.map((v) => v.id === saved_.id ? saved_ : v));
      } else {
        setVenues((prev) => [...prev, saved_]);
      }
      setSaved(true);
      setTimeout(() => { setSaved(false); setDrawerOpen(false); }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(v: Venue) {
    setDialog({
      title: '¿Eliminar estadio?',
      message: `«${v.name}» será eliminado permanentemente.`,
      tone: 'danger',
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        try {
          await fetch(`${API}/venues/${v.id}`, { method: 'DELETE' });
          setVenues((prev) => prev.filter((x) => x.id !== v.id));
          if (editingId.current === v.id) setDrawerOpen(false);
        } catch (e) {
          setDialog({ title: 'Error al eliminar', message: e instanceof Error ? e.message : 'Error', tone: 'error' });
        }
      },
    });
  }

  // Calcula posición del drawer anclada a la fila seleccionada

  return (
    <div className={`space-y-3 ${embedded ? '' : 'p-4'}`}>
      {/* Header uniforme */}
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/35 shrink-0">🏟️ Estadios</h3>
        <input
          className={searchInputClass}
          placeholder="Buscar estadio…"
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
        />
        <button type="button" onClick={openNew} className={primaryButtonClass}>+ Nuevo estadio</button>
      </div>

      {/* Lista */}
      {loading && <p className="text-xs text-white/30">Cargando…</p>}
      {!loading && filtered.length === 0 && (
        <p className="text-xs text-white/30">{venues.length === 0 ? 'Sin estadios registrados.' : 'Sin resultados.'}</p>
      )}
      {!loading && filtered.length > 0 && (
        <div className="rounded border border-white/10 overflow-hidden">
          <table className={tableClass}>
            <thead>
              <tr className={tableHeadRowClass}>
                <th className={tableHeaderClass + ' w-9'}></th>
                <th className={tableHeaderClass}>Nombre</th>
                <th className={tableHeaderClass}>Ciudad</th>
                <th className={tableHeaderClass}>País</th>
                <th className={tableHeaderClass}>Coords</th>
                <th className={tableHeaderClass}>Cómo llegar</th>
                <th className={tableHeaderClass + ' w-10'}></th>
              </tr>
            </thead>
            <tbody className={tableBodyClass}>
              {filtered.map((v) => {
                const url = mapsUrl(v);
                return (
                  <tr
                    key={v.id}
                    className={tableRowClass}
                    style={drawerOpen && editingId.current === v.id ? selectedRowStyle : undefined}
                    onClick={(e) => openEdit(v, e.currentTarget as HTMLTableRowElement)}
                  >
                    <td className="px-2 py-1 align-middle">
                      <AssetImage assetId={v.photoAssetId} alt={v.name} size={28} />
                    </td>
                    <td className={tableCellClass + ' font-medium'}>{v.name}</td>
                    <td className={tableCellClass + ' text-white/50'}>{v.address.city || '—'}</td>
                    <td className={tableCellClass + ' text-white/50'}>{v.address.countryCode || v.address.country || '—'}</td>
                    <td className={tableCellClass + ' text-white/40 font-mono text-[10px]'}>
                      {v.google.latitude && v.google.longitude
                        ? `${Number(v.google.latitude).toFixed(5)}, ${Number(v.google.longitude).toFixed(5)}`
                        : '—'}
                    </td>
                    <td className={tableCellClass} onClick={(e) => e.stopPropagation()}>
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded border border-white/15 px-2 py-0.5 text-[10px] text-white/60 hover:border-white/30 hover:text-white transition"
                          title="Abrir en Google Maps"
                        >
                          📍 Maps
                        </a>
                      ) : (
                        <span className="text-white/20 text-[10px]">—</span>
                      )}
                    </td>
                    <RowDeleteButton onDelete={() => handleDelete(v)} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer de edición */}
      <SlideDrawer
        open={drawerOpen}
        title={editingId.current ? 'Editar estadio' : 'Nuevo estadio'}
        onClose={() => setDrawerOpen(false)}
        anchorRef={anchorRef as React.RefObject<HTMLElement | null>}
      >
        <div className="space-y-3 p-1">
          {error && <Feedback tone="error" message={error} />}
          {saved  && <Feedback tone="success" message="Guardado ✓" />}

          <Field label="Nombre del estadio">
            <input className={fieldClass} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Estadio Mineros de Santiago" />
          </Field>

          <Field label="Foto — Asset ID">
            <input className={fieldClass} value={form.photoAssetId} onChange={(e) => setForm((f) => ({ ...f, photoAssetId: e.target.value }))} placeholder="venues/estadio-mineros" />
          </Field>

          {/* Dirección */}
          <SectionTitle>Dirección</SectionTitle>

          <Field label="Calle y número">
            <input className={fieldClass} value={form.address.line1} onChange={(e) => setAddr('line1', e.target.value)} placeholder="Av. Pedro de Valdivia 1234" />
          </Field>

          <Field label="Piso / suite / sector (opcional)">
            <input className={fieldClass} value={form.address.line2} onChange={(e) => setAddr('line2', e.target.value)} placeholder="Sector Norte" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Ciudad">
              <input className={fieldClass} value={form.address.city} onChange={(e) => setAddr('city', e.target.value)} placeholder="Santiago" />
            </Field>
            <Field label="Región / Estado / Provincia">
              <input className={fieldClass} value={form.address.stateProvince} onChange={(e) => setAddr('stateProvince', e.target.value)} placeholder="Región Metropolitana" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Código postal">
              <input className={fieldClass} value={form.address.postalCode} onChange={(e) => setAddr('postalCode', e.target.value)} placeholder="7500000" />
            </Field>
            <Field label="País">
              <input className={fieldClass} value={form.address.country} onChange={(e) => setAddr('country', e.target.value)} placeholder="Chile" />
            </Field>
          </div>

          <Field label="Código de país (ISO 3166-1)">
            <input
              className={fieldClass}
              value={form.address.countryCode}
              onChange={(e) => setAddr('countryCode', e.target.value.toUpperCase().slice(0, 2))}
              placeholder="CL"
              maxLength={2}
            />
          </Field>

          {/* Google Maps */}
          <SectionTitle>Google Maps</SectionTitle>
          <p className="text-[10px] text-white/30 -mt-1">Obtén las coordenadas y el Place ID desde <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="text-mineros-gold/60 hover:text-mineros-gold underline">Google Maps</a> o la consola de Google Cloud.</p>

          <Field label="Google Place ID">
            <input className={fieldClass} value={form.google.placeId} onChange={(e) => setGoogle('placeId', e.target.value)} placeholder="ChIJi-UOO4b-YpYRfmvMnfkRlW8" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitud">
              <input className={fieldClass} type="number" step="any" value={form.google.latitude} onChange={(e) => setGoogle('latitude', e.target.value)} placeholder="-33.45694" />
            </Field>
            <Field label="Longitud">
              <input className={fieldClass} type="number" step="any" value={form.google.longitude} onChange={(e) => setGoogle('longitude', e.target.value)} placeholder="-70.64827" />
            </Field>
          </div>

          {/* Vista previa del link */}
          {mapsUrl(form) && (
            <a
              href={mapsUrl(form)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded border border-white/15 px-3 py-1.5 text-xs text-white/60 hover:border-mineros-gold/50 hover:text-mineros-gold transition"
            >
              📍 Ver en Google Maps
            </a>
          )}

          {/* Capacidad */}
          <SectionTitle>Datos adicionales</SectionTitle>
          <Field label="Capacidad (espectadores)">
            <input className={fieldClass} type="number" min={0} value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} placeholder="5000" />
          </Field>

          <Field label="Notas">
            <textarea className={`${fieldClass} resize-none`} rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Información adicional…" />
          </Field>

          {/* Acciones */}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => { void handleSave(); }} disabled={saving} className={primaryButtonClass}>
              {saved ? '✅ Guardado' : saving ? 'Guardando…' : 'Guardar'}
            </button>
            {editingId.current && (
              <button type="button" onClick={() => { const v = venues.find((x) => x.id === editingId.current); if (v) handleDelete(v); }} className={dangerButtonClass}>
                Eliminar
              </button>
            )}
            <button type="button" onClick={() => setDrawerOpen(false)} className={secondaryButtonClass}>
              Cancelar
            </button>
          </div>
        </div>
      </SlideDrawer>

      <ConfirmDialog state={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}
