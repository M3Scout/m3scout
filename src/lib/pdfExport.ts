import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export interface PdfExportOptions {
  filename?: string;
  scale?: number;
  onProgress?: (progress: number) => void;
}

/**
 * Export a DOM element to PDF with high-quality rendering
 */
export async function exportToPdf(
  element: HTMLElement,
  options: PdfExportOptions = {}
): Promise<void> {
  const { filename = "report.pdf", scale = 2, onProgress } = options;

  onProgress?.(10);

  // Create canvas from the element with high resolution
  const canvas = await html2canvas(element, {
    scale: scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#FFFFFF",
    logging: false,
    imageTimeout: 15000,
    onclone: (clonedDoc) => {
      // Ensure all SVGs are properly rendered
      const svgs = clonedDoc.querySelectorAll("svg");
      svgs.forEach((svg) => {
        svg.setAttribute("width", svg.getBoundingClientRect().width.toString());
        svg.setAttribute("height", svg.getBoundingClientRect().height.toString());
      });
    },
  });

  onProgress?.(50);

  // Calculate PDF dimensions (A4)
  const imgWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // Create PDF
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  onProgress?.(70);

  // Add the image to PDF
  const imgData = canvas.toDataURL("image/png", 1.0);
  
  // Handle multi-page documents
  let heightLeft = imgHeight;
  let position = 0;
  let pageNum = 1;

  // First page
  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  // Additional pages if needed
  while (heightLeft > 0) {
    position = -pageHeight * pageNum;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    pageNum++;
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
