import { OPENAI_RESPONSES_ENDPOINT, extractResponseText } from './aiClient.js';
import { countWords } from './lessonPages.js';

// Canon generation is pinned to one strong model regardless of the user's
// chat preference, so shared-library quality does not depend on who clicked
// first. The generating user's key still pays for the run.
export const CANON_MODEL = 'gpt-5.4';

export const PIPELINE_STEPS = [
  { id: 'draft', label: 'Drafting' },
  { id: 'verify', label: 'Verifying against sources' },
  { id: 'revise', label: 'Correcting and polishing' },
];

const CHECKPOINT_PREFIX = 'curiosity.lessonPipeline.v1.';

const PAGE_WORD_LIMIT = 1100;
const MAX_PAGES = 6;

const SHARED_RULES = [
  'Hard rules for every step:',
  '- Omission beats invention. Never fabricate quotes, citations, dates, statistics, study findings, or events.',
  '- Anti-padding is absolute: never stretch the essay to fill a length. A topic that deserves one page gets one page.',
  '- Counterpoints, historical examples, and uncertainty are woven into the prose, never appended as labeled sections.',
  '- Where accounts genuinely differ or a claim is uncertain, say so inside the prose ("accounts differ", "attribution is uncertain").',
  '- No section labels, no bullet-point summaries, no quiz questions, no meta commentary. Flowing essay prose only.',
  '- Plain English over textbook voice. Write like a good book chapter.',
].join('\n');

function lessonJsonContract() {
  return [
    'Return ONLY a JSON object with exactly these fields:',
    '{',
    '  "title": string,',
    '  "openingLine": string,  // one sentence that would make a reader open this',
    `  "pages": string[]       // 1-${MAX_PAGES} pages of flowing markdown prose, roughly 500-1000 words per page except the last`,
    '}',
    'No markdown fence, no commentary around the JSON.',
  ].join('\n');
}

export function buildDraftPrompt(slot) {
  return [
    'Write a lesson for Curiosity, a calm nightly reading app. The lesson is a flowing essay the reader experiences as a short book chapter.',
    '',
    `Topic: ${slot.title}`,
    `Subject area: ${slot.subject}${slot.topic ? ` — ${slot.topic}` : ''}`,
    `Editorial brief: ${slot.brief}`,
    '',
    'Choose the depth the topic deserves: a focused idea gets one page, a war gets several. Use web search to ground names, dates, and events before asserting them.',
    '',
    SHARED_RULES,
    '',
    lessonJsonContract(),
  ].join('\n');
}

export function buildVerifyPrompt(draft) {
  return [
    'You are fact-checking a lesson draft before publication. Re-read every factual claim (names, dates, attributions, numbers, sequences of events, scientific or medical statements) and check each against web search results.',
    '',
    'Return ONLY a JSON object:',
    '{',
    '  "confirmed": string[],   // claims you confirmed, briefly stated',
    '  "corrected": [{ "claim": string, "problem": string, "correction": string }],',
    '  "unverified": string[]   // claims you could not confirm either way',
    '}',
    'Be adversarial: your job is to catch errors, not to approve the draft.',
    '',
    'Draft to check:',
    JSON.stringify(draft),
  ].join('\n');
}

// One pass that does the old fix and optimize steps together: apply the
// fact-check corrections AND make the final editing pass. Both rule-sets are
// kept verbatim so nothing the two separate prompts enforced is lost.
export function buildRevisePrompt(draft, verification) {
  return [
    'Revise this lesson draft in a single pass that both corrects it and finishes the writing.',
    '',
    'First, apply the fact-check results:',
    '- Apply every correction.',
    '- For each unverified claim: remove it, or keep it only with explicit hedging inside the prose ("accounts differ", "the attribution is uncertain"). Prefer removal when the claim is decorative.',
    '',
    'Then make the final editing pass:',
    '- Improve the writing only: clarity, concision, rhythm, concrete examples, a strong opening and ending. Cut filler ruthlessly.',
    '- Beyond the corrections above, you may NOT introduce any new factual claims.',
    '- You may merge, split, or rebalance pages so each reads as a natural movement of the essay.',
    '',
    SHARED_RULES,
    '',
    lessonJsonContract(),
    '',
    'Draft:',
    JSON.stringify(draft),
    '',
    'Fact-check results:',
    JSON.stringify(verification),
  ].join('\n');
}

function stripJsonFence(text = '') {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

export function parseLessonJson(text) {
  let parsed = null;
  try {
    parsed = JSON.parse(stripJsonFence(text));
  } catch {
    throw new Error('The model returned a response that was not valid JSON.');
  }
  return parsed;
}

export function validateLessonShape(lesson) {
  if (!lesson || typeof lesson !== 'object') throw new Error('The generated lesson is empty.');
  if (!lesson.title || typeof lesson.title !== 'string') throw new Error('The generated lesson is missing a title.');
  const pages = Array.isArray(lesson.pages) ? lesson.pages.filter((page) => typeof page === 'string' && page.trim()) : [];
  if (pages.length === 0) throw new Error('The generated lesson has no pages.');
  if (pages.length > MAX_PAGES) throw new Error(`The generated lesson has ${pages.length} pages; the limit is ${MAX_PAGES}.`);
  for (const page of pages) {
    if (countWords(page) > PAGE_WORD_LIMIT + 300) {
      throw new Error('A generated page is far over the word limit.');
    }
  }
  return {
    title: lesson.title.trim(),
    openingLine: typeof lesson.openingLine === 'string' ? lesson.openingLine.trim() : '',
    pages: pages.map((page) => page.trim()),
  };
}

// reasoningEffort controls the Responses API `reasoning: { effort }` knob. Pass
// 'low' for the cheap, mechanical verify pass; leave it null on draft and revise
// so the model uses its default (higher) effort for the writing-heavy steps.
async function callCanonModel({ apiKey, input, useWebSearch = false, maxOutputTokens = 8000, reasoningEffort = null }) {
  let response;
  try {
    response = await fetch(OPENAI_RESPONSES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: CANON_MODEL,
        input: [{ role: 'user', content: input }],
        ...(useWebSearch ? { tools: [{ type: 'web_search' }] } : {}),
        ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
        max_output_tokens: maxOutputTokens,
      }),
    });
  } catch {
    throw new Error('Could not reach OpenAI. Check your network and try again; the run will resume from this step.');
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message || `OpenAI request failed with status ${response.status}.`);
  }
  return extractResponseText(payload);
}

function checkpointKey(slotId) {
  return `${CHECKPOINT_PREFIX}${slotId}`;
}

export function loadPipelineCheckpoint(slotId) {
  try {
    return JSON.parse(localStorage.getItem(checkpointKey(slotId)) || 'null');
  } catch {
    return null;
  }
}

function saveCheckpoint(slotId, checkpoint) {
  try {
    localStorage.setItem(checkpointKey(slotId), JSON.stringify(checkpoint));
  } catch {
    // Checkpointing is best-effort; a full run still works without it.
  }
}

export function clearPipelineCheckpoint(slotId) {
  try {
    localStorage.removeItem(checkpointKey(slotId));
  } catch {
    // ignore
  }
}

// Runs the pipeline (draft -> verify -> revise -> validate) in the browser on
// the generating user's key. The old fix and optimize steps are now one revise
// call. Each completed step is checkpointed to localStorage so a dropped
// connection resumes instead of restarting (and re-paying for) earlier steps.
// Checkpoints written by older runs may carry `fix`/`optimize` keys instead of
// `revise`; those are ignored, and revise re-runs from the saved draft/verify.
export async function runLessonPipeline({ apiKey, slot, onProgress = () => {} }) {
  const checkpoint = loadPipelineCheckpoint(slot.slotId) || { slotId: slot.slotId, steps: {} };
  const steps = checkpoint.steps;

  if (!steps.draft) {
    onProgress('draft');
    const draftText = await callCanonModel({ apiKey, input: buildDraftPrompt(slot), useWebSearch: true });
    steps.draft = validateLessonShape(parseLessonJson(draftText));
    saveCheckpoint(slot.slotId, checkpoint);
  }

  if (!steps.verify) {
    onProgress('verify');
    const verifyText = await callCanonModel({
      apiKey,
      input: buildVerifyPrompt(steps.draft),
      useWebSearch: true,
      reasoningEffort: 'low',
    });
    steps.verify = parseLessonJson(verifyText);
    saveCheckpoint(slot.slotId, checkpoint);
  }

  if (!steps.revise) {
    onProgress('revise');
    const reviseText = await callCanonModel({ apiKey, input: buildRevisePrompt(steps.draft, steps.verify) });
    steps.revise = validateLessonShape(parseLessonJson(reviseText));
    saveCheckpoint(slot.slotId, checkpoint);
  }

  const lesson = steps.revise;
  const verificationNotes = {
    confirmedCount: steps.verify.confirmed?.length || 0,
    corrected: steps.verify.corrected || [],
    unverified: steps.verify.unverified || [],
  };

  return { lesson, verificationNotes, model: CANON_MODEL };
}
