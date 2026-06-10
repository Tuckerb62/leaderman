export const MAX_SESSIONS = 10;
export const MAX_REFLECTIONS = 100;
export const MAX_AI_CHAT_MESSAGES = 80;

export function trimSessions(sessions = []) {
  return (sessions || []).slice(0, MAX_SESSIONS);
}

export function trimReflections(reflections = []) {
  return (reflections || []).slice(0, MAX_REFLECTIONS);
}

export function trimAiChatMessages(messages = []) {
  return (messages || []).slice(-MAX_AI_CHAT_MESSAGES);
}
