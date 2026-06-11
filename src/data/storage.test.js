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
  it('accepts a valid Curiosity backup', () => {
    const backup = createInitialState();
    const parsed = parseImportedState(JSON.stringify(backup));
    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.lessons.length).toBeGreaterThanOrEqual(24);
    expect(parsed.sources.length).toBeGreaterThan(25);
  });

  it('keeps current seeded curriculum when importing older backups', () => {
    const backup = createInitialState();
    backup.lessons = backup.lessons.filter((lesson) => lesson.domain !== 'World History');
    backup.sources = backup.sources.filter((source) => !source.id.startsWith('src-history-'));

    const parsed = parseImportedState(JSON.stringify(backup));

    expect(parsed.lessons.some((lesson) => lesson.slug === 'history-roman-empire')).toBe(true);
    expect(parsed.sources.some((source) => source.id === 'src-history-roman-empire')).toBe(true);
  });

  it('rejects unrelated JSON', () => {
    expect(() => parseImportedState(JSON.stringify({ hello: 'world' }))).toThrow('Curiosity backup');
  });

  it('caps imported sessions at 10', () => {
    const backup = createInitialState();
    backup.sessions = Array.from({ length: 12 }, (_, index) => ({
      id: `session-${index}`,
      lessonIds: ['lesson-hidden-rule'],
    }));

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
      'lesson-hidden-rule': {
        lessonId: 'lesson-hidden-rule',
        chapterIndex: 2,
        completedChapters: [0, 1],
        updatedAt: '2026-06-07T12:00:00.000Z',
      },
    };

    const parsed = parseImportedState(JSON.stringify(backup));

    expect(parsed.readingProgress['lesson-hidden-rule']).toMatchObject(backup.readingProgress['lesson-hidden-rule']);
  });

  it('keeps note timestamps when importing a backup', () => {
    const backup = createInitialState();
    backup.notes = {
      'lesson-hidden-rule': 'Silence is not the same as agreement.',
    };
    backup.noteUpdatedAtByKey = {
      'lesson-hidden-rule': '2026-06-09T12:00:00.000Z',
    };

    const parsed = parseImportedState(JSON.stringify(backup));

    expect(parsed.notes['lesson-hidden-rule']).toBe(backup.notes['lesson-hidden-rule']);
    expect(parsed.noteUpdatedAtByKey['lesson-hidden-rule']).toBe('2026-06-09T12:00:00.000Z');
  });

  it('keeps locally generated lesson expansions when importing a backup', () => {
    const backup = createInitialState();
    backup.lessonExpansions = {
      'lesson:lesson-hidden-rule': {
        lessonId: 'lesson-hidden-rule',
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

    expect(parsed.lessonExpansions['lesson:lesson-hidden-rule']).toMatchObject(backup.lessonExpansions['lesson:lesson-hidden-rule']);
  });

  it('migrates legacy AI chat into app state when no synced copy exists yet', () => {
    localStorage.setItem('leaderman.ai.chat.v1', JSON.stringify([{ id: 'chat-1', role: 'user', content: 'Hello', createdAt: '2026-06-09T12:00:00.000Z' }]));

    const loaded = loadState();

    expect(loaded.aiChatMessages).toEqual([{ id: 'chat-1', role: 'user', content: 'Hello', createdAt: '2026-06-09T12:00:00.000Z' }]);
  });

  it('adds the new sync slices to fresh state', () => {
    const state = createInitialState();

    expect(state.completedArticlesByKey).toEqual({});
    expect(state.generatedArticlesByKey).toEqual({});
    expect(state.articleTutorThreadsByKey).toEqual({});
    expect(state.followedTopics).toEqual({});
    expect(state.savedItems).toEqual({});
    expect(state.dismissedItems).toEqual({});
    expect(state.itemActivity).toEqual({});
    expect(state.noteUpdatedAtByKey).toEqual({});
    expect(state.aiChatMessages).toEqual([]);
  });

  it('loads older schema-1 backups into the new state shape', () => {
    const backup = createInitialState();
    backup.schemaVersion = 1;
    delete backup.followedTopics;
    delete backup.savedItems;
    delete backup.dismissedItems;
    delete backup.itemActivity;
    delete backup.completedArticlesByKey;
    delete backup.generatedArticlesByKey;
    delete backup.articleTutorThreadsByKey;
    delete backup.noteUpdatedAtByKey;
    delete backup.aiChatMessages;

    const parsed = parseImportedState(JSON.stringify(backup));

    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.completedArticlesByKey).toEqual({});
    expect(parsed.generatedArticlesByKey).toEqual({});
    expect(parsed.articleTutorThreadsByKey).toEqual({});
    expect(parsed.followedTopics).toEqual({});
    expect(parsed.noteUpdatedAtByKey).toEqual({});
    expect(parsed.aiChatMessages).toEqual([]);
  });

  it('removes legacy novel-summary state while keeping current literature articles', () => {
    const backup = createInitialState();
    backup.savedItems = {
      'novels:lesson-summary-way-kings': {
        itemKey: 'novels:lesson-summary-way-kings',
        updatedAt: '2026-06-08T12:00:00.000Z',
      },
      'article:literature-classic-novels-american-classics-the-great-gatsby-the-great-gatsby-chapter-1': {
        itemKey: 'article:literature-classic-novels-american-classics-the-great-gatsby-the-great-gatsby-chapter-1',
        updatedAt: '2026-06-09T12:00:00.000Z',
      },
    };
    backup.itemActivity = {
      'novels:lesson-summary-way-kings': {
        itemKey: 'novels:lesson-summary-way-kings',
        openCount: 3,
        updatedAt: '2026-06-08T12:00:00.000Z',
      },
    };
    backup.notes = {
      'lesson-summary-way-kings': 'Old novel guide note',
      'article:literature-classic-novels-american-classics-the-great-gatsby-the-great-gatsby-chapter-1': 'Keep the green light symbol in view.',
    };
    backup.reviews = {
      ...backup.reviews,
      'lesson-summary-way-kings': {
        lessonId: 'lesson-summary-way-kings',
        completed: true,
      },
    };

    const parsed = parseImportedState(JSON.stringify(backup));

    expect(parsed.savedItems['novels:lesson-summary-way-kings']).toBeUndefined();
    expect(parsed.itemActivity['novels:lesson-summary-way-kings']).toBeUndefined();
    expect(parsed.notes['lesson-summary-way-kings']).toBeUndefined();
    expect(parsed.reviews['lesson-summary-way-kings']).toBeUndefined();
    expect(parsed.savedItems['article:literature-classic-novels-american-classics-the-great-gatsby-the-great-gatsby-chapter-1']).toBeTruthy();
    expect(parsed.notes['article:literature-classic-novels-american-classics-the-great-gatsby-the-great-gatsby-chapter-1']).toBe('Keep the green light symbol in view.');
  });

  it('round-trips saved items through local storage', () => {
    const state = createInitialState();
    state.savedItems = {
      'library:lesson-hidden-rule': {
        itemKey: 'library:lesson-hidden-rule',
        updatedAt: '2026-06-08T12:00:00.000Z',
      },
    };

    saveState(state);
    const loaded = loadState();

    expect(loaded.savedItems['library:lesson-hidden-rule']).toBeTruthy();
  });

  it('round-trips article-keyed state through import and local storage', () => {
    const state = createInitialState();
    state.completedArticlesByKey = {
      'article:leadership-foundations-authority': {
        completed: true,
        completedAt: '2026-06-09T12:00:00.000Z',
        updatedAt: '2026-06-09T12:00:00.000Z',
      },
    };
    state.generatedArticlesByKey = {
      'article:leadership-foundations-authority': {
        title: 'Authority',
        articleMarkdown: '## Expanded\nA private generated article.',
        imageCards: [],
        imageQueries: [],
        practicalTakeaway: 'Check whether authority is recognized.',
        updatedAt: '2026-06-09T12:05:00.000Z',
      },
    };
    state.articleTutorThreadsByKey = {
      'article:leadership-foundations-authority': [
        { role: 'user', content: 'Explain this.', createdAt: '2026-06-09T12:06:00.000Z' },
      ],
    };
    state.notes = {
      'article:leadership-foundations-authority': 'My article note.',
    };
    state.noteUpdatedAtByKey = {
      'article:leadership-foundations-authority': '2026-06-09T12:07:00.000Z',
    };
    state.aiChatMessages = [
      { id: 'chat-1', role: 'user', content: 'Hello', createdAt: '2026-06-09T12:08:00.000Z' },
    ];

    const imported = parseImportedState(JSON.stringify(state));
    expect(imported.completedArticlesByKey).toEqual(state.completedArticlesByKey);
    expect(imported.generatedArticlesByKey).toEqual(state.generatedArticlesByKey);
    expect(imported.articleTutorThreadsByKey).toEqual(state.articleTutorThreadsByKey);
    expect(imported.notes['article:leadership-foundations-authority']).toBe('My article note.');
    expect(imported.noteUpdatedAtByKey['article:leadership-foundations-authority']).toBe('2026-06-09T12:07:00.000Z');
    expect(imported.aiChatMessages).toEqual(state.aiChatMessages);

    saveState(state);
    const loaded = loadState();
    expect(loaded.completedArticlesByKey).toEqual(state.completedArticlesByKey);
    expect(loaded.generatedArticlesByKey).toEqual(state.generatedArticlesByKey);
    expect(loaded.articleTutorThreadsByKey).toEqual(state.articleTutorThreadsByKey);
    expect(loaded.noteUpdatedAtByKey).toEqual(state.noteUpdatedAtByKey);
    expect(loaded.aiChatMessages).toEqual(state.aiChatMessages);
  });
});
