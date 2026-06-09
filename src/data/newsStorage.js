export const NEWS_RETENTION_DAYS = 14;

function union(listA = [], listB = []) {
  return [...new Set([...(listA || []), ...(listB || [])].filter(Boolean))];
}

function latestTimestamp(...values) {
  return values
    .filter(Boolean)
    .sort()
    .at(-1) || null;
}

export function createInitialNewsState() {
  return {
    items: [],
    topicLedger: {},
    expansions: {},
    lastRefreshedAt: null,
    lastRequestedAt: null,
  };
}

function normalizeSources(item) {
  return (item.sources || []).map((source) => ({
    title: source.title,
    url: source.url,
  }));
}

function normalizeNewsItem(item, fallbackUpdatedAt = new Date().toISOString()) {
  return {
    id: item.id,
    topicKey: item.topicKey || item.id,
    title: item.title,
    category: item.category || 'General',
    priority: item.priority || 'worth-scanning',
    whatHappened: item.whatHappened || '',
    whyItMatters: item.whyItMatters || '',
    neutralAnalysis: item.neutralAnalysis || '',
    whatIsKnown: item.whatIsKnown || '',
    whatIsUncertain: item.whatIsUncertain || '',
    whatToWatch: item.whatToWatch || '',
    backgroundContext: item.backgroundContext || '',
    relatedTopics: item.relatedTopics || [],
    entities: item.entities || [],
    eventType: item.eventType || null,
    sourceUrls: union(item.sourceUrls || [], normalizeSources(item).map((source) => source.url)),
    sources: normalizeSources(item),
    status: item.status || 'fresh',
    publishedAt: item.publishedAt || fallbackUpdatedAt,
    updatedAt: item.updatedAt || fallbackUpdatedAt,
  };
}

export function saveNewsItem(newsState, newsId, saved, now = new Date().toISOString()) {
  return {
    ...newsState,
    items: (newsState.items || []).map((item) =>
      item.id === newsId
        ? {
            ...item,
            status: saved ? 'saved' : 'fresh',
            updatedAt: now,
          }
        : item
    ),
  };
}

export function saveNewsExpansion(newsState, newsId, expansion) {
  return {
    ...newsState,
    expansions: {
      ...(newsState.expansions || {}),
      [newsId]: {
        ...(newsState.expansions || {})[newsId],
        ...expansion,
      },
    },
  };
}

export function mergeNewsRefresh(newsState, incomingItems, refreshedAt = new Date().toISOString()) {
  const existingByTopic = new Map((newsState.items || []).map((item) => [item.topicKey || item.id, item]));
  const mergedItems = [...(newsState.items || [])];

  for (const rawItem of incomingItems || []) {
    const incoming = normalizeNewsItem(rawItem, refreshedAt);
    const match = existingByTopic.get(incoming.topicKey);

    if (!match) {
      mergedItems.push(incoming);
      existingByTopic.set(incoming.topicKey, incoming);
      continue;
    }

    const nextItem = {
      ...incoming,
      id: match.status === 'saved' ? match.id : incoming.id,
      status: match.status === 'saved' ? 'saved' : incoming.status,
      sourceUrls: union(match.sourceUrls, incoming.sourceUrls),
      sources: [...new Map([...normalizeSources(match), ...normalizeSources(incoming)].map((source) => [source.url, source])).values()],
      updatedAt: latestTimestamp(match.updatedAt, incoming.updatedAt, refreshedAt),
    };

    const index = mergedItems.findIndex((item) => item.id === match.id);
    mergedItems[index] = nextItem;
    existingByTopic.set(incoming.topicKey, nextItem);
  }

  const topicLedger = { ...(newsState.topicLedger || {}) };
  for (const item of mergedItems) {
    const existing = topicLedger[item.topicKey] || {};
    topicLedger[item.topicKey] = {
      topicKey: item.topicKey,
      category: item.category,
      canonicalTitle: item.title,
      entities: union(existing.entities, item.entities),
      eventType: item.eventType || existing.eventType || null,
      firstSeenAt: existing.firstSeenAt || item.publishedAt || item.updatedAt,
      lastSeenAt: latestTimestamp(existing.lastSeenAt, item.updatedAt, refreshedAt),
      sourceUrls: union(existing.sourceUrls, item.sourceUrls),
      status: item.status,
    };
  }

  return {
    ...newsState,
    items: mergedItems,
    topicLedger,
    lastRefreshedAt: refreshedAt,
    lastRequestedAt: refreshedAt,
  };
}

export function expireNewsItems(newsState, now = new Date().toISOString()) {
  const cutoff = new Date(now).getTime() - NEWS_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const items = (newsState.items || []).filter((item) => {
    if (item.status === 'saved' || item.status === 'archived') return true;
    return new Date(item.updatedAt || item.publishedAt || 0).getTime() >= cutoff;
  });
  const remainingKeys = new Set(items.map((item) => item.topicKey));
  const expansions = Object.fromEntries(
    Object.entries(newsState.expansions || {}).filter(([newsId]) => items.some((item) => item.id === newsId))
  );
  const topicLedger = Object.fromEntries(
    Object.entries(newsState.topicLedger || {}).filter(([topicKey, entry]) => {
      if (remainingKeys.has(topicKey)) return true;
      return entry.status === 'saved' || entry.status === 'archived';
    })
  );

  return {
    ...newsState,
    items,
    expansions,
    topicLedger,
  };
}

export function mergeNewsState(localNews, remoteNews) {
  if (!remoteNews) return localNews;

  const merged = mergeNewsRefresh(localNews || createInitialNewsState(), remoteNews.items || [], remoteNews.lastRefreshedAt || remoteNews.lastRequestedAt || new Date().toISOString());
  return {
    ...merged,
    expansions: {
      ...(localNews?.expansions || {}),
      ...(remoteNews.expansions || {}),
    },
    lastRequestedAt: latestTimestamp(localNews?.lastRequestedAt, remoteNews.lastRequestedAt),
  };
}

export function isNewsRefreshDue(newsState, now = new Date().toISOString()) {
  if (!newsState?.lastRefreshedAt) return true;
  return newsState.lastRefreshedAt.slice(0, 10) !== now.slice(0, 10);
}
