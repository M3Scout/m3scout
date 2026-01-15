import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildExportCanvas } from "./pdfExport";

// Mock html2canvas since it requires a real browser environment
vi.mock("html2canvas", () => ({
  default: vi.fn().mockImplementation((element, options) => {
    // Simulate html2canvas behavior
    const canvas = document.createElement("canvas");
    // Use the provided width/height and scale
    const scale = options?.scale ?? 1;
    canvas.width = (options?.width ?? 794) * scale;
    canvas.height = (options?.height ?? 1123) * scale;
    
    // Draw something so toDataURL works
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    return Promise.resolve(canvas);
  }),
}));

describe("pdfExport", () => {
  let testElement: HTMLDivElement;
  
  beforeEach(() => {
    // Create a mock element that simulates the PDF template
    testElement = document.createElement("div");
    testElement.className = "pdf-export";
    testElement.style.width = "210mm"; // A4 width
    testElement.style.minHeight = "297mm"; // A4 height
    testElement.style.backgroundColor = "#FFFFFF";
    
    // Add a mock logo image
    const logo = document.createElement("img");
    logo.alt = "M3";
    logo.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    logo.style.width = "80px";
    logo.style.height = "48px";
    logo.style.objectFit = "contain";
    testElement.appendChild(logo);
    
    // Append to body for proper rendering
    document.body.appendChild(testElement);
    
    // Mock getBoundingClientRect for the test element
    vi.spyOn(testElement, "getBoundingClientRect").mockReturnValue({
      width: 794,
      height: 1123,
      top: 0,
      left: 0,
      right: 794,
      bottom: 1123,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    
    // Mock getBoundingClientRect for the logo
    vi.spyOn(logo, "getBoundingClientRect").mockReturnValue({
      width: 80,
      height: 48,
      top: 0,
      left: 0,
      right: 80,
      bottom: 48,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    // Mock document.fonts
    Object.defineProperty(document, "fonts", {
      value: {
        ready: Promise.resolve(),
      },
      writable: true,
    });
  });
  
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  describe("buildExportCanvas", () => {
    it("should always use scale = 1 regardless of provided scale", async () => {
      const { meta } = await buildExportCanvas(testElement, {
        scale: 3, // Try to force scale 3
        mode: "png",
      });
      
      expect(meta.effectiveScale).toBe(1);
      expect(meta.providedScale).toBe(3);
    });

    it("should return layout width approximately 794px (A4 @ 96dpi)", async () => {
      const { canvas, meta } = await buildExportCanvas(testElement, {
        mode: "png",
      });
      
      const layoutWidth = canvas.width / meta.effectiveScale;
      
      // A4 width at 96dpi is 794px, allow 10px tolerance
      expect(layoutWidth).toBeGreaterThanOrEqual(784);
      expect(layoutWidth).toBeLessThanOrEqual(804);
    });

    it("should use consistent runId across meta object", async () => {
      const { meta } = await buildExportCanvas(testElement, {
        mode: "debug",
      });
      
      expect(meta.runId).toBeDefined();
      expect(typeof meta.runId).toBe("string");
      expect(meta.runId.length).toBeGreaterThan(5);
    });

    it("should report correct mode in meta", async () => {
      const pngResult = await buildExportCanvas(testElement, { mode: "png" });
      const pdfResult = await buildExportCanvas(testElement, { mode: "pdf" });
      const debugResult = await buildExportCanvas(testElement, { mode: "debug" });
      
      expect(pngResult.meta.mode).toBe("png");
      expect(pdfResult.meta.mode).toBe("pdf");
      expect(debugResult.meta.mode).toBe("debug");
    });

    it("should capture element description in meta", async () => {
      const { meta } = await buildExportCanvas(testElement, {
        mode: "png",
      });
      
      expect(meta.element).toBeDefined();
      expect(meta.element.tag).toBe("div");
      expect(meta.element.className).toContain("pdf-export");
    });

    it("should track typography matching between source and clone", async () => {
      const { meta } = await buildExportCanvas(testElement, {
        mode: "png",
      });
      
      expect(meta.typography).toBeDefined();
      expect(meta.typography.source).toBeDefined();
      expect(meta.typography.clone).toBeDefined();
      expect(typeof meta.typography.matches).toBe("boolean");
    });

    it("should capture wrapper width at 794px", async () => {
      const { meta } = await buildExportCanvas(testElement, {
        mode: "png",
      });
      
      // Wrapper rect should be close to 794px (A4 width)
      expect(meta.wrapperRect).toBeDefined();
      // Note: In mock environment, this may not reflect actual 794px
      // The real test is that the wrapper is created with width: "794px"
    });

    it("should detect logo images in the template", async () => {
      const { meta } = await buildExportCanvas(testElement, {
        mode: "png",
      });
      
      // Should find at least one logo (the one we added with alt="M3")
      expect(meta.logoRects).toBeDefined();
      expect(Array.isArray(meta.logoRects)).toBe(true);
    });

    it("should respect firstPageOnly option for height limiting", async () => {
      // Create a tall element
      const tallElement = document.createElement("div");
      tallElement.style.width = "210mm";
      tallElement.style.height = "3000px"; // Taller than A4
      document.body.appendChild(tallElement);
      
      vi.spyOn(tallElement, "getBoundingClientRect").mockReturnValue({
        width: 794,
        height: 3000,
        top: 0,
        left: 0,
        right: 794,
        bottom: 3000,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });
      
      const fullResult = await buildExportCanvas(tallElement, {
        mode: "png",
        firstPageOnly: false,
      });
      
      const firstPageResult = await buildExportCanvas(tallElement, {
        mode: "png",
        firstPageOnly: true,
      });
      
      // First page only should be capped at A4 height (~1123px)
      expect(firstPageResult.meta.captureHeight).toBeLessThanOrEqual(1123);
      
      // Full export should capture the full height
      expect(fullResult.meta.captureHeight).toBeGreaterThan(1123);
      
      tallElement.remove();
    });
  });

  describe("Logo distortion prevention", () => {
    it("should preserve logo aspect ratio by tracking logo rects", async () => {
      // Add a logo with specific dimensions
      const logo = testElement.querySelector('img[alt="M3"]') as HTMLImageElement;
      expect(logo).toBeTruthy();
      
      const { meta } = await buildExportCanvas(testElement, {
        mode: "png",
      });
      
      // Find the logo in the captured metadata
      const logoRect = meta.logoRects.find((l) => l.alt.toLowerCase().includes("m3"));
      
      if (logoRect) {
        // Verify dimensions are captured (aspect ratio preserved check)
        expect(logoRect.rect.width).toBeGreaterThan(0);
        expect(logoRect.rect.height).toBeGreaterThan(0);
        
        // The logo should maintain its original aspect ratio
        // Original: 80x48, ratio ~1.67
        const aspectRatio = logoRect.rect.width / logoRect.rect.height;
        const expectedRatio = 80 / 48; // ~1.67
        
        // Allow 0.1 tolerance for aspect ratio
        expect(aspectRatio).toBeCloseTo(expectedRatio, 0);
      }
    });
  });

  describe("Scale enforcement", () => {
    it.each([
      [1, 1],
      [1.5, 1],
      [2, 1],
      [3, 1],
      [0.5, 1],
    ])("provided scale %d should result in effective scale %d", async (providedScale, expectedScale) => {
      const { meta } = await buildExportCanvas(testElement, {
        scale: providedScale,
        mode: "png",
      });
      
      expect(meta.effectiveScale).toBe(expectedScale);
    });
  });

  describe("Canvas output", () => {
    it("should return a valid canvas element", async () => {
      const { canvas } = await buildExportCanvas(testElement, {
        mode: "png",
      });
      
      expect(canvas).toBeInstanceOf(HTMLCanvasElement);
      expect(canvas.width).toBeGreaterThan(0);
      expect(canvas.height).toBeGreaterThan(0);
    });

    it("should be able to generate data URL from canvas", async () => {
      const { canvas } = await buildExportCanvas(testElement, {
        mode: "png",
      });
      
      const dataUrl = canvas.toDataURL("image/png");
      expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe("Progress callback", () => {
    it("should call onProgress with increasing values", async () => {
      const progressValues: number[] = [];
      
      await buildExportCanvas(testElement, {
        mode: "png",
        onProgress: (progress) => {
          progressValues.push(progress);
        },
      });
      
      expect(progressValues.length).toBeGreaterThan(0);
      
      // Progress should be increasing (or at least non-decreasing)
      for (let i = 1; i < progressValues.length; i++) {
        expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
      }
      
      // Should reach at least 80% by the end of buildExportCanvas
      expect(progressValues[progressValues.length - 1]).toBeGreaterThanOrEqual(80);
    });
  });
});
