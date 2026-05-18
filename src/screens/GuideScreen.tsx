import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { AppSurface } from '../components/AppSurface';
import { MascotSpotlight } from '../components/MascotSpotlight';
import { Panel } from '../components/Panel';
import { ScreenHeader } from '../components/ScreenHeader';
import { guideItems } from '../data/placeholder';
import { inspectionManual } from '../data/inspectionManual';
import { colors } from '../theme';

const GuideScreen = () => {
  return (
    <AppSurface>
      <ScreenHeader title="촬영 가이드" description="사진 품질을 먼저 잡아야 AI 판독 결과도 안정적으로 나옵니다." />
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
});

export default GuideScreen;
