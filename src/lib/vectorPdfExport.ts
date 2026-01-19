/**
 * Vector PDF Export utilities using @react-pdf/renderer
 * Generates crisp, scalable PDFs with native text rendering
 */
import { pdf } from "@react-pdf/renderer";
import React from "react";

export interface VectorPdfExportOptions {
  filename?: string;
  onProgress?: (progress: number) => void;
}

/**
 * Export a React PDF document to a downloadable file
 * @param document - A React element created with @react-pdf/renderer components
 * @param options - Export options
 */
export async function exportVectorPdf(
  document: React.ReactElement,
  options: VectorPdfExportOptions = {}
): Promise<void> {
  const { filename = "report.pdf", onProgress } = options;

  onProgress?.(10);

  // Generate the PDF blob
  const blob = await pdf(document).toBlob();
  
  onProgress?.(80);

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename;
  
  // Trigger download
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
  
  // Cleanup
  URL.revokeObjectURL(url);
  
  onProgress?.(100);
}

/**
 * Generate a PDF blob without downloading
 * Useful for preview or uploading
 */
export async function generateVectorPdfBlob(
  document: React.ReactElement
): Promise<Blob> {
  return pdf(document).toBlob();
}

/**
 * Generate a PDF as base64 data URL
 * Useful for embedding or previewing
 */
export async function generateVectorPdfDataUrl(
  document: React.ReactElement
): Promise<string> {
  const blob = await pdf(document).toBlob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
