type ActionButtonTone = 'primary' | 'secondary' | 'danger';
type ActionButtonState = 'enabled' | 'disabled' | 'loading';

type ActionButtonProps = {
  label: string;
  tone?: ActionButtonTone;
  state?: ActionButtonState;
  onClick?: () => void;
};

const TONE_STYLES: Record<ActionButtonTone, string> = {
  primary: 'border-mineros-red bg-mineros-red text-white hover:bg-red-700 hover:border-red-700',
  secondary: 'border-white/15 bg-white/10 text-white hover:border-white/25 hover:bg-white/15',
  danger: 'border-mineros-gold/50 bg-mineros-gold/15 text-mineros-gold hover:border-mineros-gold hover:bg-mineros-gold/20',
};

export function ActionButton({
  label,
  tone = 'secondary',
  state = 'enabled',
  onClick,
}: ActionButtonProps) {
  const isDisabled = state !== 'enabled';

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={onClick}
      className={[
        'inline-flex min-w-[8.5rem] items-center justify-center rounded-md border px-4 py-3',
        'text-xs font-semibold uppercase tracking-[0.18em] shadow-broadcast transition',
        state === 'disabled' ? 'cursor-not-allowed border-white/10 bg-white/5 text-white/35' : TONE_STYLES[tone],
        state === 'loading' ? 'cursor-wait opacity-85' : '',
      ].join(' ')}
    >
      {state === 'loading' ? 'Procesando…' : label}
    </button>
  );
}
