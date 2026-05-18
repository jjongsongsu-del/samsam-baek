import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, elevation, radius, spacing } from '../theme';

type PanelProps = {
  children: React.ReactNode;
  tone?: 'dark' | 'light' | 'accent';
  style?: ViewStyle;
};

export function Panel({ children, tone = 'dark', style }: PanelProps) {
  return <View style={[styles.base, styles[tone], style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    padding: spacing.card,
    marginBottom: spacing.gap,
    borderWidth: 1,
  },
  dark: {
    backgroundColor: colors.gray0,
    borderColor: colors.line,
    ...elevation.level1,
  },
  light: {
    backgroundColor: colors.secondary5,
    borderColor: colors.secondary10,
  },
  accent: {
    backgroundColor: colors.primary5,
    borderColor: colors.primary10,
  },
});
