import { describe, expect, it } from 'vitest';
import {
  normalizeSubjectTitle,
  parseMarkdownCurriculumSource,
} from './markdownCurriculumParser.js';

describe('markdown curriculum parser', () => {
  it('parses standard heading and bullet sources into article records', () => {
    const markdown = [
      '# Leadership Framework',
      '',
      '## Leadership Foundations',
      '',
      '### Core Leadership Concepts',
      '',
      '- Who Gets to Give Orders?',
      '  - Authority is the recognized right to make decisions.',
      '',
      '#### Deeper Branch',
      '',
      '- Path-Based Slugs Matter',
      '  - The same title should not collide across hierarchy branches.',
      'A longer body paragraph appears after the summary.',
    ].join('\n');

    const result = parseMarkdownCurriculumSource(markdown, {
      sourceFile: 'leadership-framework-complete.md',
    });

    expect(result.subject).toBe('Leadership');
    expect(result.articles).toHaveLength(2);
    expect(result.articles[0]).toMatchObject({
      key: 'article:leadership-leadership-foundations-core-leadership-concepts-who-gets-to-give-orders',
      subject: 'Leadership',
      subjectId: 'leadership',
      topic: 'Leadership Foundations',
      topicId: 'leadership-foundations',
      subtopic: 'Core Leadership Concepts',
      subtopicId: 'core-leadership-concepts',
      title: 'Who Gets to Give Orders?',
      summary: 'Authority is the recognized right to make decisions.',
      bodyMarkdown: 'Authority is the recognized right to make decisions.',
      articleType: 'standard',
      sourceFile: 'leadership-framework-complete.md',
      hierarchyPath: ['Leadership', 'Leadership Foundations', 'Core Leadership Concepts'],
    });
    expect(result.articles[1]).toMatchObject({
      subsubtopic: 'Deeper Branch',
      subsubtopicId: 'deeper-branch',
      bodyMarkdown: [
        'The same title should not collide across hierarchy branches.',
        'A longer body paragraph appears after the summary.',
      ].join('\n\n'),
      hierarchyPath: ['Leadership', 'Leadership Foundations', 'Core Leadership Concepts', 'Deeper Branch'],
    });
  });

  it('normalizes Emergency Medicine and captures source-level blockquotes as context', () => {
    const markdown = [
      '# Emergency Medicine and Critical Care',
      '',
      '> Educational only. Not patient-specific advice.',
      '',
      '## Emergency Medicine Foundations',
      '',
      '### Emergency Thinking and First-Pass Care',
      '',
      '- The Emergency Mindset',
      '  - Find the threat before the diagnosis.',
    ].join('\n');

    const result = parseMarkdownCurriculumSource(markdown, {
      sourceFile: 'emergency_medicine_critical_care_microlearning.md',
    });

    expect(normalizeSubjectTitle('Emergency Medicine and Critical Care')).toBe('Emergency Medicine & Critical Care');
    expect(result.subject).toBe('Emergency Medicine & Critical Care');
    expect(result.sourceContext).toEqual(['Educational only. Not patient-specific advice.']);
    expect(result.articles[0]).toMatchObject({
      subject: 'Emergency Medicine & Critical Care',
      subjectId: 'emergency-medicine-critical-care',
      sourceContext: ['Educational only. Not patient-specific advice.'],
    });
  });

  it('creates literature articles per chapter and skips poetry branches', () => {
    const markdown = [
      '# Literature',
      '',
      '## Chapter-by-Chapter Novel Retellings',
      '',
      '### Classic Novels',
      '',
      '#### American Classics',
      '',
      '- The Great Gatsby',
      '  - Chapter 1, Chapter 2',
      '',
      '## Chapter-by-Chapter Poetry Retellings',
      '',
      '### Poetry Collections',
      '',
      '- Leaves of Grass',
      '  - Song of Myself',
    ].join('\n');

    const result = parseMarkdownCurriculumSource(markdown, {
      sourceFile: 'literature_chapter_library_continued.md',
    });

    expect(result.articles.map((article) => article.title)).toEqual([
      'The Great Gatsby: Chapter 1',
      'The Great Gatsby: Chapter 2',
    ]);
    expect(result.articles.every((article) => article.articleType === 'literature')).toBe(true);
    expect(result.articles[0]).toMatchObject({
      topic: 'Chapter-by-Chapter Novel Retellings',
      subtopic: 'Classic Novels',
      subsubtopic: 'American Classics',
      summary: 'Reader guide seed for The Great Gatsby, Chapter 1.',
      bodyMarkdown: 'Reader guide seed for The Great Gatsby, Chapter 1.',
      hierarchyPath: ['Literature', 'Chapter-by-Chapter Novel Retellings', 'Classic Novels', 'American Classics', 'The Great Gatsby'],
    });
    expect(result.articles.some((article) => article.title.includes('Leaves of Grass'))).toBe(false);
  });
});
