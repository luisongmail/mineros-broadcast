import type { ReactNode } from 'react';

type SlideDrawerProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * Panel que desliza desde la derecha — patrón estándar para edición
 * sobre listas. Cubre solo el panel de datos, no la pantalla completa.
 */
export function SlideDrawer({ open, title, onClose, children }: SlideDrawerProps) {
  return (
    <>
      {/* Overlay semitransparente */}
      {open && (
        <div
          className="absolute inset-0 z-20 bg-black/40"
          onClick={onClose}
        />
      )}

      {/* Panel lateral */}
      <div
        className={`absolute inset-y-0 right-0 z-30 flex w-full max-w-md flex-col border-l border-gray-700 bg-gray-900 shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header del drawer */}
        <div className="flex items-center justify-between border-b border-gray-700 px-5 py-3">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button
            type="button"
            className="rounded-md p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </>
  );
}
