import React, { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppSurface } from '../components/AppSurface';
import { Panel } from '../components/Panel';
import { latestPrices } from '../data/placeholder';
import { loadInspectionHistory, type SavedInspection } from '../services/inspectionHistoryService';
import { fetchCurrentMarketPrices, type CurrentMarketPrice } from '../services/priceService';
import { colors } from '../theme';

const mascotImage = require('../../samsam-i.png');

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

const fallbackMainPrice: CurrentMarketPrice = {
  gradeCode: latestPrices[0].gradeCode,
  name: latestPrices[0].grade,
  category: latestPrices[0].category,
  grade: latestPrices[0].grade,
  day: new Date().toLocaleDateString('sv-SE'),
  requestedDate: new Date().toLocaleDateString('sv-SE'),
  currentAvgPrice: latestPrices[0].price,
  unit: latestPrices[0].unit,
  sourceUrl: 'https://insamtong.kr/price.do',
};

const formatPrice = (value?: number) => (value == null ? '시세 없음' : `${Math.round(value).toLocaleString('ko-KR')}원`);

const HomeScreen = ({ navigation }: any) => {
  const [mainPrice, setMainPrice] = useState<CurrentMarketPrice>(fallbackMainPrice);
  const [recentInspections, setRecentInspections] = useState<SavedInspection[]>([]);

  const openMarketDetail = () => {
    navigation.navigate('시세', { selectedGradeCode: mainPrice.gradeCode });
  };

  const openInspection = (initialView: 'source' | 'history') => {
    if (navigation.jumpTo) {
      navigation.jumpTo('판독', { initialView });
      return;
    }
    navigation.navigate('판독', { initialView });
  };

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      loadInspectionHistory().then((items) => {
        if (mounted) {
          setRecentInspections(items.slice(0, 3));
        }
      });
      fetchCurrentMarketPrices()
        .then((items) => {
          if (mounted && items.length > 0) {
            setMainPrice(items[0]);
          }
        })
        .catch(() => {
          if (mounted) {
            setMainPrice(fallbackMainPrice);
          }
        });
      return () => {
        mounted = false;
      };
    }, []),
  );

  return (
    <AppSurface>
      <View style={styles.hero}>
        <View style={styles.brandRow}>
          <View style={styles.logoMark}>
            <Image source={mascotImage} style={styles.logoImage} resizeMode="contain" />
          </View>
          <View>
            <Text style={styles.brand}>삼박사</Text>
            <Text style={styles.brandSub}>AI Ginseng Encyclopedia</Text>
          </View>
        </View>

        <View style={styles.heroMain}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>삼박사가 인삼을 읽어드립니다</Text>
            <Text style={styles.heroText}>사진 판독, 오늘의 시세, 인삼 정보를 하나의 흐름으로 연결한 모바일 서비스입니다.</Text>
          </View>
          <Image source={mascotImage} style={styles.heroMascot} resizeMode="contain" />
        </View>

        <Pressable style={styles.primaryAction} onPress={() => openInspection('source')}>
          <Ionicons name="scan" size={22} color={colors.white} />
          <Text style={styles.primaryActionText}>AI 판독 시작</Text>
        </Pressable>
      </View>

      <Panel tone="light">
        <View style={styles.panelHeader}>
          <Text style={styles.lightTitle}>최근 판독 결과</Text>
          <Pressable onPress={() => openInspection('history')} style={styles.linkButton}>
            <Text style={styles.linkButtonText}>목록 보기</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary60} />
          </Pressable>
        </View>
        {recentInspections.length === 0 ? (
          <Text style={styles.lightText}>아직 저장된 판독 결과가 없습니다. 사진을 판독하고 결과 저장을 눌러 보세요.</Text>
        ) : (
          <View style={styles.recentList}>
            {recentInspections.map((item) => (
              <View key={item.id} style={styles.recentItem}>
                <Image source={{ uri: item.imageUri }} style={styles.recentImage} />
                <View style={styles.recentBody}>
                  <Text style={styles.recentTitle}>
                    {item.result.year} / {item.result.grade}
                  </Text>
                  <Text style={styles.recentMeta}>{formatDateTime(item.createdAt)}</Text>
                </View>
                <Text style={styles.recentPrice}>
                  {item.pricePrediction?.quarters?.at(-1)?.avgPc
                    ? `${item.pricePrediction.quarters.at(-1)?.avgPc.toLocaleString('ko-KR')}원`
                    : '시세 없음'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Panel>

      <View style={styles.quickGrid}>
        <Pressable style={styles.quickTile} onPress={openMarketDetail}>
          <Ionicons name="stats-chart" size={22} color={colors.mint} />
          <Text style={styles.quickTitle}>시세</Text>
          <Text style={styles.quickText}>{mainPrice.category} {mainPrice.grade}</Text>
        </Pressable>
        <Pressable style={styles.quickTile} onPress={() => navigation.navigate('백과')}>
          <Ionicons name="book" size={22} color={colors.mint} />
          <Text style={styles.quickTitle}>백과</Text>
          <Text style={styles.quickText}>분류와 검색</Text>
        </Pressable>
        <Pressable style={styles.quickTile} onPress={() => navigation.navigate('가이드')}>
          <Ionicons name="camera" size={22} color={colors.mint} />
          <Text style={styles.quickTitle}>촬영</Text>
          <Text style={styles.quickText}>정확도 높이기</Text>
        </Pressable>
        <Pressable style={styles.quickTile} onPress={() => navigation.navigate('지도')}>
          <Ionicons name="map" size={22} color={colors.mint} />
          <Text style={styles.quickTitle}>유통</Text>
          <Text style={styles.quickText}>시장 정보</Text>
        </Pressable>
      </View>

      <Pressable onPress={openMarketDetail}>
      <Panel tone="accent">
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>최근 시세</Text>
          <Text style={styles.panelBadge}>{mainPrice.day.replace(/-/g, '.')} 기준</Text>
        </View>
        <View style={styles.priceLine}>
          <Text style={styles.priceName}>{mainPrice.category} / {mainPrice.grade}</Text>
          <Text style={styles.priceValue}>{formatPrice(mainPrice.currentAvgPrice)}</Text>
        </View>
        <Text style={styles.caption}>{mainPrice.unit} 기준 · 인삼통 최근 거래일 시세입니다. 선택하면 상세 시세로 이동합니다.</Text>
      </Panel>
      </Pressable>
    </AppSurface>
  );
};

const styles = StyleSheet.create({
  hero: {
    minHeight: 330,
    justifyContent: 'space-between',
    backgroundColor: colors.forest2,
    borderColor: colors.leaf,
    borderWidth: 1,
    borderRadius: 8,
    padding: 20,
    marginBottom: 14,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoMark: {
    width: 46,
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary60,
  },
  logoImage: { width: 38, height: 42 },
  brand: { color: colors.cream, fontSize: 18, fontWeight: '700' },
  brandSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  heroMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroCopy: { flex: 1 },
  heroMascot: { width: 104, height: 132 },
  heroTitle: { color: colors.cream, fontSize: 30, fontWeight: '700', lineHeight: 38, letterSpacing: 0 },
  heroText: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  primaryAction: {
    minHeight: 52,
    backgroundColor: colors.mint,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryActionText: { color: colors.white, fontSize: 15, lineHeight: 23, fontWeight: '700' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  quickTile: {
    width: '48%',
    minHeight: 104,
    backgroundColor: colors.forest,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    justifyContent: 'space-between',
  },
  quickTitle: { color: colors.cream, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  quickText: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 14 },
  panelTitle: { color: colors.cream, fontSize: 17, lineHeight: 26, fontWeight: '700' },
  panelBadge: { color: colors.success60, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  linkButton: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  linkButtonText: { color: colors.primary60, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  recentList: { gap: 10 },
  recentItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recentImage: { width: 54, height: 54, borderRadius: 8, backgroundColor: colors.gray10 },
  recentBody: { flex: 1 },
  recentTitle: { color: colors.ink, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  recentMeta: { color: colors.gray60, fontSize: 12, lineHeight: 18, marginTop: 2 },
  recentPrice: { color: colors.success60, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  priceLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
  priceName: { color: colors.muted, fontSize: 15, lineHeight: 23, fontWeight: '700' },
  priceValue: { color: colors.cream, fontSize: 22, lineHeight: 33, fontWeight: '700' },
  caption: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 12 },
  lightTitle: { color: colors.ink, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  lightText: { color: colors.gray60, fontSize: 13, lineHeight: 20, fontWeight: '400' },
});

export default HomeScreen;
