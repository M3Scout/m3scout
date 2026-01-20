import { test, expect } from "@playwright/test";

/**
 * E2E test to verify React hook stability on Live Match page refresh.
 * 
 * This test catches the "Rendered more hooks than during the previous render" error
 * which occurs when components call hooks conditionally or after early returns.
 */
test.describe("Live Match - Hook Stability", () => {
  // Collect console errors during the test
  const consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors.length = 0;

    // Listen for console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Listen for page errors (uncaught exceptions)
    page.on("pageerror", (error) => {
      consoleErrors.push(error.message);
    });
  });

  test("should not throw hook mismatch error after 10 consecutive refreshes", async ({ page }) => {
    // Use a test match ID - in real scenario this should be a seeded match or parameterized
    const testMatchId = "aabbcf55-a6c1-4a49-b6ea-e18b0e9d3f38";
    const matchUrl = `/app/live-match/${testMatchId}`;

    // Navigate to the live match page
    await page.goto(matchUrl);

    // Wait for initial load (either content or error boundary)
    await page.waitForLoadState("networkidle");

    // Perform 10 consecutive refreshes
    for (let i = 1; i <= 10; i++) {
      // Refresh the page
      await page.reload();

      // Wait for the page to stabilize
      await page.waitForLoadState("networkidle");

      // Small delay to ensure React has finished rendering
      await page.waitForTimeout(500);

      // Check for hook mismatch error after each refresh
      const hookMismatchErrors = consoleErrors.filter(
        (err) =>
          err.includes("Rendered more hooks than during the previous render") ||
          err.includes("Rendered fewer hooks than expected") ||
          err.includes("React error #310") ||
          err.includes("Minified React error #310")
      );

      // Fail immediately if hook error is detected
      expect(
        hookMismatchErrors,
        `Hook mismatch error detected on refresh #${i}: ${hookMismatchErrors.join(", ")}`
      ).toHaveLength(0);
    }

    // Final assertion: no hook-related errors in the entire session
    const allHookErrors = consoleErrors.filter(
      (err) =>
        err.includes("Rendered more hooks") ||
        err.includes("Rendered fewer hooks") ||
        err.includes("error #310")
    );

    expect(
      allHookErrors,
      `Hook stability test failed with errors: ${allHookErrors.join("\n")}`
    ).toHaveLength(0);
  });

  test("should not show ErrorBoundary fallback after refresh", async ({ page }) => {
    const testMatchId = "aabbcf55-a6c1-4a49-b6ea-e18b0e9d3f38";
    const matchUrl = `/app/live-match/${testMatchId}`;

    // Navigate and refresh
    await page.goto(matchUrl);
    await page.waitForLoadState("networkidle");

    for (let i = 1; i <= 5; i++) {
      await page.reload();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(300);

      // Check that ErrorBoundary fallback is NOT visible
      const errorBoundaryVisible = await page
        .locator('text="Ocorreu um erro"')
        .or(page.locator('text="Algo deu errado"'))
        .or(page.locator('text="Tentar novamente"'))
        .isVisible()
        .catch(() => false);

      expect(
        errorBoundaryVisible,
        `ErrorBoundary fallback appeared on refresh #${i}`
      ).toBe(false);
    }
  });
});
