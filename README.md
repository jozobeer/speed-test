# 回線速度チェッカー

ブラウザから Cloudflare Workers 上の API へ固定サイズのダミーデータを送受信し、下り（受信）と上り（送信）の実効速度を Mbps で表示する Web アプリです。

「計測」を押すと、先に `GET /api/download` から 4 MiB（4,194,304 バイト）を受信し、続けて `POST /api/upload` へ 2 MiB（2,097,152 バイト）を送信します。それぞれの所要時間から速度を小数第2位まで算出し、計測中は「下り計測中…」「上り計測中…」と段階表示します。結果（日時・下り・上り）は localStorage に残り、履歴テーブルで新しい順に見比べられます。タイトルと `apps.jozo.beer` フッターは `#root` 外の静的 HTML なので、API や JS が使えなくても骨格は表示されます。

## 公開URL

https://speed-test.jozo.beer

## 開発

[kojo](https://github.com/jozobeer/kojo)（1日1アプリ自動生成基盤）により生成されたリポジトリです。

初回セットアップ: `npm install`（Playwright ブラウザ未取得の環境では `npx playwright install chromium`）

- `npm run dev` — wrangler dev でローカル起動（http://127.0.0.1:8787）
- `npm test` — build → typecheck → vitest（ユニット）→ Playwright（E2E）
- `npm run verify` — 不変条件チェック（favicon / apps.jozo.beer フッター / 単一ファイル出力）
- `npm run deploy` — ビルドして Cloudflare Workers へデプロイ

## 構成

- `index.html` + `src/ui/` — React UI の正本（`public/index.html` はビルド出力）
- `src/shared/constants.ts` — 転送バイト数など UI / Worker 共用定数
- `src/ui/measure.ts` — 計測・Mbps 算出（依存注入可能な純粋モジュール）
- `src/ui/history.ts` — localStorage の履歴読み書き
- `src/worker/index.ts` — Hono の Worker（`/api/health`・`/api/download`・`/api/upload`）
- `tests/unit/` — vitest ユニットテスト、`tests/app.spec.ts` — Playwright E2E
- `PLAN.md` — 初回実装時の計画（歴史的文書。現状の正は本 README とテスト）
