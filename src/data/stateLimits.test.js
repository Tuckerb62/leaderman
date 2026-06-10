import { describe, expect, it } from 'vitest';
import { trimAiChatMessages, trimReflections, trimSessions } from './stateLimits.js';

describe('state limit helpers', () => {
  it('keeps the newest bounded state slices consistently', () => {
    expect(trimSessions(Array.from({ length: 12 }, (_, index) => ({ id: `session-${index}` })))).toHaveLength(10);
    expect(trimReflections(Array.from({ length: 105 }, (_, index) => ({ id: `reflection-${index}` })))).toHaveLength(100);

    const chatMessages = Array.from({ length: 85 }, (_, index) => ({ id: `chat-${index}` }));

    expect(trimAiChatMessages(chatMessages).map((message) => message.id)[0]).toBe('chat-5');
    expect(trimAiChatMessages(chatMessages)).toHaveLength(80);
  });
});
