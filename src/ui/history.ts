export type HistoryRecord = {
  measuredAt: string;
  downloadMbps: number;
  uploadMbps: number;
};

const STORAGE_KEY = "speed-test:history";

export function loadHistory(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as HistoryRecord[];
  } catch {
    return [];
  }
}

export function saveHistory(records: HistoryRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}
