import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Doc, Selection } from '../../core/model/types';
import { selectionRects } from '../../dom/selection';
import LinkPopover from './LinkPopover';

type Props = {
  doc: Doc;
  selection: Selection | null;
  href: string;
  onApply: (href: string) => void;
  onClose: () => void;
};

// Portalled to the body: rendered inside the editor these would count as siblings
// and the block spacing rule would shift the content. Positions itself against the
// selection, so it follows the text rather than the toolbar.
export default function LinkEditor({ doc, selection, href, onApply, onClose }: Props) {
  const rects = useMemo(() => {
    // Geometry depends on the rendered document, so `doc` is a real dependency
    // even though selectionRects reads it from the DOM rather than from here.
    void doc;
    return selection ? selectionRects(selection) : [];
  }, [selection, doc]);

  // Positions are measured once against the viewport, so scrolling would leave the
  // popover floating away from its text. We Dismiss it instead of chasing it.
  useEffect(() => {
    window.addEventListener('scroll', onClose, true);
    return () => window.removeEventListener('scroll', onClose, true);
  }, [onClose]);

  const anchor = rects[0];
  if (!anchor) return null;

  return createPortal(
    <>
      {/* The browser stops painting the selection once focus moves to the input. */}
      {rects.map((rect, i) => (
        <span
          key={i}
          aria-hidden
          className="animate-highlight-in pointer-events-none fixed z-40 rounded-[2px] bg-accent/25"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
        />
      ))}
      <div
        className="animate-pop-in fixed z-50"
        style={{ top: anchor.bottom + 8, left: anchor.left }}
      >
        <LinkPopover href={href} onApply={onApply} onClose={onClose} />
      </div>
    </>,
    document.body,
  );
}
