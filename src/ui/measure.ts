import { DOWNLOAD_BYTES, FILL_BYTE, UPLOAD_BYTES } from "../shared/constants";

export function toMbps(bytes: number, ms: number): number {
  return (bytes * 8) / (ms / 1000) / 1_000_000;
}

type MeasureDeps = {
  fetchFn: typeof fetch;
  now: () => number;
};

export type MeasureResult = {
  bytes: number;
  ms: number;
  mbps: number;
};

export async function measureDownload(deps: MeasureDeps): Promise<MeasureResult> {
  const { fetchFn, now } = deps;
  const started = now();
  const response = await fetchFn("/api/download");
  const buffer = await response.arrayBuffer();
  const elapsed = now() - started;
  const bytes = buffer.byteLength;
  if (bytes !== DOWNLOAD_BYTES) {
    throw new Error(`unexpected download size: ${bytes}`);
  }
  return { bytes, ms: elapsed, mbps: toMbps(bytes, elapsed) };
}

export async function measureUpload(deps: MeasureDeps): Promise<MeasureResult> {
  const { fetchFn, now } = deps;
  const body = new Uint8Array(UPLOAD_BYTES).fill(FILL_BYTE);
  const started = now();
  const response = await fetchFn("/api/upload", {
    method: "POST",
    body,
    headers: { "Content-Type": "application/octet-stream" },
  });
  const elapsed = now() - started;
  const json = (await response.json()) as { ok?: boolean; receivedBytes?: number };
  if (!json.ok || json.receivedBytes !== UPLOAD_BYTES) {
    throw new Error("upload rejected");
  }
  return { bytes: UPLOAD_BYTES, ms: elapsed, mbps: toMbps(UPLOAD_BYTES, elapsed) };
}
