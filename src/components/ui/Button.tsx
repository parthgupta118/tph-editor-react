type Props = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

export function Button({ label, active = false, disabled = false, onClick, children }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      // Without this the editor blurs on mousedown and the selection collapses
      // before the click handler ever runs.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={[
        'inline-flex h-8 min-w-8 items-center justify-center rounded-[--radius-control] px-2',
        'text-sm transition-colors duration-[140ms] ease-[--ease-out]',
        'focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-35',
        active ? 'bg-accent-soft text-accent' : 'text-ink hover:bg-canvas active:bg-line/60',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-line" />;
}
