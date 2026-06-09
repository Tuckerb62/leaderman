import { describe, expect, it } from 'vitest';
import { createInitialState } from '../data/seedData.js';
import { createInitialNewsState } from '../data/newsStorage.js';
import { articles } from '../data/articleCatalog.js';
import { resolveCanonicalItemRoute } from './itemRouting.js';

describe('item routing', () => {
  it('routes library items into the shared lesson detail view', () => {
    const state = createInitialState();
    const lesson = state.lessons.find((item) => item.summaryKind !== 'Novel');

    expect(resolveCanonicalItemRoute(state, `library:${lesson.id}`)).toMatchObject({
      view: 'learn',
      domain: 'library',
      lessonId: lesson.id,
    });
  });

  it('routes news items into the news detail view', () => {
    const state = createInitialState();
    state.news = createInitialNewsState();
    state.news.items = [
      {
        id: 'news-1',
        topicKey: 'markets-fed-cut',
        title: 'Fed holds rates',
        category: 'Markets',
      },
    ];

    expect(resolveCanonicalItemRoute(state, 'news:news-1')).toMatchObject({
      view: 'news',
      domain: 'news',
      newsId: 'news-1',
    });
  });

  it('routes article keys into the clean article detail view', () => {
    const state = createInitialState();
    const article = articles.find((item) => item.subject === 'Leadership');

    expect(resolveCanonicalItemRoute(state, article.key)).toMatchObject({
      view: 'article',
      domain: 'article',
      articleKey: article.key,
      articleSlug: article.slug,
      article,
    });
  });
});
