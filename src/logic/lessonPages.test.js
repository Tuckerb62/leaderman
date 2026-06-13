import { describe, expect, it } from 'vitest';
import {
  buildArticlePages,
  buildLessonPages,
  clampPageIndex,
  countWords,
  markdownToBlocks,
  paginateBlocks,
} from './lessonPages.js';

function fakeParagraph(words) {
  return Array.from({ length: words }, (_, index) => `word${index}`).join(' ');
}

// A paragraph made of short sentences so the paginator can split it mid-block.
function fakeSentenceParagraph(sentenceCount, wordsPerSentence = 8) {
  return Array.from({ length: sentenceCount }, () => `${fakeParagraph(wordsPerSentence)}.`).join(' ');
}

describe('lesson pagination', () => {
  it('counts words across whitespace', () => {
    expect(countWords('one  two\nthree')).toBe(3);
    expect(countWords('')).toBe(0);
  });

  it('splits markdown into blocks on blank lines', () => {
    const blocks = markdownToBlocks('## Heading\n\nFirst paragraph.\n\n- a\n- b\n\nSecond paragraph.');
    expect(blocks).toEqual(['## Heading', 'First paragraph.', '- a\n- b', 'Second paragraph.']);
  });

  it('keeps a short lesson on a single page', () => {
    const pages = paginateBlocks([fakeParagraph(120), fakeParagraph(150)]);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toHaveLength(2);
  });

  it('fills pages to about 600 words and keeps every page under the max', () => {
    const blocks = Array.from({ length: 10 }, () => fakeParagraph(220));
    const pages = paginateBlocks(blocks);

    expect(pages.length).toBeGreaterThan(1);
    for (const page of pages) {
      const words = page.reduce((total, block) => total + countWords(block), 0);
      expect(words).toBeLessThanOrEqual(650);
    }
    // No words are lost when packing.
    expect(pages.flat().join(' ').split(/\s+/).filter(Boolean).length).toBe(2200);
  });

  it('splits a long passage across pages instead of overflowing one', () => {
    // ~880 words in a single paragraph; must be divided since that exceeds a page.
    const pages = paginateBlocks([fakeSentenceParagraph(110)]);

    expect(pages.length).toBeGreaterThanOrEqual(2);
    for (const page of pages) {
      const words = page.reduce((total, block) => total + countWords(block), 0);
      expect(words).toBeLessThanOrEqual(650);
    }
  });

  it('does not strand a heading at the bottom of a page', () => {
    const blocks = [fakeParagraph(600), '## The Turning Point', fakeParagraph(600)];
    const pages = paginateBlocks(blocks);

    expect(pages).toHaveLength(2);
    expect(pages[1][0]).toBe('## The Turning Point');
  });

  it('folds a tiny final page into the previous one', () => {
    // 76 short sentences (~608 words): packing leaves an ~8-word tail that folds back.
    const pages = paginateBlocks([fakeSentenceParagraph(76)]);

    expect(pages).toHaveLength(1);
    const lastWords = pages[0].reduce((total, block) => total + countWords(block), 0);
    expect(lastWords).toBeGreaterThanOrEqual(120);
  });

  it('builds lesson pages from seeded article paragraphs', () => {
    const pages = buildLessonPages({ articleParagraphs: ['First paragraph.', 'Second paragraph.'] });
    expect(pages).toEqual([['First paragraph.', 'Second paragraph.']]);
  });

  it('prefers the expanded markdown draft when present', () => {
    const pages = buildLessonPages(
      { articleParagraphs: ['Seed paragraph.'] },
      { markdown: 'Expanded opening.\n\nExpanded body.' },
    );
    expect(pages).toEqual([['Expanded opening.', 'Expanded body.']]);
  });

  it('builds article pages from summary plus body markdown', () => {
    const pages = buildArticlePages({ summary: 'A short summary.', bodyMarkdown: 'Body paragraph.' });
    expect(pages).toEqual([['A short summary.', 'Body paragraph.']]);
  });

  it('clamps page positions into range', () => {
    const pages = [['a'], ['b']];
    expect(clampPageIndex(pages, -2)).toBe(0);
    expect(clampPageIndex(pages, 9)).toBe(1);
    expect(clampPageIndex([], 3)).toBe(0);
    expect(clampPageIndex(pages, undefined)).toBe(0);
  });
});
