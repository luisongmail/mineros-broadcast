import { useEffect, useRef, type ReactNode } from 'react';

export const cardClass = 'rounded-lg border border-gray-700 bg-gray-900';
export const fieldClass = 'w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none transition focus:border-yellow-500';
export const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-widest text-gray-400';
export const tableHeaderClass = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400';
export const tableCellClass = 'px-3 py-2 align-top text-sm text-gray-200';
export const primaryButtonClass = 'rounded-md bg-yellow-500 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50';
export const secondaryButtonClass = 'rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50';
export const dangerButtonClass = 'rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-red-200 transition hover:bg-red-900/60 disabled:cursor-not-allowed disabled:opacity-50';

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
  return <div className="rounded-md border border-dashed border-gray-700 px-4 py-6 text-center text-sm text-gray-400">{message}</div>;
}

export function LoadingState({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-gray-700 bg-gray-900 px-3 py-3 text-sm text-gray-300">
      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-500 border-t-white" />
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
      <div className={`w-full max-w-sm rounded-xl border ${accentBorder[tone]} bg-zinc-900 shadow-2xl mx-4`}>
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
