import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Spinner } from '../components/Spinner';
import { Chip } from '../components/Chip';
import { SectionCard } from '../components/ask-ui';
import { chat, Progress, Reply } from '../lib/api';
import { colors, sizes } from '../theme/tv';

export function WatchPartyScreen({
  title,
  progress,
}: {
  title: string;
  progress?: Progress;
}) {
  const [reply, setReply] = useState<Reply | null>(null);
  const [busy, setBusy] = useState(true);
  const [round, setRound] = useState(0);

  const load = useCallback(async () => {
    setBusy(true);
    const where = progress ? ` — we're at S${progress.season}E${progress.episode}` : '';
    const r = await chat(`Discussion prompts for ${title}${where}. Make them fresh.`);
    setReply(r);
    setBusy(false);
  }, [title, progress]);

  useEffect(() => {
    void load();
  }, [load, round]);

  const prompts = reply?.sections ?? [];

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ color: colors.text, fontSize: sizes.title, fontWeight: '700' }}>
          🍿 Watch party: {title}
        </Text>
        <Chip
          id="wp-regen"
          row={0}
          col={0}
          label={round === 0 ? 'New prompts' : 'Different prompts'}
          small
          onEnter={() => setRound((r) => r + 1)}
        />
      </View>
      {busy ? (
        <Spinner label="Brewing prompts…" />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {prompts.map((p, i) => (
            <SectionCard key={`${round}-${i}`} heading={p.heading} body={p.body} />
          ))}
          {prompts.length === 0 && (
            <Text style={{ color: colors.textDim, fontSize: sizes.body }}>{reply?.text ?? 'No prompts right now.'}</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}
