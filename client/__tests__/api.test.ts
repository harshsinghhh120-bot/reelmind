/**
 * Unit tests for the agent API client contract (lib/api.ts).
 * fetch is mocked; the timeout test uses fake timers with a fetch mock that
 * rejects on abort (like real fetch does).
 */
import { AGENT_URL, VIEWER_ID, chat } from '../lib/api';

// No expo extra configured in the test env → documented defaults.
const DEFAULT_AGENT_URL = 'http://192.168.1.10:8000';
const DEFAULT_VIEWER_ID = 'couch-1';

type FetchMock = jest.Mock;

beforeEach(() => {
  (globalThis as Record<string, unknown>).fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('config', () => {
  it('falls back to documented defaults when no expo extra is set', () => {
    expect(AGENT_URL).toBe(DEFAULT_AGENT_URL);
    expect(VIEWER_ID).toBe(DEFAULT_VIEWER_ID);
  });
});

describe('chat()', () => {
  it('POSTs the wire contract and returns the parsed reply', async () => {
    const reply = { kind: 'briefing' as const, text: 'hi', sections: [] };
    (globalThis.fetch as FetchMock).mockResolvedValue({
      ok: true,
      json: async () => reply,
    });

    const out = await chat('what is a black hole?', 'explain', { concept: 'black hole' });

    expect(out).toEqual(reply);
    const [url, init] = (globalThis.fetch as FetchMock).mock.calls[0];
    expect(url).toBe(`${DEFAULT_AGENT_URL}/chat`);
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({
      viewer_id: DEFAULT_VIEWER_ID,
      message: 'what is a black hole?',
      action: 'explain',
      payload: { concept: 'black hole' },
    });
  });

  it('sends action/payload as undefined when omitted', async () => {
    (globalThis.fetch as FetchMock).mockResolvedValue({
      ok: true,
      json: async () => ({ kind: 'answer', text: 'ok' }),
    });
    await chat('hello');
    const body = JSON.parse((globalThis.fetch as FetchMock).mock.calls[0][1].body);
    expect(body).toEqual({
      viewer_id: DEFAULT_VIEWER_ID,
      message: 'hello',
      action: undefined,
      payload: undefined,
    });
  });

  it('maps non-2xx to an http_error reply (never throws)', async () => {
    (globalThis.fetch as FetchMock).mockResolvedValue({ ok: false, status: 503 });
    const out = await chat('hello');
    expect(out.kind).toBe('error');
    expect(out.error_code).toBe('http_error');
    expect(out.text).toContain('503');
    expect(out.text).toContain(DEFAULT_AGENT_URL);
  });

  it('maps network failure to a network_error reply (never throws)', async () => {
    (globalThis.fetch as FetchMock).mockRejectedValue(new TypeError('fetch failed'));
    const out = await chat('hello');
    expect(out.kind).toBe('error');
    expect(out.error_code).toBe('network_error');
  });

  it('aborts after 20s and reports network_error', async () => {
    jest.useFakeTimers();
    let signal: AbortSignal | undefined;
    (globalThis.fetch as FetchMock).mockImplementation(
      (_url: string, init: { signal: AbortSignal }) => {
        signal = init.signal;
        return new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () =>
            reject(new Error('The operation was aborted.')),
          );
        });
      },
    );

    const pending = chat('slow request');
    await jest.advanceTimersByTimeAsync(19_999);
    expect(signal?.aborted).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    expect(signal?.aborted).toBe(true);

    const out = await pending;
    expect(out.kind).toBe('error');
    expect(out.error_code).toBe('network_error');
  });
});
