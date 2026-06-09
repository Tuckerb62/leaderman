import { isLessonComplete } from './reviewScheduler.js';

export function lessonReview(state, lessonId) {
  return state.reviews[lessonId];
}

export function dueLessons(state, limit = Infinity) {
  return state.lessons
    .filter((lesson) => !isLessonComplete(state.reviews[lesson.id]))
    .sort((a, b) => a.order - b.order)
    .slice(0, limit);
}

export function recommendedLessons(state, limit = 5) {
  const incomplete = dueLessons(state, limit);
  if (incomplete.length >= limit) return incomplete;
  const usedIds = new Set(incomplete.map((lesson) => lesson.id));
  const extras = state.lessons.filter((lesson) => !usedIds.has(lesson.id)).slice(0, limit - incomplete.length);
  return [...incomplete, ...extras];
}

export function sourceById(state, id) {
  return state.sources.find((source) => source.id === id);
}

export function progressStats(state) {
  const reviews = Object.values(state.reviews);
  const completed = reviews.filter(isLessonComplete).length;
  const questionAttempts = reviews.reduce((sum, review) => sum + (review.questionAttempts || 0), 0);
  const correctAnswers = reviews.reduce((sum, review) => sum + (review.correctAnswers || 0), 0);
  const minutes = state.sessions.reduce((sum, session) => sum + (session.minutes || 0), 0);
  return {
    completed,
    completionPercent: reviews.length ? Math.round((completed / reviews.length) * 100) : 0,
    correctAnswers,
    questionAttempts,
    questionAccuracy: questionAttempts ? Math.round((correctAnswers / questionAttempts) * 100) : null,
    minutes,
    streakDays: state.settings?.streakDays || 0,
  };
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
  const usedIds = new Set();

  function take(predicate, sort = (a, b) => a.order - b.order) {
    const picked = state.lessons
      .filter((lesson) => !usedIds.has(lesson.id) && predicate(lesson, state.reviews[lesson.id]))
      .sort(sort);
    picked.forEach((lesson) => usedIds.add(lesson.id));
    return picked;
  }

  const incomplete = take((lesson, review) => !isLessonComplete(review));
  const complete = take(
    (lesson, review) => isLessonComplete(review),
    (a, b) => stableHash(`${a.id}-${new Date().toISOString().slice(0, 10)}`) - stableHash(`${b.id}-${new Date().toISOString().slice(0, 10)}`),
  );
  const remaining = take(() => true);

  return interleaveDomains([...incomplete, ...complete, ...remaining]).slice(0, limit);
}
