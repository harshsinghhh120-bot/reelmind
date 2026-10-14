import { TITLES, keyOf } from '../state/types';

describe('state/types', () => {
  it('keyOf normalizes titles for the progress map', () => {
    expect(keyOf(' The Bear ')).toBe('the bear');
    expect(keyOf('Avatar: The Last Airbender')).toBe('avatar: the last airbender');
    expect(keyOf('Shogun')).toBe('shogun');
  });

  it('TITLES is the demo watchlist used by Home and voice matching', () => {
    expect(TITLES).toHaveLength(10);
    expect(TITLES).toContain('Severance');
    expect(TITLES).toContain('Shogun');
    // Voice matching (App.tsx handleVoice) lowercases both sides.
    const spoken = 'tell me about the bear';
    const hit = TITLES.find((t) => spoken.includes(t.toLowerCase()));
    expect(hit).toBe('The Bear');
  });
});
