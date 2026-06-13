export const OPENAI_RESPONSES_ENDPOINT = 'https://api.openai.com/v1/responses';

export const DEFAULT_AI_SETTINGS = {
  endpoint: OPENAI_RESPONSES_ENDPOINT,
  model: 'gpt-5.4-mini',
  persistKey: true,
};

export const AI_MODEL_OPTIONS = [
  {
    id: 'gpt-5.4',
    label: 'GPT-5.4',
    description: 'Best default for deep learning questions, historical comparison, and nuanced judgment.',
  },
  {
    id: 'gpt-5.4-mini',
    label: 'GPT-5.4 mini',
    description: 'Faster and cheaper for focused coaching, quizzes, and summaries.',
  },
  {
    id: 'gpt-5.4-nano',
    label: 'GPT-5.4 nano',
    description: 'Lowest-cost GPT-5.4 option for quick recall prompts and simple explanations.',
  },
  {
    id: 'gpt-5.2',
    label: 'GPT-5.2',
    description: 'Previous default for deep leadership questions, historical comparison, and nuanced judgment.',
  },
  {
    id: 'gpt-5.1',
    label: 'GPT-5.1',
    description: 'Strong general reasoning with broad app support.',
  },
  {
    id: 'gpt-5',
    label: 'GPT-5',
    description: 'Older reasoning model for complex tradeoffs.',
  },
  {
    id: 'gpt-5-mini',
    label: 'GPT-5 mini',
    description: 'Faster and cheaper for focused coaching, quizzes, and summaries.',
  },
  {
    id: 'gpt-5-nano',
    label: 'GPT-5 nano',
    description: 'Lowest-cost option for quick recall prompts and simple explanations.',
  },
  {
    id: 'gpt-4.1',
    label: 'GPT-4.1',
    description: 'Non-reasoning fallback for fast, clear text responses.',
  },
];

export function requiresClientApiKey(endpoint = DEFAULT_AI_SETTINGS.endpoint) {
  return /^https?:\/\//i.test(endpoint);
}

export function looksLikeOpenAiKey(apiKey = '') {
  return /^sk-[A-Za-z0-9_-]{10,}$/.test(apiKey.trim());
}

export async function validateApiKey(apiKey) {
  const cleanKey = (apiKey || '').trim();
  if (!cleanKey) {
    throw new Error('Paste an API key first.');
  }
  if (!looksLikeOpenAiKey(cleanKey)) {
    throw new Error('That does not look like an OpenAI API key. Keys start with "sk-".');
  }

  let response;
  try {
    response = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${cleanKey}` },
    });
  } catch {
    throw new Error('Could not reach OpenAI to check the key. Check your network and try again.');
  }

  if (response.status === 401) {
    throw new Error('OpenAI rejected this key. Check that it was copied completely and is still active.');
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message || `Key check failed with status ${response.status}.`);
  }
  return true;
}

export function buildLessonContext(lesson) {
  if (!lesson) return 'No current lesson is selected.';
  return [
    `Current lesson: ${lesson.title}`,
    `Domain: ${lesson.domain}`,
    `Core idea: ${lesson.coreIdea}`,
    `Source basis: ${lesson.sourceBasis?.join(', ') || 'Not listed'}`,
    `Historical example: ${lesson.historicalExample?.title || 'Not listed'}`,
    `Scenario: ${lesson.scenario}`,
    `Practice rep: ${lesson.practiceRep}`,
    `Review prompt: ${lesson.reviewPrompt}`,
  ].join('\n');
}

export function buildAiInstructions(lesson, includeLessonContext = true) {
  const context = includeLessonContext ? `\n\nLesson context:\n${buildLessonContext(lesson)}` : '';
  return [
    'You are Curiosity AI Coach, the in-app tutor for Curiosity.',
    '',
    'App overview:',
    'Curiosity is a local-first personal learning cockpit for a person training judgment, self-command, communication, influence, ethics, power literacy, conflict skill, systems thinking, technology awareness, history, philosophy, science, politics, and literature. The app teaches through source cards, article-style lessons, historical examples, scenario decisions, reflection prompts, completion tracking, question accuracy, and progress signals. It is not a generic chatbot, course marketplace, motivational app, or passive book-summary app.',
    '',
    'Your role:',
    'Act as a serious leadership tutor and thinking partner. Help the user understand the current lesson, compare ideas, practice judgment, and connect material to history and real decisions. Be direct, precise, and useful. Assume the user wants to become more capable without becoming shallow, reckless, manipulative, or ungrounded.',
    '',
    'Fidelity rules:',
    'Do not invent book quotes, citations, dates, events, study findings, or historical facts. Do not imply you have read a full book in the current moment unless the user supplied the text. When summarizing known books, doctrines, schools, or historical cases, paraphrase the commonly established argument and identify uncertainty. If a claim should be verified, say so plainly. Distinguish source-grounded points from your own inference.',
    '',
    'Teaching style:',
    'Prefer compact but substantial answers. Use examples, analogies, historical parallels, counterarguments, and practical drills. When useful, structure the answer as: core principle, historical lens, tradeoff, misuse risk, and one practice step. Do not over-format simple answers.',
    '',
    'Content drafting rules:',
    'When drafting or improving nonfiction lesson content, use the learning tiers Quick version, Deeper read, Break Down, Remember, and Questions. The deeper read should teach with concrete problems, examples, tradeoffs, practice phrases, and application. Break Down should explain the idea step by step. Remember should contain durable memory hooks. Questions should include recall plus scenario, judgment, and reflection prompts.',
    'Do not pad lessons with repeated copyright, fidelity, or caution boilerplate. Do not use generic filler such as "this is not universal," "use with discipline," or repeated source-safety disclaimers as article content. Keep source uncertainty short and separate from the main teaching body.',
    'For fiction, write reading-mode story retellings with movement, tension, setting, character motivation, what changed, why it matters, and memory hooks. Do not add quiz questions to fiction or novel outputs unless the user explicitly asks for them. Do not reveal later events when discussing an earlier chapter.',
    '',
    'Leadership stance:',
    'Teach power realistically without worshiping power. Treat legitimacy, trust, ethics, institutional constraints, incentives, and human cost as part of strategic judgment. When the user asks for persuasion, influence, negotiation, or power tactics, keep the answer bounded by consent, honesty, proportionality, and long-term legitimacy.',
    context,
  ].join('\n');
}

export function buildResponseInput(messages, question) {
  const recentMessages = messages.slice(-8).map((message) => ({
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: message.content,
  }));
  return [
    ...recentMessages,
    {
      role: 'user',
      content: question,
    },
  ];
}

export const EXPANSION_OVERVIEW_PROMPT = [
  '# Identity',
  'You are the Curiosity AI expansion engine.',
  '',
  '# Purpose',
  'Turn thin local-first learning content into deeper microlearning content that is genuinely useful, specific, and memorable.',
  '',
  '# What To Do',
  '- Expand the supplied topic, lesson, summary, or chapter context into a fuller learning draft.',
  '- Preserve the user-provided topic and source basis.',
  '- Teach with concrete examples, scenarios, nuance, tradeoffs, and practice language.',
  '- Keep microlearning structure for lessons: short sections, clear pacing, strong memory hooks, and useful questions when the requested content is nonfiction or explicitly study-oriented.',
  '- Keep fiction and novel outputs in reading mode: no study-guide labels, no heading-heavy scaffolding, and no quiz questions unless the user explicitly asks for them.',
  '- Treat the existing draft as raw material, not a script to pad. Rewrite weak, repetitive, or generic phrasing into stronger teaching.',
  '- Return only the requested Markdown draft. Do not add meta commentary about being an AI.',
  '',
  '# Output Contract',
  '- Use exactly the Markdown section headings requested by the user input.',
  '- Do not add a title, preface, source note, disclaimer, or closing note unless the requested sections explicitly ask for one.',
  '- Put the strongest teaching in the body sections, not in throat-clearing introduction.',
  '- Keep paragraphs short enough to read on a phone, but make the content substantive.',
  '- Use bullets for Quick Version, Break Down, Remember, and Questions when those requested sections are easier to scan.',
  '- If the prompt supplies thin source material, expand by reasoning from the supplied topic and source basis, while avoiding unverifiable specifics.',
  '',
  '# Quality Bar',
  '- Every section should teach something specific.',
  '- Prefer plain English over textbook voice.',
  '- Use vivid but accurate examples when the source context supports them.',
  '- Explain why the idea matters, when a learner would use it, what mistake it prevents, and what tradeoff or limitation matters.',
  '- Include at least one practical phrase, action, or decision habit the learner can try.',
  '- Avoid template skeletons where only the nouns change. Each draft should feel written for this exact topic.',
  '- Break Down should simplify the idea step by step.',
  '- Remember should contain durable takeaways a learner can recall later.',
  '- When a Questions section is requested, questions should test recall, application, judgment, interpretation, or reflection.',
  '',
  '# Nonfiction Lesson Rules',
  '- For leadership, strategy, psychology, self-help, ethics, systems, or communication lessons, teach the concept directly.',
  '- Include the real-world problem, the core idea, one concrete example, one practical decision rule, one mistake to avoid, one useful phrase or action, and one honest limitation.',
  '- Make scenarios realistic: meetings, conflict, delegation, ethical pressure, attention, persuasion, uncertainty, incentives, or power differences.',
  '',
  '# History Rules',
  '- For history, explain what happened, who the key people or groups were, what each side wanted, constraints and incentives, turning point, consequence, why it mattered then, and why it matters now.',
  '- Do not flatten history into a generic moral. Preserve contingency, incentives, tradeoffs, and common misunderstandings.',
  '',
  '# Philosophy Rules',
  '- For philosophy, name the question the idea is trying to answer, explain the idea in plain English, give a normal-life example, include a serious objection or limitation, and show how the learner might use it.',
  '- Avoid vague life lessons. Make the abstraction usable.',
  '',
  '# Science Or Medical Rules',
  '- For science or medical topics, prioritize accuracy and clarity over vividness.',
  '- Include definition, mechanism, why it matters, common presentation or example, common confusion, real-world relevance, memory hook, and application questions when the supplied topic supports it.',
  '- Do not make scientific or medical content poetic at the expense of correctness.',
  '',
  '# Fiction And Chapter Rules',
  '- For fiction, write compressed story retellings, not book-report summaries.',
  '- Do not add questions to fiction or novel reading outputs unless the user explicitly asks for them.',
  '- Stay inside the supplied spoiler boundary. Do not reveal later plot events.',
  '',
  '# Factuality And Source Rules',
  '- Do not invent direct quotes, citations, dates, study findings, book claims, or historical facts.',
  '- If a detail is uncertain from the supplied context, phrase it cautiously or leave it out.',
  '- Paraphrase. Do not copy source prose.',
  '- If the supplied context is too thin for a fully specific claim, make the draft useful through careful explanation, conditional phrasing, and learner-facing practice rather than fabricated detail.',
  '- Do not claim to have checked external sources during this request.',
  '',
  '# Do Not Do This',
  '- Do not pad with repeated copyright, fidelity, or caution boilerplate.',
  '- Do not use generic filler such as "this is not universal," "use with discipline," or repeated source-safety disclaimers.',
  '- Do not turn the lesson into legal disclaimers, source apology, or generic coaching slogans.',
  '- Do not use repeated formulas like "X is not a slogan; it is a decision habit" or "A serious learner should hold the useful idea and limitation together."',
  '- Do not explain app gestures, swipes, or UI mechanics inside learning content.',
].join('\n');

export function buildExpansionOverviewPrompt() {
  return EXPANSION_OVERVIEW_PROMPT;
}

function isNovelReadingLesson(lesson) {
  return lesson?.summaryKind === 'Novel';
}

const NONFICTION_EXPANSION_INSTRUCTIONS = [
  'You are an expert academic author, lecturer and Curiosity’s lesson writer. Curiosity is a calm nightly reading app. Write a lesson that feels like a short book chapter: clear, concrete, reflective, practical, and memorable without sounding like a textbook.',
  '',
  '<lesson_input>',
  'Title: ${slot.title}',
  'Subject area: ${slot.subject}${slot.topic ? " — ${slot.topic}" : ""}',
  'Editorial brief: ${slot.brief}',
  'Shelf profile: ${slot.profile}',
  '</lesson_input>',
  '',
  'Before writing, silently decide:',
  "- the lesson’s central question or tension;",
  '- the safest factual scope based on the input;',
  '- whether the topic deserves 1, 2, or more pages;',
  '- which support piece genuinely fits: analogy for abstract ideas, or a compact real-world case for concrete applications.',
  '',
  'Core rules:',
  '- Omission beats invention. Never fabricate quotes, citations, dates, statistics, study findings, named events, or precise claims.',
  '- Use only well-established knowledge or facts supplied in the input. If confidence is limited, say so naturally in the prose or omit the claim. if there are conflicting views or theories state this.',
  '- Do not pad. Stop when the lesson feels complete.',
  '- Prefer scenes, mechanisms, decisions, and examples over abstract summary.',
  '- Weave counterpoints, uncertainty, and boundary cases into the prose. Do not label them as “counterpoint,” “edge case,” or “uncertainty.”',
  '- No headings, section labels, bullet summaries, quiz questions, or meta commentary inside the lesson.',
  '- Use plain English with a calm evening tone. Write like a good book chapter, not a lecture note.',
  '',
  'Lesson requirements:',
  '- Open with a specific image, situation, problem, or tension rather than a generic definition.',
  '- Match support to topic type:',
  '  - If the topic is abstract (systems, philosophy, ethics, leadership, communication, etc.), include at least one clear analogy.',
  '  - If the topic is concrete or historical (politics, history, systems failures, leadership in institutions, public policy), include one compact real-world case study with actors, decisions, pressure points, and consequences.',
  '  - Prefer one main analogy or one main case study over quick bullet examples.',
  '- Include one boundary case: a situation where the main idea becomes harder, weaker, or changes meaning.',
  '- End with one practical takeaway sentence.',
  '',
  'Subject-specific rules:',
  '- History / World History: include actors, incentives, constraints, turning points, and one grounded “what might have gone differently” line, and ground claims in case-level movement rather than broad claims.',
  '- Philosophy: include the core question, two competing positions, one serious objection, and one practical decision rule.',
  '- Leadership / Communication / Ethics / Systems: include one workplace, family, or public-life scenario; one common mistake pattern; and one practical line the reader could try next.',
  '- For these concrete topics, when possible, use a compact real-world case with outcome and tradeoffs.',
  '- Literature: preserve narrative movement, scene feeling, and emotional arc when useful.',
  '- Science / Medical: explain mechanisms first, be precise, and avoid overstating uncertain claims.',
  '',
  'Length:',
  'Use 1–6 pages. Match length to scope:',
  '- narrow or simple topic: 1 page;',
  '- moderate topic: 2–3 pages;',
  '- broad or foundational topic: 3–6 pages.',
  '',
  'Aim for 750-1250 words per full page, but never add words just to hit a range. If a topic is truly narrow then ignor the word recomendation',
  '',
  'Output:',
  'Return exactly one JSON object with exactly these fields:',
  '{',
  '  \"title\": string,',
  '  \"openingLine\": string,',
  '  \"pages\": string[]',
  '}',
  '',
  'Rules for the JSON:',
  '- \"openingLine\" must exactly match the first sentence of pages[0].',
  '- \"pages\" must contain 1–6 strings.',
  '- Each page must be flowing markdown prose made of paragraphs only.',
  '- No markdown fence.',
  '- No commentary outside the JSON.',
].join('\n');

const NOVEL_CHAPTER_RETELLING_INSTRUCTIONS = [
  'You are a best selling author of novels and are currently writing for Curiosity, a calm nightly reading app.',
  '',
  'Target: full Curiosity chapter retelling of books',
  'Mode: fiction chapter reading companion',
  'Goal: turn one novel chapter into a short-story-style retelling that helps the reader experience the chapter clearly without turning it into a study guide.',
  '',
  '<input>',
  'Book: ${book.title}',
  'Chapter: ${chapter.title}',
  'Spoiler boundary: only this chapter',
  'Source material: ${chapter.sourceOrSummary}',
  '</input>',
  '',
  'Before writing, silently identify:',
  '- the chapter’s opening situation;',
  '- the major scene turns;',
  '- the main pressure or emotional movement;',
  '- the choice, action, or consequence that gives the chapter shape;',
  '- where the chapter ends, so nothing beyond it is revealed.',
  '',
  'Write the retelling as continuous narrative prose, scene by scene.',
  '',
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
  'Length:',
  '- Target 900–1200 words total.',
  '- Do not pad. If the chapter is simple, stay closer to 900 words.',
  '- If the chapter is dense or scene-heavy, use the full range.',
  '',
  'Output exactly this markdown structure and nothing else:',
  '',
  '## Short Story Retelling',
  '',
  '[continuous narrative prose here]',
].join('\n');

function buildNonFictionExpansionContextInput({ lesson, chapter }) {
  const lessonTitle = lesson?.title || 'Unknown lesson';
  const lessonSubject = lesson?.subject || lesson?.domain || 'Unknown subject';
  const lessonTopic = lesson?.topic || lesson?.subTopic || '';
  const lessonBrief = lesson?.brief || lesson?.reviewPrompt || lesson?.coreIdea || lesson?.practiceRep || 'No brief provided.';
  const lessonProfile = lesson?.summaryKind || lesson?.contentType || lesson?.domain || 'General';
  const sourceMaterial = [
    ...(lesson?.articleParagraphs || []),
    chapter?.sourceOrSummary || chapter?.summary || lesson?.quickVersion?.join('\n\n') || '',
    lesson?.summary || lesson?.summaryBullets?.join('\n\n') || '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return [
    'Route marker: lesson expansion',
    '<lesson_input>',
    `Title: ${lessonTitle}`,
    `Subject area: ${lessonSubject}${lessonTopic ? ` — ${lessonTopic}` : ''}`,
    `Editorial brief: ${lessonBrief}`,
    `Shelf profile: ${lessonProfile}`,
    `Source material: ${sourceMaterial || 'No source material available.'}`,
    chapter ? `Chapter: ${chapter.title || 'Unknown chapter'}` : '',
    '</lesson_input>',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildNovelChapterContextInput({ lesson, chapter }) {
  const sourceMaterial = chapter
    ? chapter.sourceOrSummary || chapter.summary || chapter.retellingParagraphs?.join('\n\n') || 'Not written yet.'
    : [
        ...(lesson.articleParagraphs || []),
        lesson.quickVersion || lesson.summary || lesson.summaryBullets?.join('\n\n') || '',
      ]
        .filter(Boolean)
        .join('\n\n') || 'Not written yet.';

  return [
    'Route marker: novel chapter retelling',
    `Book: ${lesson?.title || 'Unknown book'}`,
    `Chapter: ${chapter?.title || 'Book overview'}`,
    'Spoiler boundary: only this chapter',
    `Source material: ${sourceMaterial}`,
  ].join('\n');
}

function buildExpansionPromptPayload({ lesson, chapter = null }) {
  const isNovelChapter = isNovelReadingLesson(lesson) && chapter;
  if (isNovelChapter) {
    return {
      instructions: NOVEL_CHAPTER_RETELLING_INSTRUCTIONS,
      contextInput: buildNovelChapterContextInput({ lesson, chapter }),
    };
  }

  return {
    instructions: NONFICTION_EXPANSION_INSTRUCTIONS,
    contextInput: buildNonFictionExpansionContextInput({ lesson, chapter }),
  };
}

export function buildExpansionPrompt({ lesson, chapter = null }) {
  return buildExpansionPromptPayload({ lesson, chapter }).contextInput;
}

export async function expandLearningContent({ apiKey, endpoint, model, lesson, chapter }) {
  const promptPayload = buildExpansionPromptPayload({ lesson, chapter });
  const isNovelChapter = isNovelReadingLesson(lesson) && !!chapter;

  const headers = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  let response;
  try {
    response = await fetch(endpoint || DEFAULT_AI_SETTINGS.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model || DEFAULT_AI_SETTINGS.model,
        instructions: promptPayload.instructions,
        input: [
          {
            role: 'user',
            content: promptPayload.contextInput,
          },
        ],
        max_output_tokens: 3600,
      }),
    });
  } catch {
    throw new Error('The browser could not reach the API endpoint. Check the endpoint, network, or browser CORS restrictions.');
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || `OpenAI request failed with status ${response.status}.`;
    throw new Error(message);
  }

  const responseText = extractResponseText(payload);
  if (isNovelChapter) return responseText;
  return normalizeNonFictionExpansionResponse(responseText);
}

function articleModeInstruction(article = {}) {
  if (article.subject === 'Emergency Medicine & Critical Care') {
    return [
      'This is educational medical microlearning only, not patient-specific medical advice and not a substitute for local protocols, supervision, or formal training.',
      'Emphasize ED/ICU recognition, threats, traps, first actions, escalation, and bedside reasoning.',
      'Do not invent ECG, radiology, ultrasound, pathology, lab, dosing, procedural, or medical image findings.',
    ].join('\n');
  }

  if (article.subject === 'Science') {
    return 'Science summaries may be rough or generic. Use the path, summary, and bodyMarkdown to produce a polished but careful lesson without blocking generation.';
  }

  return 'Produce a practical article lesson for the supplied subject and hierarchy path.';
}

export function buildArticleAiInstructions(article = {}) {
  if (article.articleType === 'literature') {
    return [
      '# Identity',
      'You are the Curiosity AI article expansion engine.',
      '',
      NOVEL_CHAPTER_RETELLING_INSTRUCTIONS,
    ].join('\n');
  }

  return [
    '# Identity',
    'You are the Curiosity AI article expansion engine.',
    '',
    '# Role',
    'Expand one opened markdown-derived article into a private generated learning aid for a single local-first user.',
    '',
    '# Output Contract',
    'Return JSON with exactly these top-level fields: title, articleMarkdown, imageCards, imageQueries, practicalTakeaway.',
    'Do not map output into old Curiosity lesson fields such as quickVersion, breakdown, scenario, decision, or reflection.',
    '',
    '# Article Mode',
    articleModeInstruction(article),
    '',
    '# Factuality And Source Rules',
    'Do not invent URLs, attribution, licenses, quotes, dates, citations, or source claims.',
    'Do not claim you checked external sources during this request.',
    'If a source claim is not present in the supplied article context, phrase it cautiously or leave it out.',
    'Paraphrase the supplied markdown instead of copying long passages.',
    '',
    '# Image Rules',
    'Only return imageCards when sourceName, pageUrl, imageUrl, attribution, and license are reliable.',
    'If reliable image metadata is unavailable, return imageCards as an empty array.',
    'Return imageQueries only when they would help the user find legitimate supporting visuals.',
    '',
    '# Teaching Style',
    'Write concise but substantive markdown. Use concrete explanation, examples, traps, tradeoffs, and practical takeaways.',
  ].join('\n');
}

export function buildArticleTutorInstructions(article = {}) {
  return [
    'You are Curiosity article-specific tutor.',
    'Answer only within the current article, generated article draft, hierarchy path, and local thread history.',
    'Tutor responses may use markdown.',
    'Do not return JSON, code fences that wrap a JSON object, or old lesson field names.',
    articleModeInstruction(article),
    'Keep the answer grounded in the supplied article context and generated draft.',
    'If the article leaves something uncertain, say so plainly instead of inventing details.',
  ].join('\n');
}

export function buildArticleExpansionInput(article = {}) {
  const isLiterature = article.articleType === 'literature';
  return {
    task: isLiterature
      ? 'Retell this literature chapter in a continuous short-story style as a reading companion.'
      : article.subject === 'Science'
      ? 'Expand this markdown article. Science summaries may be rough or generic; do not block generation because of that.'
      : 'Expand this markdown article into the structured JSON output.',
    article: {
      subject: article.subject,
      topic: article.topic,
      subtopic: article.subtopic,
      subsubtopic: article.subsubtopic,
      title: article.title,
      summary: article.summary,
      bodyMarkdown: article.bodyMarkdown,
      articleType: article.articleType,
      hierarchyPath: article.hierarchyPath,
      sourceFile: article.sourceFile,
      sourceContext: article.sourceContext || [],
    },
  };
}

function responseInputFromStructuredJson(value) {
  return [
    {
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: JSON.stringify(value, null, 2),
        },
      ],
    },
  ];
}

function stripJsonFence(text = '') {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function normalizeNonFictionExpansionResponse(text = '') {
  const parsedText = stripJsonFence(text);
  let parsed = null;
  try {
    parsed = JSON.parse(parsedText);
  } catch {
    parsed = null;
  }

  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.pages)) {
    return parsed.pages
      .filter((page) => typeof page === 'string')
      .map((page) => page.trim())
      .filter(Boolean)
      .join('\n\n');
  }

  if (parsed && typeof parsed === 'object' && typeof parsed.articleMarkdown === 'string' && parsed.articleMarkdown.trim()) {
    return parsed.articleMarkdown.trim();
  }

  return text.trim() || 'No readable text was returned.';
}

function reliableImageCard(card = {}) {
  return Boolean(card.sourceName && card.pageUrl && card.imageUrl && card.attribution && card.license);
}

function normalizeGeneratedArticle(text, fallbackTitle = 'Generated article', article = null) {
  let parsed = null;
  try {
    parsed = JSON.parse(stripJsonFence(text));
  } catch {
    parsed = null;
  }

  let articleMarkdown = '';
  if (!parsed || typeof parsed !== 'object') {
    articleMarkdown = text;
  } else {
    articleMarkdown = parsed.articleMarkdown || '';
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      title: fallbackTitle,
      articleMarkdown,
      imageCards: [],
      imageQueries: [],
      practicalTakeaway: '',
    };
  }

  return {
    title: parsed.title || fallbackTitle,
    articleMarkdown,
    imageCards: Array.isArray(parsed.imageCards) ? parsed.imageCards.filter(reliableImageCard) : [],
    imageQueries: Array.isArray(parsed.imageQueries)
      ? parsed.imageQueries.filter((query) => typeof query === 'string' && query.trim()).map((query) => query.trim())
      : [],
    practicalTakeaway: parsed.practicalTakeaway || '',
  };
}

export async function expandArticleFromMarkdown({ apiKey, endpoint, model, article }) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  let response;
  try {
    response = await fetch(endpoint || DEFAULT_AI_SETTINGS.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model || DEFAULT_AI_SETTINGS.model,
        instructions: buildArticleAiInstructions(article),
        input: responseInputFromStructuredJson(buildArticleExpansionInput(article)),
        max_output_tokens: 3600,
      }),
    });
  } catch {
    throw new Error('The browser could not reach the API endpoint. Check the endpoint, network, or browser CORS restrictions.');
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || `OpenAI request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return normalizeGeneratedArticle(
    extractResponseText(payload),
    article?.title || 'Generated article',
    article,
  );
}

export const generateArticleLesson = expandArticleFromMarkdown;

export async function askArticleTutor({
  apiKey,
  endpoint,
  model,
  article,
  generatedArticle = null,
  userMessage,
  conversationHistory = [],
}) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  let response;
  try {
    response = await fetch(endpoint || DEFAULT_AI_SETTINGS.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model || DEFAULT_AI_SETTINGS.model,
        instructions: buildArticleTutorInstructions(article),
        input: responseInputFromStructuredJson({
          article: buildArticleExpansionInput(article).article,
          generatedArticle,
          conversationHistory: conversationHistory.slice(-8),
          message: userMessage,
        }),
        max_output_tokens: 1200,
      }),
    });
  } catch {
    throw new Error('The browser could not reach the API endpoint. Check the endpoint, network, or browser CORS restrictions.');
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || `OpenAI request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return extractResponseText(payload);
}

export function extractResponseText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const chunks = [];
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string') chunks.push(content.text);
      if (typeof content?.text?.value === 'string') chunks.push(content.text.value);
    }
  }

  const text = chunks.join('\n').trim();
  return text || 'The API returned a response, but no readable text was found.';
}

export function isEventStreamResponse(response) {
  const contentType = response?.headers?.get?.('content-type') || '';
  return contentType.includes('text/event-stream') && Boolean(response?.body) && typeof response.body.getReader === 'function';
}

// Parse one SSE event block (the text between two blank lines) into its decoded
// JSON frame. Returns null for events we can't use, or { done: true } for the
// terminal [DONE] sentinel. Whole-event parsing means a frame whose data line is
// split across network reads is never parsed half-formed: the caller only hands
// us a block once it has seen the closing blank line.
export function parseSseEvent(rawEvent) {
  const dataLines = [];
  for (const line of rawEvent.split('\n')) {
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''));
    }
  }
  if (dataLines.length === 0) return null;
  const data = dataLines.join('\n').trim();
  if (!data || data === '[DONE]') return { done: true };
  try {
    return { frame: JSON.parse(data) };
  } catch {
    return null;
  }
}

// Read an OpenAI Responses SSE stream, accumulating response.output_text.delta
// frames into the final text and reporting each delta through onDelta. Bytes are
// buffered across reads and only split into events on blank-line boundaries, so a
// delta whose JSON is torn mid-token across two network reads is reassembled
// before parsing. Throws on error/failed frames; otherwise returns the full text.
export async function streamOpenAiResponse(response, onDelta = () => {}) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let completed = null;

  const drain = () => {
    let boundary;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const parsed = parseSseEvent(rawEvent);
      if (!parsed || parsed.done || !parsed.frame) continue;
      const frame = parsed.frame;
      if (frame.type === 'response.output_text.delta') {
        if (typeof frame.delta === 'string' && frame.delta) {
          text += frame.delta;
          onDelta(frame.delta);
        }
      } else if (frame.type === 'response.completed') {
        completed = frame.response || null;
      } else if (frame.type === 'error' || frame.type === 'response.failed') {
        const message = frame.message || frame.error?.message || frame.response?.error?.message
          || 'The streaming response failed.';
        throw new Error(message);
      }
    }
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) buffer += decoder.decode(value, { stream: true });
    drain();
  }
  buffer += decoder.decode();
  drain();

  if (text.trim()) return text.trim();
  if (completed) return extractResponseText(completed);
  return 'The API returned a response, but no readable text was found.';
}

export async function askOpenAI({ apiKey, endpoint, model, messages, question, lesson, includeLessonContext, onDelta }) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  const wantsStream = typeof onDelta === 'function';

  let response;
  try {
    response = await fetch(endpoint || DEFAULT_AI_SETTINGS.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model || DEFAULT_AI_SETTINGS.model,
        instructions: buildAiInstructions(lesson, includeLessonContext),
        input: buildResponseInput(messages, question),
        max_output_tokens: 1200,
        ...(wantsStream ? { stream: true } : {}),
      }),
    });
  } catch {
    throw new Error('The browser could not reach the API endpoint. Check the endpoint, network, or browser CORS restrictions.');
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.error?.message || `OpenAI request failed with status ${response.status}.`;
    throw new Error(message);
  }

  if (wantsStream && isEventStreamResponse(response)) {
    return streamOpenAiResponse(response, onDelta);
  }

  const payload = await response.json().catch(() => null);
  return extractResponseText(payload);
}

// Markdown-prose variant of the nonfiction expansion contract: same teaching
// rules, but the model returns flowing prose (no JSON envelope) so the text can
// stream straight into the reader and be paginated live.
const NONFICTION_MARKDOWN_OUTPUT = [
  'Output:',
  'Write the lesson as continuous markdown prose — paragraphs only.',
  '- No JSON, no code fences, no title line, no section headings, no bullet lists, no labels.',
  '- Just the flowing lesson text, the way a calm book chapter reads.',
  '- Separate paragraphs with a blank line.',
].join('\n');

function nonfictionMarkdownInstructions() {
  const base = NONFICTION_EXPANSION_INSTRUCTIONS.split('\nOutput:')[0];
  return `${base}\n\n${NONFICTION_MARKDOWN_OUTPUT}`;
}

// Stream a markdown lesson/expansion, reporting each delta through onDelta and
// resolving to the full markdown text. Falls back to a non-streaming read if the
// endpoint does not return an event stream.
export async function streamMarkdownExpansion({ apiKey, endpoint, model, instructions, contextInput, onDelta }) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  let response;
  try {
    response = await fetch(endpoint || DEFAULT_AI_SETTINGS.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model || DEFAULT_AI_SETTINGS.model,
        instructions,
        input: [{ role: 'user', content: contextInput }],
        max_output_tokens: 3600,
        stream: true,
      }),
    });
  } catch {
    throw new Error('The browser could not reach the API endpoint. Check the endpoint, network, or browser CORS restrictions.');
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message || `OpenAI request failed with status ${response.status}.`);
  }

  if (isEventStreamResponse(response)) {
    return streamOpenAiResponse(response, onDelta);
  }

  const payload = await response.json().catch(() => null);
  const text = extractResponseText(payload);
  if (typeof onDelta === 'function' && text) onDelta(text);
  return text;
}

export function streamExpandLearningContent({ apiKey, endpoint, model, lesson, chapter = null, onDelta }) {
  const isNovelChapter = isNovelReadingLesson(lesson) && !!chapter;
  const instructions = isNovelChapter ? NOVEL_CHAPTER_RETELLING_INSTRUCTIONS : nonfictionMarkdownInstructions();
  const contextInput = isNovelChapter
    ? buildNovelChapterContextInput({ lesson, chapter })
    : buildNonFictionExpansionContextInput({ lesson, chapter });
  return streamMarkdownExpansion({ apiKey, endpoint, model, instructions, contextInput, onDelta });
}

export function streamExpandArticleContent({ apiKey, endpoint, model, article, onDelta }) {
  const isLiterature = article?.articleType === 'literature';
  const instructions = isLiterature ? NOVEL_CHAPTER_RETELLING_INSTRUCTIONS : nonfictionMarkdownInstructions();
  const contextInput = [
    'Expand this opened article into a flowing lesson written as markdown prose.',
    JSON.stringify(buildArticleExpansionInput(article).article, null, 2),
  ].join('\n\n');
  return streamMarkdownExpansion({ apiKey, endpoint, model, instructions, contextInput, onDelta });
}
