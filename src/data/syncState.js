import { createInitialState } from './seedData.js';
import { createInitialNewsState, mergeNewsState } from './newsStorage.js';
import { trimAiChatMessages, trimReflections, trimSessions } from './stateLimits.js';

function latestTimestamp(...values) {
  return values
    .filter(Boolean)
    .sort()
    .at(-1) || null;
}

function reviewTimestamp(review = {}) {
  return latestTimestamp(review.completedAt, review.lastQuestionAt, review.lastReviewedAt);
}

function mergeUpdatedMap(localMap = {}, remoteMap = {}) {
  const keys = new Set([...Object.keys(localMap || {}), ...Object.keys(remoteMap || {})]);
  const merged = {};

  for (const key of keys) {
    const local = localMap[key];
    const remote = remoteMap[key];
    if (!local) {
      merged[key] = remote;
      continue;
    }
    if (!remote) {
      merged[key] = local;
      continue;
    }
    merged[key] = (remote.updatedAt || '') >= (local.updatedAt || '') ? remote : local;
  }

  return merged;
}

function mergeMissingMap(localMap = {}, remoteMap = {}) {
  return {
    ...(remoteMap || {}),
    ...(localMap || {}),
  };
}

function mergeReviews(localReviews = {}, remoteReviews = {}) {
  const merged = { ...localReviews };
  for (const [lessonId, review] of Object.entries(remoteReviews || {})) {
    const current = localReviews[lessonId];
    if (!current || (reviewTimestamp(review) || '') >= (reviewTimestamp(current) || '')) {
      merged[lessonId] = {
        ...current,
        ...review,
      };
    }
  }
  return merged;
}

function mergeSessions(localSessions = [], remoteSessions = []) {
  return trimSessions([...new Map([...localSessions, ...remoteSessions].map((session) => [session.id, session])).values()]
    .sort((left, right) => (right.endedAt || right.startedAt || '').localeCompare(left.endedAt || left.startedAt || '')));
}

function mergeReflections(localReflections = [], remoteReflections = []) {
  return trimReflections([...new Map([...localReflections, ...remoteReflections].map((reflection) => [reflection.id, reflection])).values()]
    .sort((left, right) => (right.createdAt || '').localeCompare(left.createdAt || '')));
}

function mergeAiChatMessages(localMessages = [], remoteMessages = []) {
  return trimAiChatMessages([...new Map([...localMessages, ...remoteMessages].map((message) => [message.id, message])).values()]
    .sort((left, right) => (left.createdAt || '').localeCompare(right.createdAt || '')));
}

function mergeNotes(localNotes = {}, remoteNotes = {}, localUpdatedAtByKey = {}, remoteUpdatedAtByKey = {}) {
  const keys = new Set([
    ...Object.keys(localNotes || {}),
    ...Object.keys(remoteNotes || {}),
    ...Object.keys(localUpdatedAtByKey || {}),
    ...Object.keys(remoteUpdatedAtByKey || {}),
  ]);
  const notes = {};
  const noteUpdatedAtByKey = {};

  for (const key of keys) {
    const localUpdatedAt = localUpdatedAtByKey?.[key] || '';
    const remoteUpdatedAt = remoteUpdatedAtByKey?.[key] || '';
    const useRemote = remoteUpdatedAt >= localUpdatedAt;

    notes[key] = useRemote
      ? (remoteNotes?.[key] ?? '')
      : (localNotes?.[key] ?? '');
    noteUpdatedAtByKey[key] = useRemote ? remoteUpdatedAt : localUpdatedAt;
  }

  return { notes, noteUpdatedAtByKey };
}

function syncSettingsFromState(settings = {}) {
  const {
    dailyGoalCards,
    currentFocus,
    streakDays,
    lastStudiedDate,
    profile = {},
    onboarding = {},
  } = settings;

  return {
    dailyGoalCards,
    currentFocus,
    streakDays,
    lastStudiedDate,
    profile,
    onboarding,
  };
}

export function buildSyncSnapshot(state, syncedAt = new Date().toISOString()) {
  return {
    syncVersion: 1,
    syncedAt,
    reviews: state.reviews || {},
    sessions: trimSessions(state.sessions || []),
    reflections: trimReflections(state.reflections || []),
    notes: state.notes || {},
    noteUpdatedAtByKey: state.noteUpdatedAtByKey || {},
    aiChatMessages: trimAiChatMessages(state.aiChatMessages || []),
    readingProgress: state.readingProgress || {},
    lessonExpansions: state.lessonExpansions || {},
    completedArticlesByKey: state.completedArticlesByKey || {},
    generatedArticlesByKey: state.generatedArticlesByKey || {},
    articleTutorThreadsByKey: state.articleTutorThreadsByKey || {},
    followedTopics: state.followedTopics || {},
    savedItems: state.savedItems || {},
    dismissedItems: state.dismissedItems || {},
    itemActivity: state.itemActivity || {},
    news: state.news || createInitialNewsState(),
    settings: syncSettingsFromState(state.settings),
  };
}

export function mergeSyncSnapshot(localState, remoteSnapshot) {
  if (!remoteSnapshot) return localState;

  const seeded = createInitialState();
  const mergedNotes = mergeNotes(
    localState.notes,
    remoteSnapshot.notes,
    localState.noteUpdatedAtByKey,
    remoteSnapshot.noteUpdatedAtByKey,
  );

  return {
    ...localState,
    schemaVersion: seeded.schemaVersion,
    sources: localState.sources,
    lessons: localState.lessons,
    reviews: mergeReviews(localState.reviews, remoteSnapshot.reviews),
    sessions: mergeSessions(localState.sessions, remoteSnapshot.sessions),
    reflections: mergeReflections(localState.reflections, remoteSnapshot.reflections),
    notes: mergedNotes.notes,
    noteUpdatedAtByKey: mergedNotes.noteUpdatedAtByKey,
    aiChatMessages: mergeAiChatMessages(localState.aiChatMessages, remoteSnapshot.aiChatMessages),
    readingProgress: mergeUpdatedMap(localState.readingProgress, remoteSnapshot.readingProgress),
    lessonExpansions: mergeMissingMap(localState.lessonExpansions, remoteSnapshot.lessonExpansions),
    completedArticlesByKey: mergeUpdatedMap(localState.completedArticlesByKey, remoteSnapshot.completedArticlesByKey),
    generatedArticlesByKey: mergeMissingMap(localState.generatedArticlesByKey, remoteSnapshot.generatedArticlesByKey),
    articleTutorThreadsByKey: mergeUpdatedMap(localState.articleTutorThreadsByKey, remoteSnapshot.articleTutorThreadsByKey),
    followedTopics: mergeUpdatedMap(localState.followedTopics, remoteSnapshot.followedTopics),
    savedItems: mergeUpdatedMap(localState.savedItems, remoteSnapshot.savedItems),
    dismissedItems: mergeUpdatedMap(localState.dismissedItems, remoteSnapshot.dismissedItems),
    itemActivity: mergeUpdatedMap(localState.itemActivity, remoteSnapshot.itemActivity),
    news: mergeNewsState(localState.news || createInitialNewsState(), remoteSnapshot.news || createInitialNewsState()),
    settings: {
      ...localState.settings,
      ...syncSettingsFromState(remoteSnapshot.settings || {}),
      resume: localState.settings?.resume || seeded.settings.resume,
    },
  };
}
