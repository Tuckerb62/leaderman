import { describe, expect, it, vi, afterEach } from 'vitest';
import { fetchSyncHealth, fetchSyncSnapshot, pushSyncSnapshot } from './syncClient.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('sync client', () => {
  it('calls the built-in sync bridge health endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ available: true }),
    });
    globalThis.fetch = fetchMock;

    await fetchSyncHealth();

    expect(fetchMock).toHaveBeenCalledWith('/api/sync-health');
  });

  it('loads the built-in sync snapshot', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ snapshot: null }),
    });
    globalThis.fetch = fetchMock;

    await fetchSyncSnapshot();

    expect(fetchMock).toHaveBeenCalledWith('/api/sync-state');
  });

  it('posts snapshots to the built-in sync endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ snapshot: { syncedAt: '2026-06-08T12:00:00.000Z' } }),
    });
    globalThis.fetch = fetchMock;

    await pushSyncSnapshot({ syncedAt: '2026-06-08T12:00:00.000Z' });

    expect(fetchMock).toHaveBeenCalledWith('/api/sync-state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ snapshot: { syncedAt: '2026-06-08T12:00:00.000Z' } }),
    });
  });
});
