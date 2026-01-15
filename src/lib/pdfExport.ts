import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export interface PdfExportOptions {
  filename?: string;
  scale?: number;
  onProgress?: (progress: number) => void;
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
  const { filename = "report.pdf", scale = 3, onProgress } = options;

  onProgress?.(5);

  // Preload images first
  await preloadImages(element);

  onProgress?.(15);

  // Create canvas from the element with high resolution
  const canvas = await html2canvas(element, {
    scale: scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#FFFFFF",
    logging: false,
    imageTimeout: 30000,
    removeContainer: true,
    onclone: (clonedDoc, clonedElement) => {
      // Force white background on container
      clonedElement.style.backgroundColor = "#FFFFFF";
      clonedElement.style.overflow = "visible";
      
      // Add pdf-export class for specific styles
      clonedElement.classList.add("pdf-export");
      
      // Ensure all SVGs are properly sized and have explicit dimensions
      const svgs = clonedElement.querySelectorAll("svg");
      svgs.forEach((svg) => {
        const rect = svg.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          svg.setAttribute("width", rect.width.toString());
          svg.setAttribute("height", rect.height.toString());
          // Ensure SVG elements have proper stroke visibility
          svg.style.overflow = "visible";
        }
      });
      
      // Ensure images have fixed dimensions and no lazy loading
      const images = clonedElement.querySelectorAll("img");
      images.forEach((img) => {
        img.crossOrigin = "anonymous";
        img.loading = "eager";
        // Force image visibility
        img.style.visibility = "visible";
        img.style.opacity = "1";
      });

      // Ensure high contrast text
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

  onProgress?.(55);

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

  onProgress?.(70);

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

  onProgress?.(90);

  // Save the PDF
  pdf.save(filename);

  onProgress?.(100);
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
