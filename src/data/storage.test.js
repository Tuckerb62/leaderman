import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState } from './seedData.js';
import { parseImportedState } from './storage.js';

beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };
});

describe('storage import', () => {
  it('accepts a valid Leaderman backup', () => {
    const backup = createInitialState();
    const parsed = parseImportedState(JSON.stringify(backup));
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.lessons.length).toBeGreaterThan(40);
    expect(parsed.sources.length).toBeGreaterThan(25);
  });

  it('keeps current seeded curriculum when importing older backups', () => {
    const backup = createInitialState();
    backup.lessons = backup.lessons.filter((lesson) => lesson.domain !== 'Philosophy');
    backup.sources = backup.sources.filter((source) => source.domain !== 'Philosophy');

    const parsed = parseImportedState(JSON.stringify(backup));

    expect(parsed.lessons.some((lesson) => lesson.slug === 'stoic-control')).toBe(true);
    expect(parsed.sources.some((source) => source.id === 'src-stoicism')).toBe(true);
  });

  it('rejects unrelated JSON', () => {
    expect(() => parseImportedState(JSON.stringify({ hello: 'world' }))).toThrow('Leaderman backup');
  });

  it('caps imported sessions at 10', () => {
    const backup = createInitialState();
    backup.sessions = Array.from({ length: 12 }, (_, index) => ({ id: `session-${index}` }));

    const parsed = parseImportedState(JSON.stringify(backup));

    expect(parsed.sessions).toHaveLength(10);
  });
});
