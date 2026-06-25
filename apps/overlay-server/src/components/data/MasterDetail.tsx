import type { ReactNode } from 'react';

/**
 * Layout master-detail: lista a la izquierda, formulario CRUD a la derecha.
 * Se adapta al espacio disponible en el panel inferior.
 */
export function MasterDetail({
  listTitle,
  listContent,
  detailTitle,
  detailContent,
  listWidth = 'w-64',
}: {
  listTitle?: string;
  listContent: ReactNode;
  detailTitle?: string;
  detailContent: ReactNode;
  listWidth?: string;
}) {
  return (
    <div className="flex h-full gap-0 min-h-0">
      {/* Lista */}
      <div className={`${listWidth} shrink-0 flex flex-col border-r border-white/10 overflow-hidden`}>
        {listTitle && (
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-white/35 border-b border-white/10 shrink-0">
            {listTitle}
          </p>
        )}
        <div className="flex-1 overflow-y-auto">
          {listContent}
        </div>
      </div>

      {/* Detalle / Form */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {detailTitle && (
          <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-white/35 border-b border-white/10 shrink-0">
            {detailTitle}
          </p>
        )}
        <div className="flex-1 overflow-y-auto p-4">
          {detailContent}
        </div>
      </div>
    </div>
  );
}
