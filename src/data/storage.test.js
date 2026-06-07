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

  it('rejects unrelated JSON', () => {
    expect(() => parseImportedState(JSON.stringify({ hello: 'world' }))).toThrow('Leaderman backup');
  });
});
