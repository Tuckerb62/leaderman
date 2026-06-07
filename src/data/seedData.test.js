import { describe, expect, it } from 'vitest';
import { domains, microLessons, philosophySchools } from './seedData.js';

describe('seed lesson articles', () => {
  it('expands every lesson into a source-grounded article', () => {
    expect(microLessons.length).toBeGreaterThanOrEqual(40);

    for (const lesson of microLessons) {
      expect(lesson.articleParagraphs.length).toBeGreaterThanOrEqual(4);
      expect(lesson.articleParagraphs.length).toBeLessThanOrEqual(6);
      expect(lesson.sourceBasis.length).toBeGreaterThan(0);
      if (lesson.contentType === 'summary') {
        expect(lesson.articleParagraphs.join(' ')).toContain('Summary:');
        expect(lesson.summaryBullets.length).toBeGreaterThanOrEqual(4);
        expect(lesson.timeline.length).toBeGreaterThanOrEqual(4);
        expect(lesson.themeNotes.length).toBeGreaterThanOrEqual(4);
        expect(lesson.fidelityNote).toContain('copyright-safe synthesis');
        expect(lesson.scenario).toContain('memory map');
      } else {
        expect(lesson.articleParagraphs.join(' ')).toContain('Historical example:');
        expect(lesson.articleParagraphs.join(' ')).toContain('Analogy:');
        expect(lesson.fidelityNote).toContain('copyright-safe synthesis');
      }
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

  it('includes self-help, literature, and history expansion tracks', () => {
    for (const domain of ['Self-Help', 'Literature', 'History']) {
      expect(domains).toContain(domain);
      expect(microLessons.filter((lesson) => lesson.domain === domain).length).toBeGreaterThanOrEqual(6);
    }

    expect(microLessons.find((lesson) => lesson.slug === 'habit-identity')?.sourceBasis).toContain('Atomic Habits');
    expect(microLessons.find((lesson) => lesson.slug === 'frankenstein-responsibility')?.sourceBasis).toContain('Frankenstein');
    expect(microLessons.find((lesson) => lesson.slug === 'melian-power')?.sourceBasis).toContain('History of the Peloponnesian War');
  });

  it('includes standalone novel and world history study summaries', () => {
    const novelSummaries = microLessons.filter((lesson) => lesson.domain === 'Novel Summaries');
    const worldHistory = microLessons.filter((lesson) => lesson.domain === 'World History');

    expect(domains).toContain('Novel Summaries');
    expect(domains).toContain('World History');
    expect(novelSummaries.length).toBeGreaterThanOrEqual(14);
    expect(worldHistory.length).toBeGreaterThanOrEqual(10);
    expect(novelSummaries.every((lesson) => lesson.contentType === 'summary')).toBe(true);
    expect(worldHistory.every((lesson) => lesson.summaryKind === 'History')).toBe(true);
    expect(microLessons.find((lesson) => lesson.slug === 'summary-final-empire')?.sourceBasis).toContain('Mistborn: The Final Empire');
    expect(microLessons.find((lesson) => lesson.slug === 'summary-way-kings')?.sourceBasis).toContain('The Way of Kings');
    expect(microLessons.find((lesson) => lesson.slug === 'history-sengoku-japan')?.sourceBasis).toContain('Sengoku Japan and Unification');
    expect(microLessons.find((lesson) => lesson.slug === 'history-roman-empire')?.sourceBasis).toContain('The Roman Empire');
  });
});
