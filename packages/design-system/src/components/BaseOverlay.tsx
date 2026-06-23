import type { PropsWithChildren } from 'react';

export interface BaseOverlayProps extends PropsWithChildren {
  className?: string;
}

export function BaseOverlay({ children, className = '' }: BaseOverlayProps) {
  return (
    <div
      className={[
        'pointer-events-none absolute left-0 top-0 h-[1080px] w-[1920px] origin-top-left bg-transparent',
        '[transform:scale(var(--overlay-preview-scale,1))]',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
