import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../theme';

type ScreenHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
};

export function ScreenHeader({ eyebrow = '삼삼백과', title, description }: ScreenHeaderProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 18,
  },
  eyebrow: {
    color: colors.primary60,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: 0,
    marginBottom: 4,
  },
  title: {
    color: colors.ink,
    ...typography.heading,
    letterSpacing: 0,
    marginBottom: 8,
  },
  description: {
    color: colors.gray60,
    ...typography.body,
  },
});
