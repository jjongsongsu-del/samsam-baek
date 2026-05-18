import AsyncStorage from '@react-native-async-storage/async-storage';
import type { InspectionResult } from './inspectionService';
import type { PricePrediction } from './priceService';

const STORAGE_KEY = 'samsam.inspection.history.v1';
const HISTORY_LIMIT = 20;

export type SavedInspection = {
  id: string;
  createdAt: string;
  imageUri: string;
  imageBase64: string;
  source: 'mobile-camera' | 'photo-library' | 'saved-result';
  result: InspectionResult;
  pricePrediction?: PricePrediction;
};

export async function loadInspectionHistory(): Promise<SavedInspection[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, HISTORY_LIMIT) : [];
  } catch {
    return [];
  }
}

export async function saveInspectionRecord(record: SavedInspection): Promise<SavedInspection[]> {
  const history = await loadInspectionHistory();
  const withoutDuplicate = history.filter((item) => item.id !== record.id);
  const nextHistory = [record, ...withoutDuplicate].slice(0, HISTORY_LIMIT);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextHistory));
  return nextHistory;
}

export async function deleteInspectionRecord(id: string): Promise<SavedInspection[]> {
  const history = await loadInspectionHistory();
  const nextHistory = history.filter((item) => item.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextHistory));
  return nextHistory;
}
