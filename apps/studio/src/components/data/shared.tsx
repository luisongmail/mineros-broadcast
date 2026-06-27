import { useEffect, useRef, useState, type ReactNode } from 'react';

export const cardClass = 'rounded-lg border border-white/10 bg-white/[0.03]';
export const fieldClass = 'w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-mineros-gold focus:bg-white/[0.06]';
export const searchInputClass = 'flex-1 min-w-[140px] rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white outline-none transition placeholder:text-white/25 focus:border-mineros-gold focus:bg-white/[0.06]';
export const filterSelectClass = 'rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white outline-none transition focus:border-mineros-gold appearance-none cursor-pointer';
export const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-widest text-white/40';
export const tableHeaderClass = 'px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-widest text-white/40';
export const tableCellClass = 'px-3 py-2 align-middle text-xs text-white/80';
export const tableClass = 'w-full text-xs';
export const tableBodyClass = 'divide-y divide-white/5';
export const tableRowClass = 'cursor-pointer transition hover:bg-white/[0.04] active:bg-white/[0.07]';
export const selectedRowStyle = {
  boxShadow: 'inset 3px 0 0 #D4AF37',
  backgroundColor: 'rgba(212,175,55,0.06)',
} as const;
export const tableHeadRowClass = 'bg-white/[0.03]';
export const primaryButtonClass = 'rounded-md bg-mineros-gold px-3 py-2 text-xs font-semibold uppercase tracking-wide text-broadcast-black transition hover:bg-mineros-gold/85 disabled:cursor-not-allowed disabled:opacity-50';
export const secondaryButtonClass = 'rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:bg-white/10 hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-50';
export const dangerButtonClass = 'rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-red-300 transition hover:bg-red-500/20 hover:border-red-500/50 disabled:cursor-not-allowed disabled:opacity-50';

// URL base para assets estáticos
const ASSETS_BASE = import.meta.env.DEV ? 'http://localhost:3001/assets' : '/assets';
export function assetUrl(assetId: string): string {
  return `${ASSETS_BASE}/${assetId}`;
}

/** Muestra la imagen del asset o un badge de iniciales como fallback. */
export function AssetImage({
  assetId,
  alt,
  size = 32,
  initials,
  bgColor,
}: {
  assetId?: string | null;
  alt: string;
  size?: number;
  initials?: string;
  bgColor?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (assetId && !failed) {
    return (
      <img
        src={assetUrl(assetId)}
        alt={alt}
        style={{ width: size, height: size }}
        className="shrink-0 rounded object-contain"
        onError={() => setFailed(true)}
      />
    );
  }
  const label = initials ?? alt.slice(0, 2).toUpperCase();
  return (
    <div
      className="shrink-0 rounded flex items-center justify-center font-bold text-white text-[10px]"
      style={{ width: size, height: size, backgroundColor: bgColor ?? 'rgba(255,255,255,0.08)' }}
    >
      {label}
    </div>
  );
}

/** Celda de acciones en fila (eliminar). Detiene propagación de click. */
export function RowDeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
    <td
      className="px-2 py-1 align-middle text-right whitespace-nowrap w-10"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onDelete}
        className="p-1.5 rounded text-white/25 hover:text-red-400 hover:bg-red-400/10 transition"
        title="Eliminar"
      >
        ✕
      </button>
    </td>
  );
}

export function SectionCard({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className={`${cardClass} p-4`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

export function Feedback({ tone, message }: { tone: 'error' | 'info' | 'success'; message: string }) {
  const tones = {
    error: 'border-red-800 bg-red-950/40 text-red-200',
    info: 'border-blue-800 bg-blue-950/40 text-blue-200',
    success: 'border-emerald-800 bg-emerald-950/40 text-emerald-200',
  } as const;

  return <div className={`rounded-md border px-3 py-2 text-xs ${tones[tone]}`}>{message}</div>;
}

export function EmptyState({ message }: { message: string }) {
  return <div className="rounded-md border border-dashed border-white/10 px-4 py-6 text-center text-sm text-white/30">{message}</div>;
}

export function LoadingState({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/40">
      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
      {message}
    </div>
  );
}

// ── ConfirmDialog ─────────────────────────────────────────────────────────────
// Reemplaza window.confirm() y window.alert() con un diálogo consistente.
//
// Uso:
//   const [dialog, setDialog] = useState<DialogState | null>(null);
//
//   // Confirmación destructiva:
//   setDialog({ title: '¿Eliminar?', message: 'Esta acción no se puede deshacer.', tone: 'danger',
//     onConfirm: () => doDelete() });
//
//   // Alerta de error:
//   setDialog({ title: 'Error', message: err.message, tone: 'error' });
//
//   <ConfirmDialog state={dialog} onClose={() => setDialog(null)} />

export type DialogTone = 'danger' | 'error' | 'info' | 'success';

export interface DialogState {
  title: string;
  message: string;
  tone?: DialogTone;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Si no se provee, el diálogo es solo informativo (sin botón Cancelar). */
  onConfirm?: () => void | Promise<void>;
}

interface ConfirmDialogProps {
  state: DialogState | null;
  onClose: () => void;
}

export function ConfirmDialog({ state, onClose }: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Foco automático al botón de confirmación al abrir
  useEffect(() => {
    if (state) setTimeout(() => confirmRef.current?.focus(), 50);
  }, [state]);

  // Cerrar con Escape
  useEffect(() => {
    if (!state) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, onClose]);

  if (!state) return null;

  const tone = state.tone ?? 'info';

  const icons: Record<DialogTone, string> = {
    danger:  '⚠️',
    error:   '✕',
    info:    'ℹ️',
    success: '✓',
  };

  const accentBorder: Record<DialogTone, string> = {
    danger:  'border-red-700',
    error:   'border-red-800',
    info:    'border-blue-700',
    success: 'border-emerald-700',
  };

  const accentTitle: Record<DialogTone, string> = {
    danger:  'text-red-300',
    error:   'text-red-300',
    info:    'text-blue-200',
    success: 'text-emerald-300',
  };

  const confirmBtnClass: Record<DialogTone, string> = {
    danger:  dangerButtonClass,
    error:   dangerButtonClass,
    info:    primaryButtonClass,
    success: primaryButtonClass,
  };

  const isConfirmation = typeof state.onConfirm === 'function';

  async function handleConfirm() {
    if (!state) return;
    await state.onConfirm?.();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div className={`w-full max-w-sm rounded-xl border ${accentBorder[tone]} bg-[#0f1117] shadow-2xl mx-4`}>
        {/* Header */}
        <div className="flex items-start gap-3 p-5 pb-3">
          <span className="text-lg leading-none mt-0.5" aria-hidden="true">{icons[tone]}</span>
          <div>
            <p id="dialog-title" className={`font-semibold text-sm ${accentTitle[tone]}`}>{state.title}</p>
            <p className="mt-1 text-xs text-white/60 leading-relaxed">{state.message}</p>
          </div>
        </div>
        {/* Acciones */}
        <div className="flex justify-end gap-2 px-5 pb-5 pt-2">
          {isConfirmation && (
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={onClose}
            >
              {state.cancelLabel ?? 'Cancelar'}
            </button>
          )}
          <button
            ref={confirmRef}
            type="button"
            className={confirmBtnClass[tone]}
            onClick={isConfirmation ? handleConfirm : onClose}
          >
            {isConfirmation ? (state.confirmLabel ?? 'Confirmar') : 'Aceptar'}
          </button>
        </div>
      </div>
    </div>
  );
}
