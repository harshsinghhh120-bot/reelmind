import type { Progress, Quiz, Reply } from '../lib/api';

export type Screen =
  | { name: 'home' }
  | { name: 'ask'; title: string; initialMessage?: string }
  | { name: 'briefing'; title: string; reply: Reply }
  | { name: 'quiz'; title: string; quiz: Quiz }
  | { name: 'explain' }
  | { name: 'watchparty'; title: string };

export type HomeAction = 'ask' | 'quiz' | 'explain' | 'watchparty';

export const TITLES = [
  'The Bear',
  'Severance',
  'Shogun',
  'Ted Lasso',
  'Dark',
  'The Last of Us',
  'Andor',
  'Stranger Things',
  'Succession',
  'Avatar: The Last Airbender',
] as const;

export const keyOf = (title: string) => title.trim().toLowerCase();

export type ProgressMap = Record<string, Progress>;
