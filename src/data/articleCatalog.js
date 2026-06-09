import emergencyMarkdown from './sources/emergency_medicine_critical_care_microlearning.md?raw';
import historyMarkdown from './sources/history_microlearning_final.md?raw';
import leadershipMarkdown from './sources/leadership-framework-complete.md?raw';
import literatureMarkdown from './sources/literature_chapter_library_continued.md?raw';
import philosophyMarkdown from './sources/philosophy_microlearning_library_unique.md?raw';
import politicsMarkdown from './sources/politics_microlearning_completed.md?raw';
import scienceMarkdown from './sources/science_microlearning_finished.md?raw';
import { parseMarkdownCurriculumSource, slugify } from './markdownCurriculumParser.js';

export const TOP_LEVEL_SUBJECTS = [
  { id: 'leadership', title: 'Leadership' },
  { id: 'politics', title: 'Politics' },
  { id: 'philosophy', title: 'Philosophy' },
  { id: 'science', title: 'Science' },
  { id: 'emergency-medicine-critical-care', title: 'Emergency Medicine & Critical Care' },
  { id: 'history', title: 'History' },
  { id: 'literature', title: 'Literature' },
];

const SOURCE_DEFINITIONS = [
  { sourceFile: 'leadership-framework-complete.md', markdown: leadershipMarkdown },
  { sourceFile: 'politics_microlearning_completed.md', markdown: politicsMarkdown },
  { sourceFile: 'philosophy_microlearning_library_unique.md', markdown: philosophyMarkdown },
  { sourceFile: 'science_microlearning_finished.md', markdown: scienceMarkdown },
  { sourceFile: 'emergency_medicine_critical_care_microlearning.md', markdown: emergencyMarkdown },
  { sourceFile: 'history_microlearning_final.md', markdown: historyMarkdown },
  { sourceFile: 'literature_chapter_library_continued.md', markdown: literatureMarkdown },
];

export const parsedSources = SOURCE_DEFINITIONS.map((source) => parseMarkdownCurriculumSource(source.markdown, {
  sourceFile: source.sourceFile,
}));

const subjectOrder = new Map(TOP_LEVEL_SUBJECTS.map((subject, index) => [subject.id, index]));

export const articles = parsedSources
  .flatMap((source) => source.articles)
  .sort((left, right) => {
    const subjectDelta = (subjectOrder.get(left.subjectId) ?? 999) - (subjectOrder.get(right.subjectId) ?? 999);
    return subjectDelta;
  });

export const articleByKey = Object.fromEntries(articles.map((article) => [article.key, article]));
export const articleBySlug = Object.fromEntries(articles.map((article) => [article.slug, article]));

function emptySubjectNode(subject) {
  return {
    ...subject,
    articleCount: 0,
    topics: [],
  };
}

function findOrCreate(collection, id, create) {
  let item = collection.find((entry) => entry.id === id);
  if (!item) {
    item = create();
    collection.push(item);
  }
  return item;
}

function buildHierarchy(allArticles) {
  const subjects = TOP_LEVEL_SUBJECTS.map(emptySubjectNode);
  for (const article of allArticles) {
    const subject = findOrCreate(subjects, article.subjectId, () => emptySubjectNode({
      id: article.subjectId,
      title: article.subject,
    }));
    subject.articleCount += 1;

    const topic = findOrCreate(subject.topics, article.topicId, () => ({
      id: article.topicId,
      title: article.topic,
      articleCount: 0,
      subtopics: [],
      articles: [],
    }));
    topic.articleCount += 1;
    topic.articles.push(article);

    const subtopic = findOrCreate(topic.subtopics, article.subtopicId || 'all', () => ({
      id: article.subtopicId || 'all',
      title: article.subtopic || 'General',
      articleCount: 0,
      subsubtopics: [],
      articles: [],
    }));
    subtopic.articleCount += 1;
    subtopic.articles.push(article);

    if (article.subsubtopicId) {
      const subsubtopic = findOrCreate(subtopic.subsubtopics, article.subsubtopicId, () => ({
        id: article.subsubtopicId,
        title: article.subsubtopic,
        articleCount: 0,
        articles: [],
      }));
      subsubtopic.articleCount += 1;
      subsubtopic.articles.push(article);
    }
  }
  return subjects;
}

export const articleHierarchy = buildHierarchy(articles);

function buildInterestChildren(topicOrSubtopic) {
  if (!topicOrSubtopic?.subtopics) return [];

  return topicOrSubtopic.subtopics.flatMap((subtopic) => {
    const subsubtopics = (subtopic.subsubtopics || []).map((subsubtopic) => ({
      id: subsubtopic.id,
      title: subsubtopic.title,
      articleCount: subsubtopic.articleCount,
      children: [],
    }));

    if (subtopic.id === 'all' && subtopic.title === 'General') {
      return subsubtopics;
    }

    return [{
      id: subtopic.id,
      title: subtopic.title,
      articleCount: subtopic.articleCount,
      children: subsubtopics,
    }];
  });
}

export const interestSubjectHierarchy = articleHierarchy
  .filter((subject) => subject.id !== 'emergency-medicine-critical-care')
  .map((subject) => ({
    id: subject.id,
    title: subject.title,
    articleCount: subject.articleCount,
    topics: subject.topics.map((topic) => ({
      id: topic.id,
      title: topic.title,
      articleCount: topic.articleCount,
      children: buildInterestChildren(topic),
    })),
  }));

export function articlesForSubject(subjectId, allArticles = articles) {
  return allArticles.filter((article) => article.subjectId === subjectId);
}

export function searchArticles(query, allArticles = articles) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return allArticles;
  const terms = normalized.split(/\s+/).filter(Boolean);
  return allArticles.filter((article) => {
    const text = [
      article.subject,
      article.topic,
      article.subtopic,
      article.subsubtopic,
      article.title,
      article.summary,
      article.hierarchyPath.join(' '),
    ].join(' ').toLowerCase();
    return terms.every((term) => text.includes(term));
  });
}

export function isArticleCompleted(articleKey, completedArticlesByKey = {}) {
  return Boolean(completedArticlesByKey?.[articleKey]?.completed);
}

export function calculateArticleProgress(allArticles = [], completedArticlesByKey = {}) {
  const total = allArticles.length;
  const completed = allArticles.filter((article) => isArticleCompleted(article.key, completedArticlesByKey)).length;
  return {
    completed,
    total,
    percent: total ? Math.round((completed / total) * 100) : 0,
  };
}

export function getSubjectProgress(subjectId, completedArticlesByKey = {}) {
  return calculateArticleProgress(articlesForSubject(subjectId), completedArticlesByKey);
}

export function getTopicProgress(subjectId, topicId, completedArticlesByKey = {}) {
  return calculateArticleProgress(
    articles.filter((article) => article.subjectId === subjectId && article.topicId === topicId),
    completedArticlesByKey,
  );
}

export function getSubtopicProgress(subjectId, topicId, subtopicId, completedArticlesByKey = {}) {
  return calculateArticleProgress(
    articles.filter((article) => (
      article.subjectId === subjectId
      && article.topicId === topicId
      && article.subtopicId === subtopicId
    )),
    completedArticlesByKey,
  );
}

export function progressContextForArticle(article, completedArticlesByKey = {}) {
  return {
    subjectProgress: getSubjectProgress(article.subjectId, completedArticlesByKey).percent,
    topicProgress: getTopicProgress(article.subjectId, article.topicId, completedArticlesByKey).percent,
    subtopicProgress: getSubtopicProgress(article.subjectId, article.topicId, article.subtopicId, completedArticlesByKey).percent,
  };
}

export function articlePathLabel(article, { omitSubject = false } = {}) {
  const path = omitSubject ? article.hierarchyPath.slice(1) : article.hierarchyPath;
  return path.filter(Boolean).join(': ');
}

function cleanLiteraturePathSegments(path = []) {
  if (path[0]?.toLowerCase().includes('chapter-by-chapter')) {
    return path.slice(1);
  }
  return path;
}

export function articleFeedPathLabel(article) {
  const path = article.hierarchyPath.slice(1).filter(Boolean);
  return (article.articleType === 'literature' ? cleanLiteraturePathSegments(path) : path).join(': ');
}

const ORDINAL_WORD_MAP = new Map([
  ['first', '1'],
  ['second', '2'],
  ['third', '3'],
  ['fourth', '4'],
  ['fifth', '5'],
  ['sixth', '6'],
  ['seventh', '7'],
  ['eighth', '8'],
  ['ninth', '9'],
  ['tenth', '10'],
  ['one', '1'],
  ['two', '2'],
  ['three', '3'],
  ['four', '4'],
  ['five', '5'],
  ['six', '6'],
  ['seven', '7'],
  ['eight', '8'],
  ['nine', '9'],
  ['ten', '10'],
]);

export function humanizeLiteratureLabel(value = '') {
  return value.replace(/\b(Book|Part)\s+(?:the\s+)?(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)\b/gi, (match, prefix, ordinalWord) => {
    const number = ORDINAL_WORD_MAP.get(String(ordinalWord).toLowerCase());
    return number ? `${prefix} ${number}` : match;
  });
}

export function subjectIdForTitle(title) {
  return slugify(title);
}
