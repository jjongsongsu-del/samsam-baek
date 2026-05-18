import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, type ViewStyle } from 'react-native';
import { colors, spacing } from '../theme';

type AppSurfaceProps = {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  scrollRef?: React.RefObject<ScrollView>;
};

export function AppSurface({ children, scroll = true, contentStyle, scrollRef }: AppSurfaceProps) {
  if (!scroll) {
    return <SafeAreaView style={[styles.safeArea, contentStyle]}>{children}</SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView ref={scrollRef} contentContainerStyle={[styles.content, contentStyle]} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.gray5,
  },
  content: {
    padding: spacing.screen,
    paddingBottom: 36,
  },
});
