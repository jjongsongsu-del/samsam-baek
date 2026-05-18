import React, { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppSurface } from '../components/AppSurface';
import { Panel } from '../components/Panel';
import { ScreenHeader } from '../components/ScreenHeader';
import { cultivationDataSource, cultivationStats, cultivationSummary } from '../data/cultivationStats';
import { colors } from '../theme';

type MapCategory = 'cultivation' | 'market';

type MarketPlace = {
  name: string;
  area: string;
  address: string;
  phone?: string;
  hours?: string;
  stores?: string;
  description: string;
  sourceUrl: string;
};

const googleMapsUrl = (query: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
const openUrl = (url: string) => Linking.openURL(url);

const marketPlaces: MarketPlace[] = [
  {
    name: '금산수삼센터',
    area: '금산',
    address: '충청남도 금산군 금산읍 인삼약초로 24',
    phone: '041-754-3161',
    hours: '소매 09:00~18:00 / 도매 장날 10:00~18:00',
    stores: '도매 82개, 소매 221개',
    description: '전국 최대 수삼 유통지로 도매시장, 소매시장, 생약시장으로 구성되어 있습니다.',
    sourceUrl: 'https://insamtong.kr/static/page24/1.do',
  },
  {
    name: '농협수삼랜드',
    area: '금산',
    address: '충청남도 금산군 금산읍 인삼약초로 42',
    phone: '041-753-3732',
    hours: '연중무휴 09:00~18:00',
    stores: '35개',
    description: '금산 토종수삼과 농협 조합원 재배 수삼을 생산자-소비자 직거래 방식으로 판매합니다.',
    sourceUrl: 'https://insamtong.kr/static/page24/2.do',
  },
  {
    name: '금산수삼시장',
    area: '금산',
    address: '충청남도 금산군 금산읍 인삼약초로 48-8',
    phone: '041-751-8555',
    hours: '연중무휴 08:00~18:00',
    stores: '50개',
    description: '가정용 수삼, 홍삼용 난밭삼, 선물용 수삼세트 등 다양한 인삼 품목을 취급합니다.',
    sourceUrl: 'https://insamtong.kr/static/page24/3.do',
  },
  {
    name: '강화인삼센터',
    area: '강화',
    address: '인천광역시 강화군 강화읍 강화대로 335',
    phone: '032-933-8913',
    hours: '08:00~18:30',
    stores: '53개 점포',
    description: '전국 인삼시장 정보에 등록된 강화 지역 인삼시장입니다.',
    sourceUrl: 'https://insamtong.kr/static/page25.do',
  },
  {
    name: '풍기인삼시장',
    area: '풍기',
    address: '경상북도 영주시 풍기읍 인삼로 8',
    phone: '054-636-7948',
    hours: '09:00~18:00',
    stores: '45개 점포',
    description: '전국 인삼시장 정보에 등록된 풍기 지역 대표 인삼시장입니다.',
    sourceUrl: 'https://insamtong.kr/static/page25.do',
  },
  {
    name: '김포파주인삼 유통센터',
    area: '파주',
    address: '경기 김포시 대곶면 대명항로 518',
    phone: '031-985-2381',
    hours: '09:00~18:00',
    stores: '약 30개 점포',
    description: '전국 인삼시장 정보에 등록된 김포·파주권 인삼 유통 거점입니다.',
    sourceUrl: 'https://insamtong.kr/static/page25.do',
  },
];

const MapScreen = () => {
  const [category, setCategory] = useState<MapCategory>('cultivation');
  const [selectedMarket, setSelectedMarket] = useState(marketPlaces[0]);

  const cultivationQuery = useMemo(() => `${cultivationStats[0]?.region ?? '금산'} 인삼 재배`, []);
  const selectedQuery = category === 'market' ? selectedMarket.address : cultivationQuery;

  return (
    <AppSurface>
      <ScreenHeader title="인삼 지도" description="재배현황과 인삼시장 정보를 분류별로 확인하고 Google 지도에서 위치를 열어봅니다." />

      <View style={styles.categorySwitch}>
        <TouchableOpacity
          style={[styles.categoryButton, category === 'cultivation' ? styles.categoryButtonActive : null]}
          onPress={() => setCategory('cultivation')}
        >
          <Ionicons name="leaf" size={17} color={category === 'cultivation' ? colors.white : colors.primary60} />
          <Text style={[styles.categoryText, category === 'cultivation' ? styles.categoryTextActive : null]}>재배현황</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.categoryButton, category === 'market' ? styles.categoryButtonActive : null]}
          onPress={() => setCategory('market')}
        >
          <Ionicons name="storefront" size={17} color={category === 'market' ? colors.white : colors.primary60} />
          <Text style={[styles.categoryText, category === 'market' ? styles.categoryTextActive : null]}>인삼시장 정보</Text>
        </TouchableOpacity>
      </View>

      <Panel tone="accent">
        <View style={styles.mapHeader}>
          <View>
            <Text style={styles.panelTitle}>{category === 'market' ? selectedMarket.name : '금산 인삼 경작지 현황'}</Text>
            <Text style={styles.mapMeta}>
              {category === 'market'
                ? selectedMarket.address
                : `${cultivationDataSource.baseYear}년 CSV ${cultivationSummary.parcels.toLocaleString('ko-KR')}필지 · 경작면적 ${cultivationSummary.cultivatedAreaHa.toLocaleString(
                    'ko-KR',
                  )}ha`}
            </Text>
          </View>
          <TouchableOpacity style={styles.mapIconButton} onPress={() => openUrl(googleMapsUrl(selectedQuery))}>
            <Ionicons name="map" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.mapPreview} onPress={() => openUrl(googleMapsUrl(selectedQuery))} activeOpacity={0.86}>
          <Ionicons name="location" size={34} color={colors.primary60} />
          <Text style={styles.mapPreviewTitle}>Google 지도에서 보기</Text>
          <Text style={styles.mapPreviewText}>{selectedQuery}</Text>
        </TouchableOpacity>
      </Panel>

      {category === 'cultivation' ? (
        <>
          <Text style={styles.sectionTitle}>읍면동별 경작지 통계</Text>
          {cultivationStats.map((item) => (
            <Panel key={item.region}>
              <View style={styles.rowHeader}>
                <Text style={styles.region}>{item.region}</Text>
                <TouchableOpacity style={styles.linkButton} onPress={() => openUrl(googleMapsUrl(`${item.region} 인삼 재배`))}>
                  <Text style={styles.linkText}>지도</Text>
                  <Ionicons name="chevron-forward" size={15} color={colors.primary60} />
                </TouchableOpacity>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>필지</Text>
                <Text style={styles.metricValue}>{item.parcels.toLocaleString('ko-KR')}건</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>경작면적</Text>
                <Text style={styles.metricValue}>{item.cultivatedAreaHa.toLocaleString('ko-KR')}ha</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>실제면적</Text>
                <Text style={styles.metricValue}>{item.actualAreaHa.toLocaleString('ko-KR')}ha</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>주요 경작연도</Text>
                <Text style={styles.metricValue}>{item.mainCropYear}년</Text>
              </View>
            </Panel>
          ))}
        </>
      ) : (
        <>
          <Text style={styles.sectionTitle}>인삼시장 목록</Text>
          {marketPlaces.map((market) => {
            const selected = selectedMarket.name === market.name;
            return (
              <TouchableOpacity key={market.name} activeOpacity={0.86} onPress={() => setSelectedMarket(market)}>
                <Panel style={selected ? styles.selectedPanel : undefined}>
                  <View style={styles.rowHeader}>
                    <View>
                      <Text style={styles.region}>{market.name}</Text>
                      <Text style={styles.marketArea}>{market.area}</Text>
                    </View>
                    <Ionicons name={selected ? 'checkmark-circle' : 'chevron-forward'} size={20} color={colors.primary60} />
                  </View>
                  <Text style={styles.description}>{market.description}</Text>
                  <Text style={styles.marketMeta}>{market.address}</Text>
                  <View style={styles.marketActions}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => openUrl(googleMapsUrl(market.address))}>
                      <Ionicons name="map" size={16} color={colors.primary60} />
                      <Text style={styles.actionText}>Google 지도</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => openUrl(market.sourceUrl)}>
                      <Ionicons name="open-outline" size={16} color={colors.primary60} />
                      <Text style={styles.actionText}>인삼통 정보</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.detailGrid}>
                    {market.phone ? <Text style={styles.detailText}>문의 {market.phone}</Text> : null}
                    {market.hours ? <Text style={styles.detailText}>운영 {market.hours}</Text> : null}
                    {market.stores ? <Text style={styles.detailText}>점포 {market.stores}</Text> : null}
                  </View>
                </Panel>
              </TouchableOpacity>
            );
          })}
        </>
      )}
    </AppSurface>
  );
};

const styles = StyleSheet.create({
  categorySwitch: {
    flexDirection: 'row',
    backgroundColor: colors.primary5,
    borderColor: colors.primary10,
    borderWidth: 1,
    borderRadius: 6,
    padding: 4,
    marginBottom: 14,
  },
  categoryButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    borderRadius: 4,
  },
  categoryButtonActive: { backgroundColor: colors.primary60 },
  categoryText: { color: colors.primary60, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  categoryTextActive: { color: colors.white },
  mapHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  panelTitle: { color: colors.cream, fontSize: 18, lineHeight: 27, fontWeight: '700' },
  mapMeta: { color: colors.gray60, fontSize: 13, lineHeight: 20, marginTop: 3 },
  mapIconButton: {
    width: 42,
    height: 42,
    borderRadius: 6,
    backgroundColor: colors.primary60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPreview: {
    minHeight: 168,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary10,
    backgroundColor: colors.primary5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  mapPreviewTitle: { color: colors.ink, fontSize: 18, lineHeight: 27, fontWeight: '700', marginTop: 8 },
  mapPreviewText: { color: colors.gray60, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 4 },
  sectionTitle: { color: colors.ink, fontSize: 18, lineHeight: 27, fontWeight: '700', marginBottom: 10 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  region: { color: colors.cream, fontSize: 18, lineHeight: 27, fontWeight: '700' },
  linkButton: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  linkText: { color: colors.primary60, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  metricLabel: { color: colors.muted, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  metricValue: { color: colors.primary60, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  selectedPanel: { borderColor: colors.primary50, borderWidth: 2 },
  marketArea: { color: colors.primary60, fontSize: 13, lineHeight: 20, fontWeight: '700', marginTop: 2 },
  description: { color: colors.gray70, fontSize: 14, lineHeight: 21, fontWeight: '700', marginBottom: 8 },
  marketMeta: { color: colors.gray60, fontSize: 13, lineHeight: 20, marginBottom: 10 },
  marketActions: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  actionButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary10,
    backgroundColor: colors.primary5,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  actionText: { color: colors.primary60, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  detailGrid: { gap: 4 },
  detailText: { color: colors.gray60, fontSize: 12, lineHeight: 18 },
});

export default MapScreen;
