import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export interface PdfExportOptions {
  filename?: string;
  /** 
   * Canvas scale for html2canvas. 
   * IMPORTANT: Use scale=1 for pixel-identical layout matching.
   * Higher scales (2x, 3x) cause subtle layout shifts in flex/baseline alignment.
   * For PDF quality, rely on PDF compression settings, not canvas scale.
   * Default: 1 (pixel-identical to preview)
   */
  scale?: number;
  onProgress?: (progress: number) => void;
  /** If true, capture only the first A4 page (~1123px at 96dpi) for faster debug */
  firstPageOnly?: boolean;
  /** If true, open the captured canvas in a new tab with debug overlay instead of downloading */
  debugMode?: boolean;
}

// A4 page height in pixels at 96dpi
const A4_PAGE_HEIGHT_PX = 1123;

// Google Fonts URL for Inter (used by the app)
const INTER_FONT_URL = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap";


/**
 * Wait for all fonts to finish loading to avoid layout shifts.
 */
async function waitForFonts(): Promise<void> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
}

/**
 * Best-effort wait for images decode/load.
 */
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

/**
 * Preload all images in an element and convert to base64 for reliable PDF rendering.
 * IMPORTANT: Call this on the export CLONE, never on the visible preview.
 * 
 * This function preserves the DISPLAYED dimensions of each image (from CSS/attributes)
 * rather than using the natural image dimensions, which could cause distortion.
 */
async function preloadImages(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll("img");
  const imagePromises: Promise<void>[] = [];

  images.forEach((img) => {
    if (img.src && !img.src.startsWith("data:")) {
      const promise = new Promise<void>((resolve) => {
        // Capture the DISPLAYED dimensions before loading
        const displayedWidth = img.offsetWidth || img.width || 100;
        const displayedHeight = img.offsetHeight || img.height || 100;

        const testImg = new Image();
        testImg.crossOrigin = "anonymous";
        testImg.onload = () => {
          try {
            // Use the DISPLAYED dimensions, not natural dimensions
            // This prevents distortion when the CSS constrains the image
            const canvas = document.createElement("canvas");
            canvas.width = displayedWidth;
            canvas.height = displayedHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              // Draw the image scaled to the displayed dimensions
              ctx.drawImage(testImg, 0, 0, displayedWidth, displayedHeight);
              img.src = canvas.toDataURL("image/png");
            }
          } catch {
            // Keep original src if conversion fails
          }
          resolve();
        };
        testImg.onerror = () => resolve();
        testImg.src = img.src;
      });
      imagePromises.push(promise);
    }
  });

  await Promise.all(imagePromises);
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * Inject Google Fonts stylesheet into a document (for font embedding in export).
 */
function injectFontStylesheet(doc: Document): HTMLLinkElement {
  const link = doc.createElement("link");
  link.rel = "stylesheet";
  link.href = INTER_FONT_URL;
  doc.head.appendChild(link);
  return link;
}

/**
 * Wait for fonts to be loaded on a specific document.
 */
async function waitForDocFonts(doc: Document): Promise<void> {
  if (doc.fonts?.ready) {
    await doc.fonts.ready;
  }
}

function createExportWrapper(source: HTMLElement) {
  // A4 @ 96dpi ≈ 794px
  const wrapper = document.createElement("div");
  wrapper.setAttribute("data-pdf-export-wrapper", "true");

  // IMPORTANT:
  // - must be "visible" for html2canvas to render
  // - must not be opacity:0 (would result in blank capture)
  // We move it off-screen instead.
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
  
  // CRITICAL: Inherit the exact same font-family from the document body
  // This ensures the export uses 'Inter' (or whatever font the app uses)
  // instead of falling back to system-ui which causes layout mismatches.
  const bodyCs = getComputedStyle(document.body);
  wrapper.style.fontFamily = bodyCs.fontFamily;
  wrapper.style.fontSize = bodyCs.fontSize;
  wrapper.style.lineHeight = bodyCs.lineHeight;

  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.transform = "none";
  clone.style.display = "block";
  // Force white bg at root to avoid transparent results
  clone.style.backgroundColor = "#FFFFFF";
  
  // Ensure the clone inherits font from wrapper (which inherits from body)
  // Do NOT override fontFamily, fontSize, or lineHeight on the clone

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  return { wrapper, clone };
}

/**
 * Open a debug window with the captured canvas and overlay showing measurements.
 */
function openDebugWindow(
  canvas: HTMLCanvasElement,
  typography: {
    source: { fontFamily: string; fontSize: string; lineHeight: string };
    clone: { fontFamily: string; fontSize: string; lineHeight: string };
    matches: boolean;
  },
  scale: number
): void {
  const debugWindow = window.open("", "_blank", "width=1000,height=800");
  if (!debugWindow) {
    // eslint-disable-next-line no-console
    console.error("Could not open debug window - popup blocker?");
    return;
  }

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
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
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
      font-size: 16px; 
      font-weight: 600; 
      color: #fff; 
    }
    .metric-value.match { color: #10b981; }
    .metric-value.mismatch { color: #ef4444; }
    .typography { 
      background: #0f3460; 
      padding: 16px; 
      border-radius: 8px; 
      margin-bottom: 20px;
    }
    .typography h2 { 
      font-size: 14px; 
      color: #00d9ff; 
      margin-bottom: 12px; 
    }
    .typo-row { 
      display: flex; 
      gap: 20px; 
      margin-bottom: 8px; 
      font-size: 13px;
    }
    .typo-label { color: #7f8c9f; min-width: 100px; }
    .typo-source { color: #a3e635; }
    .typo-clone { color: #fbbf24; }
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
    <h1>🔍 Export Debug - Canvas Capture</h1>
    <span class="status ${typography.matches ? "ok" : "fail"}">
      Typography: ${typography.matches ? "✓ MATCH" : "✗ MISMATCH"}
    </span>
    <span class="status ${scale === 1 ? "ok" : "fail"}" style="margin-left: 8px;">
      Scale: ${scale === 1 ? "✓ 1x (OK)" : `✗ ${scale}x (SHOULD BE 1x)`}
    </span>
  </div>
  
  <div class="metrics">
    <div class="metric">
      <div class="metric-label">Canvas Width</div>
      <div class="metric-value">${canvas.width}px</div>
    </div>
    <div class="metric">
      <div class="metric-label">Canvas Height</div>
      <div class="metric-value">${canvas.height}px</div>
    </div>
    <div class="metric">
      <div class="metric-label">Scale</div>
      <div class="metric-value ${scale === 1 ? "match" : "mismatch"}">${scale}x ${scale === 1 ? "✓" : "✗"}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Layout Width (must be ~794px)</div>
      <div class="metric-value ${Math.abs(Math.round(canvas.width / scale) - 794) < 10 ? "match" : "mismatch"}">${Math.round(canvas.width / scale)}px</div>
    </div>
    <div class="metric">
      <div class="metric-label">Layout Height</div>
      <div class="metric-value">${Math.round(canvas.height / scale)}px</div>
    </div>
  </div>

  <div class="typography">
    <h2>Typography Comparison (Source vs Clone)</h2>
    <div class="typo-row">
      <span class="typo-label">fontFamily:</span>
      <span class="typo-source">${typography.source.fontFamily}</span>
      <span style="color:#555">→</span>
      <span class="typo-clone ${typography.source.fontFamily === typography.clone.fontFamily ? "" : "mismatch"}">${typography.clone.fontFamily}</span>
    </div>
    <div class="typo-row">
      <span class="typo-label">fontSize:</span>
      <span class="typo-source">${typography.source.fontSize}</span>
      <span style="color:#555">→</span>
      <span class="typo-clone ${typography.source.fontSize === typography.clone.fontSize ? "" : "mismatch"}">${typography.clone.fontSize}</span>
    </div>
    <div class="typo-row">
      <span class="typo-label">lineHeight:</span>
      <span class="typo-source">${typography.source.lineHeight}</span>
      <span style="color:#555">→</span>
      <span class="typo-clone ${typography.source.lineHeight === typography.clone.lineHeight ? "" : "mismatch"}">${typography.clone.lineHeight}</span>
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

/**
 * Export a DOM element to PDF with high-quality rendering.
 * Strategy: clone the EXACT preview DOM into a fixed-width A4 wrapper (no transforms)
 * to ensure the exported PDF matches the preview.
 */
export async function exportToPdf(
  element: HTMLElement,
  options: PdfExportOptions = {}
): Promise<void> {
  const {
    filename = "report.pdf",
    // CRITICAL: scale=1 ensures pixel-identical layout matching with preview.
    // Higher scales (2x, 3x) cause subtle flex/baseline alignment shifts.
    scale = 1,
    onProgress,
    firstPageOnly = false,
    debugMode = false,
  } = options;

  onProgress?.(5);

  // Ensure fonts are ready before cloning (prevents swapped font in clone)
  await waitForFonts();
  onProgress?.(10);

  const { wrapper, clone } = createExportWrapper(element);

  try {
    // Wait for clone layout + charts/SVG text layout settle
    await nextFrame();
    await nextFrame();

    await waitForFonts();
    await waitForImagesDecode(clone);
    onProgress?.(20);

    await preloadImages(clone);
    // Wait again after swapping to data URLs
    await nextFrame();
    await waitForImagesDecode(clone);
    onProgress?.(35);

    const rect = clone.getBoundingClientRect();
    const captureWidth = Math.max(1, Math.ceil(rect.width));
    // If firstPageOnly, limit to A4 page height
    const fullHeight = Math.max(1, Math.ceil(rect.height));
    const captureHeight = firstPageOnly
      ? Math.min(fullHeight, A4_PAGE_HEIGHT_PX)
      : fullHeight;

    // Debug logs requested
    // eslint-disable-next-line no-console
    console.log("[exportToPdf] element", element);
    // eslint-disable-next-line no-console
    console.log("[exportToPdf] clone rect", rect, { captureWidth, captureHeight });

    // Typography parity check (preview vs export clone)
    const srcCs = getComputedStyle(element);
    const cloneCs = getComputedStyle(clone);
    // eslint-disable-next-line no-console
    console.log("[exportToPdf] typography", {
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
    });

    if (captureWidth <= 1 || captureHeight <= 1) {
      throw new Error("Elemento para export não foi renderizado (dimensões 0)");
    }

    const canvas = await html2canvas(clone, {
      scale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: true,
      imageTimeout: 30000,
      removeContainer: true,

      // Critical: lock the viewport and capture box to the report itself
      width: captureWidth,
      height: captureHeight,
      windowWidth: captureWidth,
      windowHeight: captureHeight,
      scrollX: 0,
      scrollY: 0,

      onclone: (_clonedDoc, clonedElement) => {
        // Force export-safe defaults without changing layout
        clonedElement.style.backgroundColor = "#FFFFFF";
        clonedElement.style.overflow = "visible";

        // Avoid any transform inheritance
        clonedElement.style.transform = "none";

        // Ensure all SVGs have explicit dimensions (helps charts/icons)
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
        });
      },
    });

    // Debug: validate canvas isn't blank
    // eslint-disable-next-line no-console
    console.log("[exportToPdf] canvas", { width: canvas.width, height: canvas.height });
    // eslint-disable-next-line no-console
    console.log("[exportToPdf] canvas dataUrl head", canvas.toDataURL("image/png", 0.2).slice(0, 80));

    onProgress?.(65);

    // If debug mode, open canvas in new tab with overlay and exit early
    if (debugMode) {
      const typography = {
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
      openDebugWindow(canvas, typography, scale);
      onProgress?.(100);
      return;
    }

    // A4 dimensions in mm
    const a4Width = 210;
    const a4Height = 297;

    const imgWidth = a4Width;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    onProgress?.(75);

    const imgData = canvas.toDataURL("image/png", 1.0);
    const totalPages = Math.ceil(imgHeight / a4Height);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();

      const yOffset = -(page * a4Height);
      pdf.addImage(imgData, "PNG", 0, yOffset, imgWidth, imgHeight, undefined, "FAST");
    }

    onProgress?.(95);
    pdf.save(filename);
    onProgress?.(100);
  } finally {
    wrapper.remove();
  }
}

/**
 * Export a DOM element to PNG image for debugging/comparison.
 * Uses the same clone strategy as PDF export.
 */
export async function exportToPng(
  element: HTMLElement,
  options: { filename?: string; scale?: number; onProgress?: (progress: number) => void; firstPageOnly?: boolean; debugMode?: boolean } = {}
): Promise<void> {
  // CRITICAL: scale=1 ensures pixel-identical layout matching with preview.
  const { filename = "preview.png", scale = 1, onProgress, firstPageOnly = false, debugMode = false } = options;

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

    await preloadImages(clone);
    await nextFrame();
    await waitForImagesDecode(clone);
    onProgress?.(40);

    const rect = clone.getBoundingClientRect();
    const captureWidth = Math.max(1, Math.ceil(rect.width));
    const fullHeight = Math.max(1, Math.ceil(rect.height));
    const captureHeight = firstPageOnly
      ? Math.min(fullHeight, A4_PAGE_HEIGHT_PX)
      : fullHeight;

    // Debug logs requested
    // eslint-disable-next-line no-console
    console.log("[exportToPng] element", element);
    // eslint-disable-next-line no-console
    console.log("[exportToPng] clone rect", rect, { captureWidth, captureHeight });

    // Typography parity check (preview vs export clone)
    const srcCs = getComputedStyle(element);
    const cloneCs = getComputedStyle(clone);
    // eslint-disable-next-line no-console
    console.log("[exportToPng] typography", {
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
    });

    if (captureWidth <= 1 || captureHeight <= 1) {
      throw new Error("Elemento para export não foi renderizado (dimensões 0)");
    }

    const canvas = await html2canvas(clone, {
      scale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: true,
      imageTimeout: 30000,
      removeContainer: true,

      // Critical: lock the viewport and capture box to the report itself
      width: captureWidth,
      height: captureHeight,
      windowWidth: captureWidth,
      windowHeight: captureHeight,
      scrollX: 0,
      scrollY: 0,

      onclone: (_clonedDoc, clonedElement) => {
        clonedElement.style.backgroundColor = "#FFFFFF";
        clonedElement.style.overflow = "visible";
        clonedElement.style.transform = "none";

        const svgs = clonedElement.querySelectorAll("svg");
        svgs.forEach((svg) => {
          const r = svg.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            svg.setAttribute("width", `${Math.round(r.width)}`);
            svg.setAttribute("height", `${Math.round(r.height)}`);
          }
        });

        const images = clonedElement.querySelectorAll("img");
        images.forEach((img) => {
          img.loading = "eager";
          img.style.visibility = "visible";
          img.style.opacity = "1";
        });
      },
    });

    // Debug: validate canvas isn't blank
    // eslint-disable-next-line no-console
    console.log("[exportToPng] canvas", { width: canvas.width, height: canvas.height });
    // eslint-disable-next-line no-console
    console.log("[exportToPng] canvas dataUrl head", canvas.toDataURL("image/png", 0.2).slice(0, 80));

    onProgress?.(80);

    // If debug mode, open canvas in new tab with overlay and exit early
    if (debugMode) {
      const typography = {
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
      openDebugWindow(canvas, typography, scale);
      onProgress?.(100);
      return;
    }

    // Download canvas as PNG
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png", 1.0);
    link.click();

    onProgress?.(100);
  } finally {
    wrapper.remove();
  }
}

/**
 * Generate a filename for the scouting report
 */
export function generateReportFilename(
  playerName: string,
  date: string
): string {
  const sanitizedName = playerName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-zA-Z0-9\s]/g, "") // Remove special chars
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .toLowerCase();

  const formattedDate = new Date(date).toISOString().split("T")[0];

  return `relatorio_scouting_${sanitizedName}_${formattedDate}.pdf`;
}

/**
 * Generate a PNG filename for the scouting report
 */
export function generateReportPngFilename(
  playerName: string,
  date: string
): string {
  const sanitizedName = playerName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .toLowerCase();

  const formattedDate = new Date(date).toISOString().split("T")[0];

  return `relatorio_scouting_${sanitizedName}_${formattedDate}.png`;
}
