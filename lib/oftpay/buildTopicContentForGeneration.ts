import type { OftreviewContentPage } from '@/types/oftreviewContent';

const MAX_CHARS_PER_PAGE = 2000;
const MAX_TOTAL_CHARS = 8000;

export function buildTopicContentForGeneration(
  pages: OftreviewContentPage[],
  topicPages?: number[]
): { text: string; pagesIncluded: number[] } {
  const sorted = [...pages].sort((a, b) => a.page - b.page);
  const topicPageSet = topicPages?.length ? new Set(topicPages) : null;
  const filtered = topicPageSet ? sorted.filter((p) => topicPageSet.has(p.page)) : sorted;

  let text = '';
  const pagesIncluded: number[] = [];

  for (const page of filtered) {
    let content = (page.content ?? '').trim().replace(/\s+/g, ' ');
    if (!content) continue;
    if (content.length > MAX_CHARS_PER_PAGE) {
      content = `${content.slice(0, MAX_CHARS_PER_PAGE)}…`;
    }
    const block = `\n=== PÁGINA ${page.page} ===\n${content}\n`;
    if (text.length + block.length > MAX_TOTAL_CHARS) break;
    text += block;
    pagesIncluded.push(page.page);
  }

  return { text: text.trim(), pagesIncluded };
}
