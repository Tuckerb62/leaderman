import { createInitialState } from './seedData.js';

const STORAGE_KEY = 'leaderman.state.v1';
const MAX_SESSIONS = 10;

function normalizeUserState(parsed) {
  const seeded = createInitialState();
  return {
    ...seeded,
    ...parsed,
    schemaVersion: seeded.schemaVersion,
    sources: seeded.sources,
    lessons: seeded.lessons,
    sessions: (parsed.sessions || []).slice(0, MAX_SESSIONS),
    readingProgress: {
      ...seeded.readingProgress,
      ...(parsed.readingProgress || {}),
    },
    reviews: {
      ...seeded.reviews,
      ...(parsed.reviews || {}),
    },
    lessonExpansions: parsed.lessonExpansions || {},
    followedTopics: {
      ...seeded.followedTopics,
      ...(parsed.followedTopics || {}),
    },
    savedItems: {
      ...seeded.savedItems,
      ...(parsed.savedItems || {}),
    },
    dismissedItems: {
      ...seeded.dismissedItems,
      ...(parsed.dismissedItems || {}),
    },
    itemActivity: {
      ...seeded.itemActivity,
      ...(parsed.itemActivity || {}),
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
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    if (![1, 2].includes(parsed?.schemaVersion)) return createInitialState();
    return normalizeUserState(parsed);
  } catch {
    return createInitialState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, sessions: (state.sessions || []).slice(0, MAX_SESSIONS) }));
}

export function exportState(state) {
  const payload = JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `leaderman-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function parseImportedState(text) {
  const parsed = JSON.parse(text);
  if (![1, 2].includes(parsed?.schemaVersion) || !Array.isArray(parsed.lessons)) {
    throw new Error('This does not look like a Leaderman backup.');
  }
  return {
    ...normalizeUserState(parsed),
    exportedAt: undefined,
  };
}
