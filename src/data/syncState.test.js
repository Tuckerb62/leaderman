import { describe, expect, it } from 'vitest';
import { createInitialState } from './seedData.js';
import { buildSyncSnapshot, mergeSyncSnapshot } from './syncState.js';

describe('sync state helpers', () => {
  it('builds a sync snapshot without device-local resume state', () => {
    const state = createInitialState();
    state.settings.resume.view = 'learn';
    state.settings.resume.lessonId = 'lesson-stoic-control';
    state.followedTopics = {
      stoicism: {
        topicId: 'stoicism',
        updatedAt: '2026-06-08T11:00:00.000Z',
      },
    };

    const snapshot = buildSyncSnapshot(state, '2026-06-08T12:00:00.000Z');

    expect(snapshot.settings.resume).toBeUndefined();
    expect(snapshot.followedTopics.stoicism).toBeTruthy();
    expect(snapshot.syncedAt).toBe('2026-06-08T12:00:00.000Z');
  });

  it('includes reflections and note timestamps in the sync snapshot', () => {
    const state = createInitialState();
    state.reflections = [
      {
        id: 'reflection-1',
        lessonId: 'lesson-stoic-control',
        text: 'Control starts with naming what is mine.',
        createdAt: '2026-06-09T12:00:00.000Z',
      },
    ];
    state.notes = {
      'lesson-stoic-control': 'Private note.',
    };
    state.noteUpdatedAtByKey = {
      'lesson-stoic-control': '2026-06-09T12:05:00.000Z',
    };
    state.aiChatMessages = [
      { id: 'chat-1', role: 'user', content: 'Hello', createdAt: '2026-06-09T12:05:30.000Z' },
    ];

    const snapshot = buildSyncSnapshot(state, '2026-06-09T12:06:00.000Z');

    expect(snapshot.reflections).toHaveLength(1);
    expect(snapshot.notes['lesson-stoic-control']).toBe('Private note.');
    expect(snapshot.noteUpdatedAtByKey['lesson-stoic-control']).toBe('2026-06-09T12:05:00.000Z');
    expect(snapshot.aiChatMessages).toHaveLength(1);
  });

  it('merges remote sync state over stale local sync slices while preserving seed curriculum', () => {
    const local = createInitialState();
    const remote = buildSyncSnapshot(createInitialState(), '2026-06-08T13:00:00.000Z');
    remote.savedItems = {
      'library:lesson-stoic-control': {
        itemKey: 'library:lesson-stoic-control',
        updatedAt: '2026-06-08T13:00:00.000Z',
      },
    };

    const merged = mergeSyncSnapshot(local, remote);

    expect(merged.sources).toHaveLength(local.sources.length);
    expect(merged.lessons).toHaveLength(local.lessons.length);
    expect(merged.savedItems['library:lesson-stoic-control']).toBeTruthy();
  });

  it('syncs article-keyed completion, generated articles, and tutor threads', () => {
    const local = createInitialState();
    const remote = buildSyncSnapshot(createInitialState(), '2026-06-09T13:00:00.000Z');
    remote.completedArticlesByKey = {
      'article:leadership-foundations-authority': {
        completed: true,
        completedAt: '2026-06-09T12:00:00.000Z',
        updatedAt: '2026-06-09T12:00:00.000Z',
      },
    };
    remote.generatedArticlesByKey = {
      'article:leadership-foundations-authority': {
        title: 'Authority',
        articleMarkdown: '## Expanded\nPrivate generated article.',
        imageCards: [],
        imageQueries: [],
        practicalTakeaway: 'Check recognized authority.',
        updatedAt: '2026-06-09T12:05:00.000Z',
      },
    };
    remote.articleTutorThreadsByKey = {
      'article:leadership-foundations-authority': {
        messages: [
          { role: 'user', content: 'Help me study this.', createdAt: '2026-06-09T12:06:00.000Z' },
        ],
        updatedAt: '2026-06-09T12:06:00.000Z',
      },
    };

    const snapshot = buildSyncSnapshot(remote, '2026-06-09T13:00:00.000Z');
    const merged = mergeSyncSnapshot(local, snapshot);

    expect(snapshot.completedArticlesByKey['article:leadership-foundations-authority'].completed).toBe(true);
    expect(snapshot.generatedArticlesByKey['article:leadership-foundations-authority'].articleMarkdown).toContain('Private generated article');
    expect(snapshot.articleTutorThreadsByKey['article:leadership-foundations-authority'].messages[0].content).toContain('study');
    expect(merged.completedArticlesByKey['article:leadership-foundations-authority'].completed).toBe(true);
    expect(merged.generatedArticlesByKey['article:leadership-foundations-authority'].practicalTakeaway).toBe('Check recognized authority.');
    expect(merged.articleTutorThreadsByKey['article:leadership-foundations-authority'].messages).toHaveLength(1);
  });

  it('syncs the profile username across devices without syncing resume state', () => {
    const local = createInitialState();
    local.settings.profile = {
      username: 'Old device name',
      updatedAt: '2026-06-09T12:00:00.000Z',
    };
    local.settings.resume = {
      view: 'library',
      lessonId: 'lesson-stoic-control',
      updatedAt: '2026-06-09T12:00:00.000Z',
    };

    const remoteState = createInitialState();
    remoteState.settings.profile = {
      username: 'Curious Cat',
      updatedAt: '2026-06-09T13:00:00.000Z',
    };
    remoteState.settings.resume = {
      view: 'feed',
      lessonId: '',
      updatedAt: '2026-06-09T13:00:00.000Z',
    };

    const remote = buildSyncSnapshot(remoteState, '2026-06-09T13:00:00.000Z');
    const merged = mergeSyncSnapshot(local, remote);

    expect(remote.settings.profile.username).toBe('Curious Cat');
    expect(remote.settings.resume).toBeUndefined();
    expect(merged.settings.profile.username).toBe('Curious Cat');
    expect(merged.settings.resume.view).toBe('library');
  });

  it('backfills missing AI-written content without overwriting local generated edits', () => {
    const local = createInitialState();
    local.lessonExpansions = {
      'lesson:lesson-stoic-control': {
        lessonId: 'lesson-stoic-control',
        markdown: '## Local\nKeep my edited local lesson draft.',
        updatedAt: '2026-06-09T12:00:00.000Z',
      },
    };
    local.generatedArticlesByKey = {
      'article:local-edited': {
        title: 'Local edited article',
        articleMarkdown: '## Local\nKeep this local generated article.',
        updatedAt: '2026-06-09T12:00:00.000Z',
      },
    };

    const remote = buildSyncSnapshot(createInitialState(), '2026-06-09T13:00:00.000Z');
    remote.lessonExpansions = {
      'lesson:lesson-stoic-control': {
        lessonId: 'lesson-stoic-control',
        markdown: '## Remote\nDo not overwrite the local lesson draft.',
        updatedAt: '2026-06-09T13:00:00.000Z',
      },
      'lesson:lesson-hidden-rule': {
        lessonId: 'lesson-hidden-rule',
        markdown: '## Remote\nBackfill this missing lesson draft.',
        updatedAt: '2026-06-09T13:00:00.000Z',
      },
    };
    remote.generatedArticlesByKey = {
      'article:local-edited': {
        title: 'Remote edited article',
        articleMarkdown: '## Remote\nDo not overwrite local generated article.',
        updatedAt: '2026-06-09T13:00:00.000Z',
      },
      'article:remote-missing': {
        title: 'Remote missing article',
        articleMarkdown: '## Remote\nBackfill this article.',
        updatedAt: '2026-06-09T13:00:00.000Z',
      },
    };

    const merged = mergeSyncSnapshot(local, remote);

    expect(merged.lessonExpansions['lesson:lesson-stoic-control'].markdown).toContain('Keep my edited local lesson draft');
    expect(merged.lessonExpansions['lesson:lesson-hidden-rule'].markdown).toContain('Backfill this missing lesson draft');
    expect(merged.generatedArticlesByKey['article:local-edited'].articleMarkdown).toContain('Keep this local generated article');
    expect(merged.generatedArticlesByKey['article:remote-missing'].articleMarkdown).toContain('Backfill this article');
  });

  it('prefers the newer note and merges reflections across devices', () => {
    const local = createInitialState();
    local.notes = {
      'lesson-stoic-control': 'Older note.',
    };
    local.noteUpdatedAtByKey = {
      'lesson-stoic-control': '2026-06-09T12:00:00.000Z',
    };
    local.reflections = [
      {
        id: 'reflection-local',
        lessonId: 'lesson-stoic-control',
        text: 'Local reflection.',
        createdAt: '2026-06-09T12:01:00.000Z',
      },
    ];
    local.aiChatMessages = [
      { id: 'chat-local', role: 'user', content: 'Local chat.', createdAt: '2026-06-09T12:02:00.000Z' },
    ];

    const remote = buildSyncSnapshot(createInitialState(), '2026-06-09T13:00:00.000Z');
    remote.notes = {
      'lesson-stoic-control': '',
    };
    remote.noteUpdatedAtByKey = {
      'lesson-stoic-control': '2026-06-09T12:05:00.000Z',
    };
    remote.reflections = [
      {
        id: 'reflection-remote',
        lessonId: 'lesson-stoic-control',
        text: 'Remote reflection.',
        createdAt: '2026-06-09T12:06:00.000Z',
      },
    ];
    remote.aiChatMessages = [
      { id: 'chat-remote', role: 'assistant', content: 'Remote chat.', createdAt: '2026-06-09T12:07:00.000Z' },
    ];

    const merged = mergeSyncSnapshot(local, remote);

    expect(merged.notes['lesson-stoic-control']).toBe('');
    expect(merged.noteUpdatedAtByKey['lesson-stoic-control']).toBe('2026-06-09T12:05:00.000Z');
    expect(merged.reflections.map((item) => item.id)).toEqual(['reflection-remote', 'reflection-local']);
    expect(merged.aiChatMessages.map((item) => item.id)).toEqual(['chat-local', 'chat-remote']);
  });
});
