import { loadAiChat } from './aiChatStorage.js';
import { createInitialState } from './seedData.js';
import { trimAiChatMessages, trimSessions } from './stateLimits.js';

const STORAGE_KEY = 'leaderman.state.v1';

function validLessonIdSet(seeded) {
  return new Set((seeded.lessons || []).map((lesson) => lesson.id));
}

function isArticleKey(key = '') {
  return String(key).startsWith('article:');
}

function isLegacyNovelItemKey(key = '') {
  return String(key).startsWith('novels:');
}

function isValidLessonKey(key = '', lessonIds) {
  return lessonIds.has(String(key));
}

function filterMappedRecord(record = {}, predicate) {
  return Object.fromEntries(Object.entries(record).filter(([key, value]) => predicate(key, value)));
}

function filterLessonExpansions(expansions = {}, lessonIds) {
  return filterMappedRecord(expansions, (key, value) => {
    const lessonId = value?.lessonId || key.split(':')[1];
    return lessonIds.has(lessonId);
  });
}

function filterSavedLikeRecord(record = {}, lessonIds) {
  return filterMappedRecord(record, (key) => {
    if (isLegacyNovelItemKey(key)) return false;
    if (isArticleKey(key) || String(key).startsWith('news:')) return true;
    if (String(key).startsWith('library:')) return lessonIds.has(String(key).slice('library:'.length));
    return true;
  });
}

function filterNotesLikeRecord(record = {}, lessonIds) {
  return filterMappedRecord(record, (key) => isArticleKey(key) || lessonIds.has(String(key)));
}

function filterReflections(reflections = [], lessonIds) {
  return reflections.filter((item) => isArticleKey(item.lessonId) || lessonIds.has(item.lessonId));
}

function filterSessions(sessions = [], lessonIds) {
  return sessions
    .map((session) => ({
      ...session,
      lessonIds: (session.lessonIds || []).filter((lessonId) => lessonIds.has(lessonId)),
    }))
    .filter((session) => (session.lessonIds || []).length > 0);
}

function normalizeUserState(parsed) {
  const seeded = createInitialState();
  const lessonIds = validLessonIdSet(seeded);
  return {
    ...seeded,
    ...parsed,
    schemaVersion: seeded.schemaVersion,
    sources: seeded.sources,
    lessons: seeded.lessons,
    sessions: filterSessions(trimSessions(parsed.sessions || []), lessonIds),
    reflections: filterReflections(parsed.reflections || [], lessonIds),
    readingProgress: {
      ...seeded.readingProgress,
      ...filterMappedRecord(parsed.readingProgress || {}, (key, value) => lessonIds.has(value?.lessonId || key)),
    },
    reviews: {
      ...seeded.reviews,
      ...filterMappedRecord(parsed.reviews || {}, (key) => lessonIds.has(key)),
    },
    notes: {
      ...seeded.notes,
      ...filterNotesLikeRecord(parsed.notes || {}, lessonIds),
    },
    noteUpdatedAtByKey: {
      ...seeded.noteUpdatedAtByKey,
      ...filterNotesLikeRecord(parsed.noteUpdatedAtByKey || {}, lessonIds),
    },
    aiChatMessages: Array.isArray(parsed.aiChatMessages)
      ? trimAiChatMessages(parsed.aiChatMessages)
      : loadAiChat(),
    lessonExpansions: filterLessonExpansions(parsed.lessonExpansions || {}, lessonIds),
    completedArticlesByKey: {
      ...seeded.completedArticlesByKey,
      ...(parsed.completedArticlesByKey || {}),
    },
    generatedArticlesByKey: {
      ...seeded.generatedArticlesByKey,
      ...(parsed.generatedArticlesByKey || {}),
    },
    articleTutorThreadsByKey: {
      ...seeded.articleTutorThreadsByKey,
      ...(parsed.articleTutorThreadsByKey || {}),
    },
    followedTopics: {
      ...seeded.followedTopics,
      ...(parsed.followedTopics || {}),
    },
    savedItems: {
      ...seeded.savedItems,
      ...filterSavedLikeRecord(parsed.savedItems || {}, lessonIds),
    },
    dismissedItems: {
      ...seeded.dismissedItems,
      ...filterSavedLikeRecord(parsed.dismissedItems || {}, lessonIds),
    },
    itemActivity: {
      ...seeded.itemActivity,
      ...filterSavedLikeRecord(parsed.itemActivity || {}, lessonIds),
    },
    news: {
      ...seeded.news,
      ...(parsed.news || {}),
      items: parsed.news?.items || seeded.news.items,
      topicLedger: parsed.news?.topicLedger || seeded.news.topicLedger,
      expansions: parsed.news?.expansions || seeded.news.expansions,
    },
    settings: {
      ...seeded.settings,
      ...(parsed.settings || {}),
    },
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeUserState({});
    const parsed = JSON.parse(raw);
    if (![1, 2].includes(parsed?.schemaVersion)) return normalizeUserState({});
    return normalizeUserState(parsed);
  } catch {
    return normalizeUserState({});
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, sessions: trimSessions(state.sessions || []) }));
}

export function exportState(state) {
  const payload = JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `curiosity-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function parseImportedState(text) {
  const parsed = JSON.parse(text);
  if (![1, 2].includes(parsed?.schemaVersion) || !Array.isArray(parsed.lessons)) {
    throw new Error('This does not look like a Curiosity backup.');
  }
  return {
    ...normalizeUserState(parsed),
    exportedAt: undefined,
  };
}
