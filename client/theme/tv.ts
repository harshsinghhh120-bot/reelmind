/**
 * 10-foot UI theme. Big type, generous focus targets, one accent color.
 */
import { StyleSheet } from 'react-native';

export const colors = {
  bg: '#0B0E14',
  bgElevated: '#141926',
  bgCard: '#1A2130',
  text: '#F2F5FA',
  textDim: '#9AA7BD',
  accent: '#FFB13D',
  accentDim: '#7A5A1E',
  ok: '#4CD97B',
  bad: '#FF6B6B',
  ring: '#FFB13D',
} as const;

export const sizes = {
  hero: 44,
  title: 34,
  body: 22,
  small: 17,
  cardPad: 22,
  cardGap: 16,
  focusRing: 3,
} as const;

export const base = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 28,
    paddingBottom: 28,
    paddingLeft: 48,
    paddingRight: 48,
  },
  screenTitle: {
    color: colors.text,
    fontSize: sizes.title,
    fontWeight: '700',
    marginBottom: 18,
  },
  hero: {
    color: colors.text,
    fontSize: sizes.hero,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dim: { color: colors.textDim, fontSize: sizes.small },
});

/** Focus style applied on top of a Focusable's base style when focused. */
export const focusStyles = StyleSheet.create({
  focused: {
    borderColor: colors.ring,
    borderWidth: sizes.focusRing,
    backgroundColor: colors.bgElevated,
    transform: [{ scale: 1.02 }],
  },
  unfocused: {
    borderColor: 'transparent',
    borderWidth: sizes.focusRing,
  },
});
