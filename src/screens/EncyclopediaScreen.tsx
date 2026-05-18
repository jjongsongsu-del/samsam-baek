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
  fetchGoogleAiSearchAnswer,
  makeGoogleAiSearchUrl,
  type EncyclopediaEntry,
  type EncyclopediaResponse,
} from '../services/encyclopediaService';
import { colors } from '../theme';

const fallbackCategories = Array.from(new Set(fallbackEncyclopediaEntries.map((entry) => entry.category)));

const filterFallback = (category: string, query: string): EncyclopediaResponse => {
  const normalizedQuery = query.trim().toLowerCase();
  const items = fallbackEncyclopediaEntries.filter((entry) => {
    const categoryMatch = category === '전체' || entry.category === category;
    const queryMatch =
      !normalizedQuery ||
      [entry.title, entry.summary, entry.body, entry.category, ...entry.tags].some((value) => value.toLowerCase().includes(normalizedQuery));
    return categoryMatch && queryMatch;
  });

  return { items, categories: fallbackCategories, fromFallback: true };
};

const makeLocalAssistantAnswer = (question: string, entry?: EncyclopediaEntry) => {
  const target = entry ?? fallbackEncyclopediaEntries[0];
  return `삼박사 설명: ${target.title} 기준으로 보면, ${target.summary} ${target.body} 질문하신 내용 "${question}"은 이 기준과 함께 확인하면 좋습니다.`;
};

const EncyclopediaScreen = () => {
  const [category, setCategory] = useState('전체');
  const [query, setQuery] = useState('');
  const [entries, setEntries] = useState<EncyclopediaEntry[]>(fallbackEncyclopediaEntries);
  const [categories, setCategories] = useState<string[]>(fallbackCategories);
  const [fromFallback, setFromFallback] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<EncyclopediaEntry | undefined>();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [googleSearchUrl, setGoogleSearchUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [assistantLoading, setAssistantLoading] = useState(false);

  const categoryOptions = useMemo(() => ['전체', ...categories.filter((item) => item !== '전체')], [categories]);

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

  const handleAsk = async () => {
    const trimmed = question.trim();
    if (!trimmed) {
      return;
    }

    setAssistantLoading(true);
    setGoogleSearchUrl('');
    try {
      const googleAnswer = await fetchGoogleAiSearchAnswer(trimmed);
      setAnswer(googleAnswer || 'Google AI 검색 결과가 비어 있습니다.');
    } catch {
      try {
        const serverAnswer = await askEncyclopediaAssistant(trimmed, selectedEntry?.id);
        setAnswer(serverAnswer);
      } catch {
        setGoogleSearchUrl(makeGoogleAiSearchUrl(trimmed));
        setAnswer(
          'Google AI 검색 결과는 앱에서 직접 가져올 수 없어 Google 검색으로 연결합니다. 백엔드에 Google Custom Search 또는 승인된 검색 API를 연결하면 이 영역에 요약 결과를 표시할 수 있습니다.',
        );
      }
    } finally {
      setAssistantLoading(false);
    }
  };

  return (
    <AppSurface>
      <ScreenHeader title="삼박사의 인삼백과" description="서버에 등록된 인삼 지식을 분류와 검색으로 찾아봅니다." />
      <MascotSpotlight
        title="삼박사가 알려주는 인삼 지식"
        description="서버 연결이 어려울 때도 기본 백과사전으로 주요 기준을 확인할 수 있습니다."
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
            <Text style={styles.assistantTitle}>삼박사 AI 설명 비서</Text>
            <Text style={styles.assistantMeta}>{selectedEntry ? `${selectedEntry.title} 기준으로 답변` : '전체 백과사전 기준으로 답변'}</Text>
          </View>
        </View>
        <View style={styles.questionRow}>
          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder="예: 수삼 등급은 어떻게 보나요?"
            placeholderTextColor={colors.gray40}
            style={styles.questionInput}
            multiline
          />
          <TouchableOpacity style={styles.askButton} onPress={handleAsk} disabled={assistantLoading}>
            <Ionicons name="send" size={17} color={colors.white} />
          </TouchableOpacity>
        </View>
        {answer ? <Text style={styles.answerText}>{answer}</Text> : null}
        {googleSearchUrl ? (
          <TouchableOpacity style={styles.googleButton} onPress={() => Linking.openURL(googleSearchUrl)}>
            <Ionicons name="logo-google" size={16} color={colors.primary60} />
            <Text style={styles.googleButtonText}>Google AI 검색으로 보기</Text>
          </TouchableOpacity>
        ) : null}
      </Panel>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>백과 항목</Text>
        <Text style={styles.listCount}>{loading ? '불러오는 중' : `${entries.length}개`}</Text>
      </View>

      {entries.length === 0 ? (
        <Panel tone="light">
          <Text style={styles.noticeTitle}>검색 결과가 없습니다</Text>
          <Text style={styles.noticeText}>다른 검색어나 분류를 선택해 주세요.</Text>
        </Panel>
      ) : (
        entries.map((entry) => (
          <TouchableOpacity key={entry.id} activeOpacity={0.86} onPress={() => setSelectedEntry(entry)}>
            <Panel style={selectedEntry?.id === entry.id ? styles.selectedPanel : undefined}>
              <View style={styles.row}>
                <View style={styles.iconBox}>
                  <Ionicons name="library" size={18} color={colors.white} />
                </View>
                <View style={styles.content}>
                  <Text style={styles.tag}>{entry.category}</Text>
                  <Text style={styles.title}>{entry.title}</Text>
                  <Text style={styles.summary}>{entry.summary}</Text>
                  <Text style={styles.text}>{entry.body}</Text>
                  <View style={styles.tagRow}>
                    {entry.tags.map((tag) => (
                      <Text key={tag} style={styles.smallTag}>#{tag}</Text>
                    ))}
                  </View>
                </View>
              </View>
            </Panel>
          </TouchableOpacity>
        ))
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
  tag: { color: colors.primary60, fontSize: 13, lineHeight: 20, fontWeight: '700', marginBottom: 5 },
  title: { color: colors.cream, fontSize: 17, lineHeight: 26, fontWeight: '700', marginBottom: 6 },
  summary: { color: colors.gray70, fontSize: 14, lineHeight: 21, fontWeight: '700', marginBottom: 8 },
  text: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  smallTag: { color: colors.primary60, fontSize: 12, lineHeight: 18, fontWeight: '700' },
});

export default EncyclopediaScreen;
