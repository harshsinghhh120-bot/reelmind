import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { colors, sizes } from '../theme/tv';

const WORDS = ['Thinking…', 'On it…', 'Let me check…', 'Warming up the couch…'];

export function Spinner({ label = 'Thinking…' }: { label?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % WORDS.length), 1400);
    return () => clearInterval(t);
  }, []);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={{ color: colors.textDim, fontSize: sizes.body }}>{WORDS[i] || label}</Text>
    </View>
  );
}
