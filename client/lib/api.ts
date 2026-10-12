/**
 * ReelMind agent API client.
 *
 * The companion agent (Python, Strands + Bedrock, served by tv-agent-quickstart)
 * listens on the dev machine. Point `extra.agentUrl` in app.json at that
 * machine's LAN IP. On a real Fire TV stick, the agent can also be deployed
 * to a public URL (AgentCore gateway / Lambda) — same client, new URL.
 */
import Constants from 'expo-constants';

export type CardKind =
  | 'briefing'
  | 'answer'
  | 'quiz'
  | 'quiz_result'
  | 'explain'
  | 'discussion'
  | 'progress_update'
  | 'error';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string;
}

export interface Quiz {
  topic: string;
  difficulty?: string;
  questions: QuizQuestion[];
}

export interface Section {
  heading: string;
  body: string;
}

export interface Progress {
  title: string;
  season: number;
  episode: number;
  note?: string;
}

export interface QuizResult {
  correct: boolean;
  correct_answer?: string;
  explanation?: string;
}

export interface Reply {
  kind: CardKind;
  text?: string;
  quiz?: Quiz;
  quiz_result?: QuizResult;
  progress?: Progress;
  sections?: Section[];
  level?: string;
  spoiler_warning?: string;
  error_code?: string;
}

const config = Constants.expoConfig?.extra ?? {};

export const AGENT_URL: string =
  (config.agentUrl as string | undefined) ?? 'http://192.168.1.10:8000';
export const VIEWER_ID: string = (config.viewerId as string | undefined) ?? 'couch-1';

const TIMEOUT_MS = 20_000;

export async function chat(
  message: string,
  action?: string,
  payload?: Record<string, unknown>,
): Promise<Reply> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${AGENT_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewer_id: VIEWER_ID, message, action, payload }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      return {
        kind: 'error',
        text: `Agent server replied ${res.status}. Is it running at ${AGENT_URL}?`,
        error_code: 'http_error',
      };
    }
    return (await res.json()) as Reply;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      kind: 'error',
      text: `Couldn't reach the ReelMind agent at ${AGENT_URL}. (${msg})`,
      error_code: 'network_error',
    };
  } finally {
    clearTimeout(timer);
  }
}
