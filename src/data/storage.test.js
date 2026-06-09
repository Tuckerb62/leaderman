import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState } from './seedData.js';
import { loadState, parseImportedState, saveState } from './storage.js';

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
    expect(parsed.schemaVersion).toBe(2);
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
        structured: {
          sections: [
            {
              key: 'deeperRead',
              heading: 'Deeper Read',
              kind: 'prose',
              paragraphs: ['A privately generated expansion.'],
              raw: 'A privately generated expansion.',
            },
          ],
        },
        model: 'gpt-5-mini',
        updatedAt: '2026-06-08T12:00:00.000Z',
      },
    };

    const parsed = parseImportedState(JSON.stringify(backup));

    expect(parsed.lessonExpansions['lesson:lesson-summary-gatsby']).toMatchObject(backup.lessonExpansions['lesson:lesson-summary-gatsby']);
  });

  it('adds the new sync and news slices to fresh state', () => {
    const state = createInitialState();

    expect(state.followedTopics).toEqual({});
    expect(state.savedItems).toEqual({});
    expect(state.dismissedItems).toEqual({});
    expect(state.itemActivity).toEqual({});
    expect(state.news).toMatchObject({
      items: [],
      topicLedger: {},
      expansions: {},
    });
  });

  it('loads older schema-1 backups into the new state shape', () => {
    const backup = createInitialState();
    backup.schemaVersion = 1;
    delete backup.followedTopics;
    delete backup.savedItems;
    delete backup.dismissedItems;
    delete backup.itemActivity;
    delete backup.news;

    const parsed = parseImportedState(JSON.stringify(backup));

    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.followedTopics).toEqual({});
    expect(parsed.news.items).toEqual([]);
  });

  it('round-trips saved items and news through local storage', () => {
    const state = createInitialState();
    state.savedItems = {
      'library:lesson-stoic-control': {
        itemKey: 'library:lesson-stoic-control',
        updatedAt: '2026-06-08T12:00:00.000Z',
      },
    };
    state.news.items = [
      {
        id: 'story-1',
        topicKey: 'fed-rates',
        title: 'Fed holds rates',
        status: 'fresh',
        updatedAt: '2026-06-08T12:00:00.000Z',
      },
    ];

    saveState(state);
    const loaded = loadState();

    expect(loaded.savedItems['library:lesson-stoic-control']).toBeTruthy();
    expect(loaded.news.items[0].id).toBe('story-1');
  });
});
