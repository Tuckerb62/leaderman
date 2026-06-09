import { describe, expect, it } from 'vitest';
import { buildFeedPreviewActivityPatch } from './feedActivity.js';

describe('feed activity', () => {
  it('records preview expansion without creating open-count ranking activity', () => {
    const patch = buildFeedPreviewActivityPatch({
      itemKey: 'library:authority',
      subjectIds: ['leadership'],
      topicIds: ['leadership-foundations'],
      domain: 'library',
      existingActivity: {
        itemKey: 'library:authority',
        openCount: 2,
        previewCount: 4,
      },
      now: '2026-06-09T12:00:00.000Z',
    });

    expect(patch).toMatchObject({
      itemKey: 'library:authority',
      subjectIds: ['leadership'],
      topicIds: ['leadership-foundations'],
      domain: 'library',
      previewCount: 5,
      lastPreviewedAt: '2026-06-09T12:00:00.000Z',
    });
    expect(patch).not.toHaveProperty('openCount');
    expect(patch).not.toHaveProperty('lastOpenedAt');
  });
});
