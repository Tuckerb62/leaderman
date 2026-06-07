export const todayKey = () => new Date().toISOString().slice(0, 10);

export function addDays(dateKey, days) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isDue(review, nowKey = todayKey()) {
  return !review?.dueAt || review.dueAt <= nowKey;
}

export function nextReviewState(review, rating, nowKey = todayKey()) {
  const current = review || {
    status: 'new',
    ease: 2,
    intervalDays: 0,
    attempts: 0,
    known: 0,
    needsWork: 0,
  };

  const attempts = (current.attempts || 0) + 1;
  let intervalDays = current.intervalDays || 0;
  let ease = current.ease || 2;
  let status = 'reviewing';
  let dueAt = nowKey;
  let known = current.known || 0;
  let needsWork = current.needsWork || 0;

  if (rating === 'know') {
    known += 1;
    ease = Math.min(5, ease + 0.25);
    intervalDays = intervalDays === 0 ? 2 : Math.ceil(intervalDays * ease);
    dueAt = addDays(nowKey, intervalDays);
    status = intervalDays >= 14 ? 'strong' : 'reviewing';
  }

  if (rating === 'later') {
    intervalDays = Math.max(1, intervalDays);
    dueAt = addDays(nowKey, 1);
    status = 'reviewing';
  }

  if (rating === 'work') {
    needsWork += 1;
    ease = Math.max(1.2, ease - 0.35);
    intervalDays = 0;
    dueAt = nowKey;
    status = 'needs-work';
  }

  return {
    ...current,
    status,
    ease,
    intervalDays,
    dueAt,
    attempts,
    known,
    needsWork,
    lastReviewedAt: new Date().toISOString(),
  };
}
