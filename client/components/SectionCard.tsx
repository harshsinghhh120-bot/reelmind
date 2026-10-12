import React from 'react';
import { Text, View, StyleProp, ViewStyle } from 'react-native';
import { colors, sizes } from '../theme/tv';

export function SectionCard({
  heading,
  body,
  style,
}: {
  heading: string;
  body: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.bgCard,
          borderRadius: 14,
          padding: sizes.cardPad,
          marginBottom: sizes.cardGap,
        },
        style,
      ]}
    >
      {heading.length > 0 && (
        <Text style={{ color: colors.accent, fontSize: sizes.small, fontWeight: '800', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
          {heading}
        </Text>
      )}
      <Text style={{ color: colors.text, fontSize: sizes.body, lineHeight: sizes.body + 10 }}>{body}</Text>
    </View>
  );
}
