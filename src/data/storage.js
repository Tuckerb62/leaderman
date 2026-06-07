import { createInitialState } from './seedData.js';

const STORAGE_KEY = 'leaderman.state.v1';

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    if (parsed?.schemaVersion !== 1) return createInitialState();
    const seeded = createInitialState();
    return {
      ...seeded,
      ...parsed,
      sources: seeded.sources,
      lessons: seeded.lessons,
      reviews: {
        ...seeded.reviews,
        ...(parsed.reviews || {}),
      },
      settings: {
        ...seeded.settings,
        ...(parsed.settings || {}),
      },
    };
  } catch {
    return createInitialState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
  if (parsed?.schemaVersion !== 1 || !Array.isArray(parsed.lessons)) {
    throw new Error('This does not look like a Leaderman backup.');
  }
  const seeded = createInitialState();
  return {
    ...seeded,
    ...parsed,
    sources: seeded.sources,
    lessons: seeded.lessons,
    reviews: {
      ...seeded.reviews,
      ...(parsed.reviews || {}),
    },
    settings: {
      ...seeded.settings,
      ...(parsed.settings || {}),
    },
    exportedAt: undefined,
  };
}
