import { describe, expect, it } from 'vitest';
import { microLessons } from './seedData.js';
import { buildTopicBank, buildLibraryLessonIndex } from './topicBank.js';

describe('topic bank', () => {
  it('builds a structured subject map from the seeded curriculum', () => {
    const topicBank = buildTopicBank(microLessons);
    const leadership = topicBank.find((subject) => subject.id === 'leadership');
    const philosophy = topicBank.find((subject) => subject.id === 'philosophy');
    const emergency = topicBank.find((subject) => subject.id === 'emergency-medicine');

    expect(leadership?.lessonCount).toBeGreaterThan(10);
    expect(philosophy?.lessonCount).toBeGreaterThan(5);
    expect(philosophy?.subtopics.some((subtopic) => subtopic.id === 'stoicism')).toBe(true);
    expect(emergency?.title).toBe('Emergency Medicine');
  });

  it('builds the library lesson index without legacy novel summaries', () => {
    const lessons = buildLibraryLessonIndex(microLessons);

    expect(lessons.length).toBeGreaterThan(20);
    expect(lessons.every((lesson) => lesson.summaryKind !== 'Novel')).toBe(true);
    expect(lessons.every((lesson) => lesson.domain !== 'Novel Summaries')).toBe(true);
  });
});
