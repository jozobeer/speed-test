# PLAN: 回線速度チェッカー

## 1. 概要

ブラウザとサーバ（Cloudflare Workers 上の Hono API）の間で固定サイズのダミーデータを実際に往復させ、下り（受信）と上り（送信）それぞれの実測所要時間から速度を Mbps で算出・表示する Web アプリを作る。転送サイズはコード上の定数で一意に確定する: **下り 4,194,304 バイト（4 MiB）、上り 2,097,152 バイト（2 MiB）**。計測結果は日時・下り・上りの値ごと localStorage に保存し、リロード後も新しい順に一覧表示して条件違いの計測を見比べられるようにする。

## 2. 意図（明示）

ビデオ会議で自分の映像だけ崩れる、動画は見られるのにファイル送信だけ遅い——そうした症状の原因が上りと下りのどちらにあるのかを、その場で切り分けたい人のための道具。Wi-Fiとテザリングを切り替えながら繰り返し計測して見比べるため計測結果を端末に残す。実効速度はデータを受け取り送り返す相手（サーバ）がいて初めて測れることがサーバAPIの存在理由。

## 3. 受け入れ条件

- [ ] AC1: 「計測」ボタンを押すと、`GET /api/download` から 4,194,304 バイトのダミーデータを受信し、`POST /api/upload` へ 2,097,152 バイトのダミーデータを送信し、それぞれの実測所要時間（リクエスト開始から body 読み切り／レスポンス受領まで）から `toMbps(バイト数, 所要ms)` で算出した下り・上りの速度が Mbps 単位（小数2桁）で表示される
- [ ] AC2: API 契約 — `GET /api/download` は `Content-Type: application/json` で、body 全体がちょうど 4,194,304 バイトになる JSON `{"payload":"BB…B"}`（`payload` は文字 `B`（0x42）を 4,194,290 個並べた文字列。エンベロープ `{"payload":"` + `"}` の 14 バイトと合わせて総計 4,194,304 バイト）を返す。`POST /api/upload` は受信バイト数が 2,097,152 に一致すれば 200 で `{"ok":true,"receivedBytes":2097152}`、不一致なら 400 で `{"ok":false,"error":"unexpected size","receivedBytes":<実受信数>}` を返す（/api/* は JSON のみ）
- [ ] AC3: 計測中は「下り計測中…」「上り計測中…」のどちらの段階かが表示され、その間ボタンは無効化される。完了すると下り・上りの両速度が並んで表示される
- [ ] AC4: 計測結果（ISO 8601 日時・下り Mbps・上り Mbps）は localStorage に保存され、リロード後も各レコードの3値が保存時と同一の値で新しい順に一覧表示される
- [ ] AC5: `GET /api/health` は 200 と `{"ok":true}` を返し続ける
- [ ] AC6: API に到達できない環境でも、アプリのタイトルとフッター（apps.jozo.beer 導線）が描画される。JS が実行されない file:// で `index.html` を直接開いた場合も同様（タイトルとフッターは `#root` 外の静的 HTML として置く）

## 4. 実装方針

### 構成

| ファイル | 役割 |
|---|---|
| `src/shared/constants.ts` | `DOWNLOAD_BYTES = 4_194_304` / `UPLOAD_BYTES = 2_097_152` / `FILL_BYTE = 0x42`（文字 `B`。UI と worker が共用） |
| `src/ui/measure.ts` | `toMbps(bytes, ms)`、`measureDownload(deps)`、`measureUpload(deps)`（React 非依存の純粋モジュール） |
| `src/ui/history.ts` | `loadHistory()` / `saveHistory(records)`（localStorage、壊れた JSON は空配列扱い） |
| `src/ui/App.tsx` | 状態機械 `idle → downloading → uploading → done / error` を useState で管理。状態管理ライブラリ不使用、props 受け渡しのみ |
| `src/worker/index.ts` | 既存 health に `GET /api/download` / `POST /api/upload` を追加（状態なし） |

### 計測ロジック（テスト可能性が要）

`measureDownload` / `measureUpload` は `{ fetchFn, now }` を引数で受け取る依存注入設計にする。

- `measureDownload`: `now()` → `fetchFn("/api/download")` → `arrayBuffer()` で body を読み切る → `now()`。受信 byteLength を実際に数え、`DOWNLOAD_BYTES` と不一致なら reject。戻り値 `{ bytes, ms, mbps: toMbps(bytes, ms) }`
- `measureUpload`: `FILL_BYTE` で埋めた `UPLOAD_BYTES` 長の `Uint8Array` を `POST /api/upload` の body に載せ、レスポンス JSON の `receivedBytes` が `UPLOAD_BYTES` と不一致（または `ok:false`）なら reject
- `toMbps(bytes, ms) = (bytes * 8) / (ms / 1000) / 1_000_000`

計時区間・送受信バイト数・toMbps への引数がすべて注入した偽 fetch／偽時計から観測できるため、固定値表示や誤った計時区間の実装はユニットテストで落ちる。

### API（`src/worker/index.ts`）

- `GET /api/download`: `'{"payload":"' + "B".repeat(DOWNLOAD_BYTES - 14) + '"}'` を `Content-Type: application/json` で返す（body 総計ちょうど `DOWNLOAD_BYTES` バイト。キャッシュ抑止に `Cache-Control: no-store`）
- `POST /api/upload`: `c.req.arrayBuffer()` で受信し byteLength を数え、AC2 の契約どおり応答する。応答は JSON のみ・HTML なし・バインディング/永続化なし

### UI レイアウト

タイトル → 計測ボタン → 進行状況表示（AC3）→ 最新結果（下り/上りの2カード）→ 履歴テーブル（日時・下り・上り、新しい順）。タイトル（`<h1>`）とフッターは `#root` 外の静的 HTML として置き、JS が実行されない環境でも描画されるようにする（AC6）。フッターは AGENTS.md 固定マークアップ。スタイルは `index.html` 内 CSS。favicon は `<head>` にインライン data URI（SVG、速度計の絵柄）。

### テスト計画（前回不合格の是正点）

**tests/unit/measure.test.ts（vitest）**

- `toMbps(4_194_304, 1000)` が `33.554432` に厳密一致（式レベルの検証）
- `measureDownload`: 偽 fetch は 4,194,304 バイトの body を持つ Response を返し、偽時計は「呼び出し前 t=1000 / `arrayBuffer()` 解決時に t=3000 へ進む」列を返す。戻り値が `{ bytes: 4_194_304, ms: 2000, mbps: toMbps(4_194_304, 2000) }` に一致し、fetch が `"/api/download"` で呼ばれたことを検証 → **計時区間が body 読み切りを含むこと・実受信バイト数が toMbps に渡ることを保証（固定値実装・ヘッダ受信までの計時では ms=2000 にならず不合格になる）**
- `measureDownload`: body が 4,194,304 バイト未満なら reject
- `measureUpload`: 偽 fetch に渡された body の byteLength が `2_097_152` かつ全バイト `0x42` であること、偽時計で `ms` が送信区間に一致し `mbps === toMbps(2_097_152, ms)` であることを検証。レスポンスが `{ok:false}` または `receivedBytes` 不一致なら reject

**tests/unit/api.test.ts（vitest, `app.request`）**

- `GET /api/download`: status 200・`Content-Type: application/json`・body の byteLength が `4_194_304`・`JSON.parse` が成功し `payload` が長さ 4,194,290 の文字列で**全文字が `B` であること**
- `POST /api/upload` に 2,097,152 バイトを送る: status 200・json が `{ ok: true, receivedBytes: 2_097_152 }` に `toEqual` で完全一致
- `POST /api/upload` に 1,024 バイトを送る: status 400・json が `{ ok: false, error: "unexpected size", receivedBytes: 1024 }` に完全一致
- `POST /api/upload` に空 body: status 400・`receivedBytes: 0`
- 既存 health テストは維持

**tests/unit/history.test.ts（vitest）**

- `{ measuredAt: "2026-08-11T09:00:00.000Z", downloadMbps: 80.5, uploadMbps: 12.25 }` を含む複数件を save → load し、**件数・順序に加え各レコードの日時・下り・上りの全フィールド値が `toEqual` で一致**することを検証
- localStorage に壊れた JSON がある場合 `loadHistory()` が `[]` を返す

**tests/app.spec.ts（Playwright、雛形2件は維持）**

- 計測フロー: 「計測」押下 → 「下り計測中…」表示中に**ボタンが `disabled` であること**を検証（AC3）→ 「上り計測中…」表示 → 完了後、下り・上りの速度が `NN.NN Mbps` 形式の正の数値で並んで表示され、ボタンが再度有効になる
- 履歴の値の永続化: 計測完了後に**画面表示された日時・下り・上りの値をキャプチャし、リロード後の履歴1行目がキャプチャした3値と一致**することを検証（件数・順序だけの検証にしない）。2回計測して新しい順であることも確認
- 骨格描画（API 不達）: `page.route` で `/api/**` を全て失敗させてもタイトルとフッターリンク（`apps.jozo.beer`）が表示される
- 骨格描画（file://）: `page.goto("file://" + リポジトリ直下 index.html の絶対パス)` で開き、JS モジュールが読み込めない状態でもタイトルとフッターリンクが表示されることを検証（AC6）

### 完了確認

`npm run verify` と `npm test` が通ること。
