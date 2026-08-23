import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';

type Props = {
  href: string;
  onApply: (href: string) => void;
  onClose: () => void;
};

export function LinkPopover({ href, onApply, onClose }: Props) {
  const [value, setValue] = useState(href);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  // This input takes focus, so the DOM caret leaves the editor. The model keeps the
  // last selection it saw (see the selectionchange handler in Editor), which is what
  // the link gets applied to.
  return (
    <div
      role="dialog"
      aria-label="Link"
      className="absolute top-full left-2 z-10 mt-1.5 flex items-center gap-1 rounded-[--radius-control] border border-line bg-surface p-1.5 shadow-lg"
    >
      <input
        ref={inputRef}
        type="url"
        placeholder="https://"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onApply(value.trim());
          if (event.key === 'Escape') onClose();
        }}
        className="h-8 w-56 rounded-[calc(var(--radius-control)-2px)] border border-line px-2 text-sm focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none"
      />
      <Button label="Apply link" onClick={() => onApply(value.trim())}>Apply</Button>
      {href !== '' && (
        <Button label="Open link" onClick={() => window.open(href, '_blank', 'noopener,noreferrer')}>
          Open
        </Button>
      )}
      <Button label="Remove link" onClick={() => onApply('')}>Remove</Button>
    </div>
  );
}
