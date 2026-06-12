const HEADING_PATTERN = /^#{1,3}\s+(.+?)\s*$/;

const KNOWN_KEYS = new Map([
  ['quick version', 'quickVersion'],
  ['deeper read', 'deeperRead'],
  ['historical read', 'historicalRead'],
  ['historical narrative', 'historicalNarrative'],
  ['short story retelling', 'shortStoryRetelling'],
  ['story retelling', 'storyRetelling'],
  ['story overview', 'storyOverview'],
  ['main characters', 'mainCharacters'],
  ['main tensions', 'mainTensions'],
  ['what changed', 'whatChanged'],
  ['why it matters', 'whyItMatters'],
  ['break down', 'breakDown'],
  ['reader guide', 'readerGuide'],
  ['remember', 'remember'],
  ['keep in mind', 'keepInMind'],
  ['questions', 'questions'],
]);

const LIST_KEYS = new Set([
  'quickVersion',
  'breakDown',
  'readerGuide',
  'remember',
  'keepInMind',
  'mainCharacters',
  'mainTensions',
]);

const PROSE_KEYS = new Set([
  'deeperRead',
  'historicalRead',
  'historicalNarrative',
  'shortStoryRetelling',
  'storyRetelling',
  'storyOverview',
]);

const NOVEL_ALLOWED_SECTION_KEYS = new Set(['shortStoryRetelling', 'storyRetelling']);

const NOVEL_LEGACY_SECTION_LABELS = new Set([
  'what changed',
  'why it matters',
  'reader guide',
  'keep in mind',
  'main characters',
  'main tensions',
  'story retelling',
  'short story retelling',
  'chapter 1 guide',
  'chapter guide',
  "huck's point of view",
  'huckleberry finn point of view',
  'what happened in this chapter',
  'what happens in this chapter',
  'why this chapter matters',
  'what this chapter gives',
  'what matters now',
  'what this chapter means',
  'common reading trap',
  'in one sentence',
  'key things to notice',
  'what is this chapter doing',
  'what this chapter does',
  'what this chapter is doing',
  'what this chapter means',
]);

function normalizeLegacyNovelSectionLabel(line = '') {
  return line
    .replace(/^\s*[-*+]\s*/, '')
    .replace(/^\d+[.)]\s*/, '')
    .replace(/^#{1,3}\s+/, '')
    .replace(/^[>\s]*\+?\s*/, '')
    .replace(/[`‘’“”]/g, '')
    .replace(/[\*_`~]/g, '')
    .replace(/^"|"$|^'|'$/g, '')
    .replace(/\s*[:：]\s*$/g, '')
    .trim()
    .toLowerCase();
}

function isNovelLegacySectionLabel(line = '') {
  const normalized = normalizeLegacyNovelSectionLabel(line);
  if (!normalized) return false;

  if (normalized.length > 140) return false;
  if (normalized.split(/\s+/).length > 10) return false;

  if (NOVEL_LEGACY_SECTION_LABELS.has(normalized)) return true;
  if (/^chapter\s+\d+\b.*\bguide\b/.test(normalized)) return true;
  if (/^chapter\s+\d+/.test(normalized) && normalized.includes('guide')) return true;
  if (/^what .* chapter matters$/.test(normalized)) return true;
  if (/^why .* chapter matters$/.test(normalized)) return true;
  if (/^what .* chapter (happened|happens|happening|gives|does|is doing|matters|means)/.test(normalized)) return true;
  if (/^how .* chapter/.test(normalized)) return true;
  if (/^the chapter is not?/.test(normalized)) return true;
  if (/^common reading trap$/.test(normalized)) return true;
  if (/^in one sentence$/.test(normalized)) return true;

  return false;
}

export function normalizeNovelOutputMarkdown(markdown = '') {
  const parsed = parseExpansionMarkdown(markdown, { mode: 'novel' });
  const section = parsed.sections?.[0];
  if (!section) return '';

  const body = (section.paragraphs?.length
    ? section.paragraphs.join('\n\n')
    : (section.text || section.raw || '').trim())
    .trim();

  if (!body) return '';
  const heading = NOVEL_ALLOWED_SECTION_KEYS.has(section.key)
    ? section.heading
    : 'Short Story Retelling';
  return `## ${heading}\n\n${body}`;
}

function stripLegacyNovelSectionLabels(text = '') {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => !isNovelLegacySectionLabel(line))
    .join('\n')
    .trim();
}

function normalizeHeading(heading = '') {
  return heading
    .replace(/[*_`]/g, '')
    .replace(/:$/, '')
    .trim();
}

function keyFromHeading(heading) {
  const normalized = normalizeHeading(heading).toLowerCase();
  if (KNOWN_KEYS.has(normalized)) return KNOWN_KEYS.get(normalized);
  return normalized
    .replace(/[^a-z0-9]+(.)/g, (_, letter) => letter.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}

function stripBullet(line) {
  return line.replace(/^[-*]\s+/, '').replace(/^\d+[.)]\s+/, '').trim();
}

function nonEmptyLines(content) {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseItems(content) {
  const lines = nonEmptyLines(content);
  return lines.map(stripBullet).filter(Boolean);
}

function parseParagraphs(content) {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n+/g, ' ').trim())
    .filter(Boolean);
}

function parseQuestions(content) {
  return parseItems(content).map((item) => {
    const typed = item.match(/^([A-Za-z][A-Za-z /-]{1,32}):\s*(.+)$/);
    if (!typed) return { type: 'Question', prompt: item };
    return {
      type: typed[1].trim(),
      prompt: typed[2].trim(),
    };
  });
}

function parseSection({ heading, content }) {
  const normalizedHeading = normalizeHeading(heading);
  const key = keyFromHeading(normalizedHeading);
  const trimmedContent = content.trim();
  const base = {
    key,
    heading: normalizedHeading,
    raw: trimmedContent,
  };

  if (key === 'questions') {
    return {
      ...base,
      kind: 'questions',
      questions: parseQuestions(trimmedContent),
    };
  }

  if (LIST_KEYS.has(key)) {
    return {
      ...base,
      kind: 'list',
      items: parseItems(trimmedContent),
    };
  }

  if (PROSE_KEYS.has(key)) {
    return {
      ...base,
      kind: 'prose',
      paragraphs: parseParagraphs(trimmedContent),
    };
  }

  const paragraphs = parseParagraphs(trimmedContent);
  return {
    ...base,
    kind: paragraphs.length > 1 ? 'prose' : 'text',
    text: paragraphs.join('\n\n'),
    paragraphs,
  };
}

function normalizeMarkdownForNovel(sections = []) {
  if (sections.length === 0) {
    return '';
  }

  const primaryNovelSections = sections.filter((section) =>
    NOVEL_ALLOWED_SECTION_KEYS.has(section.key),
  );
  const selectedSections = primaryNovelSections.length > 0 ? primaryNovelSections : sections;

  const contentPieces = selectedSections
    .filter((section) => section.key !== 'questions')
    .map((section) => section.raw.trim())
    .filter(Boolean)
    .join('\n\n');

  return stripLegacyNovelSectionLabels(contentPieces);
}

export function parseExpansionMarkdown(markdown = '', options = {}) {
  const mode = options?.mode || 'default';
  const sections = [];
  let current = null;

  for (const line of markdown.split('\n')) {
    const heading = line.match(HEADING_PATTERN);
    if (heading) {
      if (current) sections.push(parseSection(current));
      current = {
        heading: heading[1],
        content: '',
      };
      continue;
    }

    if (!current) {
      if (line.trim()) {
        current = {
          heading: 'Expanded Draft',
          content: `${line}\n`,
        };
      }
      continue;
    }

    current.content += `${line}\n`;
  }

  if (current) sections.push(parseSection(current));

  if (mode === 'novel') {
    const mergedMarkdown = normalizeMarkdownForNovel(sections);
    if (!mergedMarkdown) {
      return {
        sections: [],
        byKey: {},
      };
    }

    const shortStorySection = parseSection({
      heading: 'Short Story Retelling',
      content: mergedMarkdown,
    });

    return {
      sections: [shortStorySection],
      byKey: {
        [shortStorySection.key]: shortStorySection,
      },
    };
  }

  return {
    sections,
    byKey: Object.fromEntries(sections.map((section) => [section.key, section])),
  };
}
