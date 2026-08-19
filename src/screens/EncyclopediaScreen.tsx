import React, { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppSurface } from '../components/AppSurface';
import { MascotSpotlight } from '../components/MascotSpotlight';
import { Panel } from '../components/Panel';
import { ScreenHeader } from '../components/ScreenHeader';
import { fallbackEncyclopediaEntries } from '../data/encyclopediaFallback';
import {
  askEncyclopediaAssistant,
  fetchEncyclopediaEntries,
  makeGoogleAiSearchUrl,
  type EncyclopediaEntry,
  type EncyclopediaResponse,
} from '../services/encyclopediaService';
import { colors } from '../theme';

const ALL_CATEGORY = '전체';
const fallbackCategories = Array.from(new Set(fallbackEncyclopediaEntries.map((entry) => entry.category)));

const filterFallback = (category: string, query: string): EncyclopediaResponse => {
  const normalizedQuery = query.trim().toLowerCase();
  const items = fallbackEncyclopediaEntries.filter((entry) => {
    const categoryMatch = category === ALL_CATEGORY || entry.category === category;
    const queryMatch =
      !normalizedQuery ||
      [entry.title, entry.summary, entry.body, entry.category, ...entry.tags].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    return categoryMatch && queryMatch;
  });

  return { items, categories: fallbackCategories, fromFallback: true };
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('ko-KR');
};

const EncyclopediaScreen = () => {
  const [category, setCategory] = useState(ALL_CATEGORY);
  const [query, setQuery] = useState('');
  const [entries, setEntries] = useState<EncyclopediaEntry[]>(fallbackEncyclopediaEntries);
  const [categories, setCategories] = useState<string[]>(fallbackCategories);
  const [fromFallback, setFromFallback] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<EncyclopediaEntry | undefined>();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [assistantLoading, setAssistantLoading] = useState(false);

  const categoryOptions = useMemo(
    () => [ALL_CATEGORY, ...categories.filter((item) => item !== ALL_CATEGORY)],
    [categories],
  );

  useEffect(() => {
    let mounted = true;

    const loadEntries = async () => {
      setLoading(true);
      try {
        const response = await fetchEncyclopediaEntries({ category, q: query });
        if (!mounted) {
          return;
        }
        setEntries(response.items);
        setCategories(response.categories.length ? response.categories : fallbackCategories);
        setFromFallback(false);
      } catch {
        if (!mounted) {
          return;
        }
        const fallback = filterFallback(category, query);
        setEntries(fallback.items);
        setCategories(fallback.categories);
        setFromFallback(true);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadEntries();
    return () => {
      mounted = false;
    };
  }, [category, query]);

  const handleSelect = (entry: EncyclopediaEntry) => {
    setSelectedEntry((current) => (current?.id === entry.id ? undefined : entry));
    setAnswer('');
  };

  const handleAsk = async () => {
    const trimmed = question.trim();
    if (!trimmed) {
      return;
    }

    setAssistantLoading(true);
    try {
      const serverAnswer = await askEncyclopediaAssistant(trimmed, selectedEntry?.id);
      setAnswer(serverAnswer);
    } catch {
      const target = selectedEntry ?? entries[0] ?? fallbackEncyclopediaEntries[0];
      setAnswer(
        `삼박사 설명: ${target.title} 내용을 기준으로 보면 ${target.summary} ${target.body} 더 넓게 확인하려면 아래 검색 버튼으로 관련 자료를 찾아볼 수 있습니다.`,
      );
    } finally {
      setAssistantLoading(false);
    }
  };

  const openSource = (entry: EncyclopediaEntry) => {
    if (entry.sourceUrl) {
      Linking.openURL(entry.sourceUrl);
    }
  };

  return (
    <AppSurface>
      <ScreenHeader title="인삼 백과사전" description="인삼의 종류, 재배, 품질, 섭취, 구매 정보를 검색해 볼 수 있습니다." />
      <MascotSpotlight
        title="삼박사가 정리한 인삼 지식"
        description="AI 판독과 시세 확인 전에 알아두면 좋은 내용을 주제별로 모았습니다. 건강 관련 내용은 일반 정보로만 참고해 주세요."
      />

      {fromFallback ? (
        <Panel tone="light">
          <Text style={styles.noticeTitle}>기본 내장 백과사전 표시 중</Text>
          <Text style={styles.noticeText}>서버에 연결할 수 없어 앱에 포함된 기본 내용을 보여드립니다.</Text>
        </Panel>
      ) : null}

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.gray60} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="검색어를 입력하세요"
          placeholderTextColor={colors.gray40}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="검색어 지우기">
            <Ionicons name="close-circle" size={20} color={colors.gray60} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.categoryRow}>
        {categoryOptions.map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.categoryButton, category === item ? styles.categoryButtonActive : null]}
            onPress={() => setCategory(item)}
          >
            <Text style={[styles.categoryText, category === item ? styles.categoryTextActive : null]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Panel tone="accent">
        <View style={styles.assistantHeader}>
          <Ionicons name="sparkles" size={20} color={colors.primary60} />
          <View style={styles.assistantCopy}>
            <Text style={styles.assistantTitle}>삼박사에게 물어보기</Text>
            <Text style={styles.assistantMeta}>{selectedEntry ? `${selectedEntry.title} 기준 답변` : '전체 백과 기준 답변'}</Text>
          </View>
        </View>
        <View style={styles.questionRow}>
          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder="이 인삼은 어떻게 보관해야 해?"
            placeholderTextColor={colors.gray40}
            style={styles.questionInput}
            multiline
          />
          <TouchableOpacity style={styles.askButton} onPress={handleAsk} disabled={assistantLoading}>
            <Ionicons name={assistantLoading ? 'hourglass' : 'send'} size={17} color={colors.white} />
          </TouchableOpacity>
        </View>
        {answer ? <Text style={styles.answerText}>{answer}</Text> : null}
        {question.trim() ? (
          <TouchableOpacity style={styles.googleButton} onPress={() => Linking.openURL(makeGoogleAiSearchUrl(question.trim()))}>
            <Ionicons name="logo-google" size={16} color={colors.primary60} />
            <Text style={styles.googleButtonText}>웹에서 더 찾아보기</Text>
          </TouchableOpacity>
        ) : null}
      </Panel>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>백과 목록</Text>
        <Text style={styles.listCount}>{loading ? '불러오는 중' : `${entries.length}개`}</Text>
      </View>

      {entries.length === 0 ? (
        <Panel tone="light">
          <Text style={styles.noticeTitle}>검색 결과가 없습니다</Text>
          <Text style={styles.noticeText}>다른 검색어나 분류를 선택해 주세요.</Text>
        </Panel>
      ) : (
        entries.map((entry) => {
          const expanded = selectedEntry?.id === entry.id;
          return (
            <TouchableOpacity key={entry.id} activeOpacity={0.86} onPress={() => handleSelect(entry)}>
              <Panel style={expanded ? styles.selectedPanel : undefined}>
                <View style={styles.row}>
                  <View style={styles.iconBox}>
                    <Ionicons name="library" size={18} color={colors.white} />
                  </View>
                  <View style={styles.content}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.tag}>{entry.category}</Text>
                      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary60} />
                    </View>
                    <Text style={styles.title}>{entry.title}</Text>
                    <Text style={styles.summary}>{entry.summary}</Text>
                    {expanded ? (
                      <>
                        <Text style={styles.text}>{entry.body}</Text>
                        {entry.caution ? <Text style={styles.caution}>{entry.caution}</Text> : null}
                        <View style={styles.metaBox}>
                          <Text style={styles.metaText}>갱신일 {formatDate(entry.updatedAt)}</Text>
                          {entry.sourceName ? <Text style={styles.metaText}>출처 {entry.sourceName}</Text> : null}
                        </View>
                        {entry.sourceUrl ? (
                          <TouchableOpacity style={styles.sourceButton} onPress={() => openSource(entry)}>
                            <Ionicons name="open-outline" size={16} color={colors.primary60} />
                            <Text style={styles.sourceButtonText}>원문 보기</Text>
                          </TouchableOpacity>
                        ) : null}
                      </>
                    ) : null}
                    <View style={styles.tagRow}>
                      {entry.tags.map((tag) => (
                        <Text key={tag} style={styles.smallTag}>
                          #{tag}
                        </Text>
                      ))}
                    </View>
                  </View>
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
  noticeTitle: { color: colors.ink, fontSize: 15, lineHeight: 23, fontWeight: '700', marginBottom: 4 },
  noticeText: { color: colors.gray60, fontSize: 13, lineHeight: 20 },
  searchBox: {
    minHeight: 48,
    backgroundColor: colors.gray0,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: colors.ink, fontSize: 15, lineHeight: 23, fontWeight: '700' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  categoryButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary10,
    backgroundColor: colors.gray0,
    justifyContent: 'center',
  },
  categoryButtonActive: { backgroundColor: colors.primary60, borderColor: colors.primary60 },
  categoryText: { color: colors.primary60, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  categoryTextActive: { color: colors.white },
  assistantHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  assistantCopy: { flex: 1 },
  assistantTitle: { color: colors.ink, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  assistantMeta: { color: colors.gray60, fontSize: 12, lineHeight: 18, marginTop: 2 },
  questionRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  questionInput: {
    flex: 1,
    minHeight: 46,
    maxHeight: 96,
    backgroundColor: colors.gray0,
    borderColor: colors.primary10,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 21,
  },
  askButton: {
    width: 46,
    minHeight: 46,
    borderRadius: 6,
    backgroundColor: colors.primary60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerText: { color: colors.ink, fontSize: 14, lineHeight: 22, marginTop: 12 },
  googleButton: {
    minHeight: 40,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary10,
    backgroundColor: colors.gray0,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  googleButtonText: { color: colors.primary60, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  listTitle: { color: colors.ink, fontSize: 18, lineHeight: 27, fontWeight: '700' },
  listCount: { color: colors.primary60, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  selectedPanel: { borderColor: colors.primary50, borderWidth: 2 },
  row: { flexDirection: 'row', gap: 12 },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary60,
  },
  content: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  tag: { color: colors.primary60, fontSize: 13, lineHeight: 20, fontWeight: '700', marginBottom: 5 },
  title: { color: colors.cream, fontSize: 17, lineHeight: 26, fontWeight: '700', marginBottom: 6 },
  summary: { color: colors.gray70, fontSize: 14, lineHeight: 21, fontWeight: '700', marginBottom: 8 },
  text: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  caution: {
    color: colors.ink,
    backgroundColor: colors.primary10,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    marginTop: 10,
  },
  metaBox: { marginTop: 10, gap: 3 },
  metaText: { color: colors.gray60, fontSize: 12, lineHeight: 18 },
  sourceButton: {
    minHeight: 38,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  sourceButtonText: { color: colors.primary60, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  smallTag: { color: colors.primary60, fontSize: 12, lineHeight: 18, fontWeight: '700' },
});

export default EncyclopediaScreen;
