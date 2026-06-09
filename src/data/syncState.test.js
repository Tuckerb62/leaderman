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

  it('merges remote sync state over stale local sync slices while preserving seed curriculum', () => {
    const local = createInitialState();
    const remote = buildSyncSnapshot(createInitialState(), '2026-06-08T13:00:00.000Z');
    remote.savedItems = {
      'library:lesson-stoic-control': {
        itemKey: 'library:lesson-stoic-control',
        updatedAt: '2026-06-08T13:00:00.000Z',
      },
    };
    remote.news.items = [
      {
        id: 'story-1',
        topicKey: 'fed-rates',
        title: 'Fed holds rates',
        status: 'fresh',
        updatedAt: '2026-06-08T13:00:00.000Z',
      },
    ];

    const merged = mergeSyncSnapshot(local, remote);

    expect(merged.sources).toHaveLength(local.sources.length);
    expect(merged.lessons).toHaveLength(local.lessons.length);
    expect(merged.savedItems['library:lesson-stoic-control']).toBeTruthy();
    expect(merged.news.items[0].id).toBe('story-1');
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
});
