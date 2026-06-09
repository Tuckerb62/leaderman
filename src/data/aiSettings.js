import { DEFAULT_AI_SETTINGS } from '../logic/aiClient.js';

const SETTINGS_KEY = 'leaderman.ai.settings.v1';
const LOCAL_KEY = 'leaderman.ai.apiKey.v1';
const SESSION_KEY = 'leaderman.ai.sessionKey.v1';

export function loadAiSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    const { endpoint, ...safeSaved } = saved || {};
    return {
      ...DEFAULT_AI_SETTINGS,
      ...safeSaved,
      hasStoredKey: Boolean(localStorage.getItem(LOCAL_KEY) || sessionStorage.getItem(SESSION_KEY)),
      apiKey: localStorage.getItem(LOCAL_KEY) || sessionStorage.getItem(SESSION_KEY) || '',
    };
  } catch {
    return {
      ...DEFAULT_AI_SETTINGS,
      hasStoredKey: false,
      apiKey: '',
    };
  }
}

export function saveAiSettings(settings) {
  const { apiKey, hasStoredKey, endpoint, ...safeSettings } = settings;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(safeSettings));
}

export function saveApiKey(apiKey, persistKey) {
  if (persistKey) {
    localStorage.setItem(LOCAL_KEY, apiKey);
    sessionStorage.removeItem(SESSION_KEY);
    return;
  }
  sessionStorage.setItem(SESSION_KEY, apiKey);
  localStorage.removeItem(LOCAL_KEY);
}

export function clearApiKey() {
  localStorage.removeItem(LOCAL_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}
