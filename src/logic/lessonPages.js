const PAGE_TARGET_WORDS = 600;
const PAGE_MAX_WORDS = 625;
const TINY_TAIL_WORDS = 120;

export function countWords(text = '') {
  return String(text).split(/\s+/).filter(Boolean).length;
}

function isHeadingBlock(block = '') {
  return /^#{1,6}\s/.test(block.trim());
}

function isListBlock(block = '') {
  return /^\s*[-*]\s/.test(block.trim());
}

export function markdownToBlocks(markdown = '') {
  return String(markdown)
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

// Split a paragraph into sentences so a long passage can be divided across pages
// instead of overflowing a single one. Falls back to the whole block when there
// is no sentence punctuation to break on.
function splitSentences(text = '') {
  const matches = String(text).match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g);
  if (!matches) return [String(text).trim()].filter(Boolean);
  return matches.map((sentence) => sentence.trim()).filter(Boolean);
}

export function paginateBlocks(blocks = [], { targetWords = PAGE_TARGET_WORDS, maxWords = PAGE_MAX_WORDS } = {}) {
  const cleanBlocks = blocks.map((block) => String(block).trim()).filter(Boolean);
  if (cleanBlocks.length === 0) return [];

  // Break content into the smallest units we are willing to keep together:
  // headings and list blocks stay whole; prose is split into sentences so a
  // page can be filled to ~targetWords and long passages spill onto more pages.
  const segments = [];
  cleanBlocks.forEach((block, blockIndex) => {
    if (isHeadingBlock(block) || isListBlock(block)) {
      segments.push({ blockIndex, text: block, atomic: true, words: countWords(block) });
      return;
    }
    for (const sentence of splitSentences(block)) {
      segments.push({ blockIndex, text: sentence, atomic: false, words: countWords(sentence) });
    }
  });

  // Pack segments into pages: never push a page past maxWords (unless a single
  // segment is itself larger), and close a page once it reaches targetWords.
  const segmentPages = [];
  let current = [];
  let currentWords = 0;
  function flush() {
    if (current.length) {
      segmentPages.push(current);
      current = [];
      currentWords = 0;
    }
  }
  for (const segment of segments) {
    if (current.length && currentWords + segment.words > maxWords) {
      flush();
    }
    current.push(segment);
    currentWords += segment.words;
    if (currentWords >= targetWords) {
      flush();
    }
  }
  flush();

  // Re-join consecutive sentences from the same source paragraph so each page
  // still renders as paragraphs rather than one-line fragments.
  let pages = segmentPages.map((segs) => {
    const out = [];
    let buffer = [];
    let bufferBlock = null;
    function flushBuffer() {
      if (buffer.length) {
        out.push(buffer.join(' '));
        buffer = [];
        bufferBlock = null;
      }
    }
    for (const segment of segs) {
      if (segment.atomic) {
        flushBuffer();
        out.push(segment.text);
        continue;
      }
      if (segment.blockIndex !== bufferBlock) flushBuffer();
      bufferBlock = segment.blockIndex;
      buffer.push(segment.text);
    }
    flushBuffer();
    return out;
  });

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
