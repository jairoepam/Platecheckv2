import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ConferenceResult } from "@/lib/conference-logic";

const HISTORY_KEY = "conferencia-expressa/history/v1";

export type ConferenceHistoryItem = ConferenceResult & {
  id: string;
  createdAt: string;
};

export async function loadConferenceHistory(): Promise<ConferenceHistoryItem[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as ConferenceHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveConferenceResult(result: ConferenceResult): Promise<ConferenceHistoryItem> {
  const item: ConferenceHistoryItem = {
    ...result,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const current = await loadConferenceHistory();
  const next = [item, ...current].slice(0, 100);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return item;
}

export async function clearConferenceHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}
