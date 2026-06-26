import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';

type SlideDrawerProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  /** Ref del elemento disparador (la fila seleccionada) para anclar el drawer */
  anchorRef?: React.RefObject<HTMLElement | null>;
  children: ReactNode;
};

/**
 * Panel que desliza desde la derecha, anclado al área visible del viewport.
 * Calcula su posición top a partir del elemento disparador para que el usuario
 * no necesite hacer scroll — el drawer aparece junto a la fila seleccionada.
 */
export function SlideDrawer({ open, title, onClose, anchorRef, children }: SlideDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Calcular top dinámico según la fila disparadora
  useEffect(() => {
    if (!open || !drawerRef.current) return;

    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      // Posicionar el drawer a la altura de la fila, sin salirse del viewport
      const maxTop = window.innerHeight - drawerRef.current.offsetHeight - 8;
      const top = Math.min(Math.max(rect.top, 8), Math.max(maxTop, 8));
      drawerRef.current.style.top = `${top}px`;
      drawerRef.current.style.bottom = 'auto';
    } else {
      // Sin ancla: cubrir viewport completo
      drawerRef.current.style.top = '0';
      drawerRef.current.style.bottom = '0';
    }
  }, [open, anchorRef]);

  return (
    <>
      {/* Overlay fixed sobre el viewport completo */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={onClose}
        />
      )}

      {/* Panel lateral — fixed para mantenerse en el viewport independiente del scroll */}
      <div
        ref={drawerRef}
        className={`fixed right-0 z-50 flex w-full max-w-md flex-col border-l border-gray-700 bg-gray-900 shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ top: 0, bottom: 0 }}
      >
        {/* Header del drawer */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-700 px-5 py-3">
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

        {/* Contenido con scroll interno */}
        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </>
  );
}
