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
  return 'library';
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

export function canonicalArticleItem(article) {
  const slug = article.slug || parseCanonicalItemKey(article.key).itemId;
  const key = article.key || canonicalItemKey('article', slug);
  return {
    key,
    domain: 'article',
    itemId: slug,
    articleKey: key,
    articleSlug: slug,
    title: article.title,
  };
}
