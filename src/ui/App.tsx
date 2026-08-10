import { useState } from "react";
import { loadHistory, saveHistory, type HistoryRecord } from "./history";
import { measureDownload, measureUpload } from "./measure";

type Phase = "idle" | "downloading" | "uploading" | "done" | "error";

function formatMbps(mbps: number): string {
  return `${mbps.toFixed(2)} Mbps`;
}

export function App() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [latest, setLatest] = useState<HistoryRecord | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>(() => loadHistory());

  const busy = phase === "downloading" || phase === "uploading";

  async function runMeasure() {
    setErrorMessage(null);
    setPhase("downloading");
    try {
      const download = await measureDownload({
        fetchFn: fetch,
        now: () => performance.now(),
      });
      setPhase("uploading");
      const upload = await measureUpload({
        fetchFn: fetch,
        now: () => performance.now(),
      });
      const record: HistoryRecord = {
        measuredAt: new Date().toISOString(),
        downloadMbps: download.mbps,
        uploadMbps: upload.mbps,
      };
      const next = [record, ...history];
      saveHistory(next);
      setHistory(next);
      setLatest(record);
      setPhase("done");
    } catch (err) {
      setPhase("error");
      setErrorMessage(err instanceof Error ? err.message : "計測に失敗しました");
    }
  }

  return (
    <main className="app">
      <button
        type="button"
        className="measure-btn"
        disabled={busy}
        onClick={() => void runMeasure()}
      >
        計測
      </button>

      <p className="status" aria-live="polite">
        {phase === "downloading" && "下り計測中…"}
        {phase === "uploading" && "上り計測中…"}
        {phase === "error" && (errorMessage ?? "計測に失敗しました")}
        {phase === "idle" && "ボタンを押すと下り・上りを順に計測します"}
        {phase === "done" && "計測完了"}
      </p>

      {latest && (
        <section className="results" aria-label="最新の計測結果">
          <p className="measured-at" data-testid="latest-measured-at">
            {latest.measuredAt}
          </p>
          <div className="speed-pair">
            <div className="speed-block">
              <span className="speed-label">下り</span>
              <span className="speed-value" data-testid="download-mbps">
                {formatMbps(latest.downloadMbps)}
              </span>
            </div>
            <div className="speed-block">
              <span className="speed-label">上り</span>
              <span className="speed-value" data-testid="upload-mbps">
                {formatMbps(latest.uploadMbps)}
              </span>
            </div>
          </div>
        </section>
      )}

      <section className="history" aria-label="計測履歴">
        <h2>履歴</h2>
        {history.length === 0 ? (
          <p className="empty">まだ計測結果はありません</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>日時</th>
                <th>下り</th>
                <th>上り</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.measuredAt} data-testid="history-row">
                  <td>{row.measuredAt}</td>
                  <td>{formatMbps(row.downloadMbps)}</td>
                  <td>{formatMbps(row.uploadMbps)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
