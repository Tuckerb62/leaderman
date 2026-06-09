import { parseCanonicalItemKey } from './itemIdentity.js';

export function resolveCanonicalItemRoute(state, key) {
  const { domain, itemId } = parseCanonicalItemKey(key);

  if (domain === 'news') {
    const newsItem = (state.news?.items || []).find((item) => item.id === itemId);
    return {
      view: 'news',
      domain,
      newsId: newsItem?.id || itemId,
      newsItem: newsItem || null,
    };
  }

  const lesson = state.lessons.find((item) => item.id === itemId);
  return {
    view: 'learn',
    domain,
    lessonId: lesson?.id || itemId,
    lesson: lesson || null,
  };
}
