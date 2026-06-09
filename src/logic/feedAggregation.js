import { articles, humanizeLiteratureLabel } from '../data/articleCatalog.js';
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

function addTopicWeight(map, topicIds = [], amount = 0) {
  for (const topicId of topicIds) {
    if (!topicId) continue;
    map[topicId] = (map[topicId] || 0) + amount;
  }
}

function buildTopicSignals(state) {
  const followed = {};
  const saved = {};
  const opened = {};

  for (const topicId of Object.keys(state.followedTopics || {})) {
    followed[topicId] = (followed[topicId] || 0) + 1;
  }

  for (const item of Object.values(state.savedItems || {})) {
    addTopicWeight(saved, item.topicIds || item.subjectIds || [], 1);
  }

  for (const activity of Object.values(state.itemActivity || {})) {
    const openCount = activity?.openCount || 0;
    if (!openCount) continue;
    addTopicWeight(opened, activity.topicIds || activity.subjectIds || [], openCount);
  }

  return { followed, saved, opened };
}

function bucketReason(item, state) {
  if (item.mixBucket === 'random') {
    return 'A random pick to keep the feed from narrowing too quickly';
  }
  if (item.mixBucket === 'unexplored') {
    return 'A branch you have not opened much yet';
  }
  if (item.directSignals > 0) {
    return directReason(item, state);
  }
  return coldStartReason(item);
}

function takeUniqueFromPool(target, seen, pool, count, mixBucket) {
  for (const item of pool) {
    if (target.length >= count) return;
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    target.push({
      ...item,
      mixBucket,
    });
  }
}

function ensureDomainCoverage(items, allRanked, limit) {
  const requiredDomains = ['article', 'library', 'news']
    .filter((domain) => allRanked.some((item) => item.domain === domain));
  const withCoverage = [...items];
  const seen = new Set(withCoverage.map((item) => item.key));

  for (const domain of requiredDomains) {
    if (withCoverage.some((item) => item.domain === domain)) continue;
    const replacement = allRanked.find((item) => item.domain === domain && !seen.has(item.key));
    if (!replacement) continue;
    if (withCoverage.length >= limit) {
      withCoverage.pop();
    }
    withCoverage.push({
      ...replacement,
      mixBucket: replacement.directSignals > 0 ? 'personalized' : 'cold',
    });
    seen.add(replacement.key);
  }

  return withCoverage;
}

function balanceNeutralSubjects(items, allRanked, limit) {
  const maxPerSubject = Math.max(3, Math.ceil(limit * 0.25));
  const maxNeutralLiterature = Math.max(2, Math.ceil(limit * 0.2));
  const counts = new Map();
  let neutralLiteratureCount = 0;
  const balanced = [];
  const seen = new Set();

  function subjectKey(item) {
    return item.subjectId || item.subjectTitle || item.domain;
  }

  function isLiterature(item) {
    return item.articleType === 'literature' || item.subjectId === 'literature' || item.subjectTitle === 'Literature';
  }

  function canTake(item) {
    if (item.directSignals > 0) return true;
    if (isLiterature(item) && neutralLiteratureCount >= maxNeutralLiterature) return false;
    return (counts.get(subjectKey(item)) || 0) < maxPerSubject;
  }

  function take(item) {
    balanced.push(item);
    seen.add(item.key);
    counts.set(subjectKey(item), (counts.get(subjectKey(item)) || 0) + 1);
    if (item.directSignals === 0 && isLiterature(item)) neutralLiteratureCount += 1;
  }

  for (const item of items) {
    if (seen.has(item.key) || !canTake(item)) continue;
    take(item);
    if (balanced.length >= limit) return balanced;
  }

  for (const item of allRanked) {
    if (seen.has(item.key) || !canTake(item)) continue;
    take({
      ...item,
      mixBucket: item.directSignals > 0 ? 'personalized' : 'cold',
    });
    if (balanced.length >= limit) return balanced;
  }

  return balanced;
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
  return 'Because this matches your active study map';
}

function coldStartReason(item) {
  if (item.domain === 'news') return 'Fresh briefing for tonight';
  return `A high-signal ${item.subjectTitle || 'study'} item to start with`;
}

function lessonFeedEntry(lesson, domain) {
  const topics = describeLessonTopics(lesson);
  const subjectTitle = topics[0]?.subjectId ? topics[0].subjectId.replace(/-/g, ' ') : lesson.domain;
  return {
    ...canonicalLessonItem({
      ...lesson,
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

function literatureBookGroupKey(article) {
  return article.hierarchyPath.join('|');
}

function bookPathLabel(article) {
  const path = article.hierarchyPath.slice(1, -1).filter(Boolean);
  if (path[0]?.toLowerCase().includes('chapter-by-chapter')) {
    return path.slice(1).join(': ');
  }
  return path.join(': ');
}

function literatureFeedDisplayTitle(fullTitle = '', bookTitle = '') {
  let label = String(fullTitle || '').trim();
  if (bookTitle && label.startsWith(`${bookTitle}: `)) {
    label = label.slice(bookTitle.length + 2).trim();
  }
  label = label.replace(/^(?:Book|Part)\s+.+?:\s*/i, '').trim();
  return humanizeLiteratureLabel(label);
}

function literatureFeedEntry(chapters, state, progressMaps) {
  const bookTitle = chapters[0]?.hierarchyPath.at(-1) || chapters[0]?.title || 'Literature';
  const completedChapters = chapters.filter((chapter) => Boolean(state.completedArticlesByKey?.[chapter.key]?.completed));
  const nextUnreadChapter = chapters.find((chapter) => !state.completedArticlesByKey?.[chapter.key]?.completed) || null;
  const fullyCompleted = completedChapters.length === chapters.length;
  const targetArticle = nextUnreadChapter || chapters[chapters.length - 1];
  const unreadBook = completedChapters.length === 0;
  const saved = chapters.some((chapter) => Boolean(state.savedItems?.[chapter.key]));
  const displayTitle = literatureFeedDisplayTitle(targetArticle.title, bookTitle);

  return {
    ...canonicalArticleItem(targetArticle),
    id: targetArticle.key,
    type: 'article',
    articleKey: targetArticle.key,
    article: targetArticle,
    subjectId: targetArticle.subjectId,
    subjectIds: [targetArticle.subjectId],
    subject: targetArticle.subject,
    subjectTitle: targetArticle.subject,
    title: unreadBook ? bookTitle : displayTitle,
    summary: unreadBook
      ? `Begin with ${displayTitle}.`
      : fullyCompleted
        ? `Completed through ${displayTitle}.`
        : `Next up: ${displayTitle}.`,
    hierarchyPath: targetArticle.hierarchyPath,
    articleType: targetArticle.articleType,
    completed: fullyCompleted,
    saved,
    topicIds: [targetArticle.subjectId, targetArticle.topicId, targetArticle.subtopicId, targetArticle.subsubtopicId].filter(Boolean),
    progressContext: {
      ...progressContextForFeedArticle(targetArticle, progressMaps),
      completedChapters: completedChapters.length,
      totalChapters: chapters.length,
    },
    sortDate: targetArticle.slug,
    literatureFeedMode: unreadBook ? 'book' : 'chapter',
    literatureBookTitle: bookTitle,
    pathLabel: unreadBook ? bookPathLabel(targetArticle) : undefined,
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
  const standardArticleItems = articles
    .filter((article) => article.articleType !== 'literature')
    .map((article) => articleFeedEntry(article, state, articleProgressMaps));
  const literatureGroups = new Map();
  for (const article of articles.filter((entry) => entry.articleType === 'literature')) {
    const groupKey = literatureBookGroupKey(article);
    const existing = literatureGroups.get(groupKey) || [];
    existing.push(article);
    literatureGroups.set(groupKey, existing);
  }
  const literatureItems = [...literatureGroups.values()].map((chapters) => literatureFeedEntry(chapters, state, articleProgressMaps));
  const articleItems = [...standardArticleItems, ...literatureItems];
  const libraryItems = buildLibraryLessonIndex(state.lessons).map((lesson) => lessonFeedEntry(lesson, 'library'));
  const newsItems = (state.news?.items || []).map(newsFeedEntry);
  const dismissed = new Set(Object.keys(state.dismissedItems || {}));
  const topicSignals = buildTopicSignals(state);

  const scored = [...articleItems, ...libraryItems, ...newsItems]
    .filter((item) => !dismissed.has(item.key))
    .map((item) => {
      const activity = state.itemActivity?.[item.key];
      const openCount = activity?.openCount || 0;
      const followedScore = (item.topicIds || []).reduce((sum, topicId) => sum + (topicSignals.followed[topicId] || 0), 0);
      const savedTopicScore = (item.topicIds || []).reduce((sum, topicId) => sum + (topicSignals.saved[topicId] || 0), 0);
      const topicClickScore = (item.topicIds || []).reduce((sum, topicId) => sum + (topicSignals.opened[topicId] || 0), 0);
      const saved = Boolean(state.savedItems?.[item.key]);
      const hasFollowMatch = followedScore > 0;
      const hasTopicClickMatch = topicClickScore > 0;
      const directSignals = [
        saved,
        hasFollowMatch,
        Boolean(openCount),
        hasTopicClickMatch,
      ].filter(Boolean).length;
      const score = (saved ? 140 : 0)
        + openCount * 24
        + topicClickScore * 10
        + followedScore * 30
        + savedTopicScore * 16
        + (item.domain === 'news' ? 50 : 0)
        + stableHash(`${item.key}-${now.slice(0, 10)}`) / 1000;
      const randomScore = stableHash(`random:${now.slice(0, 10)}:${item.key}`);
      const unexplored = openCount === 0 && topicClickScore === 0 && !saved;
      return {
        ...item,
        directSignals,
        score,
        openCount,
        followedScore,
        topicClickScore,
        randomScore,
        unexploredScore: (unexplored ? 100 : 0)
          + (hasFollowMatch ? 8 : 0)
          + stableHash(`unexplored:${now.slice(0, 10)}:${item.key}`) / 1000,
        unexplored,
      };
    });

  const personalized = scored
    .filter((item) => item.directSignals > 0)
    .sort((left, right) => right.score - left.score);
  const random = [...scored].sort((left, right) => right.randomScore - left.randomScore);
  const unexplored = scored
    .filter((item) => item.unexplored)
    .sort((left, right) => right.unexploredScore - left.unexploredScore);
  const allRanked = [...scored].sort((left, right) => right.score - left.score);

  const randomTarget = Math.max(1, Math.round(limit * 0.25));
  const unexploredTarget = Math.max(1, Math.round(limit * 0.1));
  const personalizedTarget = Math.max(1, limit - randomTarget - unexploredTarget);
  const feedMix = [];
  const seen = new Set();
  const basePersonalizedPool = personalized.length > 0 ? personalized : allRanked;

  takeUniqueFromPool(feedMix, seen, basePersonalizedPool, personalizedTarget, 'personalized');
  takeUniqueFromPool(feedMix, seen, random, personalizedTarget + randomTarget, 'random');
  takeUniqueFromPool(feedMix, seen, unexplored, personalizedTarget + randomTarget + unexploredTarget, 'unexplored');
  takeUniqueFromPool(feedMix, seen, basePersonalizedPool, limit, 'personalized');
  takeUniqueFromPool(feedMix, seen, allRanked, limit, 'cold');

  const feed = balanceNeutralSubjects(interleaveDomains(ensureDomainCoverage(feedMix, allRanked, limit)), allRanked, limit)
    .slice(0, limit)
    .map((item) => ({
      ...item,
      reason: bucketReason(item, state),
    }));

  if (feed.length > 0) return feed;

  return interleaveDomains([...articleItems, ...libraryItems, ...newsItems])
    .slice(0, limit)
    .map((item) => ({
      ...item,
      reason: coldStartReason(item),
    }));
}
