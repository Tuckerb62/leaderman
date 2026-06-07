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
    streakDays: state.settings?.streakDays || 0,
  };
}

export function weakDomains(state) {
  const domainMap = new Map();
  state.lessons.forEach((lesson) => {
    const review = state.reviews[lesson.id];
    const current = domainMap.get(lesson.domain) || { domain: lesson.domain, needsWork: 0, attempts: 0, needsWorkRate: 0 };
    current.needsWork += review?.needsWork || 0;
    current.attempts += review?.attempts || 0;
    current.needsWorkRate = Math.round((current.needsWork / Math.max(current.attempts, 1)) * 100);
    domainMap.set(lesson.domain, current);
  });
  return [...domainMap.values()]
    .filter((item) => item.needsWork || item.attempts)
    .sort((a, b) => b.needsWorkRate - a.needsWorkRate || b.needsWork - a.needsWork || b.attempts - a.attempts);
}

function stableHash(text) {
  return [...text].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 100000, 7);
}

function interleaveDomains(lessons) {
  const queue = [...lessons];
  for (let index = 2; index < queue.length; index += 1) {
    if (queue[index].domain !== queue[index - 1].domain || queue[index].domain !== queue[index - 2].domain) continue;
    const swapIndex = queue.findIndex((lesson, candidateIndex) => candidateIndex > index && lesson.domain !== queue[index].domain);
    if (swapIndex !== -1) {
      [queue[index], queue[swapIndex]] = [queue[swapIndex], queue[index]];
    }
  }
  return queue;
}

export function feedQueue(state, limit = 40) {
  const now = todayKey();
  const usedIds = new Set();
  const weakDomainNames = weakDomains(state).map((item) => item.domain);

  function take(predicate, sort = (a, b) => a.order - b.order) {
    const picked = state.lessons
      .filter((lesson) => !usedIds.has(lesson.id) && predicate(lesson, state.reviews[lesson.id]))
      .sort(sort);
    picked.forEach((lesson) => usedIds.add(lesson.id));
    return picked;
  }

  const needsWork = take((lesson, review) => review?.status === 'needs-work');
  const due = take(
    (lesson, review) => review?.status !== 'needs-work' && isDue(review, now),
    (a, b) => {
      const aDue = state.reviews[a.id]?.dueAt || now;
      const bDue = state.reviews[b.id]?.dueAt || now;
      return aDue.localeCompare(bDue) || a.order - b.order;
    },
  );
  const weakNew = take((lesson, review) => (!review || review.attempts === 0) && weakDomainNames.includes(lesson.domain));
  const otherNew = take((lesson, review) => !review || review.attempts === 0);
  const strong = take(
    (lesson, review) => review?.status === 'strong',
    (a, b) => stableHash(`${a.id}-${now}`) - stableHash(`${b.id}-${now}`),
  );
  const remaining = take(() => true);

  return interleaveDomains([...needsWork, ...due, ...weakNew, ...otherNew, ...strong, ...remaining]).slice(0, limit);
}
