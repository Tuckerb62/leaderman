import { addDays, todayKey } from './reviewScheduler.js';

export function markStudied(settings = {}, nowKey = todayKey()) {
  const lastStudiedDate = settings.lastStudiedDate || null;
  if (lastStudiedDate === nowKey) return settings;

  const yesterday = addDays(nowKey, -1);
  const streakDays = lastStudiedDate === yesterday ? (settings.streakDays || 0) + 1 : 1;

  return {
    ...settings,
    streakDays,
    lastStudiedDate: nowKey,
  };
}

export function sessionMinutes(startedAt, endedAt) {
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.max(1, Math.round((end - start) / 60000));
}
