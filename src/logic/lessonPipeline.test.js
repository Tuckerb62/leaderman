import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CANON_MODEL,
  buildDraftPrompt,
  buildFixPrompt,
  buildOptimizePrompt,
  buildVerifyPrompt,
  clearPipelineCheckpoint,
  loadPipelineCheckpoint,
  parseLessonJson,
  runLessonPipeline,
  validateLessonShape,
} from './lessonPipeline.js';

const slot = {
  slotId: 'test-slot',
  subjectId: 'history',
  subject: 'History',
  topic: 'Ancient World',
  title: 'The Bronze Age Collapse',
  brief: 'Systems failure around 1200 BC.',
};

const lessonJson = JSON.stringify({
  title: 'The Bronze Age Collapse',
  openingLine: 'Around 1200 BC, every major palace in the eastern Mediterranean burned within a generation.',
  pages: ['Page one prose.', 'Page two prose.'],
});

function okResponse(text) {
  return { ok: true, json: async () => ({ output_text: text }) };
}

function makeStore() {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };
}

beforeEach(() => {
  globalThis.localStorage = makeStore();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('lesson pipeline prompts', () => {
  it('drafts with the slot brief, anti-padding rule, and JSON contract', () => {
    const prompt = buildDraftPrompt(slot);
    expect(prompt).toContain('The Bronze Age Collapse');
    expect(prompt).toContain('Systems failure around 1200 BC.');
    expect(prompt).toContain('Anti-padding is absolute');
    expect(prompt).toContain('Omission beats invention');
    expect(prompt).toContain('"pages"');
  });

  it('verifies adversarially with a structured output contract', () => {
    const prompt = buildVerifyPrompt({ title: 'T', pages: ['p'] });
    expect(prompt).toContain('Be adversarial');
    expect(prompt).toContain('"corrected"');
    expect(prompt).toContain('"unverified"');
  });

  it('fixes by applying corrections and hedging or removing unverified claims', () => {
    const prompt = buildFixPrompt({ title: 'T', pages: ['p'] }, { corrected: [], unverified: ['x'] });
    expect(prompt).toContain('accounts differ');
    expect(prompt).toContain('Prefer removal');
  });

  it('optimizes without allowing new factual claims', () => {
    const prompt = buildOptimizePrompt({ title: 'T', pages: ['p'] });
    expect(prompt).toContain('may NOT introduce any new factual claims');
  });
});

describe('lesson shape validation', () => {
  it('accepts a valid lesson and trims it', () => {
    const lesson = validateLessonShape({ title: ' T ', openingLine: ' o ', pages: [' page '] });
    expect(lesson).toEqual({ title: 'T', openingLine: 'o', pages: ['page'] });
  });

  it('rejects missing pages and over-long lessons', () => {
    expect(() => validateLessonShape({ title: 'T', pages: [] })).toThrow('no pages');
    expect(() => validateLessonShape({ title: 'T', pages: Array.from({ length: 7 }, () => 'p') })).toThrow('limit is 6');
  });

  it('parses fenced JSON', () => {
    expect(parseLessonJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(() => parseLessonJson('not json')).toThrow('not valid JSON');
  });
});

describe('pipeline run', () => {
  it('runs draft, verify, fix, optimize with the pinned canon model and web search on research steps', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(okResponse(lessonJson))
      .mockResolvedValueOnce(okResponse(JSON.stringify({ confirmed: ['a'], corrected: [{ claim: 'x', problem: 'y', correction: 'z' }], unverified: [] })))
      .mockResolvedValueOnce(okResponse(lessonJson))
      .mockResolvedValueOnce(okResponse(lessonJson));
    globalThis.fetch = fetchMock;

    const stages = [];
    const result = await runLessonPipeline({ apiKey: 'sk-test', slot, onProgress: (stage) => stages.push(stage) });

    expect(stages).toEqual(['draft', 'verify', 'fix', 'optimize']);
    expect(result.model).toBe(CANON_MODEL);
    expect(result.lesson.pages).toHaveLength(2);
    expect(result.verificationNotes.corrected).toHaveLength(1);

    const bodies = fetchMock.mock.calls.map(([, options]) => JSON.parse(options.body));
    expect(bodies.every((body) => body.model === CANON_MODEL)).toBe(true);
    expect(bodies[0].tools).toEqual([{ type: 'web_search' }]);
    expect(bodies[1].tools).toEqual([{ type: 'web_search' }]);
    expect(bodies[2].tools).toBeUndefined();
  });

  it('skips the fix call when verification found nothing to fix', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(okResponse(lessonJson))
      .mockResolvedValueOnce(okResponse(JSON.stringify({ confirmed: ['a'], corrected: [], unverified: [] })))
      .mockResolvedValueOnce(okResponse(lessonJson));
    globalThis.fetch = fetchMock;

    await runLessonPipeline({ apiKey: 'sk-test', slot });

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('resumes from the checkpoint after a failed step instead of re-running paid steps', async () => {
    const failingFetch = vi.fn()
      .mockResolvedValueOnce(okResponse(lessonJson))
      .mockRejectedValueOnce(new Error('network down'));
    globalThis.fetch = failingFetch;

    await expect(runLessonPipeline({ apiKey: 'sk-test', slot })).rejects.toThrow();
    expect(loadPipelineCheckpoint(slot.slotId)?.steps?.draft).toBeTruthy();

    const resumeFetch = vi.fn()
      .mockResolvedValueOnce(okResponse(JSON.stringify({ confirmed: [], corrected: [], unverified: [] })))
      .mockResolvedValueOnce(okResponse(lessonJson));
    globalThis.fetch = resumeFetch;

    const stages = [];
    const result = await runLessonPipeline({ apiKey: 'sk-test', slot, onProgress: (stage) => stages.push(stage) });

    expect(stages).toEqual(['verify', 'fix', 'optimize']);
    expect(resumeFetch).toHaveBeenCalledTimes(2);
    expect(result.lesson.title).toBe('The Bronze Age Collapse');

    clearPipelineCheckpoint(slot.slotId);
    expect(loadPipelineCheckpoint(slot.slotId)).toBeNull();
  });
});
