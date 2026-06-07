const AI_CHAT_KEY = 'leaderman.ai.chat.v1';

export function loadAiChat() {
  try {
    const messages = JSON.parse(localStorage.getItem(AI_CHAT_KEY) || '[]');
    return Array.isArray(messages) ? messages.slice(-80) : [];
  } catch {
    return [];
  }
}

export function saveAiChat(messages) {
  localStorage.setItem(AI_CHAT_KEY, JSON.stringify(messages.slice(-80)));
}

export function clearAiChat() {
  localStorage.removeItem(AI_CHAT_KEY);
}
