import { describe, expect, it } from 'vitest';
import {
  canonicalArticleItem,
  canonicalItemKey,
  canonicalLessonDomain,
  canonicalNewsItem,
  canonicalLessonItem,
  parseCanonicalItemKey,
} from './itemIdentity.js';

describe('item identity helpers', () => {
  it('maps seeded lessons to the shared library domain', () => {
    const lesson = {
      id: 'lesson-summary-way-kings',
      title: 'The Way of Kings',
      summaryKind: 'Novel',
      domain: 'Novel Summaries',
    };

    expect(canonicalLessonDomain(lesson)).toBe('library');
    expect(canonicalLessonItem(lesson)).toMatchObject({
      key: 'library:lesson-summary-way-kings',
      domain: 'library',
      itemId: 'lesson-summary-way-kings',
    });
  });

  it('maps non-novel lessons to the library domain', () => {
    const lesson = {
      id: 'lesson-stoic-control',
      title: 'Control What Is Yours',
      domain: 'Philosophy',
    };

    expect(canonicalLessonDomain(lesson)).toBe('library');
    expect(canonicalItemKey('library', lesson.id)).toBe('library:lesson-stoic-control');
  });

  it('builds news items with stable canonical keys', () => {
    const newsItem = {
      id: 'news-romania-election',
      title: 'Election shock',
    };

    expect(canonicalNewsItem(newsItem)).toMatchObject({
      key: 'news:news-romania-election',
      domain: 'news',
      itemId: 'news-romania-election',
    });
  });

  it('builds article items with stable canonical keys', () => {
    const article = {
      key: 'article:leadership-foundations-authority',
      slug: 'leadership-foundations-authority',
      title: 'Authority',
      subject: 'Leadership',
    };

    expect(canonicalArticleItem(article)).toMatchObject({
      key: 'article:leadership-foundations-authority',
      domain: 'article',
      itemId: 'leadership-foundations-authority',
      articleKey: 'article:leadership-foundations-authority',
      articleSlug: 'leadership-foundations-authority',
      title: 'Authority',
    });
    expect(canonicalItemKey('article', article.slug)).toBe('article:leadership-foundations-authority');
  });

  it('parses canonical item keys', () => {
    expect(parseCanonicalItemKey('news:story-1')).toEqual({
      domain: 'news',
      itemId: 'story-1',
    });
  });
});
