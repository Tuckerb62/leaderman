export const DEFAULT_AI_SETTINGS = {
  endpoint: '/api/openai-responses',
  model: 'gpt-5.4',
  persistKey: false,
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

function compactList(items = []) {
  return items.filter(Boolean).map((item) => `- ${item}`).join('\n');
}

export const EXPANSION_OVERVIEW_PROMPT = [
  '# Identity',
  'You are the Curiosity AI expansion engine.',
  '',
  '# Purpose',
  'Turn thin local-first learning content into deeper microlearning content that is genuinely useful, specific, memorable, and easy to study.',
  '',
  '# What To Do',
  '- Expand the supplied topic, lesson, summary, or chapter context into a fuller learning draft.',
  '- Preserve the user-provided topic and source basis.',
  '- Teach with concrete examples, scenarios, nuance, tradeoffs, and practice language.',
  '- Keep microlearning structure for lessons: short sections, clear pacing, strong memory hooks, and useful questions when the requested content is nonfiction or explicitly study-oriented.',
  '- Keep fiction and novel outputs in reading mode: retell the story clearly and vividly without adding quiz questions unless the user explicitly asks for them.',
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
  '- Include setting, characters, tension, motivation, key events in order, emotional turn, consequence, and unresolved tension.',
  '- Make the retelling feel like a short story: scenes should move, choices should matter, and the ending should leave the chapter’s open question visible.',
  '- What Changed should explain the real shift by the end: knowledge, relationship, danger, power, identity, trust, or choice.',
  '- Why It Matters should connect the chapter to emerging themes and conflicts without spoiling later events.',
  '- Reader Guide should orient the reader gently: where the chapter starts, central tension, what the character wants, what complicates the goal, what changes, and what to watch next.',
  '- Keep In Mind should contain 3-5 reader hooks: main event, character shift, relationship change, symbol/theme/conflict, or a likely future pressure.',
  '- Do not add questions to fiction or novel reading outputs unless the user explicitly asks for them.',
  '- Stay inside the supplied spoiler boundary. Do not reveal later plot events.',
  '',
  '# Question Rules',
  '- Nonfiction questions should usually include recall, scenario/application, judgment/tradeoff, and reflection.',
  '- Do not add questions to fiction or novel reading outputs unless the user explicitly asks for them.',
  '- Questions should not merely ask the learner to repeat the heading or title.',
  '- Write questions that reveal whether the learner can transfer the idea to a real situation.',
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

function isHistoryLesson(lesson) {
  return lesson?.summaryKind === 'History' || lesson?.domain === 'World History' || lesson?.domain === 'History';
}

function buildExpansionTaskProfile(lesson, chapter) {
  if (isNovelReadingLesson(lesson) && chapter) {
    return {
      target: 'chapter retelling',
      mode: 'Fiction chapter reading companion',
      goal: 'Retell the selected chapter as a readable, spoiler-bounded story that helps the user enjoy the book without turning it into schoolwork.',
      instructions: [
        'Retell the selected chapter as a readable, spoiler-bounded story with scene movement, character pressure, emotional turns, and unresolved tension.',
        'Use the supplied chapter as the hard boundary. Do not reveal later plot events, endings, twists, deaths, betrayals, or resolutions.',
        'Do not turn the chapter into a quiz, worksheet, literary exam, or generic theme summary.',
        'Keep Reader Guide and Keep In Mind gentle: they should orient the reader, not test the reader.',
      ],
      sections: '## Story Retelling\n## What Changed\n## Why It Matters\n## Reader Guide\n## Keep In Mind',
    };
  }

  if (isNovelReadingLesson(lesson)) {
    return {
      target: 'novel reading companion',
      mode: 'Novel reading companion',
      goal: 'Help the reader enjoy and follow the book through a clear, vivid guide without adding quizzes or study pressure.',
      instructions: [
        'Help the reader enjoy and follow the book by clarifying the premise, major people, tensions, mood, and things worth noticing.',
        'Do not write quiz questions, exam prompts, or homework-style tasks.',
        'Keep spoilers appropriate to the supplied overview. If the context is thin, stay general rather than inventing details.',
        'Use Keep In Mind for light reader orientation, not memorization drills.',
      ],
      sections: '## Story Overview\n## Main Characters\n## Main Tensions\n## Why It Matters\n## Keep In Mind',
    };
  }

  if (isHistoryLesson(lesson) && chapter) {
    return {
      target: 'history study section',
      mode: 'History study section',
      goal: 'Turn a thin historical section into a concrete explanation of what happened, why people acted, and what changed.',
      instructions: [
        'Explain actors, motives, constraints, incentives, turning points, and consequences.',
        'Preserve contingency: show what was uncertain, pressured, misunderstood, or strategically constrained.',
        'Do not flatten the event into a generic moral or leadership slogan.',
        'Questions should test recall, cause-and-effect, judgment, and modern transfer.',
      ],
      sections: '## Historical Narrative\n## What Changed\n## Why It Matters\n## Break Down\n## Remember\n## Questions',
    };
  }

  if (isHistoryLesson(lesson)) {
    return {
      target: 'history study guide',
      mode: 'History study guide',
      goal: 'Expand the historical overview into a useful map of events, actors, incentives, consequences, and common misunderstandings.',
      instructions: [
        'Explain what happened, who mattered, what each side wanted, what constraints shaped action, and why the outcome mattered.',
        'Use the timeline and theme notes as anchors, but avoid copying them as filler.',
        'Include common misunderstandings and why they are tempting.',
        'Questions should test recall, cause-and-effect, judgment, and modern transfer.',
      ],
      sections: '## Quick Version\n## Historical Read\n## Break Down\n## Remember\n## Questions',
    };
  }

  return {
    target: 'lesson',
    mode: 'Nonfiction micro-lesson',
    goal: 'Expand the lesson into a practical microlearning draft that teaches a real decision habit.',
    instructions: [
      'Teach the real-world problem, core idea, concrete example, practice move, mistake to avoid, and transfer questions.',
      'Make the Deeper Read specific enough that a learner could use the idea in a real meeting, conflict, decision, or personal habit.',
      'Questions should include recall, scenario/application, judgment/tradeoff, and reflection.',
      'Avoid generic coaching language and repeated safety/fidelity boilerplate.',
    ],
    sections: '## Quick Version\n## Deeper Read\n## Break Down\n## Remember\n## Questions',
  };
}

export function buildExpansionPrompt({ lesson, chapter = null }) {
  const profile = buildExpansionTaskProfile(lesson, chapter);
  const novelReadingMode = isNovelReadingLesson(lesson);
  const currentText = chapter
    ? [
        `Chapter title: ${chapter.title}`,
        `Current chapter text: ${chapter.summary || chapter.retellingParagraphs?.join('\n\n') || 'Not written yet.'}`,
        `What changed: ${chapter.whatChanged || 'Not written yet.'}`,
        `Why it matters: ${chapter.whyItMatters || 'Not written yet.'}`,
        `${novelReadingMode ? 'Current reader guide' : 'Current breakdown'}:\n${compactList(chapter.breakDown || [])}`,
        `${novelReadingMode ? 'Current keep in mind' : 'Current remember'}:\n${compactList(chapter.remember || chapter.keyPoints || [])}`,
        novelReadingMode ? '' : `Current questions:\n${compactList((chapter.questions || []).map((question) => `${question.type}: ${question.prompt}`))}`,
      ].join('\n')
    : [
        `Current quick version:\n${compactList(lesson.quickVersion || lesson.summaryBullets || [])}`,
        `Current article:\n${(lesson.articleParagraphs || []).join('\n\n')}`,
        `${novelReadingMode ? 'Current reader guide' : 'Current breakdown'}:\n${compactList(lesson.breakDown || [])}`,
        `${novelReadingMode ? 'Current keep in mind' : 'Current remember'}:\n${compactList(lesson.remember || lesson.themeNotes || [])}`,
      ].join('\n\n');

  return [
    '# Expansion Request',
    `Target: full Curiosity ${profile.target}`,
    '',
    '# Task Profile',
    `Mode: ${profile.mode}`,
    `Goal: ${profile.goal}`,
    '',
    '# Task-Specific Instructions',
    compactList(profile.instructions),
    '',
    '# Required Markdown Sections',
    profile.sections,
    '',
    '# Topic Context',
    `Lesson title: ${lesson.title}`,
    `Domain: ${lesson.domain}`,
    `Type: ${lesson.summaryKind || lesson.contentType || 'Lesson'}`,
    `Core idea: ${lesson.coreIdea}`,
    `Source basis: ${lesson.sourceBasis?.join(', ') || 'Not listed'}`,
    chapter?.spoilerBoundary ? `Spoiler boundary: ${chapter.spoilerBoundary}` : '',
    '',
    '# Current Draft Context',
    currentText,
  ].filter(Boolean).join('\n');
}

export async function expandLearningContent({ apiKey, endpoint, model, lesson, chapter }) {
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
        instructions: EXPANSION_OVERVIEW_PROMPT,
        input: [
          {
            role: 'user',
            content: buildExpansionPrompt({ lesson, chapter }),
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

  return extractResponseText(payload);
}

function articleModeInstruction(article = {}) {
  if (article.articleType === 'literature') {
    return [
      'This is a Literature article. Produce a reader-friendly chapter guide.',
      'Do not create a worksheet, quiz, scenario, or decision UI.',
      'Stay within the supplied chapter/book boundary and do not reveal later events.',
    ].join('\n');
  }

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
  return {
    task: article.subject === 'Science'
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

function reliableImageCard(card = {}) {
  return Boolean(card.sourceName && card.pageUrl && card.imageUrl && card.attribution && card.license);
}

function normalizeGeneratedArticle(text, fallbackTitle = 'Generated article') {
  let parsed = null;
  try {
    parsed = JSON.parse(stripJsonFence(text));
  } catch {
    parsed = null;
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      title: fallbackTitle,
      articleMarkdown: text,
      imageCards: [],
      imageQueries: [],
      practicalTakeaway: '',
    };
  }

  return {
    title: parsed.title || fallbackTitle,
    articleMarkdown: parsed.articleMarkdown || '',
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

  return normalizeGeneratedArticle(extractResponseText(payload), article?.title || 'Generated article');
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

export async function askOpenAI({ apiKey, endpoint, model, messages, question, lesson, includeLessonContext }) {
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
        instructions: buildAiInstructions(lesson, includeLessonContext),
        input: buildResponseInput(messages, question),
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
