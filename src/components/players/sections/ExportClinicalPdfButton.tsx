import * as React from "react";
import { useState, useRef } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { ClinicalReportPdf } from "./ClinicalReportPdf";

interface Injury {
  id: string;
  injury_type: string;
  start_date: string;
  return_date: string | null;
  severity: string;
  notes: string | null;
}

interface Player {
  full_name: string;
  position: string;
  age?: number | null;
  birth_date?: string | null;
  nationality?: string;
  current_club?: string | null;
  photo_url?: string | null;
}

interface ExportClinicalPdfButtonProps {
  player: Player;
  injuries: Injury[];
  physicalStatus?: string | null;
  medicalNotes?: string | null;
}

export function ExportClinicalPdfButton({
  player,
  injuries,
  physicalStatus,
  medicalNotes,
}: ExportClinicalPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (!reportRef.current) return;

    setIsExporting(true);
    try {
      // Create a container for the PDF content
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      document.body.appendChild(container);

      // Clone the report element
      const clone = reportRef.current.cloneNode(true) as HTMLElement;
      container.appendChild(clone);

      // Wait for images to load
      const images = clone.getElementsByTagName("img");
      const imagePromises = Array.from(images).map((img) => {
        return new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
          } else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        });
      });
      await Promise.all(imagePromises);

      // Generate canvas
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      // Clean up
      document.body.removeChild(container);

      // Create PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate dimensions to fit A4
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      
      let imgWidth = pdfWidth;
      let imgHeight = pdfWidth / ratio;
      
      // Handle multi-page if content is too long
      if (imgHeight > pdfHeight) {
        const totalPages = Math.ceil(imgHeight / pdfHeight);
        
        for (let page = 0; page < totalPages; page++) {
          if (page > 0) {
            pdf.addPage();
          }
          
          const sourceY = page * (pdfHeight * (canvasWidth / pdfWidth));
          const sourceHeight = Math.min(
            pdfHeight * (canvasWidth / pdfWidth),
            canvasHeight - sourceY
          );
          
          // Create a cropped canvas for this page
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvasWidth;
          pageCanvas.height = sourceHeight;
          const ctx = pageCanvas.getContext("2d");
          
          if (ctx) {
            ctx.drawImage(
              canvas,
              0, sourceY,
              canvasWidth, sourceHeight,
              0, 0,
              canvasWidth, sourceHeight
            );
            
            const pageImgData = pageCanvas.toDataURL("image/png");
            const pageImgHeight = (sourceHeight / canvasWidth) * pdfWidth;
            pdf.addImage(pageImgData, "PNG", 0, 0, pdfWidth, pageImgHeight);
          }
        }
      } else {
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      }

      // Save PDF
      const fileName = `relatorio-clinico-${player.full_name.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(fileName);

      toast.success("Relatório PDF exportado com sucesso!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Erro ao exportar PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={isExporting}
        className="gap-2"
      >
        {isExporting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Gerando...
          </>
        ) : (
          <>
            <FileDown className="w-4 h-4" />
            Exportar PDF
          </>
        )}
      </Button>

      {/* Hidden PDF template */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <ClinicalReportPdf
          ref={reportRef}
          player={player}
          injuries={injuries}
          physicalStatus={physicalStatus}
          medicalNotes={medicalNotes}
        />
      </div>
    </>
  );
}
