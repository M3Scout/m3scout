import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export interface PdfExportOptions {
  filename?: string;
  scale?: number;
  onProgress?: (progress: number) => void;
}


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

function createExportWrapper(source: HTMLElement) {
  // A4 @ 96dpi ≈ 794px
  const wrapper = document.createElement("div");
  wrapper.setAttribute("data-pdf-export-wrapper", "true");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-10000px";
  wrapper.style.top = "0";
  wrapper.style.width = "794px";
  wrapper.style.background = "#FFFFFF";
  wrapper.style.pointerEvents = "none";
  wrapper.style.opacity = "0";
  wrapper.style.overflow = "visible";
  wrapper.style.zIndex = "-1";

  const clone = source.cloneNode(true) as HTMLElement;
  // Ensure clone isn't affected by parent transforms
  clone.style.transform = "none";

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
  const { filename = "report.pdf", scale = 2, onProgress } = options;

  onProgress?.(5);

  // Ensure fonts are ready before cloning (prevents swapped font in clone)
  await waitForFonts();
  onProgress?.(10);

  const { wrapper, clone } = createExportWrapper(element);

  try {
    // Wait for the clone to be fully laid out
    await new Promise((r) => setTimeout(r, 50));

    await waitForFonts();
    await waitForImagesDecode(clone);
    onProgress?.(20);

    await preloadImages(clone);
    onProgress?.(35);

    const canvas = await html2canvas(clone, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#FFFFFF",
      logging: false,
      imageTimeout: 30000,
      removeContainer: true,
      onclone: (_clonedDoc, clonedElement) => {
        // Force export-safe defaults without changing layout
        clonedElement.style.backgroundColor = "#FFFFFF";
        clonedElement.style.overflow = "visible";

        // Avoid any transform inheritance
        clonedElement.style.transform = "none";

        // Ensure all SVGs have explicit dimensions (helps charts/icons)
        const svgs = clonedElement.querySelectorAll("svg");
        svgs.forEach((svg) => {
          const rect = svg.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            svg.setAttribute("width", `${Math.round(rect.width)}`);
            svg.setAttribute("height", `${Math.round(rect.height)}`);
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
