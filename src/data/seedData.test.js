import { describe, expect, it } from 'vitest';
import { domains, microLessons, philosophySchools } from './seedData.js';

describe('seed lesson articles', () => {
  it('expands every lesson into a source-grounded article', () => {
    expect(microLessons.length).toBeGreaterThanOrEqual(40);

    for (const lesson of microLessons) {
      expect(lesson.articleParagraphs.length).toBeGreaterThanOrEqual(4);
      expect(lesson.articleParagraphs.length).toBeLessThanOrEqual(8);
      expect(lesson.sourceBasis.length).toBeGreaterThan(0);
      if (lesson.contentType === 'summary') {
        expect(lesson.summaryBullets.length).toBeGreaterThanOrEqual(4);
        expect(lesson.timeline.length).toBeGreaterThanOrEqual(4);
        expect(lesson.themeNotes.length).toBeGreaterThanOrEqual(4);
        expect(lesson.chapterSummaries.length).toBeGreaterThanOrEqual(12);
        expect(lesson.chapterSummaries[0].title).toContain('Chapter 1:');
        expect(lesson.scenario).toContain('memory map');
      } else {
        expect(lesson.quickVersion.length).toBeGreaterThanOrEqual(3);
        expect(lesson.breakDown.length).toBeGreaterThanOrEqual(5);
        expect(lesson.remember.length).toBeGreaterThanOrEqual(4);
        expect(lesson.questions.map((question) => question.type)).toEqual([
          'Recall',
          'Scenario',
          'Judgment',
          'Reflection',
        ]);
      }
      expect(JSON.stringify(lesson).toLowerCase()).not.toContain('content safety workflow');
    }
  });

  it('keeps boilerplate and repeated teaching skeletons out of lesson bodies', () => {
    const bannedPhrases = [
      'copyright-safe synthesis',
      'not a substitute for the original',
      'use the idea with discipline',
      'fidelity rule for this lesson',
      'serious learner should hold the useful idea and the limitation together',
      'use the historical example as a pattern rather than proof',
      'is not a slogan; it is a decision habit',
      'The leadership mistake this guards against is using one comfortable move for every situation',
    ];
    const paragraphCounts = new Map();

    for (const lesson of microLessons) {
      const body = JSON.stringify({
        articleParagraphs: lesson.articleParagraphs,
        breakDown: lesson.breakDown,
        remember: lesson.remember,
        questions: lesson.questions,
        chapterSummaries: lesson.chapterSummaries,
      }).toLowerCase();

      for (const phrase of bannedPhrases) {
        expect(body).not.toContain(phrase.toLowerCase());
      }

      for (const paragraph of lesson.articleParagraphs || []) {
        const normalized = paragraph
          .toLowerCase()
          .replace(/[“”]/g, '"')
          .replace(/[^\w\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        if (normalized.length > 80) {
          paragraphCounts.set(normalized, (paragraphCounts.get(normalized) || 0) + 1);
        }
      }
    }

    const repeatedTeachingParagraphs = [...paragraphCounts.entries()].filter(([, count]) => count > 1);
    expect(repeatedTeachingParagraphs).toEqual([]);
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
      expect(lesson.articleParagraphs.join(' ')).toContain(lesson.historicalExample.title);
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
    expect(novelSummaries.length).toBeGreaterThanOrEqual(24);
    expect(worldHistory.length).toBeGreaterThanOrEqual(21);
    expect(novelSummaries.every((lesson) => lesson.contentType === 'summary')).toBe(true);
    expect(worldHistory.every((lesson) => lesson.summaryKind === 'History')).toBe(true);
    expect(microLessons.find((lesson) => lesson.slug === 'summary-final-empire')?.sourceBasis).toContain('Mistborn: The Final Empire');
    expect(microLessons.find((lesson) => lesson.slug === 'summary-way-kings')?.sourceBasis).toContain('The Way of Kings');
    expect(microLessons.find((lesson) => lesson.slug === 'history-sengoku-japan')?.sourceBasis).toContain('Sengoku Japan and Unification');
    expect(microLessons.find((lesson) => lesson.slug === 'history-roman-empire')?.sourceBasis).toContain('The Roman Empire');
    expect(microLessons.find((lesson) => lesson.slug === 'summary-alloy-law')?.collectionTitle).toBe('Mistborn Era 2');
    expect(microLessons.find((lesson) => lesson.slug === 'summary-tress')?.collectionTitle).toBe('Cosmere Standalones');
    expect(microLessons.find((lesson) => lesson.slug === 'history-julius-caesar')?.reflectionLens).toContain('Caesar is a good example');
    expect(microLessons.find((lesson) => lesson.slug === 'history-augustus')?.collectionTitle).toBe('Roman Emperors');
  });

  it('turns fiction chapters into structured story retellings with useful questions', () => {
    const fictionSummaries = microLessons.filter((lesson) => lesson.summaryKind === 'Novel');
    expect(fictionSummaries.length).toBeGreaterThanOrEqual(10);

    for (const lesson of fictionSummaries) {
      expect(lesson.articleParagraphs.length).toBeGreaterThanOrEqual(5);
      expect(lesson.remember.length).toBeGreaterThanOrEqual(4);

      for (const chapter of lesson.chapterSummaries) {
        expect(chapter.retelling.length).toBeGreaterThanOrEqual(3);
        expect(chapter.summary.split(/\n\s*\n/).length).toBeGreaterThanOrEqual(3);
        expect(chapter.whatChanged).toBeTruthy();
        expect(chapter.whyItMatters).toBeTruthy();
        expect(chapter.breakDown.length).toBeGreaterThanOrEqual(5);
        expect(chapter.remember.length).toBeGreaterThanOrEqual(3);
        expect(chapter.questions.map((question) => question.type)).toEqual([
          'Plot',
          'Motivation',
          'Theme',
          'Interpretation',
        ]);
      }
    }
  });
});
