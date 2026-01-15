import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export interface PdfExportOptions {
  filename?: string;
  scale?: number;
  onProgress?: (progress: number) => void;
}

// Fixed A4 width in pixels at 96dpi
const A4_WIDTH_PX = 794;

/**
 * Wait for all fonts to be loaded
 */
async function waitForFonts(): Promise<void> {
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
  // Extra safety delay for font rendering
  await new Promise((resolve) => setTimeout(resolve, 100));
}

/**
 * Wait for all images in an element to be fully loaded
 */
async function waitForImages(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll("img");
  const imagePromises: Promise<void>[] = [];

  images.forEach((img) => {
    if (!img.complete) {
      const promise = new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        // Timeout fallback
        setTimeout(resolve, 3000);
      });
      imagePromises.push(promise);
    }
  });

  await Promise.all(imagePromises);
}

/**
 * Preload all images in an element and convert to base64 for reliable PDF rendering
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

/**
 * Export a DOM element to PDF with high-quality rendering
 * Optimized for print-ready output with proper page breaks
 */
export async function exportToPdf(
  element: HTMLElement,
  options: PdfExportOptions = {}
): Promise<void> {
  const { filename = "report.pdf", scale = 2, onProgress } = options;

  onProgress?.(5);

  // Add exporting class to body for CSS overrides
  document.body.classList.add("exporting-pdf");

  try {
    // Wait for fonts to be fully loaded
    await waitForFonts();
    onProgress?.(10);

    // Wait for images to load
    await waitForImages(element);
    onProgress?.(15);

    // Preload and convert images to base64
    await preloadImages(element);
    onProgress?.(25);

    // Create canvas from the element with high resolution
    const canvas = await html2canvas(element, {
      scale: scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#FFFFFF",
      logging: false,
      imageTimeout: 30000,
      removeContainer: true,
      width: element.scrollWidth,
      height: element.scrollHeight,
      windowWidth: element.scrollWidth,
      onclone: (clonedDoc, clonedElement) => {
        // Force white background on container
        clonedElement.style.backgroundColor = "#FFFFFF";
        clonedElement.style.overflow = "visible";
        
        // Reset any transforms that might cause issues
        clonedElement.style.transform = "none";
        
        // Ensure all SVGs are properly sized and have explicit dimensions
        const svgs = clonedElement.querySelectorAll("svg");
        svgs.forEach((svg) => {
          const rect = svg.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            svg.setAttribute("width", Math.round(rect.width).toString());
            svg.setAttribute("height", Math.round(rect.height).toString());
            svg.style.overflow = "visible";
          }
        });
        
        // Ensure images have fixed dimensions and no lazy loading
        const images = clonedElement.querySelectorAll("img");
        images.forEach((img) => {
          img.crossOrigin = "anonymous";
          img.loading = "eager";
          img.style.visibility = "visible";
          img.style.opacity = "1";
        });

        // Normalize line-height to avoid fractional pixel issues
        const textElements = clonedElement.querySelectorAll("p, span, div, h1, h2, h3, h4, h5, h6");
        textElements.forEach((el) => {
          const element = el as HTMLElement;
          const computedStyle = window.getComputedStyle(element);
          const opacity = parseFloat(computedStyle.opacity);
          if (opacity < 0.75) {
            element.style.opacity = "0.85";
          }
        });
      },
    });

    onProgress?.(60);

    // A4 dimensions in mm
    const a4Width = 210;
    const a4Height = 297;
    
    // Calculate dimensions
    const imgWidth = a4Width;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Create PDF
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    onProgress?.(75);

    // Get image data at maximum quality
    const imgData = canvas.toDataURL("image/png", 1.0);
    
    // Calculate how many pages we need
    const totalPages = Math.ceil(imgHeight / a4Height);
    
    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage();
      }
      
      // Calculate the y offset for this page
      const yOffset = -(page * a4Height);
      
      // Add the image with offset
      pdf.addImage(
        imgData, 
        "PNG", 
        0, 
        yOffset, 
        imgWidth, 
        imgHeight,
        undefined,
        "FAST"
      );
    }

    onProgress?.(95);

    // Save the PDF
    pdf.save(filename);

    onProgress?.(100);
  } finally {
    // Always remove exporting class
    document.body.classList.remove("exporting-pdf");
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
