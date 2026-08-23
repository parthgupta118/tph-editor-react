// `true` rather than `boolean` so there's no such thing as { bold: false }.
export type Marks = { bold?: true; italic?: true; link?: string };

// `kind` isn't needed yet. It's here so mentions/inline images can join the union later without renaming this everywhere.
export type InlineNode = { kind: 'text'; text: string; marks: Marks };

export type HeadingLevel = 1 | 2 | 3;

export type Block =
  | { id: string; type: 'paragraph'; children: InlineNode[] }
  | { id: string; type: 'heading'; level: HeadingLevel; children: InlineNode[] };

export type BlockType = Block['type'];

export type Doc = { blocks: Block[] };

// offset counts characters in the block, not children. See DECISIONS.
export type Position = { blockId: string; offset: number };

// anchor/focus come in drag order, so focus can precede anchor.
export type Selection = { anchor: Position; focus: Position };

export type ToggleableMark = 'bold' | 'italic';

export type Operations =
  | { type: 'insertText'; text: string }
  | { type: 'deleteBackward' }
  | { type: 'deleteForward' }
  | { type: 'splitBlock' }
  | { type: 'toggleMark'; mark: ToggleableMark }
  | { type: 'setLink'; href: string | null }
  | { type: 'setBlockType'; blockType: 'paragraph' }
  | { type: 'setBlockType'; blockType: 'heading'; level: HeadingLevel };

export type EditorState = {
  doc: Doc;
  selection: Selection | null;
  pendingMarks: Marks | null;
};

export function assertNever(value: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
}
