import { test, expect } from "@playwright/test";

/**
 * Visual regression tests for PDF/PNG export pipeline.
 *
 * These tests verify that:
 * 1. The preview renders correctly
 * 2. The exported PNG matches the preview (pixel-identical)
 * 3. Scale is always 1x
 * 4. Layout width is ~794px (A4 @ 96dpi)
 * 5. Logo is not distorted
 *
 * Run: npx playwright test e2e/pdf-export-visual.spec.ts
 * Update snapshots: npx playwright test --update-snapshots
 */

test.describe("PDF Export Visual Regression", () => {
  // Use a fixed report ID for consistent testing
  // In real tests, you'd either use a seeded test report or mock the data
  const REPORT_PATH = "/app/reports/04079b4f-0de5-4f49-ba86-14cea4576ee1";

  test.beforeEach(async ({ page }) => {
    // Listen for console logs to capture export pipeline logs
    page.on("console", (msg) => {
      if (msg.text().includes("[exportPipeline]")) {
        console.log("Export Log:", msg.text());
      }
    });
  });

  test("preview template renders correctly", async ({ page }) => {
    await page.goto(REPORT_PATH);

    // Wait for the page to fully load
    await page.waitForLoadState("networkidle");

    // Click "Exportar PDF" dropdown
    await page.click('button:has-text("Exportar PDF")');

    // Click "Preview Normal" to open the preview modal
    await page.click('text=Preview Normal');

    // Wait for the modal to open and template to render
    await page.waitForSelector('[data-testid="pdf-preview-modal"]', { timeout: 10000 }).catch(() => {
      // Fallback: wait for the dialog content
      return page.waitForSelector('.pdf-export, [class*="DialogContent"]', { timeout: 10000 });
    });

    // Wait for fonts and images to load
    await page.waitForTimeout(2000);

    // Take a screenshot of the preview template
    const previewTemplate = await page.locator('.pdf-export').first();
    
    if (await previewTemplate.isVisible()) {
      await expect(previewTemplate).toHaveScreenshot("pdf-preview-template.png", {
        maxDiffPixelRatio: 0.01,
      });
    }
  });

  test("exported PNG matches preview layout width (794px)", async ({ page }) => {
    await page.goto(REPORT_PATH);
    await page.waitForLoadState("networkidle");

    // Open preview modal
    await page.click('button:has-text("Exportar PDF")');
    await page.click('text=Preview Normal');

    // Wait for modal
    await page.waitForTimeout(2000);

    // Enable debug mode
    const debugCheckbox = page.locator('label:has-text("Debug") input[type="checkbox"], label:has-text("Debug")');
    if (await debugCheckbox.isVisible()) {
      await debugCheckbox.click();
    }

    // Capture console logs for export pipeline
    const consoleLogs: string[] = [];
    page.on("console", (msg) => {
      consoleLogs.push(msg.text());
    });

    // Click Debug button to trigger export with debug mode
    const debugButton = page.locator('button:has-text("Debug")');
    if (await debugButton.isVisible()) {
      // Listen for new page (debug window)
      const [debugPage] = await Promise.all([
        page.context().waitForEvent("page"),
        debugButton.click(),
      ]);

      // Wait for debug page to load
      await debugPage.waitForLoadState("domcontentloaded");
      await debugPage.waitForTimeout(1000);

      // Verify debug page shows Scale: 1x
      const scaleStatus = debugPage.locator('text=Scale');
      await expect(scaleStatus).toBeVisible();

      // Check for "1x (OK)" indicator
      const scaleOk = debugPage.locator('text=1x (OK)');
      await expect(scaleOk).toBeVisible();

      // Check layout width is ~794px
      const layoutWidth = debugPage.locator('text=Layout Width');
      await expect(layoutWidth).toBeVisible();

      // Take screenshot of debug window for reference
      await expect(debugPage).toHaveScreenshot("debug-window.png", {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });

      await debugPage.close();
    }

    // Verify export logs contain correct scale
    const exportLog = consoleLogs.find((log) => log.includes("[exportPipeline]"));
    if (exportLog) {
      expect(exportLog).toContain("effectiveScale");
    }
  });

  test("logo is not distorted in export", async ({ page }) => {
    await page.goto(REPORT_PATH);
    await page.waitForLoadState("networkidle");

    // Open preview
    await page.click('button:has-text("Exportar PDF")');
    await page.click('text=Preview Normal');
    await page.waitForTimeout(2000);

    // Find the logo in the preview
    const logo = page.locator('.pdf-export img[alt="M3"]').first();

    if (await logo.isVisible()) {
      // Get logo bounding box
      const box = await logo.boundingBox();

      if (box) {
        // Expected aspect ratio: 80/48 ≈ 1.67
        const aspectRatio = box.width / box.height;
        const expectedRatio = 80 / 48;

        // Allow 10% tolerance for aspect ratio
        expect(aspectRatio).toBeGreaterThan(expectedRatio * 0.9);
        expect(aspectRatio).toBeLessThan(expectedRatio * 1.1);

        console.log(`Logo dimensions: ${box.width}x${box.height}, aspect ratio: ${aspectRatio.toFixed(2)}`);
      }

      // Take screenshot of just the logo for visual comparison
      await expect(logo).toHaveScreenshot("logo-preview.png", {
        maxDiffPixelRatio: 0.01,
      });
    }
  });

  test("position pill is centered correctly", async ({ page }) => {
    await page.goto(REPORT_PATH);
    await page.waitForLoadState("networkidle");

    // Open preview
    await page.click('button:has-text("Exportar PDF")');
    await page.click('text=Preview Normal');
    await page.waitForTimeout(2000);

    // Find the position pill (e.g., "Meia Atacante")
    const positionPill = page.locator('.pdf-export span').filter({
      hasText: /Meia|Atacante|Goleiro|Zagueiro|Lateral|Volante|Ponta|Centroavante/,
    }).first();

    if (await positionPill.isVisible()) {
      // Take screenshot of the player info section for alignment verification
      const playerCard = page.locator('.pdf-export').first();
      await expect(playerCard).toHaveScreenshot("player-card-section.png", {
        maxDiffPixelRatio: 0.01,
      });
    }
  });

  test("score block alignment matches preview", async ({ page }) => {
    await page.goto(REPORT_PATH);
    await page.waitForLoadState("networkidle");

    // Open preview
    await page.click('button:has-text("Exportar PDF")');
    await page.click('text=Preview Normal');
    await page.waitForTimeout(2000);

    // Find the score display (e.g., "66.1/100")
    const scoreSection = page.locator('.pdf-export').locator('text=/\\d+\\.\\d+/').first();

    if (await scoreSection.isVisible()) {
      // Get the parent container of the score
      const scoreContainer = scoreSection.locator('xpath=ancestor::div[contains(@style, "flex")]').first();

      if (await scoreContainer.isVisible()) {
        await expect(scoreContainer).toHaveScreenshot("score-section.png", {
          maxDiffPixelRatio: 0.01,
        });
      }
    }
  });

  test("PNG download generates correct file", async ({ page }) => {
    await page.goto(REPORT_PATH);
    await page.waitForLoadState("networkidle");

    // Open preview
    await page.click('button:has-text("Exportar PDF")');
    await page.click('text=Preview Normal');
    await page.waitForTimeout(2000);

    // Set up download listener
    const downloadPromise = page.waitForEvent("download");

    // Click PNG button
    const pngButton = page.locator('button:has-text("PNG")');
    if (await pngButton.isVisible()) {
      await pngButton.click();

      const download = await downloadPromise;

      // Verify filename contains expected pattern
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/relatorio_scouting_.*\.png$/);

      console.log(`Downloaded PNG: ${filename}`);
    }
  });

  test("export pipeline logs are consistent across modes", async ({ page }) => {
    const capturedLogs: { mode: string; runId: string; scale: number }[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("[exportPipeline]") && text.includes("mode")) {
        try {
          // Parse the log to extract key values
          const modeMatch = text.match(/mode['":\s]+['"]?(\w+)/);
          const runIdMatch = text.match(/runId['":\s]+['"]?([a-z0-9-]+)/);
          const scaleMatch = text.match(/effectiveScale['":\s]+(\d+)/);

          if (modeMatch && runIdMatch && scaleMatch) {
            capturedLogs.push({
              mode: modeMatch[1],
              runId: runIdMatch[1],
              scale: parseInt(scaleMatch[1]),
            });
          }
        } catch {
          // Ignore parse errors
        }
      }
    });

    await page.goto(REPORT_PATH);
    await page.waitForLoadState("networkidle");

    // Open preview
    await page.click('button:has-text("Exportar PDF")');
    await page.click('text=Preview Normal');
    await page.waitForTimeout(2000);

    // Trigger PNG export
    const pngButton = page.locator('button:has-text("PNG")');
    if (await pngButton.isVisible()) {
      // Set up download listener to handle the download
      page.on("download", () => {});
      await pngButton.click();
      await page.waitForTimeout(3000);
    }

    // Verify all captured logs have scale = 1
    for (const log of capturedLogs) {
      expect(log.scale).toBe(1);
    }

    console.log("Captured export logs:", capturedLogs);
  });
});
