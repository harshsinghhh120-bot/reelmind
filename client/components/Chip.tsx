import React from 'react';
import { Text, View } from 'react-native';
import { Focusable } from '../lib/focus';
import { colors, sizes } from '../theme/tv';

export function Chip({
  id,
  row,
  col,
  label,
  onEnter,
  small = false,
}: {
  id: string;
  row: number;
  col: number;
  label: string;
  onEnter: () => void;
  small?: boolean;
}) {
  return (
    <Focusable
      id={id}
      row={row}
      col={col}
      onEnter={onEnter}
      style={{
        backgroundColor: colors.bgCard,
        borderRadius: 999,
        paddingHorizontal: small ? 18 : 24,
        paddingVertical: small ? 10 : 14,
        marginRight: sizes.cardGap,
      }}
      focusStyle={{ backgroundColor: colors.bgElevated }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: small ? sizes.small : sizes.body,
          fontWeight: '600',
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Focusable>
  );
}

export function ChipRow({
  row,
  startCol = 0,
  children,
}: {
  row: number;
  startCol?: number;
  children: React.ReactNode;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, marginBottom: sizes.cardGap }}>
      {children}
    </View>
  );
}
