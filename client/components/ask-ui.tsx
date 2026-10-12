import React from 'react';
import { Text, View } from 'react-native';
import { colors, sizes } from '../theme/tv';

/** Chat bubble (user / AI) used on the Ask screen. */
export function Chat({
  role,
  text,
  warning,
}: {
  role: 'user' | 'ai';
  text: string;
  warning?: string;
}) {
  const isUser = role === 'user';
  return (
    <View
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '92%',
        backgroundColor: isUser ? '#243049' : colors.bgCard,
        borderRadius: 14,
        padding: 16,
      }}
    >
      <Text
        style={{
          color: isUser ? '#C7D3E8' : colors.text,
          fontSize: sizes.body - 2,
          lineHeight: sizes.body,
        }}
      >
        {text}
      </Text>
      {warning ? (
        <Text style={{ color: colors.accent, fontSize: sizes.small, marginTop: 8, fontWeight: '700' }}>
          ⚠ {warning}
        </Text>
      ) : null}
    </View>
  );
}

export { SectionCard } from './SectionCard';
export { ProgressBadge } from './ProgressBadge';
export { Spinner } from './Spinner';
