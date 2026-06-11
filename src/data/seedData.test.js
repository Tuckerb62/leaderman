import { describe, expect, it } from 'vitest';
import { createInitialState, domains, microLessons, philosophySchools } from './seedData.js';

describe('seed lesson articles', () => {
  it('starts with empty article-keyed local-first state slices', () => {
    const state = createInitialState();

    expect(state.completedArticlesByKey).toEqual({});
    expect(state.generatedArticlesByKey).toEqual({});
    expect(state.articleTutorThreadsByKey).toEqual({});
    expect(state.notes).toEqual({});
    expect(state.noteUpdatedAtByKey).toEqual({});
    expect(state.aiChatMessages).toEqual([]);
    expect(state.savedItems).toEqual({});
  });

  it('expands every lesson into a source-grounded article', () => {
    // 3 hand-written leadership lessons + 21 World History summaries
    expect(microLessons.length).toBeGreaterThanOrEqual(24);

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

  it('exports philosophy school metadata for the UI', () => {
    const stoicism = philosophySchools.find((school) => school.id === 'stoicism');

    expect(domains).toContain('Philosophy');
    expect(philosophySchools.length).toBeGreaterThanOrEqual(8);
    expect(stoicism?.lessonSlugs.length).toBeGreaterThanOrEqual(3);
    // Philosophy lessons are now empty slots (generated on demand) rather than seeded prose
    expect(microLessons.filter((lesson) => lesson.domain === 'Philosophy').length).toBe(0);
  });

  it('retains the one hand-written Self-Help lesson; domain list covers all tracks', () => {
    // Self-Help, Literature, History are valid domains in the domain registry
    for (const domain of ['Self-Help', 'Literature', 'History']) {
      expect(domains).toContain(domain);
    }
    // Only habit-identity survived the filler cull from the Self-Help track
    expect(microLessons.filter((lesson) => lesson.domain === 'Self-Help').length).toBe(1);
    expect(microLessons.find((lesson) => lesson.slug === 'habit-identity')?.sourceBasis).toContain('Atomic Habits');
    // Literature and History leadership lessons are now generatable slots, not seeded prose
    expect(microLessons.filter((lesson) => lesson.domain === 'Literature').length).toBe(0);
    expect(microLessons.filter((lesson) => lesson.domain === 'History').length).toBe(0);
  });

  it('keeps world history summaries while removing legacy novel-summary lessons', () => {
    const worldHistory = microLessons.filter((lesson) => lesson.domain === 'World History');

    expect(domains).toContain('World History');
    expect(worldHistory.length).toBeGreaterThanOrEqual(21);
    expect(microLessons.every((lesson) => lesson.domain !== 'Novel Summaries')).toBe(true);
    expect(microLessons.every((lesson) => lesson.summaryKind !== 'Novel')).toBe(true);
    expect(worldHistory.every((lesson) => lesson.summaryKind === 'History')).toBe(true);
    expect(microLessons.find((lesson) => lesson.slug === 'history-sengoku-japan')?.sourceBasis).toContain('Sengoku Japan and Unification');
    expect(microLessons.find((lesson) => lesson.slug === 'history-roman-empire')?.sourceBasis).toContain('The Roman Empire');
    expect(microLessons.find((lesson) => lesson.slug === 'history-julius-caesar')?.reflectionLens).toContain('Caesar is a good example');
    expect(microLessons.find((lesson) => lesson.slug === 'history-augustus')?.collectionTitle).toBe('Roman Emperors');
  });

  it('does not keep legacy fiction chapter-retelling lessons in seed state', () => {
    expect(microLessons.filter((item) => item.summaryKind === 'Novel')).toEqual([]);
    expect(microLessons.every((lesson) => lesson.domain !== 'Novel Summaries')).toBe(true);
  });

  it('creates a local-first initial state with the new canonical feed slices', () => {
    const state = createInitialState();

    expect(state.schemaVersion).toBe(2);
    expect(state.followedTopics).toEqual({});
    expect(state.savedItems).toEqual({});
    expect(state.dismissedItems).toEqual({});
    expect(state.itemActivity).toEqual({});
  });
});
