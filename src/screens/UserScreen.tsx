import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppSurface } from '../components/AppSurface';
import { Panel } from '../components/Panel';
import { ScreenHeader } from '../components/ScreenHeader';
import { loadAccountState, type AccountState } from '../services/accountService';
import { colors } from '../theme';

const UserScreen = () => {
  const [accountState, setAccountState] = useState<AccountState | null>(null);

  useEffect(() => {
    loadAccountState().then(setAccountState);
  }, []);

  const usageCount = accountState?.usage.count ?? 0;

  return (
    <AppSurface>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="이용 안내" description="로그인 없이 삼삼백과의 주요 기능을 바로 사용할 수 있습니다." />

        <Panel tone="light">
          <View style={styles.accountHeader}>
            <View style={styles.iconBadge}>
              <Ionicons name="checkmark-circle" size={22} color={colors.primary60} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>로그인 없이 이용</Text>
              <Text style={styles.body}>AI 판독, 시세, 백과, 지도 기능을 계정 연결 없이 사용할 수 있습니다.</Text>
            </View>
          </View>
          <Text style={styles.meta}>오늘 이 기기에서 실행한 AI 판독: {usageCount.toLocaleString('ko-KR')}회</Text>
        </Panel>

        <Panel>
          <Text style={styles.panelTitle}>개인정보 및 데이터 안내</Text>
          <Text style={styles.body}>사진은 AI 판독을 위해 서버로 전송되며, 서버는 기본적으로 원본 사진을 저장하지 않습니다.</Text>
          <Text style={styles.meta}>앱의 저장 목록은 사용 중인 기기 안에만 보관됩니다.</Text>
          <Text style={styles.meta}>계정 로그인 기능을 사용하지 않으므로 소셜 계정 정보는 수집하지 않습니다.</Text>
        </Panel>

        <Panel>
          <Text style={styles.panelTitle}>AI 판독 안내</Text>
          <Text style={styles.body}>판독 결과는 참고 정보이며 공식 감정이나 거래 보증이 아닙니다.</Text>
          <Text style={styles.meta}>사진 품질, 조명, 배경, 인삼 상태에 따라 결과가 달라질 수 있습니다.</Text>
        </Panel>
      </ScrollView>
    </AppSurface>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 28 },
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
  title: { color: colors.ink, fontSize: 20, lineHeight: 30, fontWeight: '700' },
  panelTitle: { color: colors.cream, fontSize: 16, lineHeight: 24, fontWeight: '700', marginBottom: 10 },
  body: { color: colors.gray60, fontSize: 14, lineHeight: 21 },
  meta: { color: colors.gray60, fontSize: 12, lineHeight: 18, marginTop: 6 },
});

export default UserScreen;
