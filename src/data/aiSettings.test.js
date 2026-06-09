import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_AI_SETTINGS } from '../logic/aiClient.js';
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

    const savedSettings = localStorage.getItem('leaderman.ai.settings.v1');
    expect(savedSettings).not.toContain('sk-secret');
    expect(savedSettings).not.toContain('https://example.test/responses');
    expect(loadAiSettings().model).toBe('test-model');
    expect(loadAiSettings().endpoint).toBe(DEFAULT_AI_SETTINGS.endpoint);
  });

  it('ignores legacy browser-saved endpoints', () => {
    localStorage.setItem('leaderman.ai.settings.v1', JSON.stringify({
      endpoint: 'https://example.test/responses',
      model: 'legacy-model',
    }));

    expect(loadAiSettings().model).toBe('legacy-model');
    expect(loadAiSettings().endpoint).toBe(DEFAULT_AI_SETTINGS.endpoint);
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
