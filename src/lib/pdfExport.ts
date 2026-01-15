import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export interface PdfExportOptions {
  filename?: string;
  scale?: number;
  onProgress?: (progress: number) => void;
  /** If true, capture only the first A4 page (~1123px at 96dpi) for faster debug */
  firstPageOnly?: boolean;
}

// A4 page height in pixels at 96dpi
const A4_PAGE_HEIGHT_PX = 1123;


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
 */
async function preloadImages(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll("img");
  const imagePromises: Promise<void>[] = [];

  images.forEach((img) => {
    if (img.src && !img.src.startsWith("data:")) {
      const promise = new Promise<void>((resolve) => {
        const testImg = new Image();
        testImg.crossOrigin = "anonymous";
        testImg.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = testImg.width;
            canvas.height = testImg.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(testImg, 0, 0);
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

  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.transform = "none";
  clone.style.display = "block";
  // Force white bg at root to avoid transparent results
  clone.style.backgroundColor = "#FFFFFF";

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  return { wrapper, clone };
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
    scale = 2,
    onProgress,
    firstPageOnly = false,
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
  options: { filename?: string; scale?: number; onProgress?: (progress: number) => void; firstPageOnly?: boolean } = {}
): Promise<void> {
  const { filename = "preview.png", scale = 2, onProgress, firstPageOnly = false } = options;

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
