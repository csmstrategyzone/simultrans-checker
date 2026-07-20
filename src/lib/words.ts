/** Word count: non-empty whitespace-separated tokens. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export const MAX_WORDS = 300;
