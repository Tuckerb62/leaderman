export const DEFAULT_AI_SETTINGS = {
  endpoint: '/api/openai-responses',
  model: 'gpt-5.1',
  persistKey: false,
};

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
    'You are Leaderman AI Coach, a serious leadership tutor inside a microlearning app.',
    'Answer with practical judgment, historical pattern recognition, and clear caveats.',
    'Do not invent book quotes, citations, dates, or historical facts. If uncertain, say what should be checked.',
    'Prefer concise explanations, examples, analogies, and one concrete practice step.',
    'When asked for advice, separate principle, historical parallel, tradeoff, and action.',
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
        max_output_tokens: 900,
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
