import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppSurface } from '../components/AppSurface';
import { Panel } from '../components/Panel';
import { ScreenHeader } from '../components/ScreenHeader';
import { latestPrices } from '../data/placeholder';
import {
  fetchCurrentMarketPrices,
  fetchDetailedMarketPriceHistory,
  fetchDetailedMarketPrices,
  type CurrentMarketPrice,
  type DetailedMarketPrice,
  type DetailedMarketPriceHistoryRow,
} from '../services/priceService';
import { colors } from '../theme';

const fallbackPrices: CurrentMarketPrice[] = latestPrices.map((item) => ({
  gradeCode: item.gradeCode,
  name: item.grade,
  category: item.category,
  grade: item.grade,
  day: new Date().toLocaleDateString('sv-SE'),
  requestedDate: new Date().toLocaleDateString('sv-SE'),
  currentAvgPrice: item.price,
  diffPrevYear: item.changeRate,
  ratePrevYear: item.changeRate,
  unit: item.unit,
  sourceUrl: 'https://insamtong.kr/price.do',
}));

const formatPrice = (value?: number) => (value == null ? '-' : `${Math.round(value).toLocaleString('ko-KR')}원`);
const formatDate = (value: string) => value.replace(/-/g, '.');
const normalizeSearch = (value: string) => value.replace(/\s+/g, '').toLowerCase();

const MarketScreen = ({ route }: any) => {
  const [prices, setPrices] = useState<CurrentMarketPrice[]>(fallbackPrices);
  const [detailedPrices, setDetailedPrices] = useState<DetailedMarketPrice[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<DetailedMarketPrice | undefined>();
  const [historyRows, setHistoryRows] = useState<DetailedMarketPriceHistoryRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const loadPrices = useCallback(async () => {
    setIsLoading(true);
    setIsDetailLoading(true);
    setErrorMessage(undefined);
    try {
      const currentPrices = await fetchCurrentMarketPrices();
      if (currentPrices.length > 0) {
        setPrices(currentPrices);
      }
      setIsFallback(currentPrices.length === 0);
      if (currentPrices.length === 0) {
        setErrorMessage('인삼통 간편 시세를 불러오지 못해 기본 시세를 표시하고 있습니다.');
      }
      setIsLoading(false);

      const currentDetailPrices = await fetchDetailedMarketPrices();
      setDetailedPrices(currentDetailPrices);
    } catch (error) {
      setPrices(fallbackPrices);
      setDetailedPrices([]);
      setSelectedDetail(undefined);
      setHistoryRows([]);
      setIsFallback(true);
      setErrorMessage('인삼통 가격 정보를 불러오지 못해 기본 시세를 표시하고 있습니다.');
    } finally {
      setIsLoading(false);
      setIsDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrices();
  }, [loadPrices]);

  const mainPrice = prices[0];
  const tradeDate = useMemo(() => prices.find((item) => item.day)?.day ?? mainPrice.day, [mainPrice.day, prices]);
  const normalizedQuery = useMemo(() => normalizeSearch(searchQuery), [searchQuery]);
  const filteredPrices = useMemo(() => {
    if (!normalizedQuery) {
      return prices;
    }
    return prices.filter((item) =>
      normalizeSearch(`${item.gradeCode} ${item.category} ${item.grade} ${item.name} ${item.unit}`).includes(normalizedQuery),
    );
  }, [normalizedQuery, prices]);
  const filteredDetailedPrices = useMemo(() => {
    if (!normalizedQuery) {
      return detailedPrices;
    }
    return detailedPrices.filter((item) =>
      normalizeSearch(`${item.parentCode} ${item.gradeCode} ${item.category} ${item.grade} ${item.description ?? ''} ${item.unit}`).includes(normalizedQuery),
    );
  }, [detailedPrices, normalizedQuery]);
  const groupedDetails = useMemo(
    () =>
      filteredDetailedPrices.reduce<Record<string, DetailedMarketPrice[]>>((groups, item) => {
        groups[item.category] = [...(groups[item.category] ?? []), item];
        return groups;
      }, {}),
    [filteredDetailedPrices],
  );

  const openDetail = useCallback(async (item: DetailedMarketPrice) => {
    setSelectedDetail(item);
    setHistoryRows([]);
    setIsHistoryLoading(true);
    try {
      const rows = await fetchDetailedMarketPriceHistory(item.parentCode, item.gradeCode);
      setHistoryRows(rows);
    } catch (error) {
      setHistoryRows([]);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    const selectedGradeCode = route?.params?.selectedGradeCode;
    if (!selectedGradeCode || detailedPrices.length === 0) {
      return;
    }

    const matched = detailedPrices.find((item) => item.gradeCode === String(selectedGradeCode));
    if (matched) {
      openDetail(matched);
    }
  }, [detailedPrices, openDetail, route?.params?.selectedGradeCode]);

  return (
    <AppSurface>
      <ScreenHeader title="오늘의 인삼 시세" description="인삼통 간편 가격 정보 기준으로 주요 등급별 평균가를 확인합니다." />

      <Panel tone="accent">
        <View style={styles.summaryRow}>
          <View style={styles.summaryText}>
            <Text style={styles.summaryLabel}>도매시장 평균가</Text>
            <Text style={styles.summaryValue}>{formatPrice(mainPrice.currentAvgPrice)}</Text>
            <Text style={styles.summaryMeta}>
              조회일 {formatDate(mainPrice.requestedDate)} · 거래일 {formatDate(tradeDate)}
            </Text>
          </View>
          <TouchableOpacity style={styles.syncBadge} onPress={loadPrices} disabled={isLoading}>
            {isLoading ? <ActivityIndicator size="small" color={colors.white} /> : <Ionicons name="sync" size={16} color={colors.white} />}
            <Text style={styles.syncText}>{isLoading ? '조회 중' : '갱신'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.summaryCaption}>게시 가격은 인삼통 금산수삼센터 도매장 거래 평균가격 기준입니다.</Text>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </Panel>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.gray60} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="구분, 등급, 뿌리 수 검색"
          placeholderTextColor={colors.gray40}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {searchQuery ? (
          <Pressable style={styles.clearButton} onPress={() => setSearchQuery('')}>
            <Ionicons name="close" size={16} color={colors.white} />
          </Pressable>
        ) : null}
      </View>

      {filteredPrices.map((item) => {
        const diff = item.diffPreviousTradePrice ?? 0;
        const rate = item.ratePreviousTradePrice;
        const trendStyle = diff > 0 ? styles.up : diff < 0 ? styles.down : styles.flat;
        const trendIcon = diff > 0 ? 'arrow-up' : diff < 0 ? 'arrow-down' : 'remove';

        return (
          <Panel key={item.gradeCode}>
            <View style={styles.cardRow}>
              <View style={styles.gradeMark}>
                <Text style={styles.gradeCode}>{item.gradeCode}</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>
                  {item.category} / {item.grade}
                </Text>
                <Text style={styles.cardMeta}>{item.unit}</Text>
                <Text style={styles.cardMeta}>거래일 {formatDate(item.day)}</Text>
              </View>
              <View style={styles.priceBox}>
                <Text style={styles.price}>{formatPrice(item.currentAvgPrice)}</Text>
                <View style={styles.trendRow}>
                  <Ionicons name={trendIcon} size={13} color={trendStyle.color} />
                  <Text style={trendStyle}>
                    {diff === 0 ? '직전 0' : `${diff > 0 ? '+' : ''}${Math.round(diff).toLocaleString('ko-KR')}원`}
                  </Text>
                </View>
                {rate != null ? <Text style={styles.rateText}>{item.previousTradeDay ? formatDate(item.previousTradeDay) : '직전 거래일'} 대비 {rate}%</Text> : null}
              </View>
            </View>
            <Pressable style={styles.sourceButton} onPress={() => Linking.openURL(item.sourceUrl)}>
              <Text style={styles.sourceText}>{isFallback ? '인삼통에서 확인' : '인삼통 원문 보기'}</Text>
              <Ionicons name="open-outline" size={15} color={colors.primary60} />
            </Pressable>
          </Panel>
        );
      })}

      {filteredPrices.length === 0 ? (
        <Panel>
          <Text style={styles.cardTitle}>검색 결과 없음</Text>
          <Text style={styles.cardMeta}>다른 구분, 등급, 규격으로 검색해 주세요.</Text>
        </Panel>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>상세 가격 리포트</Text>
        {isDetailLoading ? <ActivityIndicator size="small" color={colors.primary60} /> : null}
      </View>
      <Text style={styles.sectionCaption}>
        {searchQuery ? `"${searchQuery}" 검색 결과 ${filteredDetailedPrices.length.toLocaleString('ko-KR')}건` : '최근 180일 내 거래가 있는 가장 최근 장별 가격을 구분과 등급별로 표시합니다.'}
      </Text>

      {Object.entries(groupedDetails).map(([category, items]) => (
        <Panel key={category}>
          <Text style={styles.groupTitle}>{category}</Text>
          {items.map((item) => {
            const diff = item.diffPreviousTradePrice ?? 0;
            const rate = item.ratePreviousTradePrice ?? 0;
            return (
              <Pressable key={item.gradeCode} style={styles.detailRow} onPress={() => openDetail(item)}>
                <View style={styles.detailMain}>
                  <Text style={styles.detailTitle}>
                    {item.grade}
                    {item.description ? ` · ${item.description}` : ''}
                  </Text>
                  <Text style={styles.detailMeta}>
                    {formatDate(item.day)} · {item.unit}
                  </Text>
                </View>
                <View style={styles.detailPriceBox}>
                  <Text style={styles.detailPrice}>{formatPrice(item.latestPrice)}</Text>
                  <Text style={diff > 0 ? styles.up : diff < 0 ? styles.down : styles.flat}>
                    {item.previousTradeDay ? `${formatDate(item.previousTradeDay)} 대비` : '직전 대비'} {rate.toFixed(2)}%
                  </Text>
                  <Text style={styles.detailLink}>상세</Text>
                </View>
              </Pressable>
            );
          })}
        </Panel>
      ))}

      {selectedDetail ? (
        <Panel tone="light">
          <View style={styles.historyHeader}>
            <View>
              <Text style={styles.lightTitle}>
                {selectedDetail.category} / {selectedDetail.grade}
              </Text>
              <Text style={styles.lightText}>최근 3개월 날짜별 가격과 전일 등락률</Text>
            </View>
            {isHistoryLoading ? <ActivityIndicator size="small" color={colors.primary60} /> : null}
          </View>
          {historyRows.map((row) => {
            const diff = row.diffPreviousTradePrice ?? 0;
            const rate = row.ratePreviousTradePrice ?? 0;
            return (
              <View key={row.day} style={styles.historyRow}>
                <View style={styles.historyDateBox}>
                  <Text style={styles.historyDate}>{formatDate(row.day)}</Text>
                  <Text style={styles.historyCompare}>{row.previousTradeDay ? `${formatDate(row.previousTradeDay)} 대비` : '직전 거래일 없음'}</Text>
                </View>
                <Text style={styles.historyPrice}>{formatPrice(row.latestPrice)}</Text>
                <Text style={diff > 0 ? styles.up : diff < 0 ? styles.down : styles.flat}>{rate.toFixed(2)}%</Text>
              </View>
            );
          })}
          {!isHistoryLoading && historyRows.length === 0 ? <Text style={styles.lightText}>최근 3개월 상세 가격 데이터가 없습니다.</Text> : null}
          <Pressable style={styles.sourceButton} onPress={() => Linking.openURL(selectedDetail.sourceUrl)}>
            <Text style={styles.sourceText}>인삼통 세부 리포트 보기</Text>
            <Ionicons name="open-outline" size={15} color={colors.primary60} />
          </Pressable>
        </Panel>
      ) : null}

      {!isDetailLoading && detailedPrices.length > 0 && filteredDetailedPrices.length === 0 ? (
        <Panel>
          <Text style={styles.cardTitle}>상세 검색 결과 없음</Text>
          <Text style={styles.cardMeta}>예: 원삼, 난발삼, 믹서, 7뿌리, 파삼</Text>
        </Panel>
      ) : null}

      {!isDetailLoading && detailedPrices.length === 0 ? (
        <Panel>
          <Text style={styles.cardTitle}>상세 가격 정보 없음</Text>
          <Text style={styles.cardMeta}>인삼통 세부 가격 리포트를 불러오지 못했습니다. 잠시 후 갱신을 눌러 다시 확인해 주세요.</Text>
        </Panel>
      ) : null}
    </AppSurface>
  );
};

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  summaryText: { flex: 1 },
  summaryLabel: { color: colors.muted, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  summaryValue: { color: colors.cream, fontSize: 32, lineHeight: 40, fontWeight: '700', marginTop: 6 },
  summaryMeta: { color: colors.gray60, fontSize: 12, lineHeight: 18, marginTop: 4 },
  syncBadge: {
    minWidth: 76,
    minHeight: 40,
    backgroundColor: colors.primary60,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  syncText: { color: colors.white, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  summaryCaption: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 12 },
  errorText: { color: colors.warning60, fontSize: 12, lineHeight: 18, marginTop: 8, fontWeight: '700' },
  searchBox: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary10,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  searchInput: { flex: 1, color: colors.ink, fontSize: 15, lineHeight: 22, paddingVertical: 8 },
  clearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray60,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gradeMark: {
    width: 42,
    height: 42,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary60,
  },
  gradeCode: { color: colors.white, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  cardContent: { flex: 1 },
  cardTitle: { color: colors.cream, fontSize: 15, lineHeight: 23, fontWeight: '700' },
  cardMeta: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  priceBox: { alignItems: 'flex-end', minWidth: 96 },
  price: { color: colors.cream, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 },
  up: { color: colors.warning60, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  down: { color: colors.primary60, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  flat: { color: colors.success60, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  rateText: { color: colors.gray60, fontSize: 11, lineHeight: 16, marginTop: 2 },
  sourceButton: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  sourceText: { color: colors.primary60, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 4 },
  sectionTitle: { color: colors.ink, fontSize: 18, lineHeight: 27, fontWeight: '700' },
  sectionCaption: { color: colors.gray60, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  groupTitle: { color: colors.cream, fontSize: 17, lineHeight: 26, fontWeight: '700', marginBottom: 8 },
  detailRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: colors.primary10,
  },
  detailMain: { flex: 1 },
  detailTitle: { color: colors.cream, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  detailMeta: { color: colors.gray60, fontSize: 12, lineHeight: 18, marginTop: 2 },
  detailPriceBox: { minWidth: 94, alignItems: 'flex-end' },
  detailPrice: { color: colors.cream, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  detailLink: { color: colors.primary60, fontSize: 12, lineHeight: 18, fontWeight: '700', marginTop: 2 },
  historyHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 },
  lightTitle: { color: colors.ink, fontSize: 17, lineHeight: 26, fontWeight: '700' },
  lightText: { color: colors.gray60, fontSize: 13, lineHeight: 20, marginTop: 2 },
  historyRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.primary10,
  },
  historyDateBox: { flex: 1 },
  historyDate: { color: colors.gray70, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  historyCompare: { color: colors.gray60, fontSize: 11, lineHeight: 16 },
  historyPrice: { color: colors.ink, fontSize: 13, lineHeight: 20, fontWeight: '700' },
});

export default MarketScreen;
