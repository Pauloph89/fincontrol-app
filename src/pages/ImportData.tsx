import { useState, useRef } from "react";
import { useFactories } from "@/hooks/useFactories";
import { useOrders } from "@/hooks/useOrders";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, Trash2, FileUp } from "lucide-react";
import { formatCurrency } from "@/lib/financial-utils";
import { PdfImportDialog } from "@/components/orders/PdfImportDialog";
import * as XLSX from "xlsx";

interface ParsedRow {
  order_number: string;
  client: string;
  value: number;
  date: string;
  commission_percent?: number;
  selected: boolean;
}

export default function ImportData() {
  const { factoriesQuery } = useFactories();
  const { createOrder } = useOrders();
  const { user, companyId } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFactory, setSelectedFactory] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");

  const factories = factoriesQuery.data || [];
  const factory = factories.find((f) => f.id === selectedFactory);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    try {
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.name.endsWith(".csv")) {
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<any>(ws);

        const rows: ParsedRow[] = json.map((row: any) => {
          // Try common column names
          const orderNum = row["Pedido"] || row["pedido"] || row["Nº Pedido"] || row["numero_pedido"] || row["Order"] || "";
          const client = row["Cliente"] || row["cliente"] || row["Client"] || row["Razão Social"] || "";
          const value = parseFloat(row["Valor"] || row["valor"] || row["Value"] || row["Total"] || row["total"] || 0);
          const date = row["Data"] || row["data"] || row["Date"] || new Date().toISOString().split("T")[0];
          const commPercent = parseFloat(row["Comissão %"] || row["comissao"] || row["Commission"] || 0);
          return {
            order_number: String(orderNum),
            client: String(client),
            value: isNaN(value) ? 0 : value,
            date: String(date),
            commission_percent: isNaN(commPercent) ? undefined : commPercent,
            selected: true,
          };
        }).filter((r: ParsedRow) => r.order_number || r.client);

        setParsedRows(rows);
        if (rows.length === 0) toast({ title: "Nenhum dado encontrado no arquivo", variant: "destructive" });
      } else {
        toast({ title: "Formato não suportado", description: "Use arquivos .xlsx, .xls ou .csv", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro ao ler arquivo", description: err.message, variant: "destructive" });
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const toggleRow = (i: number) => {
    setParsedRows((prev) => prev.map((r, idx) => idx === i ? { ...r, selected: !r.selected } : r));
  };

  const updateRow = (i: number, field: keyof ParsedRow, value: any) => {
    setParsedRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const removeRow = (i: number) => {
    setParsedRows((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleImport = async () => {
    if (!factory || !user || !companyId) return;
    const selected = parsedRows.filter((r) => r.selected && r.order_number);
    if (selected.length === 0) { toast({ title: "Selecione ao menos um registro", variant: "destructive" }); return; }

    setImporting(true);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const row of selected) {
      try {
        await createOrder.mutateAsync({
          order_number: row.order_number,
          order_date: row.date || new Date().toISOString().split("T")[0],
          factory: factory.nome,
          client: row.client,
          commission_base_value: row.value,
          commission_percent_rep: row.commission_percent ?? factory.comissao_padrao,
          commission_percent_preposto: 0,
          num_installments: 1,
          installment_interval: 30,
          status: "faturado",
          observations: `Importado de: ${fileName}`,
        });
        successCount++;
      } catch (err: any) {
        errorCount++;
        errors.push(`Pedido ${row.order_number}: ${err.message || "Erro desconhecido"}`);
      }
    }

    setImporting(false);
    setParsedRows([]);
    setImportResult({ successCount, errorCount, errors });
    setShowResultModal(true);
  };

  const [importResult, setImportResult] = useState<{ successCount: number; errorCount: number; errors: string[] } | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importar Relatório</h1>
          <p className="text-muted-foreground text-sm">Importe dados de fábricas via Excel, CSV ou PDF</p>
        </div>
        <PdfImportDialog trigger={
          <Button variant="outline">
            <FileUp className="mr-2 h-4 w-4" />Importar Pedido PDF
          </Button>
        } />
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Upload className="h-5 w-5" />Upload de Arquivo</CardTitle>
          <CardDescription>Selecione a fábrica e faça upload do arquivo de relatório</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fábrica *</Label>
              <Select value={selectedFactory} onValueChange={setSelectedFactory}>
                <SelectTrigger><SelectValue placeholder="Selecione a fábrica" /></SelectTrigger>
                <SelectContent>
                  {factories.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome} ({f.comissao_padrao}%)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Arquivo (Excel / CSV)</Label>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={!selectedFactory} className="w-full">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {fileName || "Selecionar Arquivo"}
              </Button>
            </div>
          </div>

          {factories.length === 0 && (
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 inline mr-1" />
              Cadastre fábricas antes de importar relatórios.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parsed Data Review */}
      {parsedRows.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Dados Identificados — {parsedRows.filter((r) => r.selected).length}/{parsedRows.length} selecionados</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setParsedRows([])}>Limpar</Button>
                <Button size="sm" onClick={handleImport} disabled={importing}>
                  {importing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importando...</> : <><CheckCircle2 className="mr-2 h-4 w-4" />Importar Selecionados</>}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="w-10">✓</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>% Comissão</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {parsedRows.map((row, i) => (
                    <TableRow key={i} className={!row.selected ? "opacity-40" : ""}>
                      <TableCell>
                        <input type="checkbox" checked={row.selected} onChange={() => toggleRow(i)} />
                      </TableCell>
                      <TableCell><Input value={row.order_number} onChange={(e) => updateRow(i, "order_number", e.target.value)} className="h-7 text-xs w-24" /></TableCell>
                      <TableCell><Input value={row.client} onChange={(e) => updateRow(i, "client", e.target.value)} className="h-7 text-xs w-40" /></TableCell>
                      <TableCell className="text-right"><Input type="number" step="0.01" value={row.value} onChange={(e) => updateRow(i, "value", parseFloat(e.target.value) || 0)} className="h-7 text-xs w-24 text-right" /></TableCell>
                      <TableCell><Input type="date" value={row.date} onChange={(e) => updateRow(i, "date", e.target.value)} className="h-7 text-xs w-32" /></TableCell>
                      <TableCell><Input type="number" step="0.01" value={row.commission_percent ?? factory?.comissao_padrao ?? 8} onChange={(e) => updateRow(i, "commission_percent", parseFloat(e.target.value) || 0)} className="h-7 text-xs w-16" /></TableCell>
                      <TableCell><Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => removeRow(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* How it works section */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />Como funciona a importação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>1. Selecione a fábrica correspondente ao relatório.</p>
          <p>2. Faça upload de um arquivo Excel (.xlsx, .xls) ou CSV.</p>
          <p>3. O sistema identificará automaticamente os dados e exibirá para revisão.</p>
          <p>4. Revise, edite se necessário, e confirme a importação.</p>
          <div className="pt-2">
            <p className="font-semibold text-foreground text-xs mb-1">Campos esperados no arquivo:</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Número do Pedido</Badge>
              <Badge variant="secondary">Cliente</Badge>
              <Badge variant="secondary">Valor</Badge>
              <Badge variant="secondary">Data</Badge>
              <Badge variant="secondary">Comissão %</Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled className="mt-2">
            <FileSpreadsheet className="mr-2 h-4 w-4" />Baixar modelo de planilha
          </Button>
        </CardContent>
      </Card>

      {/* Import Result Modal */}
      <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resultado da Importação</DialogTitle>
          </DialogHeader>
          {importResult && (
            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="flex-1 rounded-lg bg-emerald-50 p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{importResult.successCount}</p>
                  <p className="text-xs text-emerald-600">Importados</p>
                </div>
                <div className="flex-1 rounded-lg bg-red-50 p-3 text-center">
                  <p className="text-2xl font-bold text-destructive">{importResult.errorCount}</p>
                  <p className="text-xs text-destructive">Erros</p>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">Detalhes dos erros:</p>
                  <div className="max-h-40 overflow-y-auto rounded-lg border p-2 space-y-1">
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-xs text-destructive">• {err}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowResultModal(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
