import React from 'react';
import { Text, View } from 'react-native';
import { colors, sizes } from '../theme/tv';

export function ProgressBadge({
  title,
  season,
  episode,
}: {
  title: string;
  season: number;
  episode: number;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgElevated,
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 8,
      }}
    >
      <Text style={{ color: colors.accent, fontSize: sizes.small, fontWeight: '700' }}>
        {title} · S{season}E{episode}
      </Text>
      <Text style={{ color: colors.textDim, fontSize: sizes.small, marginLeft: 10 }}>
        spoilers locked
      </Text>
    </View>
  );
}
