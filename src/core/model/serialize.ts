import type { Doc } from './types';
import { normalizeDoc } from './normalize';

// Bump it if the on-disk shape ever changes, so old documents can be migrated
export const DOC_VERSION = 1;

export type SerializedDoc = {
  version: number;
  blocks: Doc['blocks'];
};

export function toJSON(doc: Doc): SerializedDoc {
  return { version: DOC_VERSION, blocks: doc.blocks };
}

// Normalizes the document on the way in. Input from storage or the network is untrusted, and
// that includes our own earlier output.
export function fromJSON(raw: unknown): Doc {
  if (!isSerializedDoc(raw)) throw new Error('Not a valid document');
  if (raw.version !== DOC_VERSION) {
    throw new Error(`Unsupported document version ${raw.version}`);
  }
  return normalizeDoc({ blocks: raw.blocks });
}

function isSerializedDoc(value: unknown): value is SerializedDoc {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    typeof (value as SerializedDoc).version === 'number' &&
    'blocks' in value &&
    Array.isArray((value as SerializedDoc).blocks)
  );
}
