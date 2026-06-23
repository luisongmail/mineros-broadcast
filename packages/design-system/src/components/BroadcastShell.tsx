import type { PropsWithChildren } from 'react';

export interface BroadcastShellProps extends PropsWithChildren {
  title?: string;
  subtitle?: string;
}

export function BroadcastShell({ children }: BroadcastShellProps) {
  return (
    <section className="mb-shell relative h-[1080px] w-[1920px] overflow-hidden bg-transparent">
      {children}
    </section>
  );
}
