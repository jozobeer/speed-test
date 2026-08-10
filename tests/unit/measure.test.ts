import { describe, expect, it, vi } from "vitest";
import { DOWNLOAD_BYTES, FILL_BYTE, UPLOAD_BYTES } from "../../src/shared/constants";
import { measureDownload, measureUpload, toMbps } from "../../src/ui/measure";

describe("toMbps", () => {
  it("bytes と ms から Mbps を算出する", () => {
    expect(toMbps(4_194_304, 1000)).toBe(33.554432);
  });
});

describe("measureDownload", () => {
  it("body 読み切りまでの所要時間と実受信バイト数から mbps を返す", async () => {
    let t = 1000;
    const body = new Uint8Array(DOWNLOAD_BYTES);
    const fetchFn = vi.fn(async () => {
      return {
        arrayBuffer: async () => {
          t = 3000;
          return body.buffer;
        },
      } as Response;
    });

    const result = await measureDownload({ fetchFn, now: () => t });

    expect(fetchFn).toHaveBeenCalledWith("/api/download");
    expect(result).toEqual({
      bytes: DOWNLOAD_BYTES,
      ms: 2000,
      mbps: toMbps(DOWNLOAD_BYTES, 2000),
    });
  });

  it("body が DOWNLOAD_BYTES 未満なら reject する", async () => {
    const fetchFn = async () =>
      ({
        arrayBuffer: async () => new Uint8Array(1024).buffer,
      }) as Response;

    await expect(measureDownload({ fetchFn, now: () => 0 })).rejects.toThrow();
  });
});

describe("measureUpload", () => {
  it("UPLOAD_BYTES の FILL_BYTE 埋め body を送り、レスポンス受領までの mbps を返す", async () => {
    let t = 500;
    const fetchFn = vi.fn(async (_url: string, init?: RequestInit) => {
      t = 1500;
      const body = init?.body as Uint8Array;
      expect(body).toBeInstanceOf(Uint8Array);
      expect(body.byteLength).toBe(UPLOAD_BYTES);
      expect(body.every((b) => b === FILL_BYTE)).toBe(true);
      return {
        json: async () => {
          t = 2500;
          return { ok: true, receivedBytes: UPLOAD_BYTES };
        },
      } as Response;
    });

    const result = await measureUpload({
      fetchFn: fetchFn as typeof fetch,
      now: () => t,
    });

    expect(fetchFn).toHaveBeenCalled();
    expect(result).toEqual({
      bytes: UPLOAD_BYTES,
      ms: 1000,
      mbps: toMbps(UPLOAD_BYTES, 1000),
    });
  });

  it("ok:false なら reject する", async () => {
    const fetchFn = async () =>
      new Response(JSON.stringify({ ok: false, error: "unexpected size", receivedBytes: 0 }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });

    await expect(
      measureUpload({ fetchFn, now: () => 0 }),
    ).rejects.toThrow();
  });

  it("receivedBytes 不一致なら reject する", async () => {
    const fetchFn = async () =>
      new Response(JSON.stringify({ ok: true, receivedBytes: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    await expect(
      measureUpload({ fetchFn, now: () => 0 }),
    ).rejects.toThrow();
  });
});
