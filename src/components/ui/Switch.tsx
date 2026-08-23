type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
};

export function Switch({ checked, onChange, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full',
        'transition-colors duration-[140ms] ease-[--ease-out]',
        'focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none',
        checked ? 'bg-accent' : 'bg-line',
      ].join(' ')}
    >
      <span
        className={[
          'absolute size-[14px] rounded-full bg-surface shadow-sm',
          // transform only — animating `left` would relayout every frame
          'transition-transform duration-[140ms] ease-[--ease-out]',
          checked ? 'translate-x-[16px]' : 'translate-x-[2px]',
        ].join(' ')}
      />
    </button>
  );
}
