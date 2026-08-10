import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadHistory, saveHistory, type HistoryRecord } from "../../src/ui/history";

const KEY = "speed-test:history";

function installLocalStorage() {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorage,
    configurable: true,
  });
  return store;
}

describe("history", () => {
  beforeEach(() => {
    installLocalStorage();
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "localStorage");
  });

  it("save したレコードを load で件数・順序・全フィールド一致で返す", () => {
    const records: HistoryRecord[] = [
      {
        measuredAt: "2026-08-11T10:00:00.000Z",
        downloadMbps: 90.1,
        uploadMbps: 20.5,
      },
      {
        measuredAt: "2026-08-11T09:00:00.000Z",
        downloadMbps: 80.5,
        uploadMbps: 12.25,
      },
    ];

    saveHistory(records);
    expect(loadHistory()).toEqual(records);
  });

  it("壊れた JSON なら空配列を返す", () => {
    localStorage.setItem(KEY, "{not-json");
    expect(loadHistory()).toEqual([]);
  });
});
