import { Hono } from "hono";
import { DOWNLOAD_BYTES, UPLOAD_BYTES } from "../shared/constants";

const app = new Hono();

const DOWNLOAD_BODY = `{"payload":"${"B".repeat(DOWNLOAD_BYTES - 14)}"}`;

// 機械検証と監視が依存する。パスとレスポンス形を変えないこと
app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/download", (c) => {
  c.header("Cache-Control", "no-store");
  return c.body(DOWNLOAD_BODY, 200, { "Content-Type": "application/json" });
});

app.post("/api/upload", async (c) => {
  const receivedBytes = (await c.req.arrayBuffer()).byteLength;
  if (receivedBytes !== UPLOAD_BYTES) {
    return c.json(
      { ok: false, error: "unexpected size", receivedBytes },
      400,
    );
  }
  return c.json({ ok: true, receivedBytes: UPLOAD_BYTES });
});

app.notFound((c) => c.json({ ok: false, error: "not found" }, 404));

export default app;
