import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  data: Record<string, any>[];
  columns: { key: string; label: string }[];
  filename: string;
  title: string;
}

export function ExportButtons({ data, columns, filename, title }: Props) {
  const [exporting, setExporting] = useState<string | null>(null);
  const { toast } = useToast();

  const exportExcel = async () => {
    setExporting("excel");
    try {
      const XLSX = await import("xlsx");
      const wsData = [
        columns.map((c) => c.label),
        ...data.map((row) => columns.map((c) => row[c.key] ?? "")),
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Relatório");
      XLSX.writeFile(wb, `${filename}.xlsx`);
      toast({ title: "Excel exportado com sucesso!" });
    } catch (err) {
      toast({ title: "Erro ao exportar Excel", variant: "destructive" });
    }
    setExporting(null);
  };

  const exportPdf = async () => {
    setExporting("pdf");
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(title, 14, 20);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 28);

      autoTable(doc, {
        startY: 35,
        head: [columns.map((c) => c.label)],
        body: data.map((row) => columns.map((c) => String(row[c.key] ?? ""))),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 58, 95] },
      });

      doc.save(`${filename}.pdf`);
      toast({ title: "PDF exportado com sucesso!" });
    } catch (err) {
      toast({ title: "Erro ao exportar PDF", variant: "destructive" });
    }
    setExporting(null);
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={exportExcel} disabled={!!exporting || data.length === 0}>
        {exporting === "excel" ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <FileSpreadsheet className="mr-1 h-3 w-3" />}
        Excel
      </Button>
      <Button variant="outline" size="sm" onClick={exportPdf} disabled={!!exporting || data.length === 0}>
        {exporting === "pdf" ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <FileText className="mr-1 h-3 w-3" />}
        PDF
      </Button>
    </div>
  );
}
