const PAGE_MAX_WORDS = 1000;
const PAGE_SOFT_MIN_WORDS = 500;
const TINY_TAIL_WORDS = 200;

export function countWords(text = '') {
  return String(text).split(/\s+/).filter(Boolean).length;
}

function isHeadingBlock(block = '') {
  return /^#{1,6}\s/.test(block.trim());
}

export function markdownToBlocks(markdown = '') {
  return String(markdown)
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

export function paginateBlocks(blocks = [], { maxWords = PAGE_MAX_WORDS, softMinWords = PAGE_SOFT_MIN_WORDS } = {}) {
  const cleanBlocks = blocks.map((block) => String(block).trim()).filter(Boolean);
  if (cleanBlocks.length === 0) return [];

  const pages = [];
  let currentPage = [];
  let currentWords = 0;

  for (const block of cleanBlocks) {
    const blockWords = countWords(block);
    const wouldOverflow = currentWords + blockWords > maxWords;

    if (currentPage.length > 0 && wouldOverflow && currentWords >= Math.min(softMinWords, maxWords)) {
      pages.push(currentPage);
      currentPage = [];
      currentWords = 0;
    }

    currentPage.push(block);
    currentWords += blockWords;
  }

  if (currentPage.length > 0) pages.push(currentPage);

  // A heading stranded at the bottom of a page belongs with the prose it introduces.
  for (let i = 0; i < pages.length - 1; i += 1) {
    const page = pages[i];
    if (page.length > 1 && isHeadingBlock(page[page.length - 1])) {
      pages[i + 1].unshift(page.pop());
    }
  }

  // A near-empty final page reads as a mistake; fold it back when it fits.
  if (pages.length > 1) {
    const tail = pages[pages.length - 1];
    const tailWords = tail.reduce((total, block) => total + countWords(block), 0);
    const prevWords = pages[pages.length - 2].reduce((total, block) => total + countWords(block), 0);
    if (tailWords < TINY_TAIL_WORDS && prevWords + tailWords <= maxWords + TINY_TAIL_WORDS) {
      pages[pages.length - 2].push(...pages.pop());
    }
  }

  return pages;
}

export function buildLessonPages(lesson, expansion = null) {
  if (expansion?.markdown) {
    return paginateBlocks(markdownToBlocks(expansion.markdown));
  }
  return paginateBlocks(lesson?.articleParagraphs || []);
}

export function buildArticlePages(article, generated = null) {
  if (generated?.articleMarkdown) {
    return paginateBlocks(markdownToBlocks(generated.articleMarkdown));
  }
  const bodyBlocks = markdownToBlocks(article?.bodyMarkdown || '');
  const summary = (article?.summary || '').trim();
  const bodyRepeatsSummary = summary && bodyBlocks.some((block) => block.startsWith(summary.slice(0, 80)));
  const blocks = summary && !bodyRepeatsSummary ? [summary, ...bodyBlocks] : bodyBlocks;
  return paginateBlocks(blocks);
}

export function clampPageIndex(pages, pageIndex = 0) {
  if (!Array.isArray(pages) || pages.length === 0) return 0;
  return Math.max(0, Math.min(pages.length - 1, Number(pageIndex) || 0));
}
