import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Spinner } from '../components/Spinner';
import { Chip, ChipRow } from '../components/Chip';
import { SectionCard } from '../components/ask-ui';
import { chat, Reply } from '../lib/api';
import { colors, sizes } from '../theme/tv';

const TOPICS = [
  'The stock market',
  'Quantum entanglement',
  'Feudal Japan',
  'Jazz improvisation',
  'Cryptocurrency',
  'Nuclear fusion',
  'The metaverse',
  'Sashimi etiquette',
];

const LEVELS = [
  { id: 'kid', label: '🧒 Kid mode' },
  { id: 'standard', label: 'Standard' },
  { id: 'deep', label: '🤓 Deep dive' },
];

export function ExplainScreen() {
  const [level, setLevel] = useState<string>('kid');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Reply | null>(null);
  const [topic, setTopic] = useState<string | null>(null);

  const explain = async (t: string) => {
    if (busy) return;
    setBusy(true);
    setTopic(t);
    setResult(null);
    const reply = await chat(`Explain ${t} (${level})`);
    setResult(reply);
    setBusy(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: colors.text, fontSize: sizes.title, fontWeight: '700', marginBottom: 16 }}>
        Explain this
      </Text>
      <Text style={{ color: colors.textDim, fontSize: sizes.small, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
        Pick a topic
      </Text>
      <ChipRow row={0}>
        {TOPICS.map((t, i) => (
          <Chip key={t} id={`topic-${i}`} row={0} col={i} label={t} small onEnter={() => void explain(t)} />
        ))}
      </ChipRow>
      <Text style={{ color: colors.textDim, fontSize: sizes.small, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
        Language level
      </Text>
      <ChipRow row={1}>
        {LEVELS.map((l, i) => (
          <Chip
            key={l.id}
            id={`level-${l.id}`}
            row={1}
            col={i}
            label={l.id === level ? `✓ ${l.label}` : l.label}
            small
            onEnter={() => setLevel(l.id)}
          />
        ))}
      </ChipRow>

      <View style={{ flex: 1, marginTop: 12 }}>
        {busy ? (
          <Spinner label={`Explaining ${topic}…`} />
        ) : result ? (
          <View>
            <SectionCard heading={result.level ? result.level.toUpperCase() : 'EXPLANATION'} body={result.text ?? ''} />
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Text style={{ color: colors.textDim, fontSize: sizes.body }}>
              Pick a topic from the show — ReelMind will make it make sense.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
