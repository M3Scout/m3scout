import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export interface PdfExportOptions {
  filename?: string;
  scale?: number;
  onProgress?: (progress: number) => void;
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

  onProgress?.(10);

  // Create canvas from the element with high resolution
  const canvas = await html2canvas(element, {
    scale: scale, // Higher scale for crisp printing
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#FFFFFF",
    logging: false,
    imageTimeout: 30000,
    removeContainer: true,
    // Ensure proper rendering
    onclone: (clonedDoc, clonedElement) => {
      // Force white background on container
      clonedElement.style.backgroundColor = "#FFFFFF";
      clonedElement.style.overflow = "visible";
      
      // Ensure all SVGs are properly sized
      const svgs = clonedElement.querySelectorAll("svg");
      svgs.forEach((svg) => {
        const rect = svg.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          svg.setAttribute("width", rect.width.toString());
          svg.setAttribute("height", rect.height.toString());
        }
      });
      
      // Ensure images are loaded
      const images = clonedElement.querySelectorAll("img");
      images.forEach((img) => {
        img.crossOrigin = "anonymous";
      });
    },
  });

  onProgress?.(50);

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
