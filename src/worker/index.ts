import { Hono } from "hono";

const app = new Hono();

// 機械検証と監視が依存する。パスとレスポンス形を変えないこと
app.get("/api/health", (c) => c.json({ ok: true }));

export default app;
