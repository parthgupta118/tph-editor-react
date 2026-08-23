import type { Doc, Selection } from '../../core/model/types';
import { toJSON } from '../../core/model/serialize';
import { Switch } from '../ui/Switch';

type Props = {
  doc: Doc;
  selection: Selection | null;
  open: boolean;
  onToggle: () => void;
};

function Section({ title, children }: { title: string; children: string }) {
  return (
    <section className="mb-3 last:mb-0">
      <h2 className="mb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">
        {title}
      </h2>
      <pre className="overflow-x-auto rounded-md bg-canvas p-2 font-mono text-[11px] leading-relaxed text-ink">
        {children}
      </pre>
    </section>
  );
}

export function Inspector({ doc, selection, open, onToggle }: Props) {
  return (
    <aside className="rounded-xl border border-line bg-surface shadow-sm">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-sm font-medium text-ink">Model</span>
        <Switch checked={open} onChange={onToggle} label="Show the document model" />
      </div>

      {open && (
        <div className="max-h-[70dvh] overflow-auto border-t border-line px-3 py-2">
          <Section title="Selection">{selection ? format(selection) : 'none'}</Section>
          <Section title="Document">{format(toJSON(doc))}</Section>
        </div>
      )}
    </aside>
  );
}

const format = (value: unknown) => JSON.stringify(value, null, 2);
