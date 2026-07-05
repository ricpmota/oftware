import type { OftreviewContentPage } from '@/types/oftreviewContent';

const MAX_CHARS_PER_PAGE = 2000;
const MAX_TOTAL_CHARS = 90000;

export function buildApostilaContentForMapping(
  pages: OftreviewContentPage[],
  options?: { maxTotalChars?: number }
): {
  text: string;
  pagesIncluded: number;
  truncated: boolean;
} {
  const maxTotal = options?.maxTotalChars ?? MAX_TOTAL_CHARS;
  const sorted = [...pages].sort((a, b) => a.page - b.page);
  let text = '';
  let truncated = false;
  let pagesIncluded = 0;

  for (const page of sorted) {
    let content = (page.content ?? '').trim().replace(/\s+/g, ' ');
    if (content.length > MAX_CHARS_PER_PAGE) {
      content = `${content.slice(0, MAX_CHARS_PER_PAGE)}…`;
      truncated = true;
    }
    const block = `\n=== PÁGINA ${page.page} ===\n${content}\n`;
    if (text.length + block.length > maxTotal) {
      truncated = true;
      break;
    }
    text += block;
    pagesIncluded += 1;
  }

  return { text: text.trim(), pagesIncluded, truncated };
}
