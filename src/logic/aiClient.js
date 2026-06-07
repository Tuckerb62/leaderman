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
    'Leaderman is a local-first leadership formation app for a person training judgment, self-command, communication, influence, ethics, power literacy, conflict skill, systems thinking, technology awareness, history, and philosophy. The app teaches through source cards, article-style lessons, historical examples, scenario decisions, reflection prompts, spaced review, and progress signals. It is not a generic chatbot, course marketplace, motivational app, or passive book-summary app.',
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
