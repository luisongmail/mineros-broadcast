import type { PropsWithChildren } from 'react';

export interface BroadcastShellProps extends PropsWithChildren {
  title?: string;
  subtitle?: string;
}

export function BroadcastShell({
  title = 'Mineros Broadcast',
  subtitle,
  children,
}: BroadcastShellProps) {
  return (
    <section className="mb-shell">
      <header className="mb-shell__header">
        <p className="mb-shell__eyebrow">Club Mineros de Santiago</p>
        <h1 className="mb-shell__title">{title}</h1>
        {subtitle ? <p className="mb-shell__subtitle">{subtitle}</p> : null}
      </header>
      <div className="mb-shell__content">{children}</div>
    </section>
  );
}
