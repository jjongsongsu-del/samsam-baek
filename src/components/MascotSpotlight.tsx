import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

const mascotImage = require('../../samsam-i.png');

type MascotSpotlightProps = {
  title: string;
  description: string;
};

export function MascotSpotlight({ title, description }: MascotSpotlightProps) {
  return (
    <View style={styles.wrap}>
      <Image source={mascotImage} style={styles.image} resizeMode="contain" />
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 124,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary10,
    backgroundColor: colors.gray0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    marginBottom: 14,
  },
  image: {
    width: 92,
    height: 104,
  },
  copy: {
    flex: 1,
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 27,
    fontWeight: '700',
    marginBottom: 6,
  },
  description: {
    color: colors.gray60,
    fontSize: 14,
    lineHeight: 21,
  },
});
