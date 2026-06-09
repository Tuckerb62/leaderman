import { articles } from '../data/articleCatalog.js';
import { buildLibraryLessonIndex, describeLessonTopics } from '../data/topicBank.js';
import { canonicalArticleItem, canonicalLessonItem, canonicalNewsItem } from './itemIdentity.js';

function stableHash(text) {
  return [...text].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 100000, 7);
}

function interleaveDomains(items) {
  const queue = [...items];
  for (let index = 2; index < queue.length; index += 1) {
    if (queue[index].domain !== queue[index - 1].domain || queue[index].domain !== queue[index - 2].domain) continue;
    const swapIndex = queue.findIndex((item, candidateIndex) => candidateIndex > index && item.domain !== queue[index].domain);
    if (swapIndex !== -1) {
      [queue[index], queue[swapIndex]] = [queue[swapIndex], queue[index]];
    }
  }
  return queue;
}

function topicInterestMap(state) {
  const counts = {};
  for (const topicId of Object.keys(state.followedTopics || {})) {
    counts[topicId] = (counts[topicId] || 0) + 2;
  }
  for (const key of Object.keys(state.savedItems || {})) {
    const activity = state.itemActivity?.[key];
    if (activity?.subjectIds) {
      for (const subjectId of activity.subjectIds) counts[subjectId] = (counts[subjectId] || 0) + 3;
    }
  }
  return counts;
}

function directReason(item, state) {
  const saved = state.savedItems?.[item.key];
  if (saved) {
    return item.subjectTitle ? `Because you saved several ${item.subjectTitle} items` : 'Because you saved this item';
  }

  const followed = item.topicIds?.find((topicId) => state.followedTopics?.[topicId]);
  if (followed) {
    return item.domain === 'news' ? 'New update in a topic you follow' : `Related to the ${followed.replace(/-/g, ' ')} topics you follow`;
  }

  const activity = state.itemActivity?.[item.key];
  if (activity?.openCount) {
    return item.subjectTitle ? `Related to your recent ${item.subjectTitle} activity` : 'Related to your recent reading activity';
  }

  if (item.domain === 'news') return 'Fresh update from your private briefing';
  if (item.domain === 'novels') return 'Because you tend to open reading-driven study items';
  return 'Because this matches your active study map';
}

function coldStartReason(item) {
  if (item.domain === 'news') return 'Fresh briefing for tonight';
  if (item.domain === 'novels') return 'A strong reading shelf item to keep nearby';
  return `A high-signal ${item.subjectTitle || 'study'} item to start with`;
}

function lessonFeedEntry(lesson, domain) {
  const topics = describeLessonTopics(lesson);
  const subjectTitle = topics[0]?.subjectId ? topics[0].subjectId.replace(/-/g, ' ') : lesson.domain;
  return {
    ...canonicalLessonItem({
      ...lesson,
      summaryKind: domain === 'novels' ? 'Novel' : lesson.summaryKind,
    }),
    title: lesson.title,
    lesson,
    subjectIds: topics.map((topic) => topic.subjectId),
    topicIds: [...topics.map((topic) => topic.subjectId), ...topics.flatMap((topic) => topic.subtopicIds)],
    subjectTitle,
    sortDate: lesson.completedAt || lesson.order,
  };
}

function newsFeedEntry(newsItem) {
  return {
    ...canonicalNewsItem(newsItem),
    title: newsItem.title,
    newsItem,
    topicIds: [newsItem.category?.toLowerCase().replace(/\s+/g, '-'), ...(newsItem.relatedTopics || [])],
    subjectTitle: newsItem.category,
    sortDate: newsItem.updatedAt,
  };
}

function emptyProgress() {
  return { completed: 0, total: 0, percent: 0 };
}

function progressPercent(progress) {
  return progress.total ? Math.round((progress.completed / progress.total) * 100) : 0;
}

function buildArticleProgressMaps(state) {
  const maps = {
    subject: new Map(),
    topic: new Map(),
    subtopic: new Map(),
  };

  function bump(map, key, completed) {
    if (!key) return;
    const progress = map.get(key) || { completed: 0, total: 0 };
    progress.total += 1;
    if (completed) progress.completed += 1;
    map.set(key, progress);
  }

  for (const article of articles) {
    const completed = Boolean(state.completedArticlesByKey?.[article.key]?.completed);
    bump(maps.subject, article.subjectId, completed);
    bump(maps.topic, `${article.subjectId}|${article.topicId}`, completed);
    bump(maps.subtopic, `${article.subjectId}|${article.topicId}|${article.subtopicId}`, completed);
  }

  return maps;
}

function progressContextForFeedArticle(article, maps) {
  const subject = maps.subject.get(article.subjectId) || emptyProgress();
  const topic = maps.topic.get(`${article.subjectId}|${article.topicId}`) || emptyProgress();
  const subtopic = maps.subtopic.get(`${article.subjectId}|${article.topicId}|${article.subtopicId}`) || emptyProgress();
  return {
    subjectProgress: progressPercent(subject),
    topicProgress: progressPercent(topic),
    subtopicProgress: progressPercent(subtopic),
  };
}

function articleFeedEntry(article, state, progressMaps) {
  const completed = Boolean(state.completedArticlesByKey?.[article.key]?.completed);
  const saved = Boolean(state.savedItems?.[article.key]);
  const topicIds = [article.subjectId, article.topicId, article.subtopicId, article.subsubtopicId].filter(Boolean);
  return {
    ...canonicalArticleItem(article),
    id: article.key,
    type: 'article',
    articleKey: article.key,
    article,
    subjectId: article.subjectId,
    subjectIds: [article.subjectId],
    subject: article.subject,
    subjectTitle: article.subject,
    title: article.title,
    summary: article.summary,
    hierarchyPath: article.hierarchyPath,
    articleType: article.articleType,
    completed,
    saved,
    topicIds,
    progressContext: progressContextForFeedArticle(article, progressMaps),
    sortDate: article.slug,
  };
}

export function buildFeedItems(state, { limit = 40, now = new Date().toISOString() } = {}) {
  const articleProgressMaps = buildArticleProgressMaps(state);
  const articleItems = articles.map((article) => articleFeedEntry(article, state, articleProgressMaps));
  const libraryItems = buildLibraryLessonIndex(state.lessons).map((lesson) => lessonFeedEntry(lesson, 'library'));
  const novelItems = state.lessons.filter((lesson) => lesson.summaryKind === 'Novel').map((lesson) => lessonFeedEntry(lesson, 'novels'));
  const newsItems = (state.news?.items || []).map(newsFeedEntry);
  const dismissed = new Set(Object.keys(state.dismissedItems || {}));
  const interestMap = topicInterestMap(state);

  const scored = [...articleItems, ...libraryItems, ...novelItems, ...newsItems]
    .filter((item) => !dismissed.has(item.key))
    .map((item) => {
      const activity = state.itemActivity?.[item.key];
      const directSignals = [
        Boolean(state.savedItems?.[item.key]),
        item.topicIds?.some((topicId) => state.followedTopics?.[topicId]),
        Boolean(activity?.openCount),
      ].filter(Boolean).length;
      const interestScore = (item.topicIds || []).reduce((sum, topicId) => sum + (interestMap[topicId] || 0), 0);
      const score = (state.savedItems?.[item.key] ? 120 : 0)
        + (activity?.openCount || 0) * 12
        + interestScore * 10
        + (item.domain === 'news' ? 50 : 0)
        + (item.domain === 'novels' && state.readingProgress?.[item.lesson?.id] ? 40 : 0)
        + stableHash(`${item.key}-${now.slice(0, 10)}`) / 1000;
      return {
        ...item,
        directSignals,
        score,
      };
    });

  const direct = scored
    .filter((item) => item.directSignals > 0)
    .sort((left, right) => right.score - left.score);
  const adjacent = scored
    .filter((item) => item.directSignals === 0)
    .sort((left, right) => right.score - left.score);

  const directTarget = Math.max(1, Math.round(limit * 0.8));
  const feed = interleaveDomains([
    ...direct.slice(0, directTarget),
    ...adjacent.slice(0, Math.max(limit - directTarget, 0)),
  ])
    .slice(0, limit)
    .map((item) => ({
      ...item,
      reason: direct.includes(item) ? directReason(item, state) : coldStartReason(item),
    }));

  if (feed.length > 0) return feed;

  return interleaveDomains([...articleItems, ...libraryItems, ...novelItems, ...newsItems])
    .slice(0, limit)
    .map((item) => ({
      ...item,
      reason: coldStartReason(item),
    }));
}
