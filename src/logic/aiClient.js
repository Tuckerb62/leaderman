export const DEFAULT_AI_SETTINGS = {
  endpoint: '/api/openai-responses',
  model: 'gpt-5.2',
  persistKey: false,
};

export const AI_MODEL_OPTIONS = [
  {
    id: 'gpt-5.2',
    label: 'GPT-5.2',
    description: 'Best default for deep leadership questions, historical comparison, and nuanced judgment.',
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
    'You are Leaderman AI Coach, the in-app tutor for Leaderman.',
    '',
    'App overview:',
    'Leaderman is a local-first leadership formation app for a person training judgment, self-command, communication, influence, ethics, power literacy, conflict skill, systems thinking, technology awareness, history, and philosophy. The app teaches through source cards, article-style lessons, historical examples, scenario decisions, reflection prompts, completion tracking, question accuracy, and progress signals. It is not a generic chatbot, course marketplace, motivational app, or passive book-summary app.',
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
    'When drafting or improving lesson content, use the learning tiers Quick version, Deeper read, Break Down, Remember, and Questions. The deeper read should teach with concrete problems, examples, tradeoffs, practice phrases, and application. Break Down should explain the idea step by step. Remember should contain durable memory hooks. Questions should include recall plus scenario, judgment, and reflection prompts.',
    'Do not pad lessons with repeated copyright, fidelity, or caution boilerplate. Do not use generic filler such as "this is not universal," "use with discipline," or repeated source-safety disclaimers as article content. Keep source uncertainty short and separate from the main teaching body.',
    'For fiction, write compressed story retellings with movement, tension, setting, character motivation, what changed, why it matters, breakdown, memory hooks, and plot/motivation/theme/interpretation questions. Do not reveal later events when discussing an earlier chapter.',
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

export function buildExpansionPrompt({ lesson, chapter = null }) {
  const target = chapter ? 'chapter retelling' : 'lesson';
  const currentText = chapter
    ? [
        `Chapter title: ${chapter.title}`,
        `Current chapter text: ${chapter.summary || chapter.retellingParagraphs?.join('\n\n') || 'Not written yet.'}`,
        `What changed: ${chapter.whatChanged || 'Not written yet.'}`,
        `Why it matters: ${chapter.whyItMatters || 'Not written yet.'}`,
        `Current breakdown:\n${compactList(chapter.breakDown || [])}`,
        `Current remember:\n${compactList(chapter.remember || chapter.keyPoints || [])}`,
        `Current questions:\n${compactList((chapter.questions || []).map((question) => `${question.type}: ${question.prompt}`))}`,
      ].join('\n')
    : [
        `Current quick version:\n${compactList(lesson.quickVersion || lesson.summaryBullets || [])}`,
        `Current article:\n${(lesson.articleParagraphs || []).join('\n\n')}`,
        `Current breakdown:\n${compactList(lesson.breakDown || [])}`,
        `Current remember:\n${compactList(lesson.remember || lesson.themeNotes || [])}`,
      ].join('\n\n');

  return [
    `Expand this into a full Leaderman ${target}.`,
    '',
    'Return Markdown with these sections exactly:',
    chapter
      ? '## Story Retelling\n## What Changed\n## Why It Matters\n## Break Down\n## Remember\n## Questions'
      : '## Quick Version\n## Deeper Read\n## Break Down\n## Remember\n## Questions',
    '',
    'Write like a useful teacher, not a legal disclaimer. Do not use repeated copyright, fidelity, or caution boilerplate. Do not invent direct quotes. For fiction, paraphrase story events and stay inside the spoiler boundary of the selected chapter.',
    '',
    `Lesson title: ${lesson.title}`,
    `Domain: ${lesson.domain}`,
    `Type: ${lesson.summaryKind || lesson.contentType || 'Lesson'}`,
    `Core idea: ${lesson.coreIdea}`,
    `Source basis: ${lesson.sourceBasis?.join(', ') || 'Not listed'}`,
    chapter?.spoilerBoundary ? `Spoiler boundary: ${chapter.spoilerBoundary}` : '',
    '',
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
        instructions: [
          'You are the Leaderman AI expansion engine.',
          'Your job is to turn thin local-first learning content into deeper microlearning content.',
          'Keep the answer structured, concrete, readable, and practical.',
          'Do not invent citations, direct quotes, or facts. If uncertain, phrase cautiously.',
          'Return only the expanded Markdown content requested by the user prompt.',
        ].join('\n'),
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
