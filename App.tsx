import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/theme';

const mascotImage = require('./samsam-i.png');

function LaunchScreen() {
  return (
    <View style={styles.launch}>
      <Image source={mascotImage} style={styles.launchMascot} resizeMode="contain" />
      <Text style={styles.launchTitle}>삼박사</Text>
      <Text style={styles.launchText}>인삼 판독 준비 중</Text>
    </View>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 1100);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) {
    return (
      <>
        <LaunchScreen />
        <StatusBar style="dark" />
      </>
    );
  }

  return (
    <NavigationContainer>
      <AppNavigator />
      <StatusBar style="dark" />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  launch: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray5,
    padding: 28,
  },
  launchMascot: {
    width: 148,
    height: 178,
    marginBottom: 18,
  },
  launchTitle: {
    color: colors.ink,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: 0,
  },
  launchText: {
    color: colors.gray60,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '700',
    marginTop: 6,
  },
});
