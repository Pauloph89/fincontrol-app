import { useState, useRef } from "react";
import { useCommissions } from "@/hooks/useCommissions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/financial-utils";
import * as XLSX from "xlsx";

interface AdelbrasRow {
  filial: string;
  serie: string;
  numero: string;
  parcela: string;
  tipo: string;
  cliente: string;
  loja: string;
  razaoSocial: string;
  emissao: string;
  vencimento: string;
  dataBaixa: string;
  pedido: string;
  valorTitulo: number;
  valorBase: number;
  percentual: number;
  comissao: number;
}

interface MatchedInstallment {
  row: AdelbrasRow;
  commissionId: string;
  installmentId: string;
  installmentNumber: number;
  currentStatus: string;
  currentValue: number;
  newStatus: string;
  newValue: number;
  dataBaixa: string;
  clientName: string;
  orderNumber: string;
}

interface UnmatchedRow {
  row: AdelbrasRow;
  reason: string;
}

export function AdelbrasImportDialog() {
  const { toast } = useToast();
  const { commissionsQuery } = useCommissions();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [matched, setMatched] = useState<MatchedInstallment[]>([]);
  const [unmatched, setUnmatched] = useState<UnmatchedRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<{ updated: number; notFound: number; errors: string[] }>({ updated: 0, notFound: 0, errors: [] });

  const parcelaToNumber = (p: string): number => {
    const letter = (p || "A").trim().toUpperCase();
    return letter.charCodeAt(0) - 64; // A=1, B=2, C=3
  };

  const parseDate = (val: any): string => {
    if (!val) return "";
    if (typeof val === "number") {
      // Excel serial date
      const date = XLSX.SSF.parse_date_code(val);
      if (date) return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
    }
    const str = String(val).trim();
    // DD/MM/YYYY
    const match = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) return `${match[3]}-${match[2]}-${match[1]}`;
    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    return str;
  };

  const parseNumber = (val: any): number => {
    if (typeof val === "number") return val;
    if (!val) return 0;
    const str = String(val).replace(/\s/g, "").replace("R$", "").replace(/\./g, "").replace(",", ".");
    return parseFloat(str) || 0;
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      // Skip row 1 ("Títulos"), use row 2 as header
      const json = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });

      if (json.length < 3) {
        toast({ title: "Planilha vazia ou formato inválido", variant: "destructive" });
        setProcessing(false);
        return;
      }

      // Row 0 = "Títulos", Row 1 = headers, Row 2+ = data
      const headerRow = (json[1] as string[]).map((h) => String(h || "").trim());

      const colMap: Record<string, number> = {};
      const expectedCols = ["Filial", "Série", "Número", "Parcela", "Tipo", "Cliente", "Loja", "Razão Social", "Emissão", "Vencimento", "Data Baixa", "Pedido", "Valor Título", "Valor Base", "Percentual", "Comissão"];
      for (const col of expectedCols) {
        const idx = headerRow.findIndex((h) => h.toLowerCase().includes(col.toLowerCase()));
        if (idx >= 0) colMap[col] = idx;
      }

      const rows: AdelbrasRow[] = [];
      for (let i = 2; i < json.length; i++) {
        const r = json[i] as any[];
        if (!r || r.length < 5) continue;
        const pedido = String(r[colMap["Pedido"]] || "").trim();
        if (!pedido) continue;
        rows.push({
          filial: String(r[colMap["Filial"]] || "").trim(),
          serie: String(r[colMap["Série"]] || "").trim(),
          numero: String(r[colMap["Número"]] || "").trim(),
          parcela: String(r[colMap["Parcela"]] || "A").trim(),
          tipo: String(r[colMap["Tipo"]] || "").trim(),
          cliente: String(r[colMap["Cliente"]] || "").trim(),
          loja: String(r[colMap["Loja"]] || "").trim(),
          razaoSocial: String(r[colMap["Razão Social"]] || "").trim(),
          emissao: parseDate(r[colMap["Emissão"]]),
          vencimento: parseDate(r[colMap["Vencimento"]]),
          dataBaixa: parseDate(r[colMap["Data Baixa"]]),
          pedido,
          valorTitulo: parseNumber(r[colMap["Valor Título"]]),
          valorBase: parseNumber(r[colMap["Valor Base"]]),
          percentual: parseNumber(r[colMap["Percentual"]]),
          comissao: parseNumber(r[colMap["Comissão"]]),
        });
      }

      if (rows.length === 0) {
        toast({ title: "Nenhum registro encontrado na planilha", variant: "destructive" });
        setProcessing(false);
        return;
      }

      // Match rows to existing commissions
      const commissions = commissionsQuery.data || [];
      const matchedList: MatchedInstallment[] = [];
      const unmatchedList: UnmatchedRow[] = [];

      for (const row of rows) {
        // Match by partial order number at the end
        const comm = commissions.find((c: any) => {
          const orderNum = c.order_number || "";
          return orderNum.endsWith(row.pedido) || orderNum === row.pedido;
        });

        if (!comm) {
          unmatchedList.push({ row, reason: `Pedido "${row.pedido}" não localizado no sistema` });
          continue;
        }

        const installments = (comm as any).commission_installments || [];
        const parcelaNum = parcelaToNumber(row.parcela);
        const inst = installments.find((i: any) => i.installment_number === parcelaNum);

        if (!inst) {
          unmatchedList.push({ row, reason: `Parcela ${row.parcela} (${parcelaNum}) do pedido "${row.pedido}" não encontrada` });
          continue;
        }

        // Only update if dataBaixa is filled and status isn't already recebido
        const newStatus = row.dataBaixa ? "a_receber" : inst.status;

        matchedList.push({
          row,
          commissionId: comm.id,
          installmentId: inst.id,
          installmentNumber: parcelaNum,
          currentStatus: inst.status,
          currentValue: inst.value,
          newStatus,
          newValue: row.comissao,
          dataBaixa: row.dataBaixa,
          clientName: row.razaoSocial || comm.client,
          orderNumber: comm.order_number,
        });
      }

      setMatched(matchedList);
      setUnmatched(unmatchedList);
      setShowPreview(true);
    } catch (err: any) {
      toast({ title: "Erro ao ler planilha", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleConfirmImport = async () => {
    setSaving(true);
    let updatedCount = 0;
    const errors: string[] = [];

    for (const m of matched) {
      try {
        const updatePayload: any = {};

        // Update value if different
        if (m.newValue > 0 && Math.abs(m.newValue - m.currentValue) > 0.01) {
          updatePayload.value = m.newValue;
        }

        // Update status to a_receber if dataBaixa is present and not already recebido
        if (m.dataBaixa && m.currentStatus !== "recebido") {
          updatePayload.status = "a_receber";
          updatePayload.notes = `Data liberação: ${m.dataBaixa}`;
        }

        if (Object.keys(updatePayload).length > 0) {
          const { error } = await supabase
            .from("commission_installments")
            .update(updatePayload)
            .eq("id", m.installmentId);
          if (error) throw error;
          updatedCount++;
        }
      } catch (err: any) {
        errors.push(`Pedido ${m.orderNumber} P${m.installmentNumber}: ${err.message}`);
      }
    }

    setResult({ updated: updatedCount, notFound: unmatched.length, errors });
    setShowPreview(false);
    setShowResult(true);
    setSaving(false);

    // Invalidate queries
    commissionsQuery.refetch();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <FileSpreadsheet className="mr-2 h-4 w-4" />Importar Relatório ADELBRAS
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importar Relatório ADELBRAS</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Faça upload da planilha mensal da ADELBRAS. O sistema irá localizar as comissões correspondentes e atualizar o status das parcelas.
            </p>
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Campos esperados:</p>
              <p>Filial, Série, Número, Parcela, Tipo, Cliente, Loja, Razão Social, Emissão, Vencimento, Data Baixa, Pedido, Valor Título, Valor Base, Percentual, Comissão</p>
              <p className="mt-2"><strong>Regra:</strong> "Data Baixa" preenchida → parcela muda para "A Receber" (liberada). O status "Recebido" é marcado manualmente quando o dinheiro entrar na conta.</p>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
            <Button variant="outline" className="w-full h-16 border-dashed" onClick={() => fileRef.current?.click()} disabled={processing}>
              {processing ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Processando...</>
              ) : (
                <><FileSpreadsheet className="mr-2 h-5 w-5" />Selecionar Planilha</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prévia da Importação — {matched.length} parcelas localizadas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {matched.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Parcela</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                      <TableHead>Data Baixa</TableHead>
                      <TableHead>Status Atual</TableHead>
                      <TableHead>→ Novo Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matched.map((m, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{m.clientName}</TableCell>
                        <TableCell className="text-xs">{m.orderNumber}</TableCell>
                        <TableCell className="text-xs">{m.row.parcela} (P{m.installmentNumber})</TableCell>
                        <TableCell className="text-right text-xs">{formatCurrency(m.newValue)}</TableCell>
                        <TableCell className="text-xs">{m.dataBaixa || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{m.currentStatus}</Badge>
                        </TableCell>
                        <TableCell>
                          {m.dataBaixa && m.currentStatus !== "recebido" ? (
                            <Badge className="text-[10px] bg-blue-100 text-blue-800 border-blue-200">A Receber</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">Sem alteração</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {unmatched.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold flex items-center gap-1 text-destructive">
                  <AlertTriangle className="h-4 w-4" />{unmatched.length} registros não localizados
                </p>
                <div className="max-h-40 overflow-y-auto rounded-lg border p-2 space-y-1">
                  {unmatched.map((u, i) => (
                    <p key={i} className="text-xs text-destructive">• {u.row.razaoSocial} — {u.reason}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>Cancelar</Button>
            <Button onClick={handleConfirmImport} disabled={saving || matched.length === 0}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : <><CheckCircle2 className="mr-2 h-4 w-4" />Confirmar Importação</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result Modal */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resultado da Importação</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-4">
              <div className="flex-1 rounded-lg bg-emerald-50 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{result.updated}</p>
                <p className="text-xs text-emerald-600">Atualizadas</p>
              </div>
              <div className="flex-1 rounded-lg bg-amber-50 p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{result.notFound}</p>
                <p className="text-xs text-amber-600">Não localizadas</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Erros:</p>
                <div className="max-h-40 overflow-y-auto rounded-lg border p-2 space-y-1">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-destructive">• {err}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => { setShowResult(false); setOpen(false); }}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
