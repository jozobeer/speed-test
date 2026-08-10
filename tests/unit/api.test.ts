import { describe, expect, it } from "vitest";
import { DOWNLOAD_BYTES, UPLOAD_BYTES } from "../../src/shared/constants";
import app from "../../src/worker/index";

describe("GET /api/download", () => {
  it("ちょうど DOWNLOAD_BYTES の JSON を返す", async () => {
    const res = await app.request("/api/download");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/application\/json/);

    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBe(DOWNLOAD_BYTES);

    const json = JSON.parse(new TextDecoder().decode(buf)) as { payload: string };
    expect(json.payload).toHaveLength(DOWNLOAD_BYTES - 14);
    expect([...json.payload].every((ch) => ch === "B")).toBe(true);
  });
});

describe("POST /api/upload", () => {
  it("UPLOAD_BYTES 一致で 200 を返す", async () => {
    const body = new Uint8Array(UPLOAD_BYTES);
    const res = await app.request("/api/upload", { method: "POST", body });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, receivedBytes: UPLOAD_BYTES });
  });

  it("サイズ不一致で 400 を返す", async () => {
    const body = new Uint8Array(1024);
    const res = await app.request("/api/upload", { method: "POST", body });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      ok: false,
      error: "unexpected size",
      receivedBytes: 1024,
    });
  });

  it("空 body で 400 と receivedBytes:0 を返す", async () => {
    const res = await app.request("/api/upload", { method: "POST" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      ok: false,
      error: "unexpected size",
      receivedBytes: 0,
    });
  });
});
