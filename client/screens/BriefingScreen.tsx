import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ProgressBadge, SectionCard } from '../components/ask-ui';
import { Spinner } from '../components/Spinner';
import { Focusable } from '../lib/focus';
import { Reply } from '../lib/api';
import { colors, sizes } from '../theme/tv';

export function BriefingScreen({
  title,
  reply,
  loading = false,
  onAsk,
  onQuiz,
  onExplain,
  onParty,
}: {
  title: string;
  reply: Reply;
  loading?: boolean;
  onAsk: () => void;
  onQuiz: () => void;
  onExplain: () => void;
  onParty: () => void;
}) {
  const actions = [
    { id: 'br-ask', label: 'Ask a question', sub: 'Spoiler-safe Q&A', onPress: onAsk, row: 1 },
    { id: 'br-quiz', label: 'Pop quiz', sub: 'Test your couch-mates', onPress: onQuiz, row: 2 },
    { id: 'br-explain', label: 'Explain a term', sub: 'Kid / Standard / Deep', onPress: onExplain, row: 3 },
    { id: 'br-party', label: 'Watch party', sub: 'Discussion prompts', onPress: onParty, row: 4 },
  ];

  const sections = reply.sections ?? (reply.text ? [{ heading: '', body: reply.text }] : []);

  return (
    <View style={{ flex: 1, flexDirection: 'row', gap: 36 }}>
      <View style={{ flex: 3 }}>
        <Text style={{ color: colors.accent, fontSize: sizes.title, fontWeight: '800' }}>{title}</Text>
        <Text style={{ color: colors.textDim, fontSize: sizes.body, marginBottom: 16 }}>
          Your briefing, fresh from the couch.
        </Text>
        {loading ? (
          <Spinner label={`Building your ${title} briefing…`} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8 }}>
            {sections.map((s, i) => (
              <SectionCard key={i} heading={s.heading} body={s.body} />
            ))}
          </ScrollView>
        )}
      </View>
      <View style={{ flex: 2, justifyContent: 'space-evenly' }}>
        {actions.map((a) => (
          <Focusable
            key={a.id}
            id={a.id}
            row={a.row}
            col={0}
            onEnter={a.onPress}
            style={{ backgroundColor: colors.bgCard, borderRadius: 16, padding: sizes.cardPad, marginBottom: sizes.cardGap }}
          >
            <Text style={{ color: colors.text, fontSize: sizes.body, fontWeight: '800' }}>{a.label}</Text>
            <Text style={{ color: colors.textDim, fontSize: sizes.small, marginTop: 4 }}>{a.sub}</Text>
          </Focusable>
        ))}
      </View>
    </View>
  );
}
