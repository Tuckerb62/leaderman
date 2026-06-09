import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AI_MODEL_OPTIONS,
  DEFAULT_AI_SETTINGS,
  askOpenAI,
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

  it('builds expansion prompts for unfinished chapters without asking for generic filler', () => {
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

    expect(prompt).toContain('Expand this into a full Leaderman chapter retelling');
    expect(prompt).toContain('A thin chapter note.');
    expect(prompt).toContain('Do not use repeated copyright');
    expect(prompt).toContain('Return Markdown');
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
    expect(body.input[0].content).toContain('Expand this into a full Leaderman lesson');
    expect(body.max_output_tokens).toBeGreaterThan(2500);
  });
});
