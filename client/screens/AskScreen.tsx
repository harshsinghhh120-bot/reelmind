import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Chat, ProgressBadge, SectionCard, Spinner } from '../components/ask-ui';
import { Chip, ChipRow } from '../components/Chip';
import { chat, Progress, Quiz, Reply } from '../lib/api';
import { Focusable } from '../lib/focus';
import { colors, sizes } from '../theme/tv';

const SUGGESTIONS = [
  'Why did that happen?',
  'Who is that actor?',
  'What does that term mean?',
  'Give me a pop quiz about this!',
  'Any discussion prompts?',
];

const PROGRESS_CHIPS = [
  "I'm on S1E1",
  "I'm on S1E4",
  "I'm on S2E1",
  "I'm on S2E8",
  "I'm at the end of the show",
];

interface Turn {
  role: 'user' | 'ai';
  text: string;
  warning?: string;
  sections?: Reply['sections'];
}

export function AskScreen({
  title,
  initialMessage,
  progress,
  onOpenQuiz,
  onProgress,
  onOpenParty,
}: {
  title: string;
  initialMessage?: string;
  progress?: Progress;
  onOpenQuiz: (quiz: Quiz) => void;
  onProgress: (p: Progress) => void;
  onOpenParty: () => void;
}) {
  const [thread, setThread] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [contentH, setContentH] = useState(0);

  const displayTitle = title || 'your show';

  const send = useCallback(
    async (message: string) => {
      if (busy) return;
      setBusy(true);
      setThread((t) => [...t, { role: 'user', text: message }]);
      const reply = await chat(message);
      setThread((t) => [
        ...t,
        {
          role: 'ai',
          text: reply.text ?? '…',
          warning: reply.spoiler_warning,
          sections: reply.sections,
        },
      ]);
      if (reply.kind === 'quiz' && reply.quiz) onOpenQuiz(reply.quiz);
      if (reply.kind === 'progress_update' && reply.progress) onProgress(reply.progress);
      if (reply.kind === 'discussion' && reply.sections) onOpenParty();
      setBusy(false);
    },
    [busy, onOpenQuiz, onProgress, onOpenParty],
  );

  useEffect(() => {
    if (initialMessage) void send(initialMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (contentH > 0) scrollRef.current?.scrollTo({ y: contentH, animated: true });
  }, [contentH, thread.length]);

  return (
    <View style={{ flex: 1, flexDirection: 'row', gap: 36 }}>
      {/* Thread */}
      <View style={{ flex: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 14 }}>
          <Text style={{ color: colors.text, fontSize: sizes.title, fontWeight: '700' }}>
            Asking about {displayTitle}
          </Text>
          {progress && <ProgressBadge title={progress.title} season={progress.season} episode={progress.episode} />}
        </View>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={(_w, h) => setContentH(h)}
          contentContainerStyle={{ gap: 14 }}
        >
          {thread.map((turn, i) =>
            turn.role === 'user' ? (
              <Chat key={i} role="user" text={turn.text} />
            ) : (
              <View key={i}>
                <Chat role="ai" text={turn.text} warning={turn.warning} />
                {turn.sections?.map((s, j) => (
                  <SectionCard key={j} heading={s.heading} body={s.body} style={{ marginTop: 10 }} />
                ))}
              </View>
            ),
          )}
          {busy && (
            <View style={{ paddingVertical: 10 }}>
              <Spinner />
            </View>
          )}
        </ScrollView>
      </View>

      {/* Quick inputs */}
      <View style={{ flex: 2, justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: colors.textDim, fontSize: sizes.small, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
            Ask
          </Text>
          <ChipRow row={1}>
            {SUGGESTIONS.map((s, i) => (
              <Chip key={s} id={`sug-${i}`} row={1} col={i} label={s} small onEnter={() => void send(s)} />
            ))}
          </ChipRow>
          <Text style={{ color: colors.textDim, fontSize: sizes.small, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
            Your progress
          </Text>
          <ChipRow row={2}>
            {PROGRESS_CHIPS.map((p, i) => (
              <Chip key={p} id={`prog-${i}`} row={2} col={i} label={p} small onEnter={() => void send(p)} />
            ))}
          </ChipRow>
        </View>
        <Focusable
          id="ask-party"
          row={3}
          col={0}
          onEnter={onOpenParty}
          style={{ backgroundColor: colors.bgCard, borderRadius: 16, padding: sizes.cardPad, alignSelf: 'flex-start' }}
        >
          <Text style={{ color: colors.text, fontSize: sizes.body, fontWeight: '700' }}>
            🍿 Between-episode prompts
          </Text>
        </Focusable>
      </View>
    </View>
  );
}
