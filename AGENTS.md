# 回線速度チェッカー

このリポジトリは kojo が生成した Web アプリです（React UI + Hono API）。

## アイデア

# 回線速度チェッカー

ブラウザとサーバの間で固定サイズのダミーデータを実際に往復させ、送信と受信それぞれの所要時間から上り速度と下り速度をMbpsで算出し、過去の計測結果と並べて表示するアプリ。

## 意図

ビデオ会議で自分の映像だけ崩れる、動画は見られるのにファイル送信だけ遅い——そうした症状の原因が上りと下りのどちらにあるのかを、その場で切り分けたい人のための道具。Wi-Fiとテザリングを切り替えながら繰り返し計測して見比べるため計測結果を端末に残す。実効速度はデータを受け取り送り返す相手（サーバ）がいて初めて測れることがサーバAPIの存在理由。

## 受け入れ条件の種

- 「計測」ボタンを押すと、コード上の定数で定めた固定バイト数のダミーデータが上り用APIへ送信され、同じく固定バイト数のダミーデータが下り用APIから受信され、それぞれの所要時間から上り速度と下り速度がMbpsで表示される（送受信するバイト数は「数MB程度」のような幅を持たせず、計画時点で一意の値に確定させる）
- 計測中は上り・下りのどちらを計測しているかが分かる表示になり、完了すると両方の速度が並んで表示される
- 計測結果は端末に保存され、リロード後も直近の計測が新しい順に残り、条件を変えた計測どうしを見比べられる


## 技術スタック（不変）

- TypeScript / React 19（ReactCompiler有効。状態管理ライブラリ禁止、リフトアップとprops受け渡しのみ） / Hono / Vite + vite-plugin-singlefile / vitest + Playwright
- UI の正本は `index.html` と `src/ui/`。`public/index.html` は単一ファイルのビルド出力（直接編集しない）
- 配信: Cloudflare Workers（main=`src/worker/index.ts`、assets=`public/`、/api/* が Worker に落ちる）
- 保守時もこのスタックを維持すること。フレームワーク・ビルドツール・宣言外ライブラリの導入は禁止

## 制約

- サーバは src/worker/index.ts の Hono アプリ。/api/* の JSON のみを提供し、HTML を返さない
- バインディング（KV/D1/DO）・外部 API・サーバ側の永続化は使わない（状態なし API）
- GET /api/health は 200 と {"ok":true} を返し続けること（機械検証が依存。壊さない）
- UI は API に到達できなくても骨格（タイトル・フッター）を描画すること（視覚検証は file:// で行われる）
- 受け入れ条件のテスト: API/ロジックは tests/unit/*.test.ts（vitest）、ブラウザ挙動は tests/app.spec.ts（Playwright）に書く
- PLAN.md の受け入れ条件それぞれに対応するテストを書き、`npm test` が通ること。API/ロジックは `tests/unit/*.test.ts`（vitest）、ブラウザ挙動は `tests/app.spec.ts`（Playwright）。雛形のスモークテストと health テストは削除しない
- UI の正本は `index.html` と `src/ui/`。`public/` は `npm run build` の出力なので直接編集しない
- favicon は `index.html` の `<head>` に `<link rel="icon" href="data:image/svg+xml,...">` のインライン data URI で含める（外部ファイル・外部URL不可。アプリのテーマに合った絵柄にする）
- hub（apps.jozo.beer）へのフッター導線は `index.html` の React ルート（`#root`）の外に置く（JS が読めない環境でも描画されるため）。マークアップは次のとおり固定する:

  ```html
  <footer style="margin-top:3rem;text-align:center;font-size:.8rem;opacity:.6">
    <a href="https://apps.jozo.beer" style="color:inherit">apps.jozo.beer</a>
  </footer>
  ```

  スタイル（リンク色を含む）はアプリのテーマに合わせて調整してよいが、リンク先 `https://apps.jozo.beer` とリンクテキスト `apps.jozo.beer` は変えない。リンク色を変える場合は背景とのコントラストを確保すること
- README.md はテンプレートが生成済み。削除しないこと
- apple-touch-icon / manifest / og-image / robots / sitemap は factory が公開時に自動生成するため、builder は書かない
- 完成条件: PLAN.md の受け入れ条件をすべて満たし、`npm run verify` と `npm test` が通ること
