import { articleBySlug } from '../data/articleCatalog.js';
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

  if (domain === 'article') {
    const article = articleBySlug[itemId] || null;
    return {
      view: 'article',
      domain,
      articleKey: article?.key || key,
      articleSlug: article?.slug || itemId,
      article,
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
