import { describe, expect, it } from 'vitest';
import { articles } from '../data/articleCatalog.js';
import { createInitialState } from '../data/seedData.js';
import { createInitialNewsState } from '../data/newsStorage.js';
import { buildFeedItems } from './feedAggregation.js';

describe('feed aggregation', () => {
  it('mixes library, novels, and news into one canonical feed', () => {
    const state = createInitialState();
    const novel = state.lessons.find((lesson) => lesson.summaryKind === 'Novel');
    const lesson = state.lessons.find((item) => item.summaryKind !== 'Novel');

    state.followedTopics = {
      stoicism: { topicId: 'stoicism', updatedAt: '2026-06-08T12:00:00.000Z' },
    };
    state.savedItems = {
      [`novels:${novel.id}`]: { itemKey: `novels:${novel.id}`, updatedAt: '2026-06-08T12:00:00.000Z' },
    };
    state.itemActivity = {
      [`library:${lesson.id}`]: {
        itemKey: `library:${lesson.id}`,
        openCount: 3,
        lastOpenedAt: '2026-06-08T12:00:00.000Z',
        updatedAt: '2026-06-08T12:00:00.000Z',
      },
    };
    state.news = {
      ...createInitialNewsState(),
      items: [
        {
          id: 'story-1',
          topicKey: 'technology-ai',
          title: 'Model update',
          category: 'Technology',
          whatHappened: 'A large lab shipped a model update.',
          status: 'fresh',
          updatedAt: '2026-06-08T12:00:00.000Z',
          relatedTopics: ['ai-future'],
        },
      ],
    };

    const feed = buildFeedItems(state, { limit: 12, now: '2026-06-08T12:00:00.000Z' });
    const domains = new Set(feed.map((item) => item.domain));

    expect(domains.has('article')).toBe(true);
    expect(domains.has('library')).toBe(true);
    expect(domains.has('novels')).toBe(true);
    expect(domains.has('news')).toBe(true);
    expect(feed.every((item) => typeof item.reason === 'string' && item.reason.length > 0)).toBe(true);
  });

  it('includes markdown article cards with article keys, progress, and saved state', () => {
    const state = createInitialState();
    const articleKey = 'article:leadership-leadership-foundations-core-leadership-concepts-who-gets-to-give-orders-understanding-authority-in-leadership';
    state.savedItems = {
      [articleKey]: {
        itemKey: articleKey,
        subjectIds: ['leadership'],
        updatedAt: '2026-06-09T12:00:00.000Z',
      },
    };
    state.completedArticlesByKey = Object.fromEntries(articles
      .filter((article) => article.subjectId === 'leadership')
      .map((article) => [article.key, {
        articleKey: article.key,
        completed: true,
        completedAt: '2026-06-09T12:00:00.000Z',
        updatedAt: '2026-06-09T12:00:00.000Z',
      }]));

    const feed = buildFeedItems(state, { limit: 20, now: '2026-06-09T12:00:00.000Z' });
    const articleItem = feed.find((item) => item.key === articleKey);

    expect(articleItem).toMatchObject({
      id: articleKey,
      type: 'article',
      articleKey,
      domain: 'article',
      subjectId: 'leadership',
      subject: 'Leadership',
      title: 'Who Gets to Give Orders? Understanding Authority in Leadership',
      articleType: 'standard',
      completed: true,
      saved: true,
    });
    expect(articleItem.hierarchyPath).toEqual(['Leadership', 'Leadership Foundations', 'Core Leadership Concepts']);
    expect(articleItem.progressContext.subjectProgress).toBeGreaterThan(0);
  });

  it('filters dismissed items out of the feed', () => {
    const state = createInitialState();
    const lesson = state.lessons.find((item) => item.summaryKind !== 'Novel');
    state.dismissedItems = {
      [`library:${lesson.id}`]: {
        itemKey: `library:${lesson.id}`,
        updatedAt: '2026-06-08T12:00:00.000Z',
      },
    };

    const feed = buildFeedItems(state, { limit: 10, now: '2026-06-08T12:00:00.000Z' });

    expect(feed.some((item) => item.key === `library:${lesson.id}`)).toBe(false);
  });

  it('does not promote an item from preview-only activity', () => {
    const baselineState = createInitialState();
    const baselineFeed = buildFeedItems(baselineState, { limit: 100, now: '2026-06-08T12:00:00.000Z' });
    const previewedItem = baselineFeed[Math.min(5, baselineFeed.length - 1)];

    const state = createInitialState();
    state.itemActivity = {
      [previewedItem.key]: {
        itemKey: previewedItem.key,
        previewCount: 1,
        lastPreviewedAt: '2026-06-08T12:00:00.000Z',
        updatedAt: '2026-06-08T12:00:00.000Z',
      },
    };

    const feed = buildFeedItems(state, { limit: 100, now: '2026-06-08T12:00:00.000Z' });

    expect(feed.map((item) => item.key)).toEqual(baselineFeed.map((item) => item.key));
  });
});
