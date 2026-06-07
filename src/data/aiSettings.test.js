import { beforeEach, describe, expect, it } from 'vitest';
import { clearApiKey, loadAiSettings, saveAiSettings, saveApiKey } from './aiSettings.js';

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
  globalThis.sessionStorage = makeStore();
});

describe('AI settings storage', () => {
  it('keeps API keys out of saved settings', () => {
    saveAiSettings({
      endpoint: 'https://example.test/responses',
      model: 'test-model',
      persistKey: true,
      apiKey: 'sk-secret',
      hasStoredKey: true,
    });

    expect(localStorage.getItem('leaderman.ai.settings.v1')).not.toContain('sk-secret');
    expect(loadAiSettings().model).toBe('test-model');
  });

  it('stores session-only keys in session storage', () => {
    saveApiKey('sk-session', false);

    expect(loadAiSettings().apiKey).toBe('sk-session');
    expect(localStorage.getItem('leaderman.ai.apiKey.v1')).toBe(null);
  });

  it('stores remembered keys in local storage and can clear them', () => {
    saveApiKey('sk-local', true);
    expect(loadAiSettings().apiKey).toBe('sk-local');

    clearApiKey();
    expect(loadAiSettings().apiKey).toBe('');
  });
});
