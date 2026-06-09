import { describe, expect, it } from 'vitest';
import {
  createInitialNewsState,
  expireNewsItems,
  isNewsRefreshDue,
  mergeNewsRefresh,
  saveNewsItem,
  saveNewsExpansion,
} from './newsStorage.js';

describe('news storage', () => {
  it('dedupes stories by topic key and preserves saved stories during refresh', () => {
    const initial = createInitialNewsState();
    const saved = saveNewsItem({
      ...initial,
      items: [
        {
          id: 'story-1',
          topicKey: 'fed-rates',
          title: 'Fed holds rates',
          category: 'Markets',
          status: 'saved',
          updatedAt: '2026-06-08T12:00:00.000Z',
          sourceUrls: ['https://example.com/a'],
        },
      ],
    }, 'story-1', true);

    const merged = mergeNewsRefresh(saved, [
      {
        id: 'story-2',
        topicKey: 'fed-rates',
        title: 'Fed holds rates again',
        category: 'Markets',
        whatHappened: 'The central bank held rates steady.',
        sources: [{ title: 'Wire', url: 'https://example.com/b' }],
        sourceUrls: ['https://example.com/b'],
        priority: 'must-read',
        publishedAt: '2026-06-08T13:00:00.000Z',
        updatedAt: '2026-06-08T13:00:00.000Z',
      },
    ], '2026-06-08T13:00:00.000Z');

    expect(merged.items).toHaveLength(1);
    expect(merged.items[0]).toMatchObject({
      id: 'story-1',
      topicKey: 'fed-rates',
      status: 'saved',
    });
    expect(merged.topicLedger['fed-rates'].sourceUrls).toContain('https://example.com/a');
    expect(merged.topicLedger['fed-rates'].sourceUrls).toContain('https://example.com/b');
  });

  it('expires unsaved stories after 14 days', () => {
    const news = {
      ...createInitialNewsState(),
      items: [
        {
          id: 'keep-me',
          topicKey: 'saved-story',
          title: 'Keep me',
          status: 'saved',
          updatedAt: '2026-05-20T12:00:00.000Z',
        },
        {
          id: 'drop-me',
          topicKey: 'old-story',
          title: 'Drop me',
          status: 'fresh',
          updatedAt: '2026-05-20T12:00:00.000Z',
        },
      ],
      topicLedger: {
        'saved-story': {
          topicKey: 'saved-story',
          status: 'saved',
          lastSeenAt: '2026-05-20T12:00:00.000Z',
          sourceUrls: [],
        },
        'old-story': {
          topicKey: 'old-story',
          status: 'fresh',
          lastSeenAt: '2026-05-20T12:00:00.000Z',
          sourceUrls: [],
        },
      },
    };

    const expired = expireNewsItems(news, '2026-06-08T12:00:00.000Z');

    expect(expired.items.map((item) => item.id)).toEqual(['keep-me']);
    expect(expired.topicLedger['saved-story']).toBeTruthy();
    expect(expired.topicLedger['old-story']).toBeUndefined();
  });

  it('stores explicit news expansions separately from compact cards', () => {
    const news = saveNewsExpansion(createInitialNewsState(), 'story-1', {
      markdown: '## Why it matters\nA durable angle.',
      structured: {
        sections: [
          {
            key: 'whyItMatters',
            heading: 'Why it matters',
            kind: 'prose',
            paragraphs: ['A durable angle.'],
            raw: 'A durable angle.',
          },
        ],
      },
      updatedAt: '2026-06-08T15:00:00.000Z',
    });

    expect(news.expansions['story-1'].markdown).toContain('Why it matters');
  });

  it('does not request a second automatic refresh on the same day', () => {
    const news = {
      ...createInitialNewsState(),
      lastRefreshedAt: '2026-06-08T08:00:00.000Z',
    };

    expect(isNewsRefreshDue(news, '2026-06-08T21:00:00.000Z')).toBe(false);
    expect(isNewsRefreshDue(news, '2026-06-09T08:00:00.000Z')).toBe(true);
  });
});
