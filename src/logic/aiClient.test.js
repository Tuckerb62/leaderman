import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AI_MODEL_OPTIONS,
  DEFAULT_AI_SETTINGS,
  EXPANSION_OVERVIEW_PROMPT,
  askOpenAI,
  buildExpansionOverviewPrompt,
  buildExpansionPrompt,
  buildAiInstructions,
  buildResponseInput,
  expandLearningContent,
  extractResponseText,
  requiresClientApiKey,
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

    expect(instructions).toContain('Leaderman is a local-first leadership formation app');
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

  it('sends the Leaderman overview and chosen model in the OpenAI request body', async () => {
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
    expect(body.instructions).toContain('Leaderman is a local-first leadership formation app');
    expect(body.instructions).toContain('Do not invent book quotes');
    expect(body.instructions).toContain('Control What Is Yours');
  });

  it('builds a reusable expansion overview prompt with content-quality instructions', () => {
    const overview = buildExpansionOverviewPrompt();

    expect(overview).toContain('Leaderman AI expansion engine');
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
    expect(prompt).toContain('Target: full Leaderman chapter retelling');
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
    expect(body.instructions).toContain('Leaderman AI expansion engine');
    expect(body.instructions).toContain('Do not pad with repeated copyright');
    expect(body.instructions).toBe(EXPANSION_OVERVIEW_PROMPT);
    expect(body.input[0].content).toContain('Target: full Leaderman lesson');
    expect(body.input[0].content).not.toContain('Do not pad with repeated copyright');
    expect(body.max_output_tokens).toBeGreaterThan(2500);
  });
});
