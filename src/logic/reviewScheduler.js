export const todayKey = () => new Date().toISOString().slice(0, 10);

export function addDays(dateKey, days) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isLessonComplete(review) {
  return Boolean(review?.completedAt || review?.completed || (review?.attempts || 0) > 0);
}

export function markLessonComplete(review, now = new Date()) {
  const completedAt = now.toISOString();
  return {
    ...review,
    status: 'complete',
    completed: true,
    completedAt,
    attempts: Math.max(1, review?.attempts || 0),
    lastReviewedAt: completedAt,
  };
}

export function recordQuestionAnswer(review, isCorrect, now = new Date()) {
  const answeredAt = now.toISOString();
  return {
    ...review,
    questionAttempts: (review?.questionAttempts || 0) + 1,
    correctAnswers: (review?.correctAnswers || 0) + (isCorrect ? 1 : 0),
    lastQuestionAt: answeredAt,
  };
}
