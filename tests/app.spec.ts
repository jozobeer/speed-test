import { expect, test } from "@playwright/test";
import { fileURLToPath } from "node:url";
import path from "node:path";

// 雛形スモーク。builder は受け入れ条件ごとの機能テストをこのファイルに追記する（雛形は削除しない）
test("ページがロードできてページエラーがない", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
  expect(errors).toEqual([]);
});

test("GET /api/health が 200 で ok:true を返す", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});

test("計測フロー: 段階表示・ボタン無効化・Mbps 表示", async ({ page }) => {
  let releaseDownload!: () => void;
  let releaseUpload!: () => void;
  const downloadGate = new Promise<void>((resolve) => {
    releaseDownload = resolve;
  });
  const uploadGate = new Promise<void>((resolve) => {
    releaseUpload = resolve;
  });

  // ローカルでは転送が一瞬で終わるため、段階表示を観測できるよう API をゲートする
  await page.route("**/api/download", async (route) => {
    await downloadGate;
    await route.continue();
  });
  await page.route("**/api/upload", async (route) => {
    await uploadGate;
    await route.continue();
  });

  await page.goto("/");
  const button = page.getByRole("button", { name: "計測" });
  await expect(button).toBeEnabled();

  await button.click();
  await expect(page.getByText("下り計測中…")).toBeVisible();
  await expect(button).toBeDisabled();

  releaseDownload();
  await expect(page.getByText("上り計測中…")).toBeVisible({ timeout: 60_000 });
  await expect(button).toBeDisabled();

  releaseUpload();
  await expect(page.getByTestId("download-mbps")).toHaveText(/\d+\.\d{2} Mbps/, {
    timeout: 60_000,
  });
  await expect(page.getByTestId("upload-mbps")).toHaveText(/\d+\.\d{2} Mbps/);

  const downloadText = await page.getByTestId("download-mbps").innerText();
  const uploadText = await page.getByTestId("upload-mbps").innerText();
  expect(Number.parseFloat(downloadText)).toBeGreaterThan(0);
  expect(Number.parseFloat(uploadText)).toBeGreaterThan(0);
  await expect(button).toBeEnabled();
});

test("履歴の値の永続化と新しい順", async ({ page }) => {
  await page.goto("/");
  const button = page.getByRole("button", { name: "計測" });

  await button.click();
  await expect(page.getByTestId("download-mbps")).toHaveText(/\d+\.\d{2} Mbps/, {
    timeout: 60_000,
  });
  await expect(button).toBeEnabled();

  const first = {
    at: await page.getByTestId("latest-measured-at").innerText(),
    down: await page.getByTestId("download-mbps").innerText(),
    up: await page.getByTestId("upload-mbps").innerText(),
  };

  await button.click();
  await expect(page.getByTestId("history-row").first()).not.toHaveText(first.at, {
    timeout: 60_000,
  });
  await expect(button).toBeEnabled();

  const second = {
    at: await page.getByTestId("latest-measured-at").innerText(),
    down: await page.getByTestId("download-mbps").innerText(),
    up: await page.getByTestId("upload-mbps").innerText(),
  };
  expect(second.at).not.toBe(first.at);

  const rows = page.getByTestId("history-row");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText(second.at);
  await expect(rows.nth(0)).toContainText(second.down);
  await expect(rows.nth(0)).toContainText(second.up);
  await expect(rows.nth(1)).toContainText(first.at);
  await expect(rows.nth(1)).toContainText(first.down);
  await expect(rows.nth(1)).toContainText(first.up);

  await page.reload();
  await expect(page.getByTestId("history-row")).toHaveCount(2);
  await expect(rows.nth(0)).toContainText(second.at);
  await expect(rows.nth(0)).toContainText(second.down);
  await expect(rows.nth(0)).toContainText(second.up);
  await expect(rows.nth(1)).toContainText(first.at);
  await expect(rows.nth(1)).toContainText(first.down);
  await expect(rows.nth(1)).toContainText(first.up);
});

test("API 不達でもタイトルとフッターが表示される", async ({ page }) => {
  await page.route("**/api/**", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "回線速度チェッカー" })).toBeVisible();
  await expect(page.getByRole("link", { name: "apps.jozo.beer" })).toBeVisible();
});

test("file:// で index.html を開いてもタイトルとフッターが表示される", async ({
  browser,
}) => {
  const indexPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "index.html",
  );
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`file://${indexPath}`);
  await expect(page.getByRole("heading", { name: "回線速度チェッカー" })).toBeVisible();
  await expect(page.getByRole("link", { name: "apps.jozo.beer" })).toBeVisible();
  await context.close();
});
