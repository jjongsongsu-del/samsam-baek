import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Alert, Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppSurface } from '../components/AppSurface';
import { Panel } from '../components/Panel';
import { ScreenHeader } from '../components/ScreenHeader';
import { mapFallbackData } from '../data/mapFallbackData';
import { fetchMapData, importMapCsv, type MapCategory, type MapDataItem } from '../services/mapDataService';
import { colors } from '../theme';

type CategoryMeta = {
  key: MapCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
};

const categories: CategoryMeta[] = [
  { key: 'cultivation', label: '경작지', icon: 'leaf', description: '금산 인삼 경작지 현황' },
  { key: 'seller', label: '판매업체', icon: 'storefront', description: '인삼관련제품 판매업체' },
  { key: 'certified', label: '금홍인증', icon: 'ribbon', description: '금산군 금홍인증제품' },
];

const googleMapsUrl = (query: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
const openUrl = (url: string) => Linking.openURL(url);

const categoryLabel = (category: MapCategory) => categories.find((item) => item.key === category)?.label ?? category;
const categoryFallback = (category: MapCategory) => mapFallbackData.filter((item) => item.category === category);

const matchesQuery = (item: MapDataItem, query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return [item.title, item.subtitle, item.address, item.phone, item.description, ...item.tags]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(normalized);
};

const MapScreen = () => {
  const [category, setCategory] = useState<MapCategory>('cultivation');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<MapDataItem[]>(categoryFallback('cultivation'));
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sourceMessage, setSourceMessage] = useState('로컬 기본 데이터');

  const selectedCategory = categories.find((item) => item.key === category) ?? categories[0];
  const filteredItems = useMemo(() => items.filter((item) => matchesQuery(item, query)), [items, query]);
  const selectedItem = filteredItems.find((item) => item.id === selectedId) ?? filteredItems[0];
  const selectedQuery = selectedItem?.address || selectedItem?.title || '금산군 인삼';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const serverItems = await fetchMapData(category, query);
      const nextItems = serverItems.length > 0 ? serverItems : categoryFallback(category);
      setItems(nextItems);
      setSelectedId(nextItems[0]?.id ?? null);
      setSourceMessage(serverItems.length > 0 ? '서버 반영 데이터' : '로컬 기본 데이터');
    } catch {
      const fallback = categoryFallback(category);
      setItems(fallback);
      setSelectedId(fallback[0]?.id ?? null);
      setSourceMessage('서버 연결 실패로 로컬 기본 데이터 표시');
    } finally {
      setLoading(false);
    }
  }, [category, query]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleImportCsv = async () => {
    setUploading(true);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['text/*', 'text/csv', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled) {
        return;
      }
      const asset = picked.assets[0];
      const csvBase64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      const result = await importMapCsv(category, asset.name, csvBase64);
      Alert.alert('반영 완료', `${categoryLabel(result.category)} 데이터 ${result.imported.toLocaleString('ko-KR')}건을 반영했습니다.`);
      await loadData();
    } catch (error: any) {
      Alert.alert('반영 실패', error.message || 'CSV 파일을 반영하지 못했습니다.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppSurface>
      <ScreenHeader title="인삼 지도" description="경작지, 판매업체, 금홍인증제품을 분류와 검색으로 확인합니다." />

      <View style={styles.categoryGrid}>
        {categories.map((item) => {
          const active = category === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.categoryButton, active ? styles.categoryButtonActive : null]}
              onPress={() => {
                setCategory(item.key);
                setQuery('');
              }}
            >
              <Ionicons name={item.icon} size={18} color={active ? colors.white : colors.primary60} />
              <Text style={[styles.categoryText, active ? styles.categoryTextActive : null]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Panel tone="accent">
        <View style={styles.mapHeader}>
          <View style={styles.mapHeaderText}>
            <Text style={styles.panelTitle}>{selectedItem?.title ?? selectedCategory.label}</Text>
            <Text style={styles.mapMeta}>{selectedItem?.subtitle ?? selectedCategory.description}</Text>
            <Text style={styles.sourceText}>{sourceMessage}</Text>
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

      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={colors.gray60} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={`${selectedCategory.label} 검색`}
          placeholderTextColor={colors.gray40}
          style={styles.searchInput}
          autoCapitalize="none"
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.gray60} />
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity style={styles.adminToggle} onPress={() => setAdminOpen((value) => !value)}>
        <Ionicons name="cloud-upload-outline" size={18} color={colors.primary60} />
        <Text style={styles.adminToggleText}>관리자 CSV 반영</Text>
        <Ionicons name={adminOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary60} />
      </TouchableOpacity>

      {adminOpen ? (
        <Panel>
          <Text style={styles.adminTitle}>{selectedCategory.label} CSV 업로드</Text>
          <Text style={styles.adminText}>
            관리자가 최신 CSV를 선택한 뒤 반영하면 서버의 해당 분류 데이터가 교체됩니다. 현재 분류에 맞는 CSV를 선택해 주세요.
          </Text>
          <TouchableOpacity style={styles.importButton} onPress={handleImportCsv} disabled={uploading}>
            <Ionicons name="document-attach" size={17} color={colors.white} />
            <Text style={styles.importButtonText}>{uploading ? '반영 중' : 'CSV 선택 후 반영'}</Text>
          </TouchableOpacity>
        </Panel>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{selectedCategory.label} 목록</Text>
        <Text style={styles.countText}>{loading ? '불러오는 중' : `${filteredItems.length.toLocaleString('ko-KR')}건`}</Text>
      </View>

      {filteredItems.length === 0 ? (
        <Panel>
          <Text style={styles.emptyText}>검색 결과가 없습니다.</Text>
        </Panel>
      ) : (
        filteredItems.map((item) => {
          const selected = selectedItem?.id === item.id;
          return (
            <TouchableOpacity key={item.id} activeOpacity={0.86} onPress={() => setSelectedId(item.id)}>
              <Panel style={selected ? styles.selectedPanel : undefined}>
                <View style={styles.rowHeader}>
                  <View style={styles.itemTitleBlock}>
                    <Text style={styles.region}>{item.title}</Text>
                    {item.subtitle ? <Text style={styles.itemSubtitle}>{item.subtitle}</Text> : null}
                  </View>
                  <Ionicons name={selected ? 'checkmark-circle' : 'chevron-forward'} size={20} color={colors.primary60} />
                </View>
                {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
                {item.address ? <Text style={styles.itemMeta}>{item.address}</Text> : null}
                {item.phone ? <Text style={styles.itemMeta}>문의 {item.phone}</Text> : null}
                {item.metrics ? (
                  <View style={styles.metricWrap}>
                    {Object.entries(item.metrics).map(([key, value]) => (
                      <View key={key} style={styles.metricPill}>
                        <Text style={styles.metricText}>{String(value)}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                <View style={styles.itemActions}>
                  <TouchableOpacity style={styles.actionButton} onPress={() => openUrl(googleMapsUrl(item.address || item.title))}>
                    <Ionicons name="map" size={16} color={colors.primary60} />
                    <Text style={styles.actionText}>지도</Text>
                  </TouchableOpacity>
                </View>
              </Panel>
            </TouchableOpacity>
          );
        })
      )}
    </AppSurface>
  );
};

const styles = StyleSheet.create({
  categoryGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  categoryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary10,
    backgroundColor: colors.gray0,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  categoryButtonActive: { backgroundColor: colors.primary60, borderColor: colors.primary60 },
  categoryText: { color: colors.primary60, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  categoryTextActive: { color: colors.white },
  mapHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  mapHeaderText: { flex: 1 },
  panelTitle: { color: colors.cream, fontSize: 18, lineHeight: 27, fontWeight: '700' },
  mapMeta: { color: colors.gray60, fontSize: 13, lineHeight: 20, marginTop: 3 },
  sourceText: { color: colors.primary60, fontSize: 12, lineHeight: 18, fontWeight: '700', marginTop: 4 },
  mapIconButton: {
    width: 42,
    height: 42,
    borderRadius: 6,
    backgroundColor: colors.primary60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPreview: {
    minHeight: 148,
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
  searchRow: {
    minHeight: 46,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary10,
    backgroundColor: colors.gray0,
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, color: colors.ink, fontSize: 14, lineHeight: 21, paddingVertical: 0 },
  adminToggle: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  adminToggleText: { color: colors.primary60, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  adminTitle: { color: colors.cream, fontSize: 16, lineHeight: 24, fontWeight: '700', marginBottom: 6 },
  adminText: { color: colors.gray60, fontSize: 13, lineHeight: 20, marginBottom: 12 },
  importButton: {
    minHeight: 44,
    borderRadius: 6,
    backgroundColor: colors.primary60,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  importButtonText: { color: colors.white, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { color: colors.ink, fontSize: 18, lineHeight: 27, fontWeight: '700' },
  countText: { color: colors.gray60, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  selectedPanel: { borderColor: colors.primary50, borderWidth: 2 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 },
  itemTitleBlock: { flex: 1 },
  region: { color: colors.cream, fontSize: 17, lineHeight: 26, fontWeight: '700' },
  itemSubtitle: { color: colors.primary60, fontSize: 13, lineHeight: 20, fontWeight: '700', marginTop: 2 },
  description: { color: colors.gray70, fontSize: 14, lineHeight: 21, fontWeight: '700', marginBottom: 8 },
  itemMeta: { color: colors.gray60, fontSize: 13, lineHeight: 20, marginTop: 3 },
  metricWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  metricPill: { backgroundColor: colors.primary5, borderColor: colors.primary10, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  metricText: { color: colors.primary60, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  itemActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
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
  emptyText: { color: colors.gray60, fontSize: 14, lineHeight: 21 },
});

export default MapScreen;
