import { describe, expect, it } from 'vitest';
import { articles } from '../data/articleCatalog.js';
import { createInitialState } from '../data/seedData.js';
import { createInitialNewsState } from '../data/newsStorage.js';
import { buildFeedItems } from './feedAggregation.js';

describe('feed aggregation', () => {
  it('mixes article, library, and news items into one canonical feed', () => {
    const state = createInitialState();
    const lesson = state.lessons.find((item) => item.summaryKind !== 'Novel');

    state.followedTopics = {
      stoicism: { topicId: 'stoicism', updatedAt: '2026-06-08T12:00:00.000Z' },
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
    expect(domains.has('news')).toBe(true);
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

  it('uses followed interests to shape the initial feed mix', () => {
    const state = createInitialState();
    state.followedTopics = {
      history: { topicId: 'history', updatedAt: '2026-06-09T12:00:00.000Z' },
    };

    const feed = buildFeedItems(state, { limit: 20, now: '2026-06-09T12:00:00.000Z' });
    const firstTwelve = feed.slice(0, 12);
    const historyMatches = firstTwelve.filter((item) => item.topicIds?.includes('history')).length;

    expect(historyMatches).toBeGreaterThanOrEqual(6);
  });

  it('keeps the neutral feed from being dominated by literature', () => {
    const state = createInitialState();

    const feed = buildFeedItems(state, { limit: 24, now: '2026-06-09T12:00:00.000Z' });
    const literatureItems = feed.filter((item) => item.subjectId === 'literature' || item.articleType === 'literature');
    const subjectCount = new Set(feed.map((item) => item.subjectId || item.subjectTitle || item.domain).filter(Boolean)).size;

    expect(literatureItems.length).toBeLessThanOrEqual(5);
    expect(subjectCount).toBeGreaterThanOrEqual(5);
  });

  it('keeps random and untouched items in the mix after repeated clicks', () => {
    const state = createInitialState();
    const historyArticles = articles.filter((article) => article.subjectId === 'history').slice(0, 8);
    state.followedTopics = {
      history: { topicId: 'history', updatedAt: '2026-06-09T12:00:00.000Z' },
    };
    state.itemActivity = Object.fromEntries(historyArticles.map((article, index) => [article.key, {
      itemKey: article.key,
      openCount: 6 + index,
      lastOpenedAt: '2026-06-09T12:00:00.000Z',
      updatedAt: '2026-06-09T12:00:00.000Z',
      subjectIds: [article.subjectId],
      topicIds: [article.subjectId, article.topicId, article.subtopicId, article.subsubtopicId].filter(Boolean),
    }]));

    const feed = buildFeedItems(state, { limit: 20, now: '2026-06-09T12:00:00.000Z' });
    const outsideHistory = feed.filter((item) => !item.topicIds?.includes('history'));
    const untouched = feed.filter((item) => (state.itemActivity?.[item.key]?.openCount || 0) === 0);

    expect(outsideHistory.length).toBeGreaterThanOrEqual(4);
    expect(untouched.length).toBeGreaterThanOrEqual(2);
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

  it('suggests one overall literature card for an unread novel', () => {
    const state = createInitialState();
    const literatureArticles = articles.filter((article) => article.articleType === 'literature');
    const bookGroups = new Map();
    for (const article of literatureArticles) {
      const groupKey = article.hierarchyPath.join('|');
      const existing = bookGroups.get(groupKey) || [];
      existing.push(article);
      bookGroups.set(groupKey, existing);
    }
    const multiChapterBook = [...bookGroups.values()].find((group) => group.length > 1);

    const feed = buildFeedItems(state, { limit: 3000, now: '2026-06-09T12:00:00.000Z' });
    const literatureFeedItems = feed.filter((item) => item.articleType === 'literature');
    const unreadBookCard = literatureFeedItems.find((item) => item.articleKey === multiChapterBook[0].key);

    expect(literatureFeedItems).toHaveLength(bookGroups.size);
    expect(unreadBookCard.title).toBe(multiChapterBook[0].hierarchyPath.at(-1));
    expect(unreadBookCard.literatureFeedMode).toBe('book');
    expect(unreadBookCard.summary).toBe('Begin with Chapter 1.');
    expect(unreadBookCard.pathLabel).not.toContain('Chapter-by-Chapter');
  });

  it('suggests the next chapter when a literature book is already in progress', () => {
    const state = createInitialState();
    const literatureArticles = articles.filter((article) => article.articleType === 'literature');
    const bookGroups = new Map();
    for (const article of literatureArticles) {
      const groupKey = article.hierarchyPath.join('|');
      const existing = bookGroups.get(groupKey) || [];
      existing.push(article);
      bookGroups.set(groupKey, existing);
    }
    const multiChapterBook = [...bookGroups.values()].find((group) => group.length > 1);
    const [firstChapter, secondChapter] = multiChapterBook;
    state.completedArticlesByKey = {
      [firstChapter.key]: {
        completed: true,
        completedAt: '2026-06-09T12:00:00.000Z',
        updatedAt: '2026-06-09T12:00:00.000Z',
      },
    };

    const feed = buildFeedItems(state, { limit: 3000, now: '2026-06-09T12:00:00.000Z' });
    const nextChapterCard = feed.find((item) => item.articleKey === secondChapter.key);

    expect(nextChapterCard).toBeTruthy();
    expect(nextChapterCard.title).toBe('Chapter 2');
    expect(nextChapterCard.literatureFeedMode).toBe('chapter');
    expect(nextChapterCard.summary).toBe('Next up: Chapter 2.');
    expect(feed.some((item) => item.articleKey === firstChapter.key && item.title === firstChapter.hierarchyPath.at(-1))).toBe(false);
  });

  it('humanizes archaic literature section labels for display', () => {
    const state = createInitialState();
    const targetArticle = articles.find((article) => article.title.startsWith('A Tale of Two Cities: Book the First'));

    state.completedArticlesByKey = {
      [targetArticle.key]: {
        completed: true,
        completedAt: '2026-06-09T12:00:00.000Z',
        updatedAt: '2026-06-09T12:00:00.000Z',
      },
    };

    const nextArticle = articles.find((article) => article.title.includes('A Tale of Two Cities') && article.title.includes('The Mail'));
    const feed = buildFeedItems(state, { limit: 3000, now: '2026-06-09T12:00:00.000Z' });
    const displayCard = feed.find((item) => item.articleKey === nextArticle.key);

    expect(displayCard.title).toBe('Chapter 2: The Mail');
    expect(displayCard.summary).toBe('Next up: Chapter 2: The Mail.');
    expect(displayCard.title).not.toContain('Book');
  });
});
