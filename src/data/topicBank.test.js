import { describe, expect, it } from 'vitest';
import { microLessons } from './seedData.js';
import { buildTopicBank, buildLibraryLessonIndex } from './topicBank.js';

describe('topic bank', () => {
  it('builds a structured subject map from the seeded curriculum', () => {
    const topicBank = buildTopicBank(microLessons);
    const leadership = topicBank.find((subject) => subject.id === 'leadership');
    const worldHistory = topicBank.find((subject) => subject.id === 'world-history');
    const emergency = topicBank.find((subject) => subject.id === 'emergency-medicine');

    // After filler cull: 3 hand-written leadership lessons + 21 World History summaries
    expect(leadership?.lessonCount).toBeGreaterThan(0);
    expect(worldHistory?.lessonCount ?? (microLessons.filter((l) => l.domain === 'World History').length)).toBeGreaterThan(20);
    expect(emergency?.title).toBe('Emergency Medicine');
  });

  it('builds the library lesson index without legacy novel summaries', () => {
    const lessons = buildLibraryLessonIndex(microLessons);

    expect(lessons.length).toBeGreaterThan(20);
    expect(lessons.every((lesson) => lesson.summaryKind !== 'Novel')).toBe(true);
    expect(lessons.every((lesson) => lesson.domain !== 'Novel Summaries')).toBe(true);
  });
});
