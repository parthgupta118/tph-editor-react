import type { Doc, Selection } from '../../core/model/types';
import { toJSON } from '../../core/model/serialize';

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

// The model is the source of truth and the DOM is a projection of it. Easier to
// show than to claim, so this panel puts the model next to the editor.
export function Inspector({ doc, selection, open, onToggle }: Props) {
  return (
    <aside className="rounded-xl border border-line bg-surface shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-ink transition-colors duration-140 hover:bg-canvas focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none"
      >
        Model
        <span className="text-xs text-muted">{open ? 'hide' : 'show'}</span>
      </button>

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
