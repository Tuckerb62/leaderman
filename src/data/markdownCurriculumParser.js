const SUBJECT_NORMALIZATIONS = new Map([
  ['Leadership Framework', 'Leadership'],
  ['Emergency Medicine and Critical Care', 'Emergency Medicine & Critical Care'],
]);

function stripMarkdownEmphasis(value = '') {
  return value.replace(/[*_`]/g, '').trim();
}

export function normalizeSubjectTitle(title = '') {
  const trimmed = stripMarkdownEmphasis(title);
  return SUBJECT_NORMALIZATIONS.get(trimmed) || trimmed;
}

export function slugify(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function subjectIdFor(subject) {
  if (subject === 'Emergency Medicine & Critical Care') return 'emergency-medicine-critical-care';
  return slugify(subject);
}

function headingFor(line) {
  const match = line.match(/^(#{1,4})\s+(.+?)\s*$/);
  if (!match) return null;
  return {
    level: match[1].length,
    title: stripMarkdownEmphasis(match[2]),
  };
}

function topLevelBulletFor(line) {
  const match = line.match(/^-\s+(.+?)\s*$/);
  return match ? stripMarkdownEmphasis(match[1]) : null;
}

function indentedBulletFor(line) {
  const match = line.match(/^\s+-\s+(.+?)\s*$/);
  if (!match || line.startsWith('-')) return null;
  return stripMarkdownEmphasis(match[1]);
}

function hierarchyPathFor(subject, path, extra = []) {
  return [subject, path.topic, path.subtopic, path.subsubtopic, ...extra].filter(Boolean);
}

function articleRecord({
  subject,
  path,
  title,
  summary,
  bodyMarkdown,
  articleType = 'standard',
  sourceFile,
  sourceContext = [],
  extraPath = [],
}) {
  const hierarchyPath = hierarchyPathFor(subject, path, extraPath);
  const slug = slugify([...hierarchyPath, title].join(' '));
  return {
    key: `article:${slug}`,
    slug,
    subject,
    subjectId: subjectIdFor(subject),
    topic: path.topic || '',
    topicId: slugify(path.topic || ''),
    subtopic: path.subtopic || '',
    subtopicId: slugify(path.subtopic || ''),
    subsubtopic: path.subsubtopic || '',
    subsubtopicId: slugify(path.subsubtopic || ''),
    title,
    summary,
    bodyMarkdown: bodyMarkdown || summary,
    articleType,
    sourceFile,
    hierarchyPath,
    sourceContext,
  };
}

function ensureUniqueArticleKeys(articles) {
  const seen = new Map();
  return articles.map((article) => {
    const count = (seen.get(article.slug) || 0) + 1;
    seen.set(article.slug, count);
    if (count === 1) return article;
    const slug = `${article.slug}-${count}`;
    return {
      ...article,
      slug,
      key: `article:${slug}`,
    };
  });
}

function finalizeStandardArticle({ articles, current, subject, path, sourceFile, sourceContext }) {
  if (!current?.title) return;
  const summary = current.summaryParts.join('\n\n').trim() || current.bodyParts.join('\n\n').trim();
  const bodyMarkdown = current.bodyParts.length
    ? [...current.summaryParts, ...current.bodyParts].filter(Boolean).join('\n\n').trim()
    : summary;
  if (!summary && !bodyMarkdown) return;
  articles.push(articleRecord({
    subject,
    path: current.path || path,
    title: current.title,
    summary,
    bodyMarkdown,
    sourceFile,
    sourceContext,
  }));
}

function parseStandardSource(markdown, { sourceFile }) {
  const articles = [];
  const sourceContext = [];
  let subject = '';
  let path = { topic: '', subtopic: '', subsubtopic: '' };
  let current = null;

  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    const trimmed = line.trim();
    if (!trimmed) continue;

    const heading = headingFor(trimmed);
    if (heading) {
      finalizeStandardArticle({ articles, current, subject, path, sourceFile, sourceContext });
      current = null;
      if (heading.level === 1) subject = normalizeSubjectTitle(heading.title);
      if (heading.level === 2) path = { topic: heading.title, subtopic: '', subsubtopic: '' };
      if (heading.level === 3) path = { ...path, subtopic: heading.title, subsubtopic: '' };
      if (heading.level === 4) path = { ...path, subsubtopic: heading.title };
      continue;
    }

    if (trimmed.startsWith('>')) {
      sourceContext.push(trimmed.replace(/^>\s?/, '').trim());
      continue;
    }

    const title = topLevelBulletFor(line);
    if (title) {
      finalizeStandardArticle({ articles, current, subject, path, sourceFile, sourceContext });
      current = {
        title,
        path: { ...path },
        summaryParts: [],
        bodyParts: [],
      };
      continue;
    }

    const summaryLine = indentedBulletFor(line);
    if (summaryLine && current) {
      current.summaryParts.push(summaryLine);
      continue;
    }

    if (current && trimmed) {
      current.bodyParts.push(trimmed);
    }
  }

  finalizeStandardArticle({ articles, current, subject, path, sourceFile, sourceContext });
  return {
    subject,
    sourceFile,
    sourceContext,
    articles: ensureUniqueArticleKeys(articles),
  };
}

function pathHasPoetry(path) {
  return [path.topic, path.subtopic, path.subsubtopic].some((value) => /poem|poetry/i.test(value || ''));
}

function splitChapterList(value = '') {
  return value
    .split(',')
    .map((chapter) => chapter.trim())
    .filter(Boolean);
}

function parseLiteratureSource(markdown, { sourceFile }) {
  const subject = 'Literature';
  const articles = [];
  const sourceContext = [];
  let path = { topic: '', subtopic: '', subsubtopic: '' };
  let currentBook = null;

  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    const trimmed = line.trim();
    if (!trimmed) continue;

    const heading = headingFor(trimmed);
    if (heading) {
      currentBook = null;
      if (heading.level === 2) path = { topic: heading.title, subtopic: '', subsubtopic: '' };
      if (heading.level === 3) path = { ...path, subtopic: heading.title, subsubtopic: '' };
      if (heading.level === 4) path = { ...path, subsubtopic: heading.title };
      continue;
    }

    if (trimmed.startsWith('>')) {
      sourceContext.push(trimmed.replace(/^>\s?/, '').trim());
      continue;
    }

    const bookTitle = topLevelBulletFor(line);
    if (bookTitle) {
      currentBook = pathHasPoetry(path) ? null : bookTitle;
      continue;
    }

    const chapters = indentedBulletFor(line);
    if (!chapters || !currentBook || pathHasPoetry(path)) continue;

    for (const chapterTitle of splitChapterList(chapters)) {
      const title = `${currentBook}: ${chapterTitle}`;
      const summary = `Reader guide seed for ${currentBook}, ${chapterTitle}.`;
      articles.push(articleRecord({
        subject,
        path,
        title,
        summary,
        bodyMarkdown: summary,
        articleType: 'literature',
        sourceFile,
        sourceContext,
        extraPath: [currentBook],
      }));
    }
  }

  return {
    subject,
    sourceFile,
    sourceContext,
    articles: ensureUniqueArticleKeys(articles),
  };
}

export function parseMarkdownCurriculumSource(markdown, { sourceFile = 'unknown.md' } = {}) {
  const firstHeading = markdown.match(/^#\s+(.+?)\s*$/m)?.[1] || '';
  const normalizedSubject = normalizeSubjectTitle(firstHeading);
  if (normalizedSubject === 'Literature') {
    return parseLiteratureSource(markdown, { sourceFile });
  }
  return parseStandardSource(markdown, { sourceFile });
}
