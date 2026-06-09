async function parseResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message || fallbackMessage);
  }
  return payload || {};
}

export async function fetchSyncHealth() {
  const response = await fetch('/api/sync-health');
  const payload = await parseResponse(response, 'Could not reach sync.');
  return {
    ...payload,
    mode: 'local',
  };
}

export async function fetchSyncSnapshot() {
  const response = await fetch('/api/sync-state');
  return parseResponse(response, 'Could not load sync state.');
}

export async function pushSyncSnapshot(snapshot) {
  const response = await fetch('/api/sync-state', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ snapshot }),
  });
  return parseResponse(response, 'Could not save sync state.');
}
