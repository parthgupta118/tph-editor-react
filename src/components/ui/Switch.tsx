type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
};

export default function Switch({ checked, onChange, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-4.5 w-8 shrink-0 items-center rounded-full',
        'transition-colors duration-200 ease-[--ease-smooth]',
        'focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none',
        checked ? 'bg-accent' : 'bg-line',
      ].join(' ')}
    >
      <span
        className={[
          'absolute size-3.5 rounded-full bg-surface shadow-sm',
          // transform only — animating `left` would relayout every frame
          'transition-transform duration-200 ease-[--ease-smooth]',
          checked ? 'translate-x-4' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  );
}
