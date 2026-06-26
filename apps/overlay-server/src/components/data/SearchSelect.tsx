import { useEffect, useRef, useState } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Reemplaza <select> con un dropdown buscable y mejor estilo.
 * - Muestra el label del valor seleccionado
 * - Filtra opciones al escribir
 * - Cierra al seleccionar o al perder foco
 */
export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar…',
  disabled = false,
  className = '',
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = options.filter((o) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      o.label.toLowerCase().includes(q) ||
      (o.sublabel?.toLowerCase().includes(q) ?? false)
    );
  });

  // Cierra al hacer click fuera
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  function handleOpen() {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleSelect(opt: SelectOption) {
    onChange(opt.value);
    setOpen(false);
    setQuery('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') setOpen(false);
  }

  const base =
    'relative w-full rounded-md border border-white/10 bg-white/[0.04] text-sm text-white transition focus-within:border-mineros-gold';

  return (
    <div ref={containerRef} className={`${base} ${className}`} onKeyDown={handleKeyDown}>
      {/* Trigger */}
      {!open ? (
        <button
          type="button"
          disabled={disabled}
          onClick={handleOpen}
          className="flex w-full items-center justify-between px-3 py-2 text-left disabled:opacity-40"
        >
          <span className={selected ? 'text-white/90' : 'text-white/25'}>
            {selected ? (
              <>
                {selected.label}
                {selected.sublabel && (
                  <span className="ml-2 text-[10px] text-white/40">{selected.sublabel}</span>
                )}
              </>
            ) : (
              placeholder
            )}
          </span>
          <span className="ml-2 shrink-0 text-white/30">▾</span>
        </button>
      ) : (
        /* Modo búsqueda */
        <input
          ref={inputRef}
          type="text"
          className="w-full bg-transparent px-3 py-2 text-white placeholder-white/25 outline-none"
          placeholder="Buscar…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {/* Dropdown */}
      {open && (
        <ul className="absolute z-50 left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto rounded-md border border-white/10 bg-[#0f1117] shadow-xl">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-white/30">Sin resultados</li>
          ) : (
            filtered.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  onMouseDown={() => handleSelect(opt)}
                  className={`w-full text-left px-3 py-2 text-xs transition hover:bg-white/10 ${
                    opt.value === value ? 'bg-mineros-gold/10 text-mineros-gold' : 'text-white/85'
                  }`}
                >
                  {opt.label}
                  {opt.sublabel && (
                    <span className="ml-2 text-[10px] text-white/40">{opt.sublabel}</span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
