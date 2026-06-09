import { describe, expect, it } from 'vitest';
import {
  canonicalItemKey,
  canonicalLessonDomain,
  canonicalNewsItem,
  canonicalLessonItem,
  parseCanonicalItemKey,
} from './itemIdentity.js';

describe('item identity helpers', () => {
  it('maps novel lessons to the novels domain', () => {
    const lesson = {
      id: 'lesson-summary-way-kings',
      title: 'The Way of Kings',
      summaryKind: 'Novel',
      domain: 'Novel Summaries',
    };

    expect(canonicalLessonDomain(lesson)).toBe('novels');
    expect(canonicalLessonItem(lesson)).toMatchObject({
      key: 'novels:lesson-summary-way-kings',
      domain: 'novels',
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

  it('parses canonical item keys', () => {
    expect(parseCanonicalItemKey('news:story-1')).toEqual({
      domain: 'news',
      itemId: 'story-1',
    });
  });
});
