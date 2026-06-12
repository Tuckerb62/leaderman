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

const NOVEL_SLOT_SUMMARY_KIND = 'Novel';

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

const NOVEL_REWRITE_STYLE_RULES = [
  'Style rules:',
  '- Make it feel like a readable short story, not a summary sheet.',
  '- Preserve continuity, mood, pressure, choices, consequences, and emotional movement.',
  '- Use vivid but plain prose.',
  '- Keep the reader oriented without explaining literary themes.',
  '- Do not use headings inside the retelling except the required markdown heading.',
  '- Do not include character lists, setting notes, themes, analysis, quizzes, “keep in mind,” “things to remember,” or study-guide blocks.',
  '- Do not say phrases like “this chapter shows,” “the author uses,” “the theme is,” or “the reader learns.”',
  '- Do not include events, motives, revelations, or consequences from later chapters.',
  '- Do not invent scenes, dialogue, backstory, symbolism, or facts not present in the provided chapter material.',
  '- For copyrighted works, do not quote, closely paraphrase, or imitate the original author’s sentence style. Retell in fresh prose as a companion, not a substitute for the book.',
  '',
].join('\n');

const NON_NOVEL_REWRITE_STYLE_RULES = [
  'Apply the same style contract as the initial draft prompt.',
  "You are an expert academic author, lecturer and Curiosity's lesson writer. Curiosity is a calm nightly reading app. Write a lesson that feels like a short book chapter: clear, concrete, reflective, practical, and memorable without sounding like a textbook.",
  '',
  'Keep the same story-tone, practical framing, and scope decisions as the draft.',
  '',
  'Before writing, silently decide:',
  '- the lesson\'s central question or tension;',
  '- the safest factual scope based on the input;',
  '- whether the topic deserves 1, 2, or more pages;',
  '- which concrete example, modern application, and boundary case genuinely fit.',
  '',
  'Core rules:',
  '- Omission beats invention. Never fabricate quotes, citations, dates, statistics, study findings, named events, or precise claims.',
  '- Use only well-established knowledge or facts supplied in the input. If confidence is limited, say so naturally in the prose or omit the claim. If there are conflicting views or theories, state this.',
  '- Do not pad. Stop when the lesson feels complete.',
  '- Prefer scenes, mechanisms, decisions, and examples over abstract summary.',
  '- Weave counterpoints, uncertainty, and boundary cases into the prose. Do not label them as "counterpoint," "edge case," or "uncertainty."',
  '- No headings, section labels, bullet summaries, quiz questions, or meta commentary inside the lesson.',
  '- Use plain English with a calm evening tone. Write like a good book chapter, not a lecture note.',
  '',
  'Lesson requirements:',
  '- Open with a specific image, situation, problem, or tension rather than a generic definition.',
  '- Include one concrete modern application or analogy when it genuinely clarifies the topic.',
  '- Include one boundary case: a situation where the main idea becomes harder, weaker, or changes meaning.',
  '- End with one practical takeaway sentence.',
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
    "You are an expert academic author, lecturer and Curiosity's lesson writer. Curiosity is a calm nightly reading app. Write a lesson that feels like a short book chapter: clear, concrete, reflective, practical, and memorable without sounding like a textbook.",
    '',
    '<lesson_input>',
    `Title: ${slot.title}`,
    `Subject area: ${slot.subject}${slot.topic ? ` — ${slot.topic}` : ''}`,
    `Editorial brief: ${slot.brief}`,
    `Shelf profile: ${slot.profile || slot.shelfProfile || 'general'}`,
    '</lesson_input>',
    '',
    'Before writing, silently decide:',
    '- the lesson\'s central question or tension;',
    '- the safest factual scope based on the input;',
    '- whether the topic deserves 1, 2, or more pages;',
    '- which concrete example, modern application, and boundary case genuinely fit.',
    '',
    'Core rules:',
    '- Omission beats invention. Never fabricate quotes, citations, dates, statistics, study findings, named events, or precise claims.',
    '- Use only well-established knowledge or facts supplied in the input. If confidence is limited, say so naturally in the prose or omit the claim. If there are conflicting views or theories, state this.',
    '- Do not pad. Stop when the lesson feels complete.',
    '- Prefer scenes, mechanisms, decisions, and examples over abstract summary.',
    '- Weave counterpoints, uncertainty, and boundary cases into the prose. Do not label them as "counterpoint," "edge case," or "uncertainty."',
    '- No headings, section labels, bullet summaries, quiz questions, or meta commentary inside the lesson.',
    '- Use plain English with a calm evening tone. Write like a good book chapter, not a lecture note.',
    '',
    'Lesson requirements:',
    '- Open with a specific image, situation, problem, or tension rather than a generic definition.',
    '- Include one concrete modern application or analogy when it genuinely clarifies the topic.',
    '- Include one boundary case: a situation where the main idea becomes harder, weaker, or changes meaning.',
    '- End with one practical takeaway sentence.',
    '',
    'Subject-specific rules:',
    '- History / World History: include actors, incentives, constraints, turning points, and one grounded "what might have gone differently" line.',
    '- Philosophy: include the core question, two competing positions, one serious objection, and one practical decision rule.',
    '- Leadership / Communication / Ethics / Systems: include one workplace, family, or public-life scenario; one common mistake pattern; and one practical line the reader could try next.',
    '- Literature: preserve narrative movement, scene feeling, and emotional arc when useful.',
    '- Science / Medical: explain mechanisms first, be precise, and avoid overstating uncertain claims.',
    '',
    'Length:',
    'Use 1-6 pages. Match length to scope:',
    '- narrow or simple topic: 1 page;',
    '- moderate topic: 2-3 pages;',
    '- broad or foundational topic: 3-6 pages.',
    '',
    'Aim for 750-1250 words per full page, but never add words just to hit a range. If a topic is truly narrow then ignore the word recommendation.',
    '',
    'Output:',
    'Return exactly one JSON object with exactly these fields:',
    '{',
    '  "title": string,',
    '  "openingLine": string,',
    '  "pages": string[]',
    '}',
    '',
    'Rules for the JSON:',
    '- "openingLine" must exactly match the first sentence of pages[0].',
    '- "pages" must contain 1-6 strings.',
    '- Each page must be flowing markdown prose made of paragraphs only.',
    '- No markdown fence.',
    '- No commentary outside the JSON.',
    '',
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
export function buildRevisePrompt(draft, verification, options = {}) {
  const includeNovelRules = Boolean(options.includeNovelStyle);
  const includeNonNovelRules = !includeNovelRules;
  const fallbackVerification = verification || {
    confirmed: [],
    corrected: [],
    unverified: ['Fact-checking was not run for this run. Do not add new claims, only tighten the existing draft.'],
  };

  return [
    'Revise this lesson draft in a single pass that both corrects it and finishes the writing.',
    '',
    'First, apply the fact-check results:',
    '- Apply every correction.',
    '- For each unverified claim: remove it, or keep it only with explicit hedging inside the prose ("accounts differ", "the attribution is uncertain"). Prefer removal when the claim is decorative.',
    '',
    'Then make the final editing pass:',
    ...(includeNovelRules ? ['Apply these literary constraints first to preserve the requested retelling tone:', NOVEL_REWRITE_STYLE_RULES] : []),
    ...(includeNonNovelRules ? ['Apply these style constraints first to preserve the original draft style:', NON_NOVEL_REWRITE_STYLE_RULES] : []),
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
    JSON.stringify(fallbackVerification),
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

function isNovelSlot(slot) {
  return slot?.summaryKind === NOVEL_SLOT_SUMMARY_KIND;
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

  if (!steps.verify && !isNovelSlot(slot)) {
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

  if (isNovelSlot(slot) && !steps.verify) {
    steps.verify = {
      confirmed: [],
      corrected: [],
      unverified: [],
    };
    saveCheckpoint(slot.slotId, checkpoint);
  }

  if (!steps.revise) {
    onProgress('revise');
    const reviseText = await callCanonModel({
      apiKey,
      input: buildRevisePrompt(steps.draft, steps.verify, {
        includeNovelStyle: isNovelSlot(slot),
      }),
    });
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
