# 回線速度チェッカー

ブラウザとサーバの間で固定サイズのダミーデータを実際に往復させ、送信と受信それぞれの所要時間から上り速度と下り速度をMbpsで算出し、過去の計測結果と並べて表示するアプリ。

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
- `src/worker/index.ts` — Hono の Worker（`/api/*` の JSON API）
- `tests/unit/` — vitest ユニットテスト、`tests/app.spec.ts` — Playwright E2E
- `PLAN.md` — 受け入れ条件付きの実装計画
