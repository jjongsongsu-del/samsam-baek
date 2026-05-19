import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import {
  Alert,
  Animated,
  Image,
  Linking,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppSurface } from '../components/AppSurface';
import { Panel } from '../components/Panel';
import { ScreenHeader } from '../components/ScreenHeader';
import {
  consumeInspectionUse,
  loadAccountState,
  type AccountState,
} from '../services/accountService';
import {
  deleteInspectionRecord,
  loadInspectionHistory,
  saveInspectionRecord,
  type SavedInspection,
} from '../services/inspectionHistoryService';
import { type DetectionBox, inspectGinsengImage, InspectionServiceError, type InspectionResult } from '../services/inspectionService';
import { fetchPricePrediction, type PricePrediction } from '../services/priceService';
import { colors } from '../theme';

type ImageSource = 'mobile-camera' | 'photo-library';
type ActiveView = 'source' | 'capture' | 'result' | 'history' | 'detail';
type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

type PendingImage = {
  uri: string;
  base64: string;
  width: number;
  height: number;
  source: ImageSource;
};

type SelectionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type StageSize = {
  width: number;
  height: number;
};

const CONTACT_EMAIL = 'support@samsambaekgwa.kr';
const mascotImage = require('../../samsam-i.png');
const DEFAULT_SELECTION: SelectionRect = { x: 0.12, y: 0.12, width: 0.76, height: 0.76 };
const MIN_SELECTION_SIZE = 0.16;
const TIPS = [
  '좋은 판독 사진은 인삼 전체가 화면 안에 들어오고 배경이 단순할수록 정확도가 올라갑니다.',
  '몸통과 다리 경계가 잘 보이면 연근과 등급을 더 안정적으로 추정할 수 있습니다.',
  '역광이나 그림자가 강하면 판독이 어려울 수 있어 밝은 곳에서 다시 촬영해 주세요.',
  '흙이나 포장재가 많이 가리면 인삼 윤곽을 찾기 어려우니 판독 범위를 몸통 중심으로 맞춰주세요.',
];

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

const makeInspectionId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const isUnclearInspection = (inspection: InspectionResult) =>
  inspection.year.includes('불가') || inspection.grade.includes('불가') || (inspection.confidence ?? 1) < 0.12;

const labelAliases: Record<string, string> = {
  body: '몸통',
  head: '머리',
  leg: '다리',
  root: '다리',
  tail: '다리',
  몸통: '몸통',
  머리: '머리',
  다리: '다리',
};

const normalizeBoxLabel = (label: string) => labelAliases[label.toLowerCase()] ?? label;

const summarizeBoxes = (boxes?: DetectionBox[]) => {
  if (!boxes?.length) {
    return [];
  }

  const bestByLabel = new Map<string, DetectionBox>();
  boxes.forEach((box) => {
    const label = normalizeBoxLabel(box.label);
    const current = bestByLabel.get(label);
    if (!current || box.confidence > current.confidence) {
      bestByLabel.set(label, { ...box, label });
    }
  });

  return Array.from(bestByLabel.values()).sort((a, b) => b.confidence - a.confidence);
};

const InspectionScreen = ({ route, navigation }: any) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [cameraReady, setCameraReady] = useState(false);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [selection, setSelection] = useState<SelectionRect>(DEFAULT_SELECTION);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState<ImageSource>('mobile-camera');
  const [result, setResult] = useState<InspectionResult | null>(null);
  const [pricePrediction, setPricePrediction] = useState<PricePrediction | undefined>();
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedInspection[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<SavedInspection | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('source');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [tipIndex, setTipIndex] = useState(0);
  const [stageSize, setStageSize] = useState<StageSize>({ width: 1, height: 1 });
  const [accountState, setAccountState] = useState<AccountState | null>(null);
  const [inspectionError, setInspectionError] = useState<{ title: string; message: string; recoverable: boolean } | null>(null);
  const scanLine = useRef(new Animated.Value(0)).current;
  const cameraRef = useRef<any>(null);
  const scrollRef = useRef<ScrollView>(null);
  const gestureStartSelection = useRef<SelectionRect>(DEFAULT_SELECTION);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    refreshHistory();
    refreshAccount();
  }, []);

  useEffect(() => {
    if (route?.params?.initialView === 'history') {
      setActiveView('history');
      navigation?.setParams?.({ initialView: undefined });
    }
    if (route?.params?.initialView === 'source') {
      startNewInspection();
      navigation?.setParams?.({ initialView: undefined });
    }
  }, [navigation, route?.params?.initialView]);

  useFocusEffect(
    useCallback(() => {
      refreshHistory();
      refreshAccount();
      if (route?.params?.initialView === 'history') {
        setActiveView('history');
        navigation?.setParams?.({ initialView: undefined });
      }
      if (route?.params?.initialView === 'source') {
        startNewInspection();
        navigation?.setParams?.({ initialView: undefined });
      }
    }, [navigation, route?.params?.initialView]),
  );

  useEffect(() => {
    if (!loading && !loadingMessage) {
      scanLine.stopAnimation();
      scanLine.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, { toValue: 1, duration: 1550, useNativeDriver: true }),
        Animated.timing(scanLine, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]),
    );
    animation.start();
    const timer = setInterval(() => setTipIndex((current) => (current + 1) % TIPS.length), 3600);

    return () => {
      animation.stop();
      clearInterval(timer);
    };
  }, [loading, loadingMessage, scanLine]);

  const progressTranslateX = scanLine.interpolate({ inputRange: [0, 1], outputRange: [-120, 260] });

  const refreshHistory = async () => {
    setHistory(await loadInspectionHistory());
  };

  const refreshAccount = async () => {
    const state = await loadAccountState();
    setAccountState(state);
  };

  const imageFrame = useMemo(() => {
    if (!pendingImage || stageSize.width <= 1 || stageSize.height <= 1) {
      return { left: 0, top: 0, width: stageSize.width, height: stageSize.height };
    }

    const stageRatio = stageSize.width / stageSize.height;
    const imageRatio = pendingImage.width / pendingImage.height;
    if (imageRatio > stageRatio) {
      const width = stageSize.width;
      const height = width / imageRatio;
      return { left: 0, top: (stageSize.height - height) / 2, width, height };
    }

    const height = stageSize.height;
    const width = height * imageRatio;
    return { left: (stageSize.width - width) / 2, top: 0, width, height };
  }, [pendingImage, stageSize.height, stageSize.width]);

  const setImageForSelection = (image: PendingImage) => {
    setPendingImage(image);
    setSelection(DEFAULT_SELECTION);
    setResult(null);
    setPricePrediction(undefined);
    setSavedRecordId(null);
    setInspectionError(null);
    setPhotoUri(null);
    setImageBase64(null);
    setImageSource(image.source);
    setActiveView('capture');
  };

  const startNewInspection = () => {
    setPendingImage(null);
    setPhotoUri(null);
    setImageBase64(null);
    setResult(null);
    setPricePrediction(undefined);
    setSavedRecordId(null);
    setInspectionError(null);
    setSelectedRecord(null);
    setActiveView('source');
  };

  const updateSelection = (patch: Partial<SelectionRect>) => {
    setSelection((current) => {
      const next = { ...current, ...patch };
      next.width = clamp(next.width, MIN_SELECTION_SIZE, 0.98);
      next.height = clamp(next.height, MIN_SELECTION_SIZE, 0.98);
      next.x = clamp(next.x, 0, 1 - next.width);
      next.y = clamp(next.y, 0, 1 - next.height);
      return next;
    });
  };

  const getSelectionPointFromStage = useCallback(
    (locationX: number, locationY: number) => {
      if (imageFrame.width <= 1 || imageFrame.height <= 1) {
        return null;
      }

      const x = (locationX - imageFrame.left) / imageFrame.width;
      const y = (locationY - imageFrame.top) / imageFrame.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) {
        return null;
      }

      return { x, y };
    },
    [imageFrame.height, imageFrame.left, imageFrame.top, imageFrame.width],
  );

  const isPointInsideSelection = useCallback(
    (point: { x: number; y: number }) =>
      point.x >= selection.x &&
      point.x <= selection.x + selection.width &&
      point.y >= selection.y &&
      point.y <= selection.y + selection.height,
    [selection.height, selection.width, selection.x, selection.y],
  );

  const resizeSelection = (delta: number) => {
    updateSelection({
      x: selection.x - delta / 2,
      y: selection.y - delta / 2,
      width: selection.width + delta,
      height: selection.height + delta,
    });
  };

  const resizeSelectionWidth = (delta: number) => {
    updateSelection({
      x: selection.x - delta / 2,
      width: selection.width + delta,
    });
  };

  const resizeSelectionHeight = (delta: number) => {
    updateSelection({
      y: selection.y - delta / 2,
      height: selection.height + delta,
    });
  };

  const updateSelectionFromHandle = (handle: ResizeHandle, dx: number, dy: number) => {
    const start = gestureStartSelection.current;
    let left = start.x;
    let top = start.y;
    let right = start.x + start.width;
    let bottom = start.y + start.height;

    if (handle.includes('w')) {
      left = clamp(left + dx, 0, right - MIN_SELECTION_SIZE);
    }
    if (handle.includes('e')) {
      right = clamp(right + dx, left + MIN_SELECTION_SIZE, 1);
    }
    if (handle.includes('n')) {
      top = clamp(top + dy, 0, bottom - MIN_SELECTION_SIZE);
    }
    if (handle.includes('s')) {
      bottom = clamp(bottom + dy, top + MIN_SELECTION_SIZE, 1);
    }

    updateSelection({ x: left, y: top, width: right - left, height: bottom - top });
  };

  const moveSelectionResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          gestureStartSelection.current = selection;
        },
        onPanResponderMove: (_, gesture) => {
          if (imageFrame.width <= 1 || imageFrame.height <= 1) {
            return;
          }

          const start = gestureStartSelection.current;
          updateSelection({
            x: start.x + gesture.dx / imageFrame.width,
            y: start.y + gesture.dy / imageFrame.height,
          });
        },
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [imageFrame.height, imageFrame.width, selection],
  );

  const createResizeResponder = (handle: ResizeHandle) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        gestureStartSelection.current = selection;
      },
      onPanResponderMove: (_, gesture) => {
        if (imageFrame.width <= 1 || imageFrame.height <= 1) {
          return;
        }

        updateSelectionFromHandle(handle, gesture.dx / imageFrame.width, gesture.dy / imageFrame.height);
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    });

  const stageSelectionResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (event) => {
          if (!pendingImage) {
            return false;
          }

          const point = getSelectionPointFromStage(event.nativeEvent.locationX, event.nativeEvent.locationY);
          return !!point && !isPointInsideSelection(point);
        },
        onMoveShouldSetPanResponder: (event) => {
          if (!pendingImage) {
            return false;
          }

          const point = getSelectionPointFromStage(event.nativeEvent.locationX, event.nativeEvent.locationY);
          return !!point && !isPointInsideSelection(point);
        },
        onPanResponderGrant: (event) => {
          const point = getSelectionPointFromStage(event.nativeEvent.locationX, event.nativeEvent.locationY);
          if (!point) {
            return;
          }

          const next = {
            x: clamp(point.x - selection.width / 2, 0, 1 - selection.width),
            y: clamp(point.y - selection.height / 2, 0, 1 - selection.height),
            width: selection.width,
            height: selection.height,
          };
          gestureStartSelection.current = next;
          updateSelection(next);
        },
        onPanResponderMove: (_, gesture) => {
          if (imageFrame.width <= 1 || imageFrame.height <= 1) {
            return;
          }

          const start = gestureStartSelection.current;
          updateSelection({
            x: start.x + gesture.dx / imageFrame.width,
            y: start.y + gesture.dy / imageFrame.height,
          });
        },
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
      }),
    [
      getSelectionPointFromStage,
      imageFrame.height,
      imageFrame.width,
      isPointInsideSelection,
      pendingImage,
      selection.height,
      selection.width,
    ],
  );

  const resizeResponders = useMemo(
    () => ({
      n: createResizeResponder('n'),
      s: createResizeResponder('s'),
      e: createResizeResponder('e'),
      w: createResizeResponder('w'),
      nw: createResizeResponder('nw'),
      ne: createResizeResponder('ne'),
      sw: createResizeResponder('sw'),
      se: createResizeResponder('se'),
    }),
    [imageFrame.height, imageFrame.width, selection],
  );

  const analyzeSelectedImage = async () => {
    if (!pendingImage) {
      return;
    }

    setLoading(true);
    setLoadingMessage(null);
    setResult(null);
    setPricePrediction(undefined);
    setSavedRecordId(null);
    setInspectionError(null);
    setTipIndex(0);

    try {
      const usageState = await loadAccountState();
      setAccountState(usageState);
      if (usageState.usage.count >= usageState.limit) {
        Alert.alert(
          '일일 판독 횟수 초과',
          usageState.profile.mode === 'member'
            ? '회원 일일 판독 100회를 모두 사용했습니다. 내일 다시 이용해 주세요.'
            : '비회원 일일 판독 10회를 모두 사용했습니다. SNS 회원가입을 하면 하루 100회까지 판독할 수 있습니다.',
        );
        setActiveView('source');
        return;
      }

      setActiveView('result');
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 96, animated: true }));

      const crop = {
        originX: Math.round(pendingImage.width * selection.x),
        originY: Math.round(pendingImage.height * selection.y),
        width: Math.round(pendingImage.width * selection.width),
        height: Math.round(pendingImage.height * selection.height),
      };
      const cropped = await ImageManipulator.manipulateAsync(
        pendingImage.uri,
        [{ crop }],
        { base64: true, compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
      );
      if (!cropped.base64) {
        throw new Error('선택한 영역 이미지를 만들지 못했습니다. 범위를 다시 조정한 뒤 시도해 주세요.');
      }

      const base64 = cropped.base64;
      const inspection = await inspectGinsengImage(base64, pendingImage.source);
      let price: PricePrediction | undefined;
      try {
        price = await fetchPricePrediction(inspection.priceGradeCode);
      } catch {
        price = undefined;
      }
      const usageResult = await consumeInspectionUse();
      setAccountState(usageResult.state);

      setPhotoUri(cropped.uri);
      setImageBase64(base64);
      setImageSource(pendingImage.source);
      setResult(inspection);
      setPricePrediction(price);
      setPendingImage(null);
    } catch (error: any) {
      setActiveView('capture');
      const recoverable =
        error instanceof InspectionServiceError &&
        ['network', 'timeout', 'server', 'unavailable', 'unknown'].includes(error.code);
      setInspectionError({
        title: recoverable ? 'AI 서버 연결 실패' : '판독 실패',
        message: error.message || '이미지 판독 중 오류가 발생했습니다. 다시 시도해 주세요.',
        recoverable,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current || !cameraReady) {
      return;
    }

    setLoadingMessage('삼박사가 촬영 이미지를 불러오는 중입니다.');
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.82, base64: true });
      if (!photo.base64) {
        throw new Error('사진 데이터를 읽을 수 없습니다. 다시 촬영해 주세요.');
      }
      setImageForSelection({
        uri: photo.uri,
        base64: photo.base64,
        width: photo.width,
        height: photo.height,
        source: 'mobile-camera',
      });
    } catch (error: any) {
      Alert.alert('촬영 실패', error.message || '사진 촬영 중 오류가 발생했습니다.');
    } finally {
      setLoadingMessage(null);
    }
  };

  const handlePickPhoto = async () => {
    try {
      if (Platform.OS !== 'web') {
        const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!libraryPermission.granted) {
          Alert.alert('사진첩 권한 필요', '사진첩에서 인삼 사진을 선택하려면 접근 권한이 필요합니다.');
          return;
        }
      }

      setLoadingMessage('삼박사가 사진첩 이미지를 불러오는 중입니다.');
      const selectionResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.82,
        allowsEditing: false,
      });

      if (selectionResult.canceled) {
        return;
      }

      const asset = selectionResult.assets[0];
      if (!asset?.base64 || !asset.uri) {
        throw new Error('선택한 사진 데이터를 읽을 수 없습니다. 다른 사진을 선택해 주세요.');
      }

      setImageForSelection({
        uri: asset.uri,
        base64: asset.base64,
        width: asset.width ?? 1200,
        height: asset.height ?? 1200,
        source: 'photo-library',
      });
    } catch (error: any) {
      Alert.alert('사진 선택 실패', error.message || '사진첩 이미지를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingMessage(null);
    }
  };

  const handleSaveCurrent = async () => {
    if (!photoUri || !imageBase64 || !result) {
      return;
    }

    const record: SavedInspection = {
      id: savedRecordId ?? makeInspectionId(),
      createdAt: new Date().toISOString(),
      imageUri: photoUri,
      imageBase64,
      source: imageSource,
      result,
      pricePrediction,
    };

    const nextHistory = await saveInspectionRecord(record);
    setHistory(nextHistory);
    setSavedRecordId(record.id);
    setSelectedRecord(record);
    Alert.alert('저장 완료', '판독 결과가 저장되었습니다.');
  };

  const handleDeleteRecord = (record: SavedInspection) => {
    Alert.alert('판독 결과 삭제', '저장된 판독 결과를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const nextHistory = await deleteInspectionRecord(record.id);
          setHistory(nextHistory);
          if (selectedRecord?.id === record.id) {
            setSelectedRecord(null);
            setActiveView('history');
          }
          if (savedRecordId === record.id) {
            setSavedRecordId(null);
          }
        },
      },
    ]);
  };

  const handleClearCurrent = () => {
    setPendingImage(null);
    setPhotoUri(null);
    setImageBase64(null);
    setResult(null);
    setPricePrediction(undefined);
    setSavedRecordId(null);
    setInspectionError(null);
    setActiveView('source');
  };

  const handleReinspect = async (record?: SavedInspection) => {
    setSelectedRecord(record ?? null);
    startNewInspection();
  };

  const handleOpenMail = async (record?: SavedInspection) => {
    const targetResult = record?.result ?? result;
    const targetPrice = record?.pricePrediction ?? pricePrediction;
    const subject = encodeURIComponent('삼박사 판독 결과 문의');
    const body = encodeURIComponent(
      [
        '판독 결과에 대해 문의합니다.',
        '',
        `연근: ${targetResult?.year ?? '-'}`,
        `등급: ${targetResult?.grade ?? '-'}`,
        `신뢰도: ${targetResult?.confidence !== undefined ? `${(targetResult.confidence * 100).toFixed(1)}%` : '-'}`,
        `가격 등급 코드: ${targetResult?.priceGradeCode ?? '-'}`,
        `시세 기준: ${targetPrice?.quarters?.map((item) => `${item.quarter} ${item.avgPc.toLocaleString('ko-KR')}원`).join(', ') ?? '-'}`,
        '',
        '문제 상황을 적어 주세요.',
      ].join('\n'),
    );
    const url = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('메일 앱 없음', '이 기기에서 메일 앱을 열 수 없습니다.');
    }
  };

  const openDetail = (record: SavedInspection) => {
    setSelectedRecord(record);
    setActiveView('detail');
  };

  const hasUnclearResult = useMemo(() => (result ? isUnclearInspection(result) : false), [result]);
  const inspectionViewActive = activeView === 'source' || activeView === 'capture' || activeView === 'result';

  const renderViewSwitcher = () => (
    <View style={styles.switcher}>
      <TouchableOpacity
        style={[styles.switchButton, inspectionViewActive ? styles.switchButtonActive : null]}
        onPress={startNewInspection}
      >
        <Ionicons name="scan" size={16} color={inspectionViewActive ? colors.white : colors.primary60} />
        <Text style={[styles.switchText, inspectionViewActive ? styles.switchTextActive : null]}>새 판독</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.switchButton, !inspectionViewActive ? styles.switchButtonActive : null]}
        onPress={() => setActiveView('history')}
      >
        <Ionicons name="list" size={16} color={!inspectionViewActive ? colors.white : colors.primary60} />
        <Text style={[styles.switchText, !inspectionViewActive ? styles.switchTextActive : null]}>저장 목록</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingPanel = () => {
    if (!loading && !loadingMessage) {
      return null;
    }

    return (
      <Panel tone="accent">
        <View style={styles.loadingHeader}>
          <Image source={mascotImage} style={styles.loadingMascot} resizeMode="contain" />
          <View style={styles.loadingCopy}>
            <Text style={styles.panelTitle}>{loadingMessage ?? '삼박사가 이미지를 스캔 중입니다'}</Text>
            <Text style={styles.loadingText}>{loading ? TIPS[tipIndex] : '잠시만 기다려 주세요. 사진이 크면 불러오는 데 시간이 걸릴 수 있습니다.'}</Text>
          </View>
        </View>
        <View style={styles.progressPanel}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { transform: [{ translateX: progressTranslateX }] }]} />
          </View>
          <Text style={styles.progressText}>AI 판독을 진행 중입니다</Text>
        </View>
      </Panel>
    );
  };

  const renderHandle = (handle: ResizeHandle, style: any, icon: string) => (
    <View {...resizeResponders[handle].panHandlers} hitSlop={12} style={[styles.selectionHandle, style]}>
      <Ionicons name={icon as any} size={14} color={colors.white} />
    </View>
  );

  const renderEdgeDrag = (handle: ResizeHandle, style: any) => (
    <View {...resizeResponders[handle].panHandlers} style={[styles.selectionEdgeDrag, style]} />
  );

  const renderInspectionError = () => {
    if (!inspectionError) {
      return null;
    }

    return (
      <Panel tone="light">
        <Text style={styles.errorTitle}>{inspectionError.title}</Text>
        <Text style={styles.lightText}>{inspectionError.message}</Text>
        <View style={styles.errorActions}>
          {inspectionError.recoverable ? (
            <TouchableOpacity style={styles.accountButton} onPress={analyzeSelectedImage} disabled={loading}>
              <Ionicons name="refresh" size={16} color={colors.primary60} />
              <Text style={styles.accountButtonText}>다시 시도</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={[styles.accountButton, styles.deleteButton]} onPress={handleClearCurrent}>
            <Ionicons name="images" size={16} color={colors.danger60} />
            <Text style={styles.deleteText}>사진 다시 선택</Text>
          </TouchableOpacity>
        </View>
      </Panel>
    );
  };

  const renderSelectionEditor = () => {
    if (!pendingImage) {
      return null;
    }

    return (
      <Panel>
        <Text style={styles.panelTitle}>판독 대상 범위 선택</Text>
        <Text style={styles.helperText}>파란 박스 안쪽을 끌면 이동하고, 네 변이나 모서리를 끌면 크기를 자유롭게 조절할 수 있습니다.</Text>
        <View
          {...stageSelectionResponder.panHandlers}
          style={styles.selectionStage}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setStageSize({ width: Math.max(width, 1), height: Math.max(height, 1) });
          }}
        >
          <Image source={{ uri: pendingImage.uri }} style={styles.selectionImage} resizeMode="contain" />
          <View
            {...moveSelectionResponder.panHandlers}
            style={[
              styles.selectionBox,
              {
                left: imageFrame.left + imageFrame.width * selection.x,
                top: imageFrame.top + imageFrame.height * selection.y,
                width: imageFrame.width * selection.width,
                height: imageFrame.height * selection.height,
              },
            ]}
          >
            {renderEdgeDrag('n', styles.edgeN)}
            {renderEdgeDrag('s', styles.edgeS)}
            {renderEdgeDrag('w', styles.edgeW)}
            {renderEdgeDrag('e', styles.edgeE)}
            <View style={styles.selectionDragHint}>
              <Ionicons name="move" size={18} color={colors.white} />
              <Text style={styles.selectionDragText}>이동</Text>
            </View>
            {renderHandle('n', styles.handleN, 'remove')}
            {renderHandle('s', styles.handleS, 'remove')}
            {renderHandle('w', styles.handleW, 'remove')}
            {renderHandle('e', styles.handleE, 'remove')}
            {renderHandle('nw', styles.handleNW, 'resize')}
            {renderHandle('ne', styles.handleNE, 'resize')}
            {renderHandle('sw', styles.handleSW, 'resize')}
            {renderHandle('se', styles.handleSE, 'resize')}
          </View>
        </View>
        <View style={styles.rangeGrid}>
          <TouchableOpacity style={styles.smallButton} onPress={() => updateSelection({ y: selection.y - 0.04 })}>
            <Ionicons name="arrow-up" size={18} color={colors.primary60} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallButton} onPress={() => updateSelection({ x: selection.x - 0.04 })}>
            <Ionicons name="arrow-back" size={18} color={colors.primary60} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallButton} onPress={() => updateSelection({ x: selection.x + 0.04 })}>
            <Ionicons name="arrow-forward" size={18} color={colors.primary60} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallButton} onPress={() => updateSelection({ y: selection.y + 0.04 })}>
            <Ionicons name="arrow-down" size={18} color={colors.primary60} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallButton} onPress={() => resizeSelection(-0.08)}>
            <Ionicons name="remove" size={18} color={colors.primary60} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallButton} onPress={() => resizeSelection(0.08)}>
            <Ionicons name="add" size={18} color={colors.primary60} />
          </TouchableOpacity>
        </View>
        <View style={styles.axisGrid}>
          <TouchableOpacity style={styles.axisButton} onPress={() => resizeSelectionWidth(-0.08)}>
            <Ionicons name="remove" size={16} color={colors.primary60} />
            <Text style={styles.axisButtonText}>좌우 축소</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.axisButton} onPress={() => resizeSelectionWidth(0.08)}>
            <Ionicons name="resize" size={16} color={colors.primary60} />
            <Text style={styles.axisButtonText}>좌우 확대</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.axisButton} onPress={() => resizeSelectionHeight(-0.08)}>
            <Ionicons name="remove" size={16} color={colors.primary60} />
            <Text style={styles.axisButtonText}>상하 축소</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.axisButton} onPress={() => resizeSelectionHeight(0.08)}>
            <Ionicons name="resize" size={16} color={colors.primary60} />
            <Text style={styles.axisButtonText}>상하 확대</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleClearCurrent} disabled={loading}>
            <Ionicons name="images" size={18} color={colors.primary60} />
            <Text style={styles.secondaryButtonText}>다시 선택</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={analyzeSelectedImage} disabled={loading}>
            <Ionicons name="scan" size={18} color={colors.white} />
            <Text style={styles.primaryButtonText}>판독 실행</Text>
          </TouchableOpacity>
        </View>
      </Panel>
    );
  };

  const renderDetectionDetails = (inspection: InspectionResult) => {
    const details = summarizeBoxes(inspection.boxes);
    if (!details.length) {
      return (
        <Panel tone="light">
          <Text style={styles.lightTitle}>상세 판독 정보</Text>
          <Text style={styles.lightText}>몸통이나 다리처럼 구분 가능한 부위가 충분히 감지되지 않았습니다. 배경을 단순하게 하고 인삼 전체가 보이도록 다시 촬영해 주세요.</Text>
        </Panel>
      );
    }

    return (
      <Panel tone="light">
        <Text style={styles.lightTitle}>상세 판독 정보</Text>
        <Text style={styles.lightText}>모델이 감지한 주요 부위의 신뢰도입니다.</Text>
        <View style={styles.detailList}>
          {details.map((box) => (
            <View key={`${box.label}-${box.confidence}`} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{box.label}</Text>
              <Text style={styles.detailValue}>{(box.confidence * 100).toFixed(1)}%</Text>
            </View>
          ))}
        </View>
      </Panel>
    );
  };

  const renderPricePanel = (price?: PricePrediction) => {
    if (!price?.quarters?.length) {
      return (
        <Panel tone="light">
          <Text style={styles.lightTitle}>연계 시세</Text>
          <Text style={styles.lightText}>판독 등급과 연결된 가격 정보가 아직 없습니다.</Text>
        </Panel>
      );
    }

    const current = price.quarters[price.quarters.length - 1];
    return (
      <Panel tone="light">
        <View style={styles.priceHeader}>
          <View>
            <Text style={styles.lightTitle}>연계 시세</Text>
            <Text style={styles.lightText}>가격 등급 코드 {price.selectedGrade}</Text>
          </View>
          <Text style={styles.priceValue}>{current.avgPc.toLocaleString('ko-KR')}원</Text>
        </View>
        <View style={styles.quarterRow}>
          {price.quarters.slice(-2).map((item) => (
            <View key={item.quarter} style={styles.quarterItem}>
              <Text style={styles.quarterLabel}>{item.quarter}</Text>
              <Text style={styles.quarterValue}>{item.avgPc.toLocaleString('ko-KR')}원</Text>
            </View>
          ))}
        </View>
      </Panel>
    );
  };

  const renderResultPanel = (inspection: InspectionResult, price?: PricePrediction, savedRecord?: SavedInspection) => {
    const unclear = isUnclearInspection(inspection);
    return (
      <>
        <Panel tone="accent">
          <Text style={styles.panelTitle}>판독 결과</Text>
          <View style={styles.resultGrid}>
            <View style={styles.resultCell}>
              <Text style={styles.resultLabel}>연근</Text>
              <Text style={styles.resultValue}>{inspection.year}</Text>
            </View>
            <View style={styles.resultCell}>
              <Text style={styles.resultLabel}>등급</Text>
              <Text style={styles.resultValue}>{inspection.grade}</Text>
            </View>
          </View>
          {inspection.confidence !== undefined ? (
            <Text style={styles.confidence}>신뢰도 {(inspection.confidence * 100).toFixed(1)}%</Text>
          ) : null}
          {inspection.priceGradeCode ? <Text style={styles.confidence}>가격 등급 코드 {inspection.priceGradeCode}</Text> : null}
        </Panel>
        {unclear ? renderDetectionDetails(inspection) : null}
        {unclear && !savedRecord ? (
          <Panel tone="light">
            <Text style={styles.lightTitle}>다시 촬영해 보세요</Text>
            <Text style={styles.lightText}>인삼 전체가 잘리지 않게 놓고, 배경을 단순하게 맞춘 뒤 판독 범위를 다시 지정하면 결과가 좋아질 수 있습니다.</Text>
            <TouchableOpacity style={styles.guideButton} onPress={handleClearCurrent}>
              <Ionicons name="camera" size={17} color={colors.primary60} />
              <Text style={styles.guideButtonText}>새 사진으로 다시 판독</Text>
            </TouchableOpacity>
          </Panel>
        ) : null}
        {renderPricePanel(price)}
        <View style={styles.actionGrid}>
          {!savedRecord ? (
            <TouchableOpacity style={styles.actionButton} onPress={handleSaveCurrent} disabled={!result}>
              <Ionicons name="save" size={17} color={colors.primary60} />
              <Text style={styles.actionText}>{savedRecordId ? '다시 저장' : '결과 저장'}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.actionButton} onPress={() => handleReinspect(savedRecord)}>
            <Ionicons name="refresh" size={17} color={colors.primary60} />
            <Text style={styles.actionText}>재판독</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleOpenMail(savedRecord)}>
            <Ionicons name="mail" size={17} color={colors.primary60} />
            <Text style={styles.actionText}>문의하기</Text>
          </TouchableOpacity>
          {savedRecord ? (
            <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDeleteRecord(savedRecord)}>
              <Ionicons name="trash" size={17} color={colors.danger60} />
              <Text style={styles.deleteText}>삭제</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleClearCurrent}>
              <Ionicons name="close-circle" size={17} color={colors.danger60} />
              <Text style={styles.deleteText}>결과 지우기</Text>
            </TouchableOpacity>
          )}
        </View>
      </>
    );
  };

  const renderAccountPanel = () => {
    if (!accountState) {
      return null;
    }

    const { profile, usage, limit, remaining } = accountState;
    const isMember = profile.mode === 'member';

    return (
      <Panel tone="light">
        <View style={styles.accountHeader}>
          <View>
            <Text style={styles.lightTitle}>{isMember ? '회원 판독 이용 현황' : '비회원 판독 이용 현황'}</Text>
            <Text style={styles.lightText}>오늘 {usage.count}/{limit}회 사용, 남은 {remaining}회</Text>
          </View>
          <View style={styles.usageBadge}>
            <Text style={styles.usageBadgeText}>{remaining}회</Text>
          </View>
        </View>

        <Text style={styles.accountMeta}>{isMember ? `${profile.provider?.toUpperCase() ?? 'SNS'} 회원` : '사용자 메뉴에서 소셜 계정을 연결할 수 있습니다.'}</Text>
      </Panel>
    );
  };

  const renderSourceSelection = () => (
    <>
      {renderAccountPanel()}
      <Panel>
        <Text style={styles.panelTitle}>판독할 사진 선택</Text>
        <Text style={styles.helperText}>새로 촬영하거나 사진첩에서 인삼 이미지를 골라 판독 범위를 지정해 주세요.</Text>
        <View style={styles.sourceGrid}>
          <TouchableOpacity style={styles.sourceButton} onPress={() => setActiveView('capture')} disabled={loading || !!loadingMessage}>
            <Ionicons name="camera" size={24} color={colors.primary60} />
            <Text style={styles.sourceTitle}>사진 촬영</Text>
            <Text style={styles.sourceText}>카메라로 바로 찍기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sourceButton} onPress={handlePickPhoto} disabled={loading || !!loadingMessage}>
            <Ionicons name="images" size={24} color={colors.primary60} />
            <Text style={styles.sourceTitle}>갤러리 선택</Text>
            <Text style={styles.sourceText}>저장된 사진 불러오기</Text>
          </TouchableOpacity>
        </View>
      </Panel>
      {renderLoadingPanel()}
      <Panel tone="light">
        <Text style={styles.lightTitle}>사진 선택 팁</Text>
        <Text style={styles.lightText}>인삼 전체가 잘리지 않게 담고, 판독할 대상이 잘 보이는 사진을 선택해 주세요. 다음 단계에서 범위를 다시 조정할 수 있습니다.</Text>
      </Panel>
    </>
  );

  const renderResult = () => {
    if (loading || loadingMessage) {
      return renderLoadingPanel();
    }

    if (!result) {
      return renderSourceSelection();
    }

    return renderResultPanel(result, pricePrediction);
  };

  const renderCapture = () => {
    if (!permission?.granted) {
      return (
        <View style={styles.permissionWrap}>
          <Ionicons name="camera" size={42} color={colors.mint} />
          <Text style={styles.permissionTitle}>카메라 권한이 필요합니다</Text>
          <Text style={styles.permissionText}>사진 촬영 판독을 위해 카메라 접근을 허용해 주세요. 사진첩 선택은 바로 사용할 수 있습니다.</Text>
          <View style={styles.permissionActions}>
            <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
              <Text style={styles.primaryButtonText}>권한 요청</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.libraryButton} onPress={handlePickPhoto} disabled={loading || !!loadingMessage}>
              <Ionicons name="images" size={18} color={colors.primary60} />
              <Text style={styles.libraryButtonText}>사진첩에서 선택</Text>
            </TouchableOpacity>
          </View>
          {renderLoadingPanel()}
        </View>
      );
    }

    return (
      <>
        {pendingImage ? null : (
          <>
            <View style={styles.cameraFrame}>
              {Platform.OS === 'web' ? (
                <View style={styles.webFallback}>
                  <Ionicons name="phone-portrait" size={36} color={colors.mint} />
                  <Text style={styles.webText}>모바일 앱에서 카메라 판독을 확인해 주세요.</Text>
                </View>
              ) : (
                <CameraView
                  ref={(ref) => {
                    cameraRef.current = ref;
                  }}
                  style={styles.camera}
                  facing={cameraType}
                  onCameraReady={() => setCameraReady(true)}
                />
              )}
              <View style={styles.scanGuide} />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setCameraType((current) => (current === 'back' ? 'front' : 'back'))}>
                <Ionicons name="camera-reverse" size={18} color={colors.primary60} />
                <Text style={styles.secondaryButtonText}>전환</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleTakePhoto} disabled={loading || !!loadingMessage || Platform.OS === 'web'}>
                <Ionicons name="scan" size={18} color={colors.white} />
                <Text style={styles.primaryButtonText}>촬영 후 범위 선택</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.libraryButton} onPress={handlePickPhoto} disabled={loading || !!loadingMessage}>
              <Ionicons name="images" size={18} color={colors.primary60} />
              <Text style={styles.libraryButtonText}>사진첩에서 선택해 판독</Text>
            </TouchableOpacity>
          </>
        )}

        {renderInspectionError()}
        {renderSelectionEditor()}
        {renderLoadingPanel()}

        <Panel tone="light">
          <Text style={styles.lightTitle}>사진 선택 팁</Text>
          <Text style={styles.lightText}>인삼 전체가 잘리지 않게 담고, 박스로 판독 대상만 지정해 주세요. 조명이 고르고 배경이 단순할수록 정확도가 좋아집니다.</Text>
        </Panel>
      </>
    );
  };

  const renderHistory = () => (
    <>
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>최근 판독 결과</Text>
        <Text style={styles.historyCount}>{history.length}/20</Text>
      </View>
      {history.length === 0 ? (
        <Panel tone="light">
          <Text style={styles.lightTitle}>저장된 결과가 없습니다</Text>
          <Text style={styles.lightText}>판독 후 결과 저장을 누르면 최근 20개까지 이곳에서 다시 볼 수 있습니다.</Text>
        </Panel>
      ) : (
        history.map((record) => (
          <TouchableOpacity key={record.id} onPress={() => openDetail(record)} activeOpacity={0.85}>
            <Panel>
              <View style={styles.historyRow}>
                <Image source={{ uri: record.imageUri }} style={styles.historyImage} />
                <View style={styles.historyBody}>
                  <Text style={styles.historyItemTitle}>
                    {record.result.year} / {record.result.grade}
                  </Text>
                  <Text style={styles.historyMeta}>{formatDateTime(record.createdAt)}</Text>
                  <Text style={styles.historyMeta}>
                    {record.pricePrediction?.quarters?.at(-1)?.avgPc
                      ? `${record.pricePrediction.quarters.at(-1)?.avgPc.toLocaleString('ko-KR')}원`
                      : '시세 정보 없음'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.gray40} />
              </View>
            </Panel>
          </TouchableOpacity>
        ))
      )}
    </>
  );

  const renderDetail = () => {
    if (!selectedRecord) {
      return renderHistory();
    }

    return (
      <>
        <TouchableOpacity style={styles.backButton} onPress={() => setActiveView('history')}>
          <Ionicons name="arrow-back" size={18} color={colors.primary60} />
          <Text style={styles.backButtonText}>목록으로</Text>
        </TouchableOpacity>
        <Panel>
          <Text style={styles.panelTitle}>저장된 판독 이미지</Text>
          <Text style={styles.historyMeta}>{formatDateTime(selectedRecord.createdAt)}</Text>
          <Image source={{ uri: selectedRecord.imageUri }} style={styles.previewImage} />
        </Panel>
        {renderResultPanel(selectedRecord.result, selectedRecord.pricePrediction, selectedRecord)}
      </>
    );
  };

  return (
    <AppSurface scrollRef={scrollRef}>
      <ScreenHeader title="AI 인삼 판독" description="촬영 또는 사진첩 이미지에서 판독 범위를 선택하고, 연근과 등급을 분석해 저장할 수 있습니다." />
      {renderViewSwitcher()}
      {activeView === 'source'
        ? renderSourceSelection()
        : activeView === 'capture'
          ? renderCapture()
          : activeView === 'result'
            ? renderResult()
            : activeView === 'history'
              ? renderHistory()
              : renderDetail()}
    </AppSurface>
  );
};

const styles = StyleSheet.create({
  switcher: {
    flexDirection: 'row',
    backgroundColor: colors.primary5,
    borderColor: colors.primary10,
    borderWidth: 1,
    borderRadius: 6,
    padding: 4,
    marginBottom: 14,
  },
  switchButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    borderRadius: 4,
  },
  switchButtonActive: { backgroundColor: colors.primary60 },
  switchText: { color: colors.primary60, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  switchTextActive: { color: colors.white },
  permissionWrap: { alignItems: 'center', justifyContent: 'center', padding: 28 },
  permissionActions: { alignSelf: 'stretch', gap: 10 },
  permissionTitle: { color: colors.cream, fontSize: 22, lineHeight: 33, fontWeight: '700', marginTop: 18 },
  permissionText: { color: colors.muted, fontSize: 15, lineHeight: 23, textAlign: 'center', marginVertical: 14 },
  cameraFrame: {
    height: 390,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#000',
    marginBottom: 14,
  },
  camera: { flex: 1 },
  scanGuide: {
    position: 'absolute',
    left: 34,
    right: 34,
    top: 56,
    bottom: 56,
    borderWidth: 2,
    borderColor: colors.primary50,
    borderRadius: 18,
  },
  webFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.forest },
  webText: { color: colors.muted, fontSize: 15, lineHeight: 23, fontWeight: '700' },
  buttonRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  primaryButton: {
    flex: 1,
    minHeight: 52,
    backgroundColor: colors.mint,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: { color: colors.white, fontSize: 15, lineHeight: 23, fontWeight: '700' },
  secondaryButton: {
    flex: 1,
    minHeight: 52,
    backgroundColor: colors.forest,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonText: { color: colors.primary60, fontSize: 15, lineHeight: 23, fontWeight: '700' },
  libraryButton: {
    minHeight: 50,
    backgroundColor: colors.gray0,
    borderColor: colors.primary10,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  libraryButtonText: { color: colors.primary60, fontSize: 15, lineHeight: 23, fontWeight: '700' },
  sourceGrid: { flexDirection: 'row', gap: 10 },
  sourceButton: {
    flex: 1,
    minHeight: 132,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary10,
    backgroundColor: colors.primary5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  sourceTitle: { color: colors.ink, fontSize: 16, lineHeight: 24, fontWeight: '700', marginTop: 10 },
  sourceText: { color: colors.gray60, fontSize: 12, lineHeight: 18, marginTop: 2, textAlign: 'center' },
  accountHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 },
  usageBadge: {
    minWidth: 58,
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: colors.primary5,
    borderColor: colors.primary10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  usageBadgeText: { color: colors.primary60, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  accountMeta: { color: colors.gray60, fontSize: 12, lineHeight: 18, marginBottom: 8 },
  profileInput: {
    minHeight: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary10,
    backgroundColor: colors.gray0,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 21,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  accountActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  accountButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary10,
    backgroundColor: colors.gray0,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  accountButtonText: { color: colors.primary60, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  socialRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  socialButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 6,
    backgroundColor: colors.primary60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialButtonText: { color: colors.white, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  errorTitle: { color: colors.danger60, fontSize: 16, lineHeight: 24, fontWeight: '700', marginBottom: 6 },
  errorActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  panelTitle: { color: colors.cream, fontSize: 16, lineHeight: 24, fontWeight: '700', marginBottom: 10 },
  helperText: { color: colors.muted, fontSize: 13, lineHeight: 20, marginBottom: 12 },
  selectionStage: {
    height: 290,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: colors.gray100,
    marginBottom: 12,
  },
  selectionImage: { width: '100%', height: '100%' },
  selectionBox: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: colors.primary50,
    backgroundColor: 'rgba(37, 110, 244, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionDragHint: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
    backgroundColor: 'rgba(29, 86, 197, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  selectionDragText: { color: colors.white, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  selectionHandle: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary60,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  selectionEdgeDrag: {
    position: 'absolute',
    zIndex: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.001)',
  },
  edgeN: { left: 26, right: 26, top: -16, height: 32 },
  edgeS: { left: 26, right: 26, bottom: -16, height: 32 },
  edgeW: { top: 26, bottom: 26, left: -16, width: 32 },
  edgeE: { top: 26, bottom: 26, right: -16, width: 32 },
  handleN: { top: -21, left: '50%', marginLeft: -21 },
  handleS: { bottom: -21, left: '50%', marginLeft: -21 },
  handleW: { left: -21, top: '50%', marginTop: -21 },
  handleE: { right: -21, top: '50%', marginTop: -21 },
  handleNW: { left: -21, top: -21 },
  handleNE: { right: -21, top: -21 },
  handleSW: { left: -21, bottom: -21 },
  handleSE: { right: -21, bottom: -21 },
  rangeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  smallButton: {
    width: '31.8%',
    minHeight: 40,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary10,
    backgroundColor: colors.primary5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  axisGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  axisButton: {
    flexGrow: 1,
    flexBasis: '47%',
    minHeight: 42,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary10,
    backgroundColor: colors.gray0,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  axisButtonText: { color: colors.primary60, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  progressPanel: {
    marginTop: 10,
    paddingVertical: 12,
    gap: 8,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  progressFill: {
    width: 120,
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.mint,
  },
  progressText: { color: colors.muted, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  loadingHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  loadingMascot: { width: 58, height: 70 },
  loadingCopy: { flex: 1 },
  loadingText: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  previewImage: { width: '100%', height: 220, borderRadius: 10, marginTop: 8 },
  resultGrid: { flexDirection: 'row', gap: 10 },
  resultCell: { flex: 1, backgroundColor: colors.gray0, borderColor: colors.primary10, borderWidth: 1, borderRadius: 8, padding: 14 },
  resultLabel: { color: colors.muted, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  resultValue: { color: colors.cream, fontSize: 24, lineHeight: 36, fontWeight: '700', marginTop: 4 },
  confidence: { color: colors.primary60, fontSize: 13, lineHeight: 20, fontWeight: '700', marginTop: 12 },
  detailList: { gap: 8, marginTop: 12 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.secondary10,
    backgroundColor: colors.gray0,
    borderRadius: 6,
    padding: 10,
  },
  detailLabel: { color: colors.ink, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  detailValue: { color: colors.primary60, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  lightTitle: { color: colors.ink, fontSize: 16, lineHeight: 24, fontWeight: '700', marginBottom: 6 },
  lightText: { color: colors.gray60, fontSize: 13, lineHeight: 20, fontWeight: '400' },
  guideButton: {
    minHeight: 42,
    marginTop: 12,
    borderRadius: 6,
    backgroundColor: colors.primary5,
    borderWidth: 1,
    borderColor: colors.primary10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  guideButtonText: { color: colors.primary60, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  priceHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  priceValue: { color: colors.success60, fontSize: 22, lineHeight: 32, fontWeight: '700' },
  quarterRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  quarterItem: { flex: 1, backgroundColor: colors.gray0, borderRadius: 6, borderWidth: 1, borderColor: colors.secondary10, padding: 10 },
  quarterLabel: { color: colors.gray60, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  quarterValue: { color: colors.ink, fontSize: 15, lineHeight: 23, fontWeight: '700', marginTop: 4 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  actionButton: {
    flexGrow: 1,
    flexBasis: '47%',
    minHeight: 46,
    backgroundColor: colors.gray0,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  actionText: { color: colors.primary60, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  deleteButton: { borderColor: colors.danger5, backgroundColor: colors.danger5 },
  deleteText: { color: colors.danger60, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  historyTitle: { color: colors.ink, fontSize: 18, lineHeight: 27, fontWeight: '700' },
  historyCount: { color: colors.primary60, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyImage: { width: 64, height: 64, borderRadius: 8, backgroundColor: colors.gray10 },
  historyBody: { flex: 1 },
  historyItemTitle: { color: colors.ink, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  historyMeta: { color: colors.gray60, fontSize: 12, lineHeight: 18, marginTop: 3 },
  backButton: {
    alignSelf: 'flex-start',
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: colors.primary5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  backButtonText: { color: colors.primary60, fontSize: 14, lineHeight: 21, fontWeight: '700' },
});

export default InspectionScreen;
