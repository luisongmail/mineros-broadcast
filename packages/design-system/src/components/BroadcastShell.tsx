import { PropsWithChildren } from 'react';

export interface BroadcastShellProps extends PropsWithChildren {
  title?: string;
  subtitle?: string;
}

export function BroadcastShell({ children }: BroadcastShellProps) {
  return (
    <section
      className="mb-shell"
      style={{
        width: 1920,
        height: 1080,
        position: 'relative',
        background: 'transparent',
        overflow: 'hidden',
      }}
    >
      {children}
    </section>
  );
}
