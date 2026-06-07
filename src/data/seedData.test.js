import { describe, expect, it } from 'vitest';
import { domains, microLessons, philosophySchools } from './seedData.js';

describe('seed lesson articles', () => {
  it('expands every lesson into a source-grounded article', () => {
    expect(microLessons.length).toBeGreaterThanOrEqual(40);

    for (const lesson of microLessons) {
      expect(lesson.articleParagraphs.length).toBeGreaterThanOrEqual(4);
      expect(lesson.articleParagraphs.length).toBeLessThanOrEqual(6);
      expect(lesson.sourceBasis.length).toBeGreaterThan(0);
      expect(lesson.articleParagraphs.join(' ')).toContain('Historical example:');
      expect(lesson.articleParagraphs.join(' ')).toContain('Analogy:');
      expect(lesson.fidelityNote).toContain('copyright-safe synthesis');
      expect(JSON.stringify(lesson).toLowerCase()).not.toContain('content safety workflow');
    }
  });

  it('includes philosophy schools with a strong Stoicism track', () => {
    const philosophyLessons = microLessons.filter((lesson) => lesson.domain === 'Philosophy');
    const stoicism = philosophySchools.find((school) => school.id === 'stoicism');

    expect(domains).toContain('Philosophy');
    expect(philosophySchools.length).toBeGreaterThanOrEqual(8);
    expect(philosophyLessons.length).toBeGreaterThanOrEqual(10);
    expect(stoicism?.lessonSlugs.length).toBeGreaterThanOrEqual(3);

    for (const slug of stoicism.lessonSlugs) {
      const lesson = microLessons.find((item) => item.slug === slug);
      expect(lesson?.domain).toBe('Philosophy');
      expect(lesson.articleParagraphs.join(' ')).toContain('Historical example:');
    }
  });
});
