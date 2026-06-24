import type { PropsWithChildren } from 'react';

const variantClasses = {
  primary: 'border border-white/10 bg-minerosRed/95 text-white',
  secondary: 'border border-white/10 bg-minerosNavy/95 text-white',
  gold: 'border border-minerosGold/20 bg-minerosGold/95 text-broadcastBlack',
} as const;

const sizeClasses = {
  sm: 'px-2 py-1 text-[10px] leading-none',
  md: 'px-3 py-1.5 text-xs leading-none',
} as const;

export interface BadgeProps extends PropsWithChildren {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
}

export function Badge({ children, variant = 'primary', size = 'md' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center justify-center rounded-[4px] font-inter font-semibold uppercase tracking-[0.12em] shadow-broadcast',
        variantClasses[variant],
        sizeClasses[size],
      ].join(' ')}
    >
      {children}
    </span>
  );
}
