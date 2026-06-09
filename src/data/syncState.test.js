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
});
