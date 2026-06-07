import { isDue, todayKey } from './reviewScheduler.js';

export function lessonReview(state, lessonId) {
  return state.reviews[lessonId];
}

export function dueLessons(state, limit = Infinity) {
  const now = todayKey();
  return state.lessons
    .filter((lesson) => isDue(state.reviews[lesson.id], now))
    .sort((a, b) => {
      const aReview = state.reviews[a.id];
      const bReview = state.reviews[b.id];
      if (aReview?.status === 'needs-work' && bReview?.status !== 'needs-work') return -1;
      if (bReview?.status === 'needs-work' && aReview?.status !== 'needs-work') return 1;
      return a.order - b.order;
    })
    .slice(0, limit);
}

export function recommendedLessons(state, limit = 5) {
  const due = dueLessons(state, limit);
  if (due.length >= limit) return due;
  const dueIds = new Set(due.map((lesson) => lesson.id));
  const extras = state.lessons.filter((lesson) => !dueIds.has(lesson.id)).slice(0, limit - due.length);
  return [...due, ...extras];
}

export function sourceById(state, id) {
  return state.sources.find((source) => source.id === id);
}

export function progressStats(state) {
  const reviews = Object.values(state.reviews);
  const completed = reviews.filter((review) => review.attempts > 0).length;
  const known = reviews.reduce((sum, review) => sum + (review.known || 0), 0);
  const needsWork = reviews.reduce((sum, review) => sum + (review.needsWork || 0), 0);
  const mastery = reviews.length ? Math.round((known / Math.max(known + needsWork, 1)) * 100) : 0;
  const minutes = state.sessions.reduce((sum, session) => sum + (session.minutes || 0), 0);
  return {
    completed,
    known,
    needsWork,
    mastery,
    minutes,
    due: dueLessons(state).length,
  };
}

export function weakDomains(state) {
  const domainMap = new Map();
  state.lessons.forEach((lesson) => {
    const review = state.reviews[lesson.id];
    const current = domainMap.get(lesson.domain) || { domain: lesson.domain, needsWork: 0, attempts: 0 };
    current.needsWork += review?.needsWork || 0;
    current.attempts += review?.attempts || 0;
    domainMap.set(lesson.domain, current);
  });
  return [...domainMap.values()]
    .filter((item) => item.needsWork || item.attempts)
    .sort((a, b) => b.needsWork - a.needsWork || b.attempts - a.attempts);
}
