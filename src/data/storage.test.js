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

  it('keeps resume state when importing a backup', () => {
    const backup = createInitialState();
    backup.settings.resume = {
      view: 'learn',
      lessonId: 'lesson-stoic-control',
      feedLessonId: 'lesson-hidden-rule',
      updatedAt: '2026-06-07T12:00:00.000Z',
    };

    const parsed = parseImportedState(JSON.stringify(backup));

    expect(parsed.settings.resume).toMatchObject(backup.settings.resume);
  });

  it('keeps reading bookmarks when importing a backup', () => {
    const backup = createInitialState();
    backup.readingProgress = {
      'lesson-summary-way-kings': {
        lessonId: 'lesson-summary-way-kings',
        chapterIndex: 2,
        completedChapters: [0, 1],
        updatedAt: '2026-06-07T12:00:00.000Z',
      },
    };

    const parsed = parseImportedState(JSON.stringify(backup));

    expect(parsed.readingProgress['lesson-summary-way-kings']).toMatchObject(backup.readingProgress['lesson-summary-way-kings']);
  });

  it('keeps locally generated lesson expansions when importing a backup', () => {
    const backup = createInitialState();
    backup.lessonExpansions = {
      'lesson:lesson-summary-gatsby': {
        lessonId: 'lesson-summary-gatsby',
        markdown: '## Deeper Read\nA privately generated expansion.',
        model: 'gpt-5-mini',
        updatedAt: '2026-06-08T12:00:00.000Z',
      },
    };

    const parsed = parseImportedState(JSON.stringify(backup));

    expect(parsed.lessonExpansions['lesson:lesson-summary-gatsby']).toMatchObject(backup.lessonExpansions['lesson:lesson-summary-gatsby']);
  });
});
