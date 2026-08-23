import { useState } from 'react';
import type { Doc, HeadingLevel } from './core/model/types';
import { useEditor } from './hooks/useEditor';
import { Editor } from './components/Editor';
import { Toolbar } from './components/Toolbar';
import LinkEditor from './components/Toolbar/LinkEditor';
import './styles/app.css';
import { Inspector } from './components/Inspector';

const text = (value: string, marks = {}) => ({
  kind: 'text' as const,
  text: value,
  marks,
});

const initialDoc: Doc = {
  blocks: [
    {
      id: crypto.randomUUID(),
      type: 'heading',
      level: 1,
      children: [text('Rich-text editor core')],
    },
    {
      id: crypto.randomUUID(),
      type: 'paragraph',
      children: [
        text('The document model is the source of truth and the DOM is '),
        text('only a projection', { italic: true }),
        text(' of it. Open the model panel and type to watch it change.'),
      ],
    },
    {
      id: crypto.randomUUID(),
      type: 'paragraph',
      children: [
        text('Try '),
        text('bold', { bold: true }),
        text(', '),
        text('italic', { italic: true }),
        text(', a '),
        text('link', { link: 'https://example.com' }),
        text(', headings, then undo it all.'),
      ],
    },
  ],
};

export default function App() {
  const editor = useEditor(initialDoc);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [linkOpen, setLinkOpen] = useState(false);

  const currentBlock = editor.selection
    ? editor.doc.blocks.find((block) => block.id === editor.selection?.anchor.blockId)
    : undefined;

  const blockType = !currentBlock
    ? null
    : currentBlock.type === 'heading'
      ? (`h${currentBlock.level}` as `h${HeadingLevel}`)
      : ('paragraph' as const);

  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-6 px-5 py-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Rich-text editor core</h1>
        <p className="mt-1 text-sm text-muted">
          React · TypeScript strict · the model is the single source of truth
        </p>
      </header>

      <div className="grid flex-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm transition-shadow duration-200 ease-[--ease-smooth] focus-within:ring-2 focus-within:ring-accent/25">
          <Toolbar
            activeMarks={editor.activeMarks}
            selection={editor.selection}
            blockType={blockType}
            align={currentBlock?.align ?? 'left'}
            canUndo={editor.canUndo}
            canRedo={editor.canRedo}
            run={editor.run}
            undo={editor.undo}
            redo={editor.redo}
            linkOpen={linkOpen}
            onLinkOpenChange={setLinkOpen}
          />
          <Editor
            doc={editor.doc}
            selection={editor.selection}
            run={editor.run}
            setSelection={editor.setSelection}
            onLinkClick={() => setLinkOpen(true)}
            undo={editor.undo}
            redo={editor.redo}
          />
        </section>

        {linkOpen && (
          <LinkEditor
            doc={editor.doc}
            selection={editor.selection}
            href={editor.activeMarks.link ?? ''}
            onApply={(href) => {
              editor.run({ type: 'setLink', href: href === '' ? null : href });
              setLinkOpen(false);
            }}
            onClose={() => setLinkOpen(false)}
          />
        )}

        <Inspector
          doc={editor.doc}
          selection={editor.selection}
          open={inspectorOpen}
          onToggle={() => setInspectorOpen((open) => !open)}
        />
      </div>
    </main>
  );
}
