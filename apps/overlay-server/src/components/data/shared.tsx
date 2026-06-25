import type { ReactNode } from 'react';

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
