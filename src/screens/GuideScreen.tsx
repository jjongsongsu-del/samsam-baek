import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { AppSurface } from '../components/AppSurface';
import { MascotSpotlight } from '../components/MascotSpotlight';
import { Panel } from '../components/Panel';
import { ScreenHeader } from '../components/ScreenHeader';
import { guideItems } from '../data/placeholder';
import { inspectionManual } from '../data/inspectionManual';
import { loadAccountState, type AccountState } from '../services/accountService';
import { colors } from '../theme';

const GuideScreen = () => {
  const [accountState, setAccountState] = useState<AccountState | null>(null);

  useEffect(() => {
    loadAccountState().then(setAccountState);
  }, []);

  const usageCount = accountState?.usage.count ?? 0;

  return (
    <AppSurface>
      <ScreenHeader title="가이드" description="촬영 요령, 판독 기준, 이용 안내를 한 곳에서 확인합니다." />
      <MascotSpotlight
        title="삼박사의 촬영 코칭"
        description="사진을 새로 찍거나 사진첩에서 고를 때도 같은 기준으로 확인하면 판독 품질이 좋아집니다."
      />

      {guideItems.map((item, index) => (
        <Panel key={item.title} tone={index === 0 ? 'accent' : 'dark'}>
          <View style={styles.guideRow}>
            <Text style={styles.step}>{String(index + 1).padStart(2, '0')}</Text>
            <View style={styles.guideContent}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.text}>{item.description}</Text>
            </View>
          </View>
        </Panel>
      ))}

      <Text style={styles.sectionTitle}>판독 매뉴얼</Text>
      {inspectionManual.map((section) => (
        <Panel key={section.title}>
          <View style={styles.manualHeader}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success60} />
            <Text style={styles.title}>{section.title}</Text>
          </View>
          <Text style={styles.text}>{section.description}</Text>
          {section.items?.map((item) => (
            <Text key={item} style={styles.listText}>• {item}</Text>
          ))}
          {section.note ? <Text style={styles.note}>{section.note}</Text> : null}
        </Panel>
      ))}

      <Text style={styles.sectionTitle}>이용 안내</Text>
      <Panel tone="light">
        <View style={styles.accountHeader}>
          <View style={styles.iconBadge}>
            <Ionicons name="checkmark-circle" size={22} color={colors.primary60} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.lightPanelTitle}>로그인 없이 이용</Text>
            <Text style={styles.lightPanelText}>AI 판독, 시세, 백과, 인삼정보 기능을 계정 연결 없이 사용할 수 있습니다.</Text>
          </View>
        </View>
        <Text style={styles.meta}>오늘 이 기기에서 실행한 AI 판독: {usageCount.toLocaleString('ko-KR')}회</Text>
      </Panel>

      <Panel>
        <Text style={styles.title}>개인정보 및 데이터 안내</Text>
        <Text style={styles.text}>사진은 AI 판독을 위해 서버로 전송되며, 서버는 기본적으로 원본 사진을 저장하지 않습니다.</Text>
        <Text style={styles.meta}>앱의 저장 목록은 사용 중인 기기 안에만 보관됩니다.</Text>
        <Text style={styles.meta}>계정 로그인 기능을 사용하지 않으므로 소셜 계정 정보는 수집하지 않습니다.</Text>
      </Panel>

      <Panel>
        <Text style={styles.title}>AI 판독 안내</Text>
        <Text style={styles.text}>판독 결과는 참고 정보이며 공식 감정이나 거래 보증이 아닙니다.</Text>
        <Text style={styles.meta}>사진 품질, 조명, 배경, 인삼 상태에 따라 결과가 달라질 수 있습니다.</Text>
      </Panel>
    </AppSurface>
  );
};

const styles = StyleSheet.create({
  guideRow: { flexDirection: 'row', gap: 14 },
  step: { color: colors.primary60, fontSize: 24, lineHeight: 36, fontWeight: '700' },
  guideContent: { flex: 1 },
  title: { color: colors.cream, fontSize: 16, lineHeight: 24, fontWeight: '700', marginBottom: 7 },
  text: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  sectionTitle: { color: colors.cream, fontSize: 19, lineHeight: 29, fontWeight: '700', marginTop: 10, marginBottom: 12 },
  manualHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  listText: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 7 },
  note: { color: colors.success60, fontSize: 13, lineHeight: 20, fontWeight: '700', marginTop: 10 },
  accountHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.primary5,
    borderColor: colors.primary10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1 },
  lightPanelTitle: { color: colors.ink, fontSize: 18, lineHeight: 27, fontWeight: '700' },
  lightPanelText: { color: colors.gray60, fontSize: 14, lineHeight: 21 },
  meta: { color: colors.gray60, fontSize: 12, lineHeight: 18, marginTop: 6 },
});

export default GuideScreen;
