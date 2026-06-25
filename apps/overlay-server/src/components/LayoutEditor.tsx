import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type OverlayAnimIn = 'fade_in' | 'slide_up' | 'slide_down' | 'slide_left' | 'slide_right' | 'zoom_in';
export type OverlayAnimOut = 'fade_out' | 'slide_up_out' | 'slide_down_out' | 'slide_left_out' | 'slide_right_out' | 'zoom_out';

export interface LayoutZone {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  animIn?: OverlayAnimIn;
  animOut?: OverlayAnimOut;
}

export interface Layout {
  id: string;
  name: string;
  isDefault: boolean;
  zones: Record<string, LayoutZone>;
}

const OVERLAY_LABELS: Record<string, string> = {
  scorebug: 'Scorebug',
  batter: 'Bateador',
  'next-batters': 'Próximas Bateadoras',
  pitcher: 'Pitcher',
  'inning-transition': 'Transición Entrada',
  'final-score': 'Marcador Final',
  announcement: 'Anuncio',
  social: 'Redes Sociales',
  countdown: 'Cuenta Regresiva',
  'sponsor-break': 'Pausa Comercial',
  substitution: 'Sustitución',
  'game-event': 'Evento de Juego',
  lineup: 'Lineup',
};

const OVERLAY_COLORS: Record<string, string> = {
  scorebug: '#D71920',
  batter: '#1B2F5B',
  'next-batters': '#2E4A7A',
  pitcher: '#D4AF37',
  'inning-transition': '#6B21A8',
  'final-score': '#065F46',
  announcement: '#92400E',
  social: '#1E40AF',
  countdown: '#5B21B6',
  'sponsor-break': '#166534',
  substitution: '#9F1239',
  'game-event': '#1E3A5F',
  lineup: '#374151',
};

/**
 * Posición y tamaño real del contenido de cada overlay dentro del canvas 1920×1080,
 * cuando zone.x = 0, zone.y = 0 (posición natural sin desplazamiento).
 * La posición real en pantalla es: { x: footprint.x + zone.x, y: footprint.y + zone.y }
 */
const OVERLAY_FOOTPRINT: Record<string, { x: number; y: number; width: number; height: number }> = {
  // bottom-[60px] left-[60px] min-w-[620px] → y = 1080-60-88 = 932
  scorebug:           { x: 60,  y: 932, width: 620,  height: 88  },
  // lower_third: bottom-[60px] left-[60px] min-h-[72px] min-w-[420px] py-3 → y = 1080-60-72 = 948
  batter:             { x: 60,  y: 948, width: 420,  height: 72  },
  // bottom-[160px] left-[60px] w-[980px] — left accent + 3 cols compactas → h≈120 → y = 800
  'next-batters':     { x: 60,  y: 800, width: 980,  height: 120 },
  // bottom-[80px] left-[60px] w-[980px] header(80px)+profile/stats(144px) → h=224 → y = 776
  pitcher:            { x: 60,  y: 776, width: 980,  height: 224 },
  // top-[110px] left-[60px] w-[920px] ~10 jugadoras → h≈742
  lineup:             { x: 60,  y: 110, width: 920,  height: 742 },
  // lower_third_compact: bottom-[160px] left-[60px] w-[980px] items-stretch py-4 → h=88 → y = 832
  'inning-transition':{ x: 60,  y: 832, width: 980,  height: 88  },
  // center modal: left-1/2 top-1/2 h-[480px] w-[1080px] → x=420, y=300
  'final-score':      { x: 420, y: 300, width: 1080, height: 480 },
  // bottom-[160px] left-[60px] w-[980px] items-stretch py-4 → h=88 → y = 832
  announcement:       { x: 60,  y: 832, width: 980,  height: 88  },
  // bottom-[160px] left-[60px] w-[860px] items-stretch → h=88 → y = 832
  social:             { x: 60,  y: 832, width: 860,  height: 88  },
  // bottom-[160px] left-[60px] w-[980px] items-stretch → h=88 → y = 832
  countdown:          { x: 60,  y: 832, width: 980,  height: 88  },
  // bottom-[160px] left-[60px] w-[860px] items-stretch → h=88 → y = 832
  'sponsor-break':    { x: 60,  y: 832, width: 860,  height: 88  },
  // bottom-[160px] left-[60px] w-[980px] items-stretch → h=88 → y = 832
  substitution:       { x: 60,  y: 832, width: 980,  height: 88  },
  // bottom-[160px] left-[60px] w-[980px] items-stretch → h=88 → y = 832
  'game-event':       { x: 60,  y: 832, width: 980,  height: 88  },
};

const CANVAS_W = 1920;
const CANVAS_H = 1080;
// Editor: escala 0.5 del canvas real (960×540)
const EDITOR_W = 960;
const EDITOR_H = 540;
const SCALE = EDITOR_W / CANVAS_W;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = (await res.json()) as { payload: T };
  return json.payload;
}

/** Calcula la posición absoluta del marco de contenido en el canvas */
function framePos(overlayId: string, zone: LayoutZone) {
  const fp = OVERLAY_FOOTPRINT[overlayId] ?? { x: 0, y: 0, width: CANVAS_W, height: CANVAS_H };
  return {
    x: fp.x + zone.x,
    y: fp.y + zone.y,
    width: fp.width,
    height: fp.height,
  };
}

interface DragState {
  id: string;
  startMouseX: number;
  startMouseY: number;
  /** Posición absoluta del marco al inicio del drag (fp.x + zone.x, fp.y + zone.y) */
  origFrameX: number;
  origFrameY: number;
}

interface Props {
  gameId: string;
  apiBase?: string;
  onClose?: () => void;
  onLayoutChange?: () => void;
}

export function LayoutEditor({ gameId, apiBase = '/api', onClose, onLayoutChange }: Props) {
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [activeLayout, setActiveLayout] = useState<Layout | null>(null);
  const [editingLayout, setEditingLayout] = useState<Layout | null>(null);
  const [selectedOverlay, setSelectedOverlay] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draggingRef = useRef<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const loadLayouts = useCallback(async () => {
    try {
      const all = await requestJson<Layout[]>(`${apiBase}/layouts`);
      setLayouts(all);
    } catch {
      setError('No se pudieron cargar los layouts');
    }
  }, [apiBase]);

  const loadActiveLayout = useCallback(async () => {
    try {
      const layout = await requestJson<Layout>(`${apiBase}/layouts/active/${encodeURIComponent(gameId)}`);
      setActiveLayout(layout);
      setEditingLayout(structuredClone(layout));
    } catch {
      setError('No se pudo cargar el layout activo');
    }
  }, [apiBase, gameId]);

  useEffect(() => {
    void loadLayouts();
    void loadActiveLayout();
  }, [loadLayouts, loadActiveLayout]);

  /**
   * Cambia zone.x/y a partir de la posición ABSOLUTA del marco (frameX, frameY).
   * zone.x = frameX - footprint.x, zone.y = frameY - footprint.y
   */
  const setFramePosition = useCallback((overlayId: string, frameX: number, frameY: number) => {
    const fp = OVERLAY_FOOTPRINT[overlayId] ?? { x: 0, y: 0, width: CANVAS_W, height: CANVAS_H };
    const zoneX = Math.round(frameX - fp.x);
    const zoneY = Math.round(frameY - fp.y);
    setEditingLayout((current) => {
      if (!current) return current;
      const zone = current.zones[overlayId] ?? { x: 0, y: 0, width: CANVAS_W, height: CANVAS_H, visible: true };
      if (zone.x === zoneX && zone.y === zoneY) return current;
      return {
        ...current,
        zones: { ...current.zones, [overlayId]: { ...zone, x: zoneX, y: zoneY } },
      };
    });
    setIsDirty(true);
  }, []);

  const handleVisibilityChange = useCallback((overlayId: string, visible: boolean) => {
    setEditingLayout((current) => {
      if (!current) return current;
      const zone = current.zones[overlayId] ?? { x: 0, y: 0, width: CANVAS_W, height: CANVAS_H, visible: true };
      return {
        ...current,
        zones: { ...current.zones, [overlayId]: { ...zone, visible } },
      };
    });
    setIsDirty(true);
  }, []);

  const handleAnimChange = useCallback(
    (overlayId: string, field: 'animIn' | 'animOut', value: OverlayAnimIn | OverlayAnimOut) => {
      setEditingLayout((current) => {
        if (!current) return current;
        const zone = current.zones[overlayId] ?? { x: 0, y: 0, width: CANVAS_W, height: CANVAS_H, visible: false };
        return {
          ...current,
          zones: { ...current.zones, [overlayId]: { ...zone, [field]: value } },
        };
      });
      setIsDirty(true);
    },
    [],
  );

  const handleZoneMouseDown = useCallback((e: React.MouseEvent, overlayId: string, zone: LayoutZone) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedOverlay(overlayId);
    const frame = framePos(overlayId, zone);
    draggingRef.current = {
      id: overlayId,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      origFrameX: frame.x,
      origFrameY: frame.y,
    };
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const d = draggingRef.current;
      if (!d) return;
      const dx = (e.clientX - d.startMouseX) / SCALE;
      const dy = (e.clientY - d.startMouseY) / SCALE;
      const fp = OVERLAY_FOOTPRINT[d.id] ?? { x: 0, y: 0, width: CANVAS_W, height: CANVAS_H };
      // Clampar la posición del marco al canvas (0 … CANVAS_W/H - tamaño del marco)
      const newFrameX = clamp(Math.round(d.origFrameX + dx), 0, CANVAS_W - fp.width);
      const newFrameY = clamp(Math.round(d.origFrameY + dy), 0, CANVAS_H - fp.height);
      setEditingLayout((current) => {
        if (!current) return current;
        const zone = current.zones[d.id];
        if (!zone) return current;
        const newZoneX = newFrameX - fp.x;
        const newZoneY = newFrameY - fp.y;
        if (newZoneX === zone.x && newZoneY === zone.y) return current;
        return { ...current, zones: { ...current.zones, [d.id]: { ...zone, x: newZoneX, y: newZoneY } } };
      });
      setIsDirty(true);
    };
    const handleMouseUp = () => {
      draggingRef.current = null;
      setIsDragging(false);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleSave = useCallback(async () => {
    if (!editingLayout || !activeLayout) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await requestJson<Layout>(`${apiBase}/layouts/${editingLayout.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zones: editingLayout.zones }),
      });
      setActiveLayout(updated);
      setEditingLayout(structuredClone(updated));
      setIsDirty(false);
      onLayoutChange?.();
    } catch {
      setError('Error al guardar el layout');
    } finally {
      setSaving(false);
    }
  }, [apiBase, editingLayout, activeLayout]);

  const handleSaveAsNew = useCallback(async () => {
    if (!editingLayout || !saveAsName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await requestJson<Layout>(`${apiBase}/layouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: saveAsName.trim(), zones: editingLayout.zones }),
      });
      await requestJson(`${apiBase}/layouts/game/${encodeURIComponent(gameId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layoutId: created.id }),
      });
      setActiveLayout(created);
      setEditingLayout(structuredClone(created));
      setIsDirty(false);
      setShowSaveAs(false);
      setSaveAsName('');
      await loadLayouts();
      onLayoutChange?.();
    } catch {
      setError('Error al crear el nuevo layout');
    } finally {
      setSaving(false);
    }
  }, [apiBase, editingLayout, gameId, saveAsName, loadLayouts]);

  const handleSwitchLayout = useCallback(async (layoutId: string) => {
    setSaving(true);
    try {
      await requestJson(`${apiBase}/layouts/game/${encodeURIComponent(gameId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layoutId }),
      });
      await loadActiveLayout();
      setIsDirty(false);
      onLayoutChange?.();
    } catch {
      setError('Error al cambiar el layout');
    } finally {
      setSaving(false);
    }
  }, [apiBase, gameId, loadActiveLayout]);

  const overlayIds = useMemo(() => Object.keys(OVERLAY_LABELS), []);
  const zones = editingLayout?.zones ?? {};
  const selectedZone = selectedOverlay ? (zones[selectedOverlay] ?? null) : null;
  const selectedFrame = selectedOverlay && selectedZone ? framePos(selectedOverlay, selectedZone) : null;

  return (
    <div className="flex flex-1 overflow-hidden divide-x divide-white/10">
      {/* ── CANVAS PRINCIPAL ── */}
      <div className="flex-1 overflow-auto flex flex-col items-center justify-center gap-3 bg-[#07070e] p-4">
        {/* Barra superior */}
        <div className="flex items-center gap-3 w-full" style={{ maxWidth: EDITOR_W }}>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-white/15 px-2.5 py-1 text-[10px] text-white/50 transition hover:border-white/30 hover:text-white"
            >
              ← Control
            </button>
          )}
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/35">Editor de Layout</span>
          <span className="font-semibold text-sm text-white">{activeLayout?.name ?? '—'}</span>
          {isDirty && <span className="text-[10px] text-amber-400">● sin guardar</span>}
          {layouts.length > 1 && (
            <select
              className="ml-auto rounded border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-white outline-none"
              onChange={(e) => { void handleSwitchLayout(e.target.value); }}
              value={activeLayout?.id ?? ''}
            >
              {layouts.map((l) => (
                <option key={l.id} value={l.id}>{l.name}{l.isDefault ? ' ★' : ''}</option>
              ))}
            </select>
          )}
        </div>

        {error && (
          <div className="w-full rounded border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-200" style={{ maxWidth: EDITOR_W }}>
            {error}
          </div>
        )}

        {/* Canvas de edición 960×540 */}
        <div
          className="relative overflow-hidden rounded border border-white/15 bg-[#0a0a12] select-none flex-shrink-0"
          style={{ width: EDITOR_W, height: EDITOR_H, cursor: isDragging ? 'grabbing' : 'default' }}
          onClick={() => { if (!isDragging) setSelectedOverlay(null); }}
        >
          {/* Grilla 24×12 — visible a través de los marcos transparentes */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: [
                'linear-gradient(rgba(255,255,255,0.09) 1px, transparent 1px)',
                'linear-gradient(90deg, rgba(255,255,255,0.09) 1px, transparent 1px)',
              ].join(', '),
              backgroundSize: `${EDITOR_W / 24}px ${EDITOR_H / 12}px`,
            }}
          />
          {/* Guías de tercios */}
          <div className="pointer-events-none absolute inset-0">
            {[1, 2].map((i) => (
              <div key={`v${i}`} className="absolute border-l border-dashed border-white/15" style={{ left: (EDITOR_W * i) / 3, top: 0, bottom: 0 }} />
            ))}
            {[1, 2].map((i) => (
              <div key={`h${i}`} className="absolute border-t border-dashed border-white/15" style={{ top: (EDITOR_H * i) / 3, left: 0, right: 0 }} />
            ))}
          </div>
          {/* Safe area (60px) */}
          <div
            className="pointer-events-none absolute border border-dashed border-white/10"
            style={{ left: 60 * SCALE, top: 60 * SCALE, right: 60 * SCALE, bottom: 60 * SCALE }}
          />

          {/* Marcos de overlays — fondo TRANSPARENTE para ver la grilla */}
          {overlayIds.map((oid) => {
            const z = zones[oid];
            if (!z || !z.visible) return null;
            const isSelected = selectedOverlay === oid;
            const color = OVERLAY_COLORS[oid] ?? '#666';
            const fp = OVERLAY_FOOTPRINT[oid] ?? { x: 0, y: 0, width: CANVAS_W, height: CANVAS_H };
            // Posición absoluta del marco en el canvas real (luego escalada al editor)
            const frameX = fp.x + z.x;
            const frameY = fp.y + z.y;
            const isMini = fp.height * SCALE < 20; // marcos muy pequeños
            return (
              <div
                key={oid}
                className="absolute overflow-visible"
                style={{
                  left: frameX * SCALE,
                  top: frameY * SCALE,
                  width: fp.width * SCALE,
                  height: Math.max(fp.height * SCALE, 8), // mínimo visible
                  backgroundColor: isSelected ? `${color}18` : 'transparent',
                  outline: isSelected
                    ? `2px solid #D4AF37`
                    : `1px dashed ${color}cc`,
                  outlineOffset: isSelected ? 0 : -1,
                  zIndex: isSelected ? 20 : 2,
                  cursor: 'grab',
                  boxShadow: isSelected ? `0 0 0 1px rgba(212,175,55,0.35), inset 0 0 0 1px rgba(212,175,55,0.15)` : 'none',
                }}
                onMouseDown={(e) => { handleZoneMouseDown(e, oid, z); }}
                title={`${OVERLAY_LABELS[oid]} — x:${frameX} y:${frameY}`}
              >
                {/* Etiqueta en esquina superior izquierda */}
                <span
                  className="pointer-events-none absolute left-0 top-0 px-1 py-0.5 font-semibold leading-none"
                  style={{
                    fontSize: isMini ? 7 : 9,
                    color: isSelected ? '#D4AF37' : `${color}ff`,
                    background: 'rgba(10,10,18,0.82)',
                    border: `1px solid ${color}55`,
                    borderRadius: 2,
                    whiteSpace: 'nowrap',
                    transform: isMini ? 'translateY(-100%)' : undefined,
                  }}
                >
                  {OVERLAY_LABELS[oid]}
                </span>
                {/* Handle de esquina superior izquierda (arrastre) */}
                <div
                  className="pointer-events-none absolute"
                  style={{
                    left: -3, top: -3, width: 6, height: 6,
                    background: isSelected ? '#D4AF37' : color,
                    borderRadius: 1,
                  }}
                />
              </div>
            );
          })}

          {/* Coordenadas live del marco seleccionado */}
          {selectedFrame && (
            <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/85 px-2 py-1 text-[9px] font-mono text-mineros-gold/80 border border-mineros-gold/20">
              x:{selectedFrame.x} y:{selectedFrame.y} · {selectedFrame.width}×{selectedFrame.height}
            </div>
          )}
        </div>

        {/* Leyenda */}
        <div className="flex items-center gap-4 text-[9px] font-mono text-white/25" style={{ maxWidth: EDITOR_W, width: '100%' }}>
          <span>Canvas 1920×1080 · Grid 24×12 · Escala 1:2</span>
          <span className="border border-dashed border-white/20 px-1.5 py-0.5 text-white/30">safe area</span>
          <span className="ml-auto text-white/35">Arrastra el marco para mover · X/Y = esquina superior izquierda del contenido</span>
        </div>
      </div>

      {/* ── PANEL DERECHO ── */}
      <div className="w-64 flex flex-col overflow-hidden bg-broadcast-black/40">
        <div className="border-b border-white/10 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Overlays</p>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-2 space-y-px">
          {overlayIds.map((oid) => {
            const z = zones[oid] ?? { x: 0, y: 0, width: CANVAS_W, height: CANVAS_H, visible: false };
            const isSelected = selectedOverlay === oid;
            const fp = OVERLAY_FOOTPRINT[oid] ?? { x: 0, y: 0, width: CANVAS_W, height: CANVAS_H };
            const absX = fp.x + z.x;
            const absY = fp.y + z.y;
            return (
              <div
                key={oid}
                className={`flex items-center gap-2 rounded px-2 py-1.5 transition ${isSelected ? 'bg-mineros-gold/15 border border-mineros-gold/30' : 'hover:bg-white/5'}`}
              >
                <span className="h-2 w-2 flex-shrink-0 rounded-sm" style={{ backgroundColor: OVERLAY_COLORS[oid] ?? '#666' }} />
                <button
                  type="button"
                  className="flex-1 min-w-0 text-left"
                  onClick={() => { setSelectedOverlay(isSelected ? null : oid); }}
                >
                  <span className="block truncate text-xs text-white/80">{OVERLAY_LABELS[oid]}</span>
                  {z.visible && (
                    <span className="block text-[9px] font-mono text-white/30">
                      {absX},{absY}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  title={z.visible ? 'Ocultar' : 'Mostrar'}
                  onClick={() => { handleVisibilityChange(oid, !z.visible); }}
                  className={`flex-shrink-0 text-[10px] transition ${z.visible ? 'text-emerald-400 hover:text-red-400' : 'text-white/25 hover:text-white/60'}`}
                >
                  {z.visible ? '●' : '○'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Propiedades de marco seleccionado — solo X/Y (posición esquina sup. izq.) */}
        {selectedOverlay && selectedZone && selectedFrame && (
          <div className="border-t border-white/10 p-3 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-sm flex-shrink-0" style={{ backgroundColor: OVERLAY_COLORS[selectedOverlay] ?? '#666' }} />
              <p className="text-[10px] font-semibold text-mineros-gold truncate">{OVERLAY_LABELS[selectedOverlay]}</p>
            </div>
            <p className="text-[9px] text-white/35">Posición esquina superior izquierda</p>
            <div className="grid grid-cols-2 gap-2">
              {(['x', 'y'] as const).map((axis) => (
                <label key={axis} className="space-y-0.5">
                  <span className="block text-[9px] uppercase tracking-wider text-white/40">{axis.toUpperCase()}</span>
                  <input
                    type="number"
                    min={0}
                    max={axis === 'x' ? CANVAS_W : CANVAS_H}
                    value={axis === 'x' ? selectedFrame.x : selectedFrame.y}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFramePosition(
                        selectedOverlay,
                        axis === 'x' ? val : selectedFrame.x,
                        axis === 'y' ? val : selectedFrame.y,
                      );
                    }}
                    className="w-full rounded border border-white/10 bg-black/40 px-2 py-1 text-xs text-white outline-none focus:border-mineros-gold"
                  />
                </label>
              ))}
            </div>
            <div className="rounded border border-white/8 bg-white/3 px-2 py-1.5 text-[9px] text-white/30 space-y-0.5">
              <div>Ancho: <span className="text-white/50">{selectedFrame.width}px</span></div>
              <div>Alto: <span className="text-white/50">{selectedFrame.height}px</span></div>
            </div>
            {/* Animaciones */}
            {([['animIn', 'Entrada', ['fade_in','slide_up','slide_down','slide_left','slide_right','zoom_in']] as const,
               ['animOut', 'Salida', ['fade_out','slide_up_out','slide_down_out','slide_left_out','slide_right_out','zoom_out']] as const,
            ]).map(([field, label, opts]) => (
              <label key={field} className="space-y-0.5">
                <span className="block text-[9px] uppercase tracking-wider text-white/40">Animación {label}</span>
                <select
                  value={selectedZone[field] ?? ''}
                  onChange={(e) => { handleAnimChange(selectedOverlay, field, e.target.value as never); }}
                  className="w-full rounded border border-white/10 bg-black/40 px-2 py-1 text-xs text-white outline-none focus:border-mineros-gold"
                >
                  <option value="">Default</option>
                  {opts.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
            ))}
            <button
              type="button"
              className="w-full rounded border border-white/10 py-1 text-[9px] text-white/40 transition hover:text-white/70"
              onClick={() => { setFramePosition(selectedOverlay, OVERLAY_FOOTPRINT[selectedOverlay]?.x ?? 0, OVERLAY_FOOTPRINT[selectedOverlay]?.y ?? 0); }}
            >
              Restaurar posición natural
            </button>
          </div>
        )}

        {/* Acciones */}
        <div className="border-t border-white/10 p-3 space-y-2">
          {isDirty ? (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => { activeLayout?.isDefault ? setShowSaveAs(true) : void handleSave(); }}
                className="w-full rounded bg-mineros-red px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Guardando…' : activeLayout?.isDefault ? 'Guardar como…' : 'Guardar cambios'}
              </button>
              <button
                type="button"
                onClick={() => { setEditingLayout(structuredClone(activeLayout)); setIsDirty(false); }}
                className="w-full rounded border border-white/10 py-1.5 text-xs text-white/50 transition hover:text-white"
              >
                Descartar
              </button>
            </>
          ) : (
            <p className="text-center text-[10px] text-white/25">Sin cambios pendientes</p>
          )}
        </div>

        {showSaveAs && (
          <div className="border-t border-white/10 p-3 space-y-2">
            <p className="text-[10px] font-semibold text-mineros-gold">Guardar como nueva versión</p>
            <input
              type="text"
              placeholder="Nombre del layout"
              value={saveAsName}
              onChange={(e) => { setSaveAsName(e.target.value); }}
              className="w-full rounded border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white outline-none focus:border-mineros-gold"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving || !saveAsName.trim()}
                onClick={() => { void handleSaveAsNew(); }}
                className="flex-1 rounded bg-mineros-red px-3 py-1.5 text-xs font-semibold uppercase text-white disabled:opacity-50"
              >
                {saving ? 'Creando…' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={() => { setShowSaveAs(false); setSaveAsName(''); }}
                className="rounded border border-white/10 px-3 py-1.5 text-xs text-white/50"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
