import { beforeEach, describe, expect, it } from 'vitest';
import { clearAiChat, loadAiChat, saveAiChat } from './aiChatStorage.js';

function makeStore() {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  };
}

beforeEach(() => {
  globalThis.localStorage = makeStore();
});

describe('AI chat storage', () => {
  it('persists chat messages locally', () => {
    saveAiChat([{ role: 'user', content: 'Hello' }]);
    expect(loadAiChat()).toEqual([{ role: 'user', content: 'Hello' }]);
  });

  it('clears persisted chat messages', () => {
    saveAiChat([{ role: 'user', content: 'Hello' }]);
    clearAiChat();
    expect(loadAiChat()).toEqual([]);
  });
});
