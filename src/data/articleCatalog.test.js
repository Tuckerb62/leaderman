import { describe, expect, it } from 'vitest';
import {
  articleByKey,
  articleBySlug,
  articleHierarchy,
  articles,
  calculateArticleProgress,
  getSubjectProgress,
  searchArticles,
  TOP_LEVEL_SUBJECTS,
} from './articleCatalog.js';

describe('article catalog', () => {
  it('builds the requested top-level markdown subject hierarchy', () => {
    expect(TOP_LEVEL_SUBJECTS.map((subject) => subject.title)).toEqual([
      'Leadership',
      'Politics',
      'Philosophy',
      'Science',
      'Emergency Medicine & Critical Care',
      'History',
      'Literature',
    ]);
    expect(articleHierarchy.map((subject) => subject.title)).toEqual(TOP_LEVEL_SUBJECTS.map((subject) => subject.title));
    expect(articleHierarchy.find((subject) => subject.id === 'leadership')?.topics[0]).toMatchObject({
      title: 'Leadership Foundations',
    });
  });

  it('indexes articles by stable article key and slug', () => {
    const leadershipArticle = articles.find((article) => article.title === 'Who Gets to Give Orders? Understanding Authority in Leadership');
    const uniqueKeys = new Set(articles.map((article) => article.key));
    const uniqueSlugs = new Set(articles.map((article) => article.slug));

    expect(uniqueKeys.size).toBe(articles.length);
    expect(uniqueSlugs.size).toBe(articles.length);
    expect(leadershipArticle).toBeTruthy();
    expect(leadershipArticle.key).toMatch(/^article:/);
    expect(articleByKey[leadershipArticle.key]).toBe(leadershipArticle);
    expect(articleBySlug[leadershipArticle.slug]).toBe(leadershipArticle);
    expect(leadershipArticle.hierarchyPath).toEqual([
      'Leadership',
      'Leadership Foundations',
      'Core Leadership Concepts',
    ]);
  });

  it('uses the Emergency Medicine source file as the domain source of truth', () => {
    const emergency = articles.find((article) => article.subject === 'Emergency Medicine & Critical Care');

    expect(emergency).toBeTruthy();
    expect(emergency.sourceFile).toBe('emergency_medicine_critical_care_microlearning.md');
    expect(emergency.sourceContext.join(' ')).toContain('not patient-specific medical advice');
  });

  it('keeps Science articles even when summaries are generic or rough', () => {
    const science = articles.find((article) => article.subject === 'Science' && article.title.includes('Food Webs'));

    expect(science).toBeTruthy();
    expect(science.summary).toContain('describes how organisms interact');
    expect(science.bodyMarkdown).toBe(science.summary);
  });

  it('creates literature chapter articles and excludes poetry catalog content', () => {
    const gatsby = articles.find((article) => article.title === 'The Great Gatsby: Chapter 1');

    expect(gatsby).toMatchObject({
      subject: 'Literature',
      articleType: 'literature',
      sourceFile: 'literature_chapter_library_continued.md',
    });
    expect(articles.some((article) => /Leaves of Grass|Song of Myself|Poetry/i.test(article.title))).toBe(false);
  });

  it('searches across subject, path, title, and summary', () => {
    const results = searchArticles('core leadership authority');

    expect(results.some((article) => article.title === 'Who Gets to Give Orders? Understanding Authority in Leadership')).toBe(true);
  });

  it('calculates article progress from article keys', () => {
    const leadershipArticles = articles.filter((article) => article.subjectId === 'leadership');
    const completedArticlesByKey = {
      [leadershipArticles[0].key]: {
        completed: true,
        completedAt: '2026-06-09T12:00:00.000Z',
      },
    };

    const progress = calculateArticleProgress(leadershipArticles, completedArticlesByKey);
    const subjectProgress = getSubjectProgress('leadership', completedArticlesByKey);

    expect(progress.completed).toBe(1);
    expect(progress.total).toBe(leadershipArticles.length);
    expect(progress.percent).toBe(Math.round((1 / leadershipArticles.length) * 100));
    expect(subjectProgress.completed).toBe(1);
  });
});
