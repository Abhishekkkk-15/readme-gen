export interface ChunkerOptions {
  /**
   * ~6k tokens max per call. We approximate 1 token ~= 4 chars.
   * Default 24k chars.
   */
  maxCharsPerChunk?: number;
  /**
   * Avoid tiny tail chunks.
   */
  minCharsPerChunk?: number;
  /**
   * Prefix each chunk with a header that helps grounding.
   */
  chunkHeader?: string;
}

export interface TextChunk {
  id: string;
  text: string;
  approxTokens: number;
}

function approxTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

/**
 * Intelligently chunk already-extracted evidence blocks (not raw code generation).
 * Keeps blocks intact when possible; falls back to line-splitting for oversized blocks.
 */
export function chunkEvidenceBlocks(blocks: string[], options: ChunkerOptions = {}): TextChunk[] {
  const maxChars = options.maxCharsPerChunk ?? 24_000;
  const minChars = options.minCharsPerChunk ?? Math.floor(maxChars * 0.4);
  const header = options.chunkHeader ? `${options.chunkHeader.trim()}\n\n` : '';

  const normalizedBlocks = blocks
    .map((b) => b.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = header;

  const pushCurrent = () => {
    const text = current.trim();
    if (text.length > 0) chunks.push(text + '\n');
    current = header;
  };

  const pushOversizedBlock = (block: string) => {
    // Split oversized blocks by lines, preserving ordering and some context.
    const lines = block.split('\n');
    let buf = header;
    for (const line of lines) {
      const next = (buf ? buf + '\n' : '') + line;
      if (next.length > maxChars) {
        const trimmed = buf.trim();
        if (trimmed.length > 0) chunks.push(trimmed + '\n');
        buf = header + line;
      } else {
        buf = next;
      }
    }
    const trimmed = buf.trim();
    if (trimmed.length > 0) chunks.push(trimmed + '\n');
  };

  for (const block of normalizedBlocks) {
    if (block.length > maxChars) {
      // Flush anything accumulated so far, then split this block.
      if (current.trim().length > 0) pushCurrent();
      pushOversizedBlock(block);
      continue;
    }

    const candidate = current.trim().length === 0 ? header + block : `${current.trim()}\n\n${block}`;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    // Candidate would overflow.
    pushCurrent();
    current = header + block;
  }

  if (current.trim().length > 0) pushCurrent();

  // Merge last tiny chunk into previous if possible.
  if (chunks.length >= 2) {
    const last = chunks[chunks.length - 1]!;
    const prev = chunks[chunks.length - 2]!;
    if (last.length < minChars && (prev.length + 2 + last.length) <= maxChars) {
      chunks.splice(chunks.length - 2, 2, `${prev.trim()}\n\n${last.trim()}\n`);
    }
  }

  return chunks.map((text, idx) => ({
    id: `chunk_${idx + 1}`,
    text,
    approxTokens: approxTokens(text),
  }));
}

