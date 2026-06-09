import { createInitialState } from './seedData.js';
import { createInitialNewsState, mergeNewsState } from './newsStorage.js';

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
  return [...new Map([...localSessions, ...remoteSessions].map((session) => [session.id, session])).values()]
    .sort((left, right) => (right.endedAt || right.startedAt || '').localeCompare(left.endedAt || left.startedAt || ''))
    .slice(0, 10);
}

function syncSettingsFromState(settings = {}) {
  const {
    dailyGoalCards,
    currentFocus,
    streakDays,
    lastStudiedDate,
    profile = {},
  } = settings;

  return {
    dailyGoalCards,
    currentFocus,
    streakDays,
    lastStudiedDate,
    profile,
  };
}

export function buildSyncSnapshot(state, syncedAt = new Date().toISOString()) {
  return {
    syncVersion: 1,
    syncedAt,
    reviews: state.reviews || {},
    sessions: (state.sessions || []).slice(0, 10),
    readingProgress: state.readingProgress || {},
    lessonExpansions: state.lessonExpansions || {},
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
  return {
    ...localState,
    schemaVersion: seeded.schemaVersion,
    sources: localState.sources,
    lessons: localState.lessons,
    reviews: mergeReviews(localState.reviews, remoteSnapshot.reviews),
    sessions: mergeSessions(localState.sessions, remoteSnapshot.sessions),
    readingProgress: mergeUpdatedMap(localState.readingProgress, remoteSnapshot.readingProgress),
    lessonExpansions: mergeUpdatedMap(localState.lessonExpansions, remoteSnapshot.lessonExpansions),
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
