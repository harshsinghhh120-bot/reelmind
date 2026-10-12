import React from 'react';
import { Text, View } from 'react-native';
import { Chip, ChipRow } from '../components/Chip';
import { Focusable } from '../lib/focus';
import { colors, sizes } from '../theme/tv';
import type { HomeAction } from '../state/types';
import { TITLES } from '../state/types';

const ACTIONS: { action: HomeAction; title: string; sub: string }[] = [
  { action: 'ask', title: 'Ask a question', sub: 'Spoiler-safe answers' },
  { action: 'quiz', title: 'Pop quiz', sub: 'Test the couch' },
  { action: 'explain', title: 'Explain this', sub: 'Kid mode available' },
  { action: 'watchparty', title: 'Watch party', sub: 'Between-episode prompts' },
];

export function HomeScreen({
  onPickTitle,
  onAction,
}: {
  onPickTitle: (title: string) => void;
  onAction: (action: HomeAction) => void;
}) {
  return (
    <View style={{ flex: 1, flexDirection: 'row', gap: 40 }}>
      {/* Left: what are you watching */}
      <View style={{ flex: 3 }}>
        <Text style={{ color: colors.accent, fontSize: sizes.hero, fontWeight: '800' }}>
          ReelMind
        </Text>
        <Text style={{ color: colors.textDim, fontSize: sizes.body, marginVertical: 8 }}>
          Your AI viewing companion.
        </Text>
        <Text style={{ color: colors.text, fontSize: sizes.title, fontWeight: '700', marginTop: 26, marginBottom: 14 }}>
          What are you watching?
        </Text>
        <ChipRow row={1}>
          {TITLES.map((t, i) => (
            <Chip key={t} id={`title-${i}`} row={1} col={i} label={t} onEnter={() => onPickTitle(t)} />
          ))}
          <Chip id="title-other" row={1} col={TITLES.length} label="+ Other" onEnter={() => onPickTitle('')} />
        </ChipRow>
        <View style={{ marginTop: 'auto' }}>
          <Text style={{ color: colors.textDim, fontSize: sizes.small }}>
            🎙  Or say: “OK Alexa, ask ReelMind …” — no buttons needed.
          </Text>
        </View>
      </View>

      {/* Right: quick actions */}
      <View style={{ flex: 2, justifyContent: 'space-evenly' }}>
        {ACTIONS.map((a, i) => (
          <Focusable
            key={a.action}
            id={`action-${a.action}`}
            row={2}
            col={i}
            onEnter={() => onAction(a.action)}
            style={{
              backgroundColor: colors.bgCard,
              borderRadius: 16,
              padding: sizes.cardPad,
              marginBottom: sizes.cardGap,
            }}
          >
            <Text style={{ color: colors.text, fontSize: sizes.body, fontWeight: '800' }}>{a.title}</Text>
            <Text style={{ color: colors.textDim, fontSize: sizes.small, marginTop: 4 }}>{a.sub}</Text>
          </Focusable>
        ))}
      </View>
    </View>
  );
}
