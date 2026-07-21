import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppSurface } from '../components/AppSurface';
import { Panel } from '../components/Panel';
import { latestPrices } from '../data/placeholder';
import { loadInspectionHistory, type SavedInspection } from '../services/inspectionHistoryService';
import {
  fetchCurrentMarketPrices,
  fetchDetailedMarketPriceHistory,
  type CurrentMarketPrice,
  type DetailedMarketPriceHistoryRow,
} from '../services/priceService';
import { colors } from '../theme';

const mascotImage = require('../../samsam-i.png');

const defaultGradeCode = '16';

const simpleGradeParents: Record<string, string> = {
  '13': '1',
  '16': '1',
  '24': '2',
  '27': '2',
  '17': '3',
  '48': '6',
};

const gradeImageSources: Record<string, { uri: string }> = {
  '13': { uri: 'https://insamtong.kr/resources/design/resources/img/pattern/grade/01_07.png' },
  '16': { uri: 'https://insamtong.kr/resources/design/resources/img/pattern/grade/01_10.png' },
  '17': { uri: 'https://insamtong.kr/resources/design/resources/img/pattern/grade/04_01.png' },
  '24': { uri: 'https://insamtong.kr/resources/design/resources/img/pattern/grade/03_08.png' },
  '27': { uri: 'https://insamtong.kr/resources/design/resources/img/pattern/grade/03_11.png' },
  '48': { uri: 'https://insamtong.kr/resources/design/resources/img/pattern/grade/05_01.png' },
};

const fallbackMainPrice: CurrentMarketPrice = {
  gradeCode: latestPrices[1]?.gradeCode ?? defaultGradeCode,
  name: latestPrices[1]?.grade ?? '믹서',
  category: latestPrices[1]?.category ?? '원삼',
  grade: latestPrices[1]?.grade ?? '믹서',
  day: new Date().toLocaleDateString('sv-SE'),
  requestedDate: new Date().toLocaleDateString('sv-SE'),
  currentAvgPrice: latestPrices[1]?.price ?? 0,
  unit: latestPrices[1]?.unit ?? '750g 1채',
  sourceUrl: 'https://insamtong.kr/price.do',
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

const formatPrice = (value?: number) => (value == null ? '시세 없음' : `${Math.round(value).toLocaleString('ko-KR')}원`);
const formatDate = (value?: string) => (value ? value.replace(/-/g, '.') : '-');
const formatSignedPrice = (value?: number) => {
  if (value == null) {
    return '-';
  }
  if (value === 0) {
    return '0원';
  }
  return `${value > 0 ? '+' : ''}${Math.round(value).toLocaleString('ko-KR')}원`;
};
const formatSignedPercent = (value?: number) => {
  if (value == null) {
    return '-';
  }
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
};

const normalizeGradeText = (item: CurrentMarketPrice) => {
  const label = `${item.category} ${item.grade}`.trim();
  return label || item.name || item.gradeCode;
};

const HomeScreen = ({ navigation }: any) => {
  const [marketPrices, setMarketPrices] = useState<CurrentMarketPrice[]>([fallbackMainPrice]);
  const [selectedGradeCode, setSelectedGradeCode] = useState(defaultGradeCode);
  const [recentInspections, setRecentInspections] = useState<SavedInspection[]>([]);
  const [isPriceLoading, setIsPriceLoading] = useState(true);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [historyRows, setHistoryRows] = useState<DetailedMarketPriceHistoryRow[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const mainPrice = useMemo(
    () => marketPrices.find((item) => item.gradeCode === selectedGradeCode) ?? marketPrices[0] ?? fallbackMainPrice,
    [marketPrices, selectedGradeCode],
  );

  const chartRows = useMemo(() => historyRows.slice(0, 8).reverse(), [historyRows]);
  const maxChartPrice = useMemo(
    () => Math.max(...chartRows.map((item) => item.latestPrice ?? 0), 1),
    [chartRows],
  );

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

  const loadPriceSummary = useCallback(async () => {
    setIsPriceLoading(true);
    try {
      const items = await fetchCurrentMarketPrices();
      if (items.length > 0) {
        setMarketPrices(items);
        setSelectedGradeCode((current) => (items.some((item) => item.gradeCode === current) ? current : defaultGradeCode));
      }
    } catch {
      setMarketPrices([fallbackMainPrice]);
      setSelectedGradeCode(defaultGradeCode);
    } finally {
      setIsPriceLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      loadInspectionHistory().then((items) => {
        if (mounted) {
          setRecentInspections(items.slice(0, 3));
        }
      });
      loadPriceSummary();
      return () => {
        mounted = false;
      };
    }, [loadPriceSummary]),
  );

  useEffect(() => {
    if (!isDetailOpen) {
      return;
    }

    const parentCode = simpleGradeParents[mainPrice.gradeCode];
    if (!parentCode) {
      setHistoryRows([]);
      return;
    }

    let mounted = true;
    setIsHistoryLoading(true);
    fetchDetailedMarketPriceHistory(parentCode, mainPrice.gradeCode)
      .then((rows) => {
        if (mounted) {
          setHistoryRows(rows);
        }
      })
      .catch(() => {
        if (mounted) {
          setHistoryRows([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setIsHistoryLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [isDetailOpen, mainPrice.gradeCode]);

  const yearTrendStyle =
    (mainPrice.diffPrevYear ?? mainPrice.ratePrevYear ?? 0) > 0
      ? styles.upText
      : (mainPrice.diffPrevYear ?? mainPrice.ratePrevYear ?? 0) < 0
        ? styles.downText
        : styles.flatText;

  return (
    <AppSurface>
      <View style={styles.hero}>
        <View style={styles.brandRow}>
          <View style={styles.logoMark}>
            <Image source={mascotImage} style={styles.logoImage} resizeMode="contain" />
          </View>
          <View>
            <Text style={styles.brand}>삼삼백과</Text>
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
          <Text style={styles.quickText}>{normalizeGradeText(mainPrice)}</Text>
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
        <Pressable style={styles.quickTile} onPress={() => navigation.navigate('인삼정보')}>
          <Ionicons name="map" size={22} color={colors.mint} />
          <Text style={styles.quickTitle}>인삼정보</Text>
          <Text style={styles.quickText}>경작지와 관광</Text>
        </Pressable>
      </View>

      <Panel tone="accent">
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.panelTitle}>최근 시세정보</Text>
            <Text style={styles.caption}>인삼통 간편 가격 정보 기준</Text>
          </View>
          <Pressable style={styles.refreshButton} onPress={loadPriceSummary} disabled={isPriceLoading}>
            {isPriceLoading ? <ActivityIndicator size="small" color={colors.primary60} /> : <Ionicons name="refresh" size={18} color={colors.primary60} />}
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gradeTabs}>
          {marketPrices.map((item) => {
            const selected = item.gradeCode === mainPrice.gradeCode;
            return (
              <Pressable
                key={item.gradeCode}
                style={[styles.gradeTab, selected && styles.gradeTabSelected]}
                onPress={() => {
                  setSelectedGradeCode(item.gradeCode);
                  setHistoryRows([]);
                }}
              >
                <Text style={[styles.gradeTabText, selected && styles.gradeTabTextSelected]}>{item.grade || item.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.marketHero}>
          <Image source={gradeImageSources[mainPrice.gradeCode] ?? mascotImage} style={styles.marketImage} resizeMode="contain" />
          <View style={styles.marketBody}>
            <Text style={styles.priceName}>{mainPrice.category} / {mainPrice.grade}</Text>
            <Text style={styles.priceValue}>{formatPrice(mainPrice.currentAvgPrice)}</Text>
            <Text style={styles.caption}>{mainPrice.unit} 기준 · 거래일 {formatDate(mainPrice.day)}</Text>
          </View>
        </View>

        <View style={styles.compareGrid}>
          <View style={styles.compareItem}>
            <Text style={styles.compareLabel}>전년동기</Text>
            <Text style={styles.compareValue}>{formatPrice(mainPrice.prevYearAvgPrice)}</Text>
            <Text style={yearTrendStyle}>
              {formatSignedPrice(mainPrice.diffPrevYear)} · {formatSignedPercent(mainPrice.ratePrevYear)}
            </Text>
          </View>
          <View style={styles.compareItem}>
            <Text style={styles.compareLabel}>직전 거래</Text>
            <Text style={styles.compareValue}>{formatPrice(mainPrice.previousTradePrice ?? mainPrice.prevDayAvgPrice)}</Text>
            <Text style={(mainPrice.diffPreviousTradePrice ?? mainPrice.diffPrevDay ?? 0) > 0 ? styles.upText : (mainPrice.diffPreviousTradePrice ?? mainPrice.diffPrevDay ?? 0) < 0 ? styles.downText : styles.flatText}>
              {formatSignedPrice(mainPrice.diffPreviousTradePrice ?? mainPrice.diffPrevDay)}
            </Text>
          </View>
        </View>

        <Pressable style={styles.detailToggle} onPress={() => setIsDetailOpen((value) => !value)}>
          <Text style={styles.detailToggleText}>{isDetailOpen ? '상세 접기' : '상세보기'}</Text>
          <Ionicons name={isDetailOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary60} />
        </Pressable>

        {isDetailOpen ? (
          <View style={styles.detailArea}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>장별 가격동향</Text>
              {isHistoryLoading ? <ActivityIndicator size="small" color={colors.primary60} /> : null}
            </View>

            {chartRows.length > 0 ? (
              <View style={styles.chart}>
                {chartRows.map((row) => {
                  const heightPercent = Math.max(8, Math.round(((row.latestPrice ?? 0) / maxChartPrice) * 100));
                  return (
                    <View key={row.day} style={styles.chartColumn}>
                      <View style={styles.chartTrack}>
                        <View style={[styles.chartBar, { height: `${heightPercent}%` }]} />
                      </View>
                      <Text style={styles.chartLabel}>{row.day.slice(5).replace('-', '.')}</Text>
                    </View>
                  );
                })}
              </View>
            ) : null}

            {historyRows.slice(0, 5).map((row) => {
              const diff = row.diffPreviousTradePrice ?? 0;
              return (
                <View key={row.day} style={styles.historyRow}>
                  <View style={styles.historyDateBox}>
                    <Text style={styles.historyDate}>{formatDate(row.day)}</Text>
                    <Text style={styles.historyCompare}>전일 {formatSignedPercent(row.previousDayPercent)} · 전년 {formatSignedPercent(row.previousYearPercent)}</Text>
                  </View>
                  <View style={styles.historyPriceBox}>
                    <Text style={styles.historyPrice}>{formatPrice(row.latestPrice)}</Text>
                    <Text style={diff > 0 ? styles.upText : diff < 0 ? styles.downText : styles.flatText}>{formatSignedPrice(diff)}</Text>
                  </View>
                </View>
              );
            })}

            {!isHistoryLoading && historyRows.length === 0 ? (
              <Text style={styles.caption}>해당 등급의 장별 가격동향을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</Text>
            ) : null}

            <Pressable style={styles.sourceButton} onPress={openMarketDetail}>
              <Text style={styles.sourceText}>시세 메뉴에서 더 보기</Text>
              <Ionicons name="chevron-forward" size={15} color={colors.primary60} />
            </Pressable>
          </View>
        ) : null}
      </Panel>
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
  linkButton: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  linkButtonText: { color: colors.primary60, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary10,
  },
  recentList: { gap: 10 },
  recentItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recentImage: { width: 54, height: 54, borderRadius: 8, backgroundColor: colors.gray10 },
  recentBody: { flex: 1 },
  recentTitle: { color: colors.ink, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  recentMeta: { color: colors.gray60, fontSize: 12, lineHeight: 18, marginTop: 2 },
  recentPrice: { color: colors.success60, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  gradeTabs: { gap: 8, paddingBottom: 12 },
  gradeTab: {
    minHeight: 36,
    minWidth: 68,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.primary10,
    backgroundColor: colors.white,
  },
  gradeTabSelected: { backgroundColor: colors.primary60, borderColor: colors.primary60 },
  gradeTabText: { color: colors.gray70, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  gradeTabTextSelected: { color: colors.white },
  marketHero: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 2 },
  marketImage: { width: 92, height: 92, borderRadius: 8, backgroundColor: colors.white },
  marketBody: { flex: 1 },
  priceName: { color: colors.muted, fontSize: 15, lineHeight: 23, fontWeight: '700' },
  priceValue: { color: colors.cream, fontSize: 28, lineHeight: 38, fontWeight: '700', marginTop: 2 },
  caption: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  compareGrid: { flexDirection: 'row', gap: 10, marginTop: 14 },
  compareItem: {
    flex: 1,
    minHeight: 84,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary10,
    padding: 12,
  },
  compareLabel: { color: colors.gray60, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  compareValue: { color: colors.ink, fontSize: 15, lineHeight: 23, fontWeight: '700', marginTop: 4 },
  upText: { color: colors.danger60, fontSize: 12, lineHeight: 18, fontWeight: '700', marginTop: 2 },
  downText: { color: colors.primary60, fontSize: 12, lineHeight: 18, fontWeight: '700', marginTop: 2 },
  flatText: { color: colors.success60, fontSize: 12, lineHeight: 18, fontWeight: '700', marginTop: 2 },
  detailToggle: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 14,
    borderRadius: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary10,
  },
  detailToggleText: { color: colors.primary60, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  detailArea: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.primary10 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  detailTitle: { color: colors.ink, fontSize: 15, lineHeight: 23, fontWeight: '700' },
  chart: {
    height: 142,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary10,
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 8,
    marginBottom: 12,
  },
  chartColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  chartTrack: { width: '100%', height: 94, justifyContent: 'flex-end', alignItems: 'center' },
  chartBar: { width: '70%', minHeight: 8, borderRadius: 4, backgroundColor: colors.primary60 },
  chartLabel: { color: colors.gray60, fontSize: 10, lineHeight: 14 },
  historyRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.primary10,
    paddingVertical: 8,
  },
  historyDateBox: { flex: 1 },
  historyDate: { color: colors.gray70, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  historyCompare: { color: colors.gray60, fontSize: 11, lineHeight: 16 },
  historyPriceBox: { alignItems: 'flex-end' },
  historyPrice: { color: colors.ink, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  sourceButton: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  sourceText: { color: colors.primary60, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  lightTitle: { color: colors.ink, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  lightText: { color: colors.gray60, fontSize: 13, lineHeight: 20, fontWeight: '400' },
});

export default HomeScreen;
