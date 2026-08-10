# 回線速度チェッカー

kojo が生成した Web アプリ（React UI + Hono API）。ブラウザと Worker の間で固定サイズのダミーデータを送受信し、下り・上りの実効速度を Mbps で表示する。結果は端末の localStorage に新しい順で残る。

## アプリ概要と構成

- 計測フロー: 「計測」→ 下り（`GET /api/download`、4,194,304 バイト）→ 上り（`POST /api/upload`、2,097,152 バイト）→ 両速度を小数2桁の Mbps で表示。計測中は「下り計測中…」「上り計測中…」と段階表示し、ボタンは無効化
- API: `GET /api/health`（`{"ok":true}`）、`GET /api/download`（ちょうど 4 MiB の JSON）、`POST /api/upload`（2 MiB 受信で 200、不一致は 400）。いずれも JSON のみ・状態なし
- UI: `index.html`（タイトル・フッター・スタイルの静的骨格）+ `src/ui/App.tsx`（状態機械 `idle → downloading → uploading → done / error`）。計測ロジックは `src/ui/measure.ts`、履歴は `src/ui/history.ts`、バイト数定数は `src/shared/constants.ts`
- テスト: API/ロジックは `tests/unit/*.test.ts`（vitest）、ブラウザ挙動は `tests/app.spec.ts`（Playwright）。雛形のスモークと health テストは削除しない

## 技術スタック（不変）

- TypeScript / React 19（ReactCompiler有効。状態管理ライブラリ禁止、リフトアップとprops受け渡しのみ） / Hono / Vite + vite-plugin-singlefile / vitest + Playwright
- UI の正本は `index.html` と `src/ui/`。`public/index.html` は単一ファイルのビルド出力（直接編集しない）
- 配信: Cloudflare Workers（main=`src/worker/index.ts`、assets=`public/`、/api/* が Worker に落ちる）
- 保守時もこのスタックを維持すること。フレームワーク・ビルドツール・宣言外ライブラリの導入は禁止

## 品質不変条件

- サーバは `src/worker/index.ts` の Hono アプリ。`/api/*` は JSON のみを返し、HTML を返さない
- バインディング（KV/D1/DO）・外部 API・サーバ側の永続化は使わない（状態なし API）
- `GET /api/health` は 200 と `{"ok":true}` を返し続けること（機械検証が依存。壊さない）
- UI は API に到達できなくても骨格（タイトル・フッター）を描画すること（視覚検証は file:// でも行われる）
- UI の正本は `index.html` と `src/ui/`。`public/` は `npm run build` の出力なので直接編集しない
- favicon は `index.html` の `<head>` に `<link rel="icon" href="data:image/svg+xml,...">` のインライン data URI で含める（外部ファイル・外部 URL 不可）
- hub（apps.jozo.beer）へのフッター導線は `index.html` の React ルート（`#root`）の外に置く。マークアップは次のとおり固定する:

  ```html
  <footer style="margin-top:3rem;text-align:center;font-size:.8rem;opacity:.6">
    <a href="https://apps.jozo.beer" style="color:inherit">apps.jozo.beer</a>
  </footer>
  ```

  スタイル（リンク色を含む）はアプリのテーマに合わせて調整してよいが、リンク先 `https://apps.jozo.beer` とリンクテキスト `apps.jozo.beer` は変えない。リンク色を変える場合は背景とのコントラストを確保すること
- README.md は削除しないこと
- apple-touch-icon / manifest / og-image / robots / sitemap は factory が公開時に自動生成するため、このリポジトリでは書かない
- 変更後は `npm run verify` と `npm test` が通る状態を維持する

## 保守の進め方

1. 変更内容を受け入れ条件としてテストに落とす（API/ロジックは `tests/unit/*.test.ts`、ブラウザ挙動は `tests/app.spec.ts`）
2. 実装する
3. `npm test` が通ることを確認する
4. `git commit` し `git push` する
5. `npm run deploy` で Cloudflare Workers へデプロイする

## 文書の位置づけ

`PLAN.md` は初回実装時の計画（歴史的文書）である。現状の正は README.md とテスト群である。受け入れ条件を変えるときはテストと README を先に更新する。
