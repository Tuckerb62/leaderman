import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AI_MODEL_OPTIONS,
  DEFAULT_AI_SETTINGS,
  EXPANSION_OVERVIEW_PROMPT,
  askOpenAI,
  buildExpansionOverviewPrompt,
  buildExpansionPrompt,
  buildArticleExpansionInput,
  buildArticleAiInstructions,
  buildArticleTutorInstructions,
  buildAiInstructions,
  buildResponseInput,
  expandLearningContent,
  expandArticleFromMarkdown,
  askArticleTutor,
  extractResponseText,
  looksLikeOpenAiKey,
  requiresClientApiKey,
  validateApiKey,
} from './aiClient.js';

const lesson = {
  title: 'Control What Is Yours',
  domain: 'Philosophy',
  coreIdea: 'Separate what depends on your judgment from what belongs to fortune.',
  sourceBasis: ['Stoicism', 'The Enchiridion'],
  historicalExample: { title: 'Epictetus under empire' },
  scenario: 'A public criticism lands before an important decision.',
  practiceRep: 'Write two columns.',
  reviewPrompt: 'Stoic control is disciplined authorship of your response.',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ai client helpers', () => {
  it('builds lesson-grounded instructions without asking the model to invent facts', () => {
    const instructions = buildAiInstructions(lesson, true);

    expect(instructions).toContain('Curiosity is a local-first personal learning cockpit');
    expect(instructions).toContain('source cards, article-style lessons, historical examples');
    expect(instructions).toContain('Control What Is Yours');
    expect(instructions).toContain('Epictetus under empire');
    expect(instructions).toContain('Do not invent book quotes');
    expect(instructions).toContain('Distinguish source-grounded points from your own inference');
    expect(instructions).toContain('Quick version, Deeper read, Break Down, Remember, and Questions');
    expect(instructions).toContain('Do not pad lessons with repeated copyright, fidelity, or caution boilerplate');
  });

  it('offers curated model choices with the default model included', () => {
    expect(AI_MODEL_OPTIONS.map((option) => option.id)).toContain(DEFAULT_AI_SETTINGS.model);
    expect(AI_MODEL_OPTIONS[0].id).toBe(DEFAULT_AI_SETTINGS.model);
    expect(DEFAULT_AI_SETTINGS.model).toBe('gpt-5.4');
  });

  it('uses Curiosity as the visible AI product name', () => {
    const instructions = buildAiInstructions(lesson, true);
    const overview = buildExpansionOverviewPrompt();

    expect(instructions).toContain('Curiosity AI Coach');
    expect(instructions).toContain('Curiosity is a local-first personal learning cockpit');
    expect(instructions).not.toContain('Leaderman is a local-first leadership formation app');
    expect(overview).toContain('Curiosity AI expansion engine');
    expect(overview).not.toContain('Leaderman AI expansion engine');
  });

  it('builds recent chat input for the Responses API', () => {
    const input = buildResponseInput(
      [
        { role: 'user', content: 'Explain Stoicism.' },
        { role: 'assistant', content: 'It starts with judgment.' },
      ],
      'Give me a drill.',
    );

    expect(input).toEqual([
      { role: 'user', content: 'Explain Stoicism.' },
      { role: 'assistant', content: 'It starts with judgment.' },
      { role: 'user', content: 'Give me a drill.' },
    ]);
  });

  it('extracts direct output text from a Responses API payload', () => {
    expect(extractResponseText({ output_text: '  A clear answer. ' })).toBe('A clear answer.');
  });

  it('extracts nested text from a Responses API payload', () => {
    expect(
      extractResponseText({
        output: [
          {
            content: [{ text: 'First part.' }, { text: { value: 'Second part.' } }],
          },
        ],
      }),
    ).toBe('First part.\nSecond part.');
  });

  it('only requires browser-held keys for absolute API endpoints', () => {
    expect(requiresClientApiKey('/api/openai-responses')).toBe(false);
    expect(requiresClientApiKey('https://api.openai.com/v1/responses')).toBe(true);
  });

  it('defaults to calling OpenAI directly from the browser', () => {
    expect(DEFAULT_AI_SETTINGS.endpoint).toBe('https://api.openai.com/v1/responses');
    expect(requiresClientApiKey(DEFAULT_AI_SETTINGS.endpoint)).toBe(true);
  });

  it('recognizes plausible OpenAI key shapes', () => {
    expect(looksLikeOpenAiKey('sk-proj-abc123def456')).toBe(true);
    expect(looksLikeOpenAiKey('not-a-key')).toBe(false);
    expect(looksLikeOpenAiKey('')).toBe(false);
  });

  it('rejects malformed keys before contacting OpenAI', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    await expect(validateApiKey('garbage')).rejects.toThrow('start with "sk-"');
    await expect(validateApiKey('')).rejects.toThrow('Paste an API key first.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('checks a plausible key against the OpenAI models endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    globalThis.fetch = fetchMock;

    await expect(validateApiKey('sk-proj-abc123def456')).resolves.toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.openai.com/v1/models');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer sk-proj-abc123def456');
  });

  it('reports a rejected key plainly', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });

    await expect(validateApiKey('sk-proj-abc123def456')).rejects.toThrow('OpenAI rejected this key');
  });

  it('sends the Curiosity overview and chosen model in the OpenAI request body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: 'Answer.' }),
    });
    globalThis.fetch = fetchMock;

    await askOpenAI({
      apiKey: '',
      endpoint: '/api/openai-responses',
      model: 'gpt-5-mini',
      messages: [],
      question: 'Explain legitimacy.',
      lesson,
      includeLessonContext: true,
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe('gpt-5-mini');
    expect(body.instructions).toContain('Curiosity is a local-first personal learning cockpit');
    expect(body.instructions).toContain('Do not invent book quotes');
    expect(body.instructions).toContain('Control What Is Yours');
  });

  it('builds a reusable expansion overview prompt with content-quality instructions', () => {
    const overview = buildExpansionOverviewPrompt();

    expect(overview).toContain('Curiosity AI expansion engine');
    expect(overview).toContain('Turn thin local-first learning content into deeper microlearning content');
    expect(overview).toContain('Do not pad with repeated copyright');
    expect(overview).toContain('For fiction, write compressed story retellings');
    expect(overview).toContain('Return only the requested Markdown draft');
    expect(overview).toContain('# Output Contract');
    expect(overview).toContain('Use exactly the Markdown section headings requested by the user input');
    expect(overview).toContain('# Nonfiction Lesson Rules');
    expect(overview).toContain('one practical decision rule');
    expect(overview).toContain('# History Rules');
    expect(overview).toContain('Preserve contingency, incentives, tradeoffs');
    expect(overview).toContain('# Question Rules');
    expect(overview).toContain('Nonfiction questions should usually include recall, scenario/application, judgment/tradeoff, and reflection');
    expect(overview).toContain('Do not add questions to fiction or novel reading outputs unless the user explicitly asks for them');
    expect(overview).not.toContain('Fiction questions should usually include plot');
    expect(overview).toContain('Do not explain app gestures, swipes, or UI mechanics inside learning content');
    expect(overview).toBe(EXPANSION_OVERVIEW_PROMPT);
  });

  it('builds novel chapter expansion prompts without study questions', () => {
    const prompt = buildExpansionPrompt({
      lesson: {
        ...lesson,
        summaryKind: 'Novel',
        articleParagraphs: ['A short overview.'],
      },
      chapter: {
        title: 'Chapter 4',
        summary: 'A thin chapter note.',
      },
    });

    expect(prompt).toContain('# Expansion Request');
    expect(prompt).toContain('Target: full Curiosity chapter retelling');
    expect(prompt).toContain('# Task Profile');
    expect(prompt).toContain('Mode: Fiction chapter reading companion');
    expect(prompt).toContain('Retell the selected chapter as a readable, spoiler-bounded story');
    expect(prompt).toContain('Do not turn the chapter into a quiz');
    expect(prompt).toContain('# Topic Context');
    expect(prompt).toContain('# Current Draft Context');
    expect(prompt).toContain('A thin chapter note.');
    expect(prompt).toContain('Lesson title: Control What Is Yours');
    expect(prompt).toContain('# Required Markdown Sections');
    expect(prompt).toContain('## Story Retelling');
    expect(prompt).toContain('## What Changed');
    expect(prompt).toContain('## Why It Matters');
    expect(prompt).toContain('## Reader Guide');
    expect(prompt).toContain('## Keep In Mind');
    expect(prompt).not.toContain('## Break Down');
    expect(prompt).not.toContain('## Remember');
    expect(prompt).not.toContain('## Questions');
    expect(prompt).not.toContain('Current questions');
    expect(prompt).not.toContain('Do not pad with repeated copyright');
  });

  it('builds novel book expansion prompts as reader companions', () => {
    const prompt = buildExpansionPrompt({
      lesson: {
        ...lesson,
        summaryKind: 'Novel',
        summaryBullets: ['An empire creates pressure.'],
        themeNotes: ['Power and trust.'],
        articleParagraphs: ['A short overview.'],
      },
      chapter: null,
    });

    expect(prompt).toContain('Mode: Novel reading companion');
    expect(prompt).toContain('Help the reader enjoy and follow the book');
    expect(prompt).toContain('## Story Overview');
    expect(prompt).toContain('## Main Characters');
    expect(prompt).toContain('## Main Tensions');
    expect(prompt).toContain('## Keep In Mind');
    expect(prompt).not.toContain('## Questions');
    expect(prompt).not.toContain('## Break Down');
  });

  it('builds history expansion prompts around actors, constraints, and consequences', () => {
    const prompt = buildExpansionPrompt({
      lesson: {
        ...lesson,
        domain: 'World History',
        summaryKind: 'History',
        summaryBullets: ['A regime faces pressure.'],
        timeline: ['A crisis begins.'],
        themeNotes: ['Legitimacy under strain.'],
        articleParagraphs: ['A thin history note.'],
      },
      chapter: {
        title: 'Section 2',
        summary: 'A short event note.',
        questions: [{ type: 'Recall', prompt: 'What changed?' }],
      },
    });

    expect(prompt).toContain('Mode: History study section');
    expect(prompt).toContain('Explain actors, motives, constraints, incentives, turning points, and consequences');
    expect(prompt).toContain('## Break Down');
    expect(prompt).toContain('## Questions');
    expect(prompt).toContain('Current questions');
  });

  it('builds nonfiction expansion prompts around practice and transfer', () => {
    const prompt = buildExpansionPrompt({
      lesson: {
        ...lesson,
        summaryKind: undefined,
        contentType: 'lesson',
        quickVersion: ['Separate control from noise.'],
        articleParagraphs: ['A short lesson.'],
        breakDown: ['Name the pressure.'],
        remember: ['Your judgment is yours.'],
      },
      chapter: null,
    });

    expect(prompt).toContain('Mode: Nonfiction micro-lesson');
    expect(prompt).toContain('Teach the real-world problem, core idea, concrete example, practice move, mistake to avoid, and transfer questions');
    expect(prompt).toContain('## Quick Version');
    expect(prompt).toContain('## Deeper Read');
    expect(prompt).toContain('## Questions');
  });

  it('sends expansion requests with the dedicated prompt and larger output budget', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: 'Expanded lesson.' }),
    });
    globalThis.fetch = fetchMock;

    const result = await expandLearningContent({
      apiKey: '',
      endpoint: '/api/openai-responses',
      model: 'gpt-5-mini',
      lesson,
      chapter: null,
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(result).toBe('Expanded lesson.');
    expect(body.instructions).toContain('Curiosity AI expansion engine');
    expect(body.instructions).toContain('Do not pad with repeated copyright');
    expect(body.instructions).toBe(EXPANSION_OVERVIEW_PROMPT);
    expect(body.input[0].content).toContain('Target: full Curiosity lesson');
    expect(body.input[0].content).not.toContain('Do not pad with repeated copyright');
    expect(body.max_output_tokens).toBeGreaterThan(2500);
  });

  it('builds article AI instructions with domain, image, and medical factuality rules', () => {
    const instructions = buildArticleAiInstructions({
      subject: 'Emergency Medicine & Critical Care',
      articleType: 'standard',
    });

    expect(instructions).toContain('Curiosity AI article expansion engine');
    expect(instructions).toContain('Do not invent URLs, attribution, licenses, quotes, dates, citations, or source claims');
    expect(instructions).toContain('not patient-specific medical advice');
    expect(instructions).toContain('Do not invent ECG, radiology, ultrasound, pathology, lab, dosing, procedural, or medical image findings');
    expect(instructions).toContain('Return JSON');
  });

  it('keeps article tutor instructions separate from the article JSON output contract', () => {
    const instructions = buildArticleTutorInstructions({
      subject: 'Leadership',
      articleType: 'standard',
    });

    expect(instructions).toContain('Curiosity article-specific tutor');
    expect(instructions).toContain('Tutor responses may use markdown');
    expect(instructions).toContain('Do not return JSON');
    expect(instructions).not.toContain('Return JSON with exactly these top-level fields');
  });

  it('builds structured article input with body, path, type, and source file', () => {
    const article = {
      subject: 'Science',
      topic: 'Scientific Thinking',
      subtopic: 'Research Methods',
      subsubtopic: '',
      title: 'A Rough Science Summary',
      summary: 'Generic but usable science summary.',
      bodyMarkdown: 'The markdown body should be preserved.',
      articleType: 'standard',
      hierarchyPath: ['Science', 'Scientific Thinking', 'Research Methods'],
      sourceFile: 'science_microlearning_finished.md',
    };

    const input = buildArticleExpansionInput(article);

    expect(input.article).toMatchObject(article);
    expect(input.task).toContain('Science summaries may be rough');
    expect(JSON.stringify(input)).toContain('The markdown body should be preserved.');
    expect(JSON.stringify(input)).not.toContain('quickVersion');
    expect(JSON.stringify(input)).not.toContain('scenario');
  });

  it('sends article expansion as instructions plus structured input and parses generated JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          title: 'Expanded authority',
          articleMarkdown: '## Expanded\nAuthority depends on recognition.',
          imageCards: [{ sourceName: 'Bad', imageUrl: 'https://example.com/image.jpg' }],
          imageQueries: ['legitimate authority historical example'],
          practicalTakeaway: 'Check whether authority is recognized.',
          quickVersion: ['Do not use old fields.'],
        }),
      }),
    });
    globalThis.fetch = fetchMock;

    const result = await expandArticleFromMarkdown({
      apiKey: '',
      endpoint: '/api/openai-responses',
      model: 'gpt-5-mini',
      article: {
        subject: 'Leadership',
        topic: 'Leadership Foundations',
        subtopic: 'Core Leadership Concepts',
        subsubtopic: '',
        title: 'Authority',
        summary: 'Authority is recognized decision-right.',
        bodyMarkdown: 'Authority is the recognized right to direct decisions.',
        articleType: 'standard',
        hierarchyPath: ['Leadership', 'Leadership Foundations', 'Core Leadership Concepts'],
        sourceFile: 'leadership-framework-complete.md',
      },
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.instructions).toContain('Curiosity AI article expansion engine');
    expect(body.instructions).toContain('Do not map output into old Curiosity lesson fields');
    expect(JSON.stringify(body.input)).toContain('Authority is the recognized right to direct decisions.');
    expect(JSON.stringify(body.input)).toContain('leadership-framework-complete.md');
    expect(JSON.stringify(body.input)).toContain('Core Leadership Concepts');
    expect(result).toEqual({
      title: 'Expanded authority',
      articleMarkdown: '## Expanded\nAuthority depends on recognition.',
      imageCards: [],
      imageQueries: ['legitimate authority historical example'],
      practicalTakeaway: 'Check whether authority is recognized.',
    });
  });

  it('uses literature reader-guide instructions for literature articles', () => {
    const instructions = buildArticleAiInstructions({
      subject: 'Literature',
      articleType: 'literature',
    });

    expect(instructions).toContain('reader-friendly chapter guide');
    expect(instructions).toContain('Do not create a worksheet, quiz, scenario, or decision UI');
  });

  it('sends article tutor requests scoped to the current article and history', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: 'Tutor answer.' }),
    });
    globalThis.fetch = fetchMock;

    const response = await askArticleTutor({
      apiKey: '',
      endpoint: '/api/openai-responses',
      model: 'gpt-5-mini',
      article: {
        key: 'article:science-food-webs',
        subject: 'Science',
        title: 'Food Webs',
        summary: 'A rough ecology summary.',
        bodyMarkdown: 'Food webs describe relationships.',
        articleType: 'standard',
        hierarchyPath: ['Science', 'Biology', 'Ecology'],
        sourceFile: 'science_microlearning_finished.md',
      },
      generatedArticle: { articleMarkdown: '## Expanded\nA generated draft.' },
      userMessage: 'Help me remember this.',
      conversationHistory: [{ role: 'user', content: 'Earlier question.' }],
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(response).toBe('Tutor answer.');
    expect(body.instructions).toContain('article-specific tutor');
    expect(body.instructions).toContain('Do not return JSON');
    expect(body.instructions).not.toContain('Return JSON with exactly these top-level fields');
    expect(JSON.stringify(body.input)).toContain('Food Webs');
    expect(JSON.stringify(body.input)).toContain('Earlier question.');
    expect(JSON.stringify(body.input)).toContain('Help me remember this.');
  });
});
