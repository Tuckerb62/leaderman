import { describe, expect, it } from 'vitest';
import { createInitialState } from '../data/seedData.js';
import { createInitialNewsState } from '../data/newsStorage.js';
import { resolveCanonicalItemRoute } from './itemRouting.js';

describe('item routing', () => {
  it('routes library and novels items into the shared lesson detail view', () => {
    const state = createInitialState();
    const novel = state.lessons.find((lesson) => lesson.summaryKind === 'Novel');
    const lesson = state.lessons.find((item) => item.summaryKind !== 'Novel');

    expect(resolveCanonicalItemRoute(state, `library:${lesson.id}`)).toMatchObject({
      view: 'learn',
      domain: 'library',
      lessonId: lesson.id,
    });
    expect(resolveCanonicalItemRoute(state, `novels:${novel.id}`)).toMatchObject({
      view: 'learn',
      domain: 'novels',
      lessonId: novel.id,
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
});
