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
        fidelityNote: lesson.fidelityNote,
        breakDown: lesson.breakDown,
        remember: lesson.remember,
        questions: lesson.questions,
        chapterSummaries: lesson.chapterSummaries,
      }).toLowerCase();

      for (const phrase of bannedPhrases) {
        expect(body).not.toContain(phrase.toLowerCase());
      }

      const allParagraphs = [
        ...(lesson.articleParagraphs || []),
        ...((lesson.summaryKind === 'Novel' ? lesson.chapterSummaries || [] : []).flatMap((chapter) => [
          ...(chapter.retellingParagraphs || []),
          ...(chapter.retelling || []),
          chapter.whatChanged,
          chapter.whyItMatters,
        ]).filter(Boolean)),
      ];

      for (const paragraph of allParagraphs) {
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

  it('does not manufacture fiction chapter retellings from whole-book notes', () => {
    const fictionSummaries = microLessons.filter((lesson) => lesson.summaryKind === 'Novel');

    expect(fictionSummaries.length).toBeGreaterThanOrEqual(10);

    for (const lesson of fictionSummaries) {
      expect(lesson.articleParagraphs.length).toBeGreaterThanOrEqual(5);
      expect(lesson.remember.length).toBeGreaterThanOrEqual(4);
      expect(lesson.expansionAvailable).toBe(true);

      if ((lesson.chapterSummaries || []).length === 0) {
        expect(lesson.chapterSummaries).toEqual([]);
        continue;
      }

      for (const chapter of lesson.chapterSummaries) {
        expect(chapter.chapterId).toMatch(lesson.slug);
        expect(chapter.displayNumber).toBeTruthy();
        expect(chapter.spoilerBoundary).toBeTruthy();
        expect(chapter.retellingParagraphs.length).toBeGreaterThanOrEqual(3);
        expect(chapter.summary).toBe(chapter.retellingParagraphs.join('\n\n'));
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

  it('does not use generated fiction chapter skeletons or whole-book source arrays as chapter retellings', () => {
    const forbiddenFictionSkeletons = [
      'The central figure or group is trying to protect something',
      'The tension rises because',
      'The story is asking the reader to notice',
      'By the end of this entry',
      'This chapter-level study note slows down',
      'This study movement opens',
    ];

    for (const lesson of microLessons.filter((item) => item.summaryKind === 'Novel')) {
      const chapterText = JSON.stringify(lesson.chapterSummaries || []);
      for (const phrase of forbiddenFictionSkeletons) {
        expect(chapterText).not.toContain(phrase);
      }

      for (const chapter of lesson.chapterSummaries || []) {
        const retelling = chapter.summary.toLowerCase();
        for (const sourceList of [lesson.summaryBullets, lesson.timeline, lesson.themeNotes]) {
          for (const sourcePhrase of sourceList || []) {
            if (sourcePhrase.length > 32) {
              expect(retelling).not.toContain(sourcePhrase.toLowerCase());
            }
          }
        }
      }
    }
  });
});
