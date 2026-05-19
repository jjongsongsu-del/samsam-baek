import React from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

type AppSurfaceProps = {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  scrollRef?: React.RefObject<ScrollView>;
};

export function AppSurface({ children, scroll = true, contentStyle, scrollRef }: AppSurfaceProps) {
  const insets = useSafeAreaInsets();
  const safeStyle = [styles.safeArea, { paddingTop: Math.max(insets.top, 18) }];

  if (!scroll) {
    return <View style={[safeStyle, contentStyle]}>{children}</View>;
  }

  return (
    <View style={safeStyle}>
      <ScrollView ref={scrollRef} contentContainerStyle={[styles.content, contentStyle]} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
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
