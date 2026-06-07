import { describe, expect, it } from 'vitest';
import { microLessons } from './seedData.js';

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
});
