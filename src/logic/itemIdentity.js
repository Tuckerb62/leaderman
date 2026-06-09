export function canonicalItemKey(domain, itemId) {
  return `${domain}:${itemId}`;
}

export function parseCanonicalItemKey(value) {
  const [domain, ...rest] = String(value || '').split(':');
  return {
    domain,
    itemId: rest.join(':'),
  };
}

export function canonicalLessonDomain(lesson) {
  return lesson?.summaryKind === 'Novel' ? 'novels' : 'library';
}

export function canonicalLessonItem(lesson) {
  const domain = canonicalLessonDomain(lesson);
  return {
    key: canonicalItemKey(domain, lesson.id),
    domain,
    itemId: lesson.id,
    title: lesson.title,
    lessonId: lesson.id,
  };
}

export function canonicalNewsItem(newsItem) {
  return {
    key: canonicalItemKey('news', newsItem.id),
    domain: 'news',
    itemId: newsItem.id,
    newsId: newsItem.id,
    title: newsItem.title,
  };
}
