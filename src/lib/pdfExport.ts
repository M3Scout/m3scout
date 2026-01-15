import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export interface PdfExportOptions {
  filename?: string;
  /**
   * Canvas scale for html2canvas.
   * IMPORTANT: This app requires scale=1 for pixel-identical layout matching.
   * Higher scales cause subtle flex/baseline alignment shifts.
   */
  scale?: number;
  onProgress?: (progress: number) => void;
  /** If true, capture only the first A4 page (~1123px at 96dpi) for faster debug */
  firstPageOnly?: boolean;
  /** If true, open the captured canvas in a new tab with debug overlay instead of downloading */
  debugMode?: boolean;
  /**
   * Output resolution multiplier for PNG/PDF (default: 2).
   * This upscales the final image AFTER html2canvas renders at scale=1,
   * preserving layout while improving quality.
   * - 1 = same as capture (794px wide)
   * - 2 = 2x resolution (~1588px wide) - recommended
   * - 3 = 3x resolution (~2382px wide) - high quality print
   */
  outputResolution?: number;
}

type ExportMode = "png" | "pdf" | "debug";

type ExportTypography = {
  source: { fontFamily: string; fontSize: string; lineHeight: string };
  clone: { fontFamily: string; fontSize: string; lineHeight: string };
  matches: boolean;
};

type ExportMeta = {
  runId: string;
  mode: ExportMode;
  providedScale: number;
  effectiveScale: number;
  captureWidth: number;
  captureHeight: number;
  cloneRect: DOMRect;
  wrapperRect: DOMRect;
  element: { tag: string; id?: string; className?: string };
  clone: { tag: string; id?: string; className?: string };
  typography: ExportTypography;
  logoRects: Array<{ alt: string; rect: { width: number; height: number } }>;
};

// A4 page height in pixels at 96dpi
const A4_PAGE_HEIGHT_PX = 1123;

// Google Fonts URL for Inter (used by the app)
const INTER_FONT_URL =
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap";

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/** Wait for all fonts to finish loading to avoid layout shifts. */
async function waitForFonts(): Promise<void> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
}

/** Best-effort wait for images decode/load. */
async function waitForImagesDecode(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll("img"));

  await Promise.all(
    images.map(async (img) => {
      try {
        // decode() is best because it waits for decoding too (not only network)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const decodeFn = (img as any).decode as undefined | (() => Promise<void>);
        if (decodeFn) {
          await decodeFn.call(img);
          return;
        }

        if (img.complete) return;

        await new Promise<void>((resolve) => {
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          setTimeout(done, 5000);
        });
      } catch {
        // ignore
      }
    })
  );
}

function describeElement(el: HTMLElement): { tag: string; id?: string; className?: string } {
  const tag = el.tagName.toLowerCase();
  const id = el.id || undefined;
  const className = typeof el.className === "string" && el.className.trim().length
    ? el.className
    : undefined;
  return { tag, id, className };
}

/**
 * Draw an image into a canvas respecting a subset of CSS object-fit behavior.
 * This is crucial to avoid logo distortion when converting to data URLs.
 */
function drawImageWithObjectFit(params: {
  ctx: CanvasRenderingContext2D;
  img: HTMLImageElement;
  targetW: number;
  targetH: number;
  objectFit: string;
}): void {
  const { ctx, img, targetW, targetH } = params;
  const objectFit = (params.objectFit || "fill").toLowerCase();

  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih || !targetW || !targetH) return;

  // Default background transparent; keep as-is (the wrapper is white).

  if (objectFit === "fill") {
    ctx.drawImage(img, 0, 0, targetW, targetH);
    return;
  }

  const scale =
    objectFit === "cover"
      ? Math.max(targetW / iw, targetH / ih)
      : Math.min(targetW / iw, targetH / ih); // contain + scale-down + none fallback

  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (targetW - dw) / 2;
  const dy = (targetH - dh) / 2;

  ctx.drawImage(img, dx, dy, dw, dh);
}

/**
 * Convert <img> tags inside an element to data URLs to avoid CORS/rendering issues.
 * CRITICAL: preserve displayed sizing AND object-fit so logos/photos do not get stretched.
 */
async function preloadImagesPreservingLayout(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll("img"));

  await Promise.all(
    images.map(async (imgEl) => {
      // Skip if already data
      if (!imgEl.src || imgEl.src.startsWith("data:")) return;

      const rect = imgEl.getBoundingClientRect();
      const displayedWidth = Math.max(1, Math.round(rect.width || imgEl.offsetWidth || imgEl.width || 1));
      const displayedHeight = Math.max(1, Math.round(rect.height || imgEl.offsetHeight || imgEl.height || 1));

      // Lock layout for the clone so html2canvas sees the same box
      imgEl.style.width = `${displayedWidth}px`;
      imgEl.style.height = `${displayedHeight}px`;
      imgEl.style.objectFit = getComputedStyle(imgEl).objectFit || "contain";

      const cs = getComputedStyle(imgEl);
      const objectFit = cs.objectFit || "contain";

      const src = imgEl.currentSrc || imgEl.src;

      await new Promise<void>((resolve) => {
        const testImg = new Image();
        testImg.crossOrigin = "anonymous";

        testImg.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = displayedWidth;
            canvas.height = displayedHeight;

            const ctx = canvas.getContext("2d");
            if (ctx) {
              drawImageWithObjectFit({
                ctx,
                img: testImg,
                targetW: displayedWidth,
                targetH: displayedHeight,
                objectFit,
              });
              imgEl.src = canvas.toDataURL("image/png");
            }
          } catch {
            // keep original src
          }
          resolve();
        };

        testImg.onerror = () => resolve();
        testImg.src = src;
      });
    })
  );
}

function createExportWrapper(source: HTMLElement) {
  // A4 @ 96dpi ≈ 794px
  const wrapper = document.createElement("div");
  wrapper.setAttribute("data-pdf-export-wrapper", "true");

  // IMPORTANT: visible and off-screen (avoid opacity:0 which can blank captures)
  wrapper.style.position = "fixed";
  wrapper.style.left = "-10000px";
  wrapper.style.top = "0";
  wrapper.style.width = "794px";
  wrapper.style.background = "#FFFFFF";
  wrapper.style.pointerEvents = "none";
  wrapper.style.visibility = "visible";
  wrapper.style.opacity = "1";
  wrapper.style.overflow = "visible";
  wrapper.style.zIndex = "0";
  wrapper.style.transform = "none";

  // Inherit typography from body (do not introduce export-only typography)
  const bodyCs = getComputedStyle(document.body);
  wrapper.style.fontFamily = bodyCs.fontFamily;
  wrapper.style.fontSize = bodyCs.fontSize;
  wrapper.style.lineHeight = bodyCs.lineHeight;

  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.transform = "none";
  clone.style.display = "block";
  clone.style.backgroundColor = "#FFFFFF";

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  return { wrapper, clone };
}

/** Inject Google Fonts stylesheet into a document (for font embedding in export). */
function injectFontStylesheet(doc: Document): HTMLLinkElement {
  const link = doc.createElement("link");
  link.rel = "stylesheet";
  link.href = INTER_FONT_URL;
  doc.head.appendChild(link);
  return link;
}

async function waitForDocFonts(doc: Document): Promise<void> {
  if (doc.fonts?.ready) {
    await doc.fonts.ready;
  }
}

function openDebugWindow(canvas: HTMLCanvasElement, meta: ExportMeta): void {
  const debugWindow = window.open("", "_blank", "width=1000,height=800");
  if (!debugWindow) {
    // eslint-disable-next-line no-console
    console.error("Could not open debug window - popup blocker?");
    return;
  }

  const { typography, effectiveScale } = meta;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Export Debug - Canvas Capture</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: #1a1a2e;
      color: #eee;
      padding: 20px;
    }
    .header {
      background: #16213e;
      padding: 16px 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .header h1 { font-size: 18px; margin-bottom: 8px; color: #00d9ff; }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    .metric {
      background: #0f3460;
      padding: 12px 16px;
      border-radius: 6px;
    }
    .metric-label {
      font-size: 11px;
      text-transform: uppercase;
      color: #7f8c9f;
      margin-bottom: 4px;
    }
    .metric-value {
      font-size: 14px;
      font-weight: 600;
      color: #fff;
      word-break: break-word;
    }
    .metric-value.match { color: #10b981; }
    .metric-value.mismatch { color: #ef4444; }
    .canvas-container {
      background: #fff;
      border-radius: 8px;
      padding: 10px;
      overflow: auto;
      max-height: 60vh;
    }
    img { display: block; max-width: 100%; height: auto; }
    .status {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .status.ok { background: #10b981; color: #fff; }
    .status.fail { background: #ef4444; color: #fff; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Export Debug - Canvas Capture</h1>
    <span class="status ${typography.matches ? "ok" : "fail"}">
      Typography: ${typography.matches ? "✓ MATCH" : "✗ MISMATCH"}
    </span>
    <span class="status ${effectiveScale === 1 ? "ok" : "fail"}" style="margin-left: 8px;">
      Scale: ${effectiveScale === 1 ? "✓ 1x (OK)" : `✗ ${effectiveScale}x (SHOULD BE 1x)`}
    </span>
  </div>

  <div class="metrics">
    <div class="metric">
      <div class="metric-label">Run ID</div>
      <div class="metric-value">${meta.runId}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Mode</div>
      <div class="metric-value">${meta.mode}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Canvas (px)</div>
      <div class="metric-value">${canvas.width} × ${canvas.height}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Layout Width (must be ~794px)</div>
      <div class="metric-value ${Math.abs(Math.round(canvas.width / effectiveScale) - 794) < 10 ? "match" : "mismatch"}">
        ${Math.round(canvas.width / effectiveScale)}px
      </div>
    </div>
    <div class="metric">
      <div class="metric-label">Captured Element</div>
      <div class="metric-value">${meta.element.tag}${meta.element.id ? `#${meta.element.id}` : ""}${meta.element.className ? `.${meta.element.className.split(" ").join(".")}` : ""}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Wrapper Width</div>
      <div class="metric-value ${Math.abs(Math.round(meta.wrapperRect.width) - 794) < 2 ? "match" : "mismatch"}">${Math.round(meta.wrapperRect.width)}px</div>
    </div>
  </div>

  <div class="canvas-container">
    <img src="${canvas.toDataURL("image/png", 1.0)}" alt="Captured Canvas" />
  </div>
</body>
</html>
  `.trim();

  debugWindow.document.open();
  debugWindow.document.write(html);
  debugWindow.document.close();
}

function getTypography(source: HTMLElement, clone: HTMLElement): ExportTypography {
  const srcCs = getComputedStyle(source);
  const cloneCs = getComputedStyle(clone);

  return {
    source: {
      fontFamily: srcCs.fontFamily,
      fontSize: srcCs.fontSize,
      lineHeight: srcCs.lineHeight,
    },
    clone: {
      fontFamily: cloneCs.fontFamily,
      fontSize: cloneCs.fontSize,
      lineHeight: cloneCs.lineHeight,
    },
    matches:
      srcCs.fontFamily === cloneCs.fontFamily &&
      srcCs.fontSize === cloneCs.fontSize &&
      srcCs.lineHeight === cloneCs.lineHeight,
  };
}

function collectLogoRects(clone: HTMLElement): Array<{ alt: string; rect: { width: number; height: number } }> {
  return Array.from(clone.querySelectorAll("img"))
    .filter((img) => (img.getAttribute("alt") || "").toLowerCase().includes("m3"))
    .map((img) => {
      const r = img.getBoundingClientRect();
      return { alt: img.getAttribute("alt") || "", rect: { width: Math.round(r.width), height: Math.round(r.height) } };
    });
}

/**
 * SINGLE SOURCE OF TRUTH:
 * Build the export canvas (same pipeline for Debug, PNG download, and PDF generation).
 */
export async function buildExportCanvas(
  element: HTMLElement,
  options: { scale?: number; onProgress?: (progress: number) => void; firstPageOnly?: boolean; mode: ExportMode }
): Promise<{ canvas: HTMLCanvasElement; meta: ExportMeta }> {
  const { onProgress, firstPageOnly = false, mode } = options;

  // Non-negotiable rule: scale must be 1.
  const providedScale = typeof options.scale === "number" ? options.scale : 1;
  const effectiveScale = 1;

  const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  onProgress?.(5);
  await waitForFonts();
  onProgress?.(10);

  const { wrapper, clone } = createExportWrapper(element);

  try {
    await nextFrame();
    await nextFrame();

    await waitForFonts();
    await waitForImagesDecode(clone);
    onProgress?.(20);

    // Convert images to data URLs while preserving object-fit (prevents logo distortion)
    await preloadImagesPreservingLayout(clone);
    await nextFrame();
    await waitForImagesDecode(clone);
    onProgress?.(40);

    const cloneRect = clone.getBoundingClientRect();
    const captureWidth = Math.max(1, Math.ceil(cloneRect.width));
    const fullHeight = Math.max(1, Math.ceil(cloneRect.height));
    const captureHeight = firstPageOnly ? Math.min(fullHeight, A4_PAGE_HEIGHT_PX) : fullHeight;

    const wrapperRect = wrapper.getBoundingClientRect();

    const typography = getTypography(element, clone);

    const meta: ExportMeta = {
      runId,
      mode,
      providedScale,
      effectiveScale,
      captureWidth,
      captureHeight,
      cloneRect,
      wrapperRect,
      element: describeElement(element),
      clone: describeElement(clone),
      typography,
      logoRects: collectLogoRects(clone),
    };

    if (captureWidth <= 1 || captureHeight <= 1) {
      throw new Error("Elemento para export não foi renderizado (dimensões 0)");
    }

    const canvas = await html2canvas(clone, {
      // CRITICAL: never deviate from 1.
      scale: effectiveScale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: true,
      imageTimeout: 30000,
      removeContainer: true,

      // lock the viewport and capture box to the report itself
      width: captureWidth,
      height: captureHeight,
      windowWidth: captureWidth,
      windowHeight: captureHeight,
      scrollX: 0,
      scrollY: 0,

      onclone: (clonedDoc, clonedElement) => {
        // Ensure Inter is present in the cloned document as well
        injectFontStylesheet(clonedDoc);

        // Ensure exported root is stable (no transforms)
        clonedElement.style.backgroundColor = "#FFFFFF";
        clonedElement.style.overflow = "visible";
        clonedElement.style.transform = "none";

        // ========== FIX POSITION PILLS (badges) ==========
        // Lock all badge/pill elements to use flex centering, not baseline
        const badges = clonedElement.querySelectorAll("span");
        badges.forEach((span) => {
          const cs = getComputedStyle(span);
          // Detect pill-like elements (has background, border-radius, small height)
          const hasBg = cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent";
          const hasRadius = parseFloat(cs.borderRadius) > 6;
          const isSmall = parseFloat(cs.height) > 0 && parseFloat(cs.height) < 50;
          
          if (hasBg && hasRadius && isSmall) {
            // Lock pill styles to match preview exactly
            span.style.display = "inline-flex";
            span.style.alignItems = "center";
            span.style.justifyContent = "center";
            span.style.lineHeight = "1";
            span.style.verticalAlign = "middle";
            span.style.boxSizing = "border-box";
            // Preserve computed height
            const height = Math.round(parseFloat(cs.height));
            if (height > 0) {
              span.style.height = `${height}px`;
            }
          }
        });

        // Ensure SVGs have explicit dimensions (helps charts/icons)
        const svgs = clonedElement.querySelectorAll("svg");
        svgs.forEach((svg) => {
          const r = svg.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            svg.setAttribute("width", `${Math.round(r.width)}`);
            svg.setAttribute("height", `${Math.round(r.height)}`);
          }
        });

        // Ensure images are eager and visible
        const images = clonedElement.querySelectorAll("img");
        images.forEach((img) => {
          img.loading = "eager";
          img.style.visibility = "visible";
          img.style.opacity = "1";

          // Hard rule for logos: prevent stretching
          const alt = (img.getAttribute("alt") || "").toLowerCase();
          if (alt.includes("m3")) {
            img.style.width = "auto";
            // Keep current height if it exists, otherwise default to 56px
            if (!img.style.height) img.style.height = "56px";
            img.style.objectFit = "contain";
            img.style.transform = "none";
          }
        });

        // Wait for fonts in the cloned document too
        // (best-effort; html2canvas doesn't await promises here)
        void waitForDocFonts(clonedDoc);
      },
    });

    onProgress?.(80);

    return { canvas, meta };
  } finally {
    wrapper.remove();
  }
}

/**
 * Upscale a canvas to higher resolution while preserving the layout.
 * This is the key to getting sharp PNG/PDF without changing html2canvas scale.
 */
function upscaleCanvas(sourceCanvas: HTMLCanvasElement, multiplier: number): HTMLCanvasElement {
  if (multiplier <= 1) return sourceCanvas;

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = sourceCanvas.width * multiplier;
  outputCanvas.height = sourceCanvas.height * multiplier;

  const ctx = outputCanvas.getContext("2d");
  if (!ctx) return sourceCanvas;

  // Enable high-quality scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Scale and draw
  ctx.setTransform(multiplier, 0, 0, multiplier, 0, 0);
  ctx.drawImage(sourceCanvas, 0, 0);

  // Reset transform
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  return outputCanvas;
}

/**
 * Export a DOM element to PDF.
 * IMPORTANT: Uses the exact same buildExportCanvas pipeline as PNG/Debug.
 */
export async function exportToPdf(element: HTMLElement, options: PdfExportOptions = {}): Promise<void> {
  const {
    filename = "report.pdf",
    scale = 1,
    onProgress,
    firstPageOnly = false,
    debugMode = false,
    outputResolution = 2, // Default 2x for crisp output
  } = options;

  const mode: ExportMode = debugMode ? "debug" : "pdf";

  const { canvas: baseCanvas, meta } = await buildExportCanvas(element, {
    scale,
    onProgress,
    firstPageOnly,
    mode,
  });

  if (debugMode) {
    openDebugWindow(baseCanvas, meta);
    onProgress?.(100);
    return;
  }

  // Upscale for higher quality output
  const canvas = upscaleCanvas(baseCanvas, outputResolution);

  // A4 dimensions in mm
  const a4Width = 210;
  const a4Height = 297;

  const imgWidth = a4Width;
  // Use base canvas dimensions for aspect ratio (not upscaled)
  const imgHeight = (baseCanvas.height * imgWidth) / baseCanvas.width;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  onProgress?.(85);

  // Use high-quality PNG from upscaled canvas
  const imgData = canvas.toDataURL("image/png", 1.0);
  const totalPages = Math.ceil(imgHeight / a4Height);

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) pdf.addPage();
    const yOffset = -(page * a4Height);
    // Use NONE compression for maximum quality
    pdf.addImage(imgData, "PNG", 0, yOffset, imgWidth, imgHeight, undefined, "NONE");
  }

  onProgress?.(95);
  pdf.save(filename);
  onProgress?.(100);
}

/**
 * Export a DOM element to PNG.
 * IMPORTANT: Uses the exact same buildExportCanvas pipeline as PDF/Debug.
 */
export async function exportToPng(
  element: HTMLElement,
  options: {
    filename?: string;
    scale?: number;
    onProgress?: (progress: number) => void;
    firstPageOnly?: boolean;
    debugMode?: boolean;
    outputResolution?: number;
  } = {}
): Promise<void> {
  const {
    filename = "preview.png",
    scale = 1,
    onProgress,
    firstPageOnly = false,
    debugMode = false,
    outputResolution = 2, // Default 2x for crisp output
  } = options;

  const mode: ExportMode = debugMode ? "debug" : "png";

  const { canvas: baseCanvas, meta } = await buildExportCanvas(element, {
    scale,
    onProgress,
    firstPageOnly,
    mode,
  });

  if (debugMode) {
    openDebugWindow(baseCanvas, meta);
    onProgress?.(100);
    return;
  }

  // Upscale for higher quality output
  const canvas = upscaleCanvas(baseCanvas, outputResolution);

  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png", 1.0);
  link.click();

  onProgress?.(100);
}

/** Generate a filename for the scouting report */
export function generateReportFilename(playerName: string, date: string): string {
  const sanitizedName = playerName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .toLowerCase();

  const formattedDate = new Date(date).toISOString().split("T")[0];

  return `relatorio_scouting_${sanitizedName}_${formattedDate}.pdf`;
}

/** Generate a PNG filename for the scouting report */
export function generateReportPngFilename(playerName: string, date: string): string {
  const sanitizedName = playerName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .toLowerCase();

  const formattedDate = new Date(date).toISOString().split("T")[0];

  return `relatorio_scouting_${sanitizedName}_${formattedDate}.png`;
}
