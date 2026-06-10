import { trimAiChatMessages } from './stateLimits.js';

const AI_CHAT_KEY = 'leaderman.ai.chat.v1';

export function loadAiChat() {
  try {
    const messages = JSON.parse(localStorage.getItem(AI_CHAT_KEY) || '[]');
    return Array.isArray(messages) ? trimAiChatMessages(messages) : [];
  } catch {
    return [];
  }
}

export function saveAiChat(messages) {
  localStorage.setItem(AI_CHAT_KEY, JSON.stringify(trimAiChatMessages(messages)));
}

export function clearAiChat() {
  localStorage.removeItem(AI_CHAT_KEY);
}
