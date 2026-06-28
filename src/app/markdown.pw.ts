import { expect, test, type Page } from "@playwright/test";

async function loadHarness(page: Page): Promise<void> {
  await page.goto("/");
  await page.setContent("<main></main>");
  await page.addScriptTag({
    type: "module",
    url: "/src/app/playwright-harness.ts",
  });
}

test.describe("markdown", () => {
  test("external", async ({ page }) => {
    await loadHarness(page);

    const html = await page.evaluate(() =>
      window.arrowboxPw.md2html(`[example](https://example.com)`),
    );

    expect(html).toEqual(
      `<p><a href="https://example.com" rel="nofollow" target="_blank">example</a></p>\n`,
    );
  });

  test("internal", async ({ page }) => {
    await loadHarness(page);

    const html = await page.evaluate(() => [
      window.arrowboxPw.md2html(`[example](#example)`),
      window.arrowboxPw.md2html(`[example](/example)`),
    ]);

    expect(html).toEqual([
      `<p><a href="#example">example</a></p>\n`,
      `<p><a href="/example">example</a></p>\n`,
    ]);
  });
});
