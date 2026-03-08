import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { FileUp, Loader2, CheckCircle2, AlertTriangle, FileSpreadsheet, FileText, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClients, ClientFormData } from "@/hooks/useClients";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

interface ParsedClient {
  razao_social: string;
  nome_fantasia?: string;
  cnpj_cpf?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  observacoes?: string;
  vendedor_responsavel?: string;
  // Import status
  _status?: "new" | "duplicate_cnpj" | "duplicate_phone" | "imported" | "updated" | "skipped";
  _action?: "create" | "update" | "skip";
  _existingId?: string;
  _existingName?: string;
}

const CLIENT_FIELDS = [
  { key: "razao_social", label: "Razão Social / Nome" },
  { key: "nome_fantasia", label: "Nome Fantasia" },
  { key: "cnpj_cpf", label: "CNPJ/CPF" },
  { key: "telefone", label: "Telefone" },
  { key: "email", label: "E-mail" },
  { key: "endereco", label: "Endereço" },
  { key: "cidade", label: "Cidade" },
  { key: "estado", label: "Estado/UF" },
  { key: "observacoes", label: "Observações" },
  { key: "vendedor_responsavel", label: "Vendedor Responsável" },
];

export function ClientImportDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"choose" | "mapping" | "review" | "result">("choose");
  const [importType, setImportType] = useState<"spreadsheet" | "pdf">("spreadsheet");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { clientsQuery, createClient, updateClient } = useClients();
  const existingClients = clientsQuery.data || [];

  // Spreadsheet state
  const [sheetColumns, setSheetColumns] = useState<string[]>([]);
  const [sheetRows, setSheetRows] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // Parsed clients
  const [parsedClients, setParsedClients] = useState<ParsedClient[]>([]);

  // Result
  const [result, setResult] = useState({ imported: 0, updated: 0, skipped: 0 });

  const resetState = () => {
    setStep("choose");
    setSheetColumns([]);
    setSheetRows([]);
    setColumnMapping({});
    setParsedClients([]);
    setResult({ imported: 0, updated: 0, skipped: 0 });
    setImportType("spreadsheet");
  };

  const handleSpreadsheetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xls", "xlsx", "csv"].includes(ext || "")) {
      toast({ title: "Formato inválido", description: "Selecione XLS, XLSX ou CSV.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });

      if (json.length === 0) {
        toast({ title: "Planilha vazia", variant: "destructive" });
        return;
      }

      const cols = Object.keys(json[0]);
      setSheetColumns(cols);
      setSheetRows(json.slice(0, 500)); // limit preview

      // Auto-map columns
      const autoMap: Record<string, string> = {};
      cols.forEach((col) => {
        const lower = col.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (lower.includes("razao") || lower.includes("nome da empresa") || lower.includes("empresa") || lower === "nome" || lower === "cliente") autoMap["razao_social"] = col;
        else if (lower.includes("fantasia")) autoMap["nome_fantasia"] = col;
        else if (lower.includes("cnpj") || lower.includes("cpf")) autoMap["cnpj_cpf"] = col;
        else if (lower.includes("telefone") || lower.includes("fone") || lower.includes("celular")) autoMap["telefone"] = col;
        else if (lower.includes("email") || lower.includes("e-mail")) autoMap["email"] = col;
        else if (lower.includes("endereco") || lower.includes("logradouro")) autoMap["endereco"] = col;
        else if (lower.includes("cidade") || lower.includes("municipio")) autoMap["cidade"] = col;
        else if (lower.includes("estado") || lower.includes("uf")) autoMap["estado"] = col;
        else if (lower.includes("vendedor") || lower.includes("responsavel")) autoMap["vendedor_responsavel"] = col;
        else if (lower.includes("obs")) autoMap["observacoes"] = col;
      });
      setColumnMapping(autoMap);
      setStep("mapping");
    } catch (err: any) {
      toast({ title: "Erro ao ler planilha", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      toast({ title: "Selecione um PDF", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "clients");

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-pdf-order`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: formData,
        }
      );

      if (!res.ok) throw new Error("Erro ao processar PDF");
      const result = await res.json();
      const clients: ParsedClient[] = (result.clients || []).map((c: any) => ({
        razao_social: c.name || c.razao_social || "",
        cnpj_cpf: c.cnpj || c.cnpj_cpf || "",
        telefone: c.phone || c.telefone || "",
        email: c.email || "",
        cidade: c.city || c.cidade || "",
        estado: c.state || c.estado || "",
        endereco: c.address || c.endereco || "",
      }));

      if (clients.length === 0) {
        toast({ title: "Nenhum cliente encontrado no PDF", variant: "destructive" });
        return;
      }

      const checked = checkDuplicates(clients);
      setParsedClients(checked);
      setStep("review");
    } catch (err: any) {
      toast({ title: "Erro ao importar PDF", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const processMapping = () => {
    if (!columnMapping.razao_social) {
      toast({ title: "Mapeie ao menos o campo 'Razão Social'", variant: "destructive" });
      return;
    }

    const clients: ParsedClient[] = sheetRows
      .map((row) => {
        const c: ParsedClient = { razao_social: "" };
        CLIENT_FIELDS.forEach((f) => {
          const col = columnMapping[f.key];
          if (col && row[col]) {
            (c as any)[f.key] = String(row[col]).trim();
          }
        });
        return c;
      })
      .filter((c) => c.razao_social.trim());

    const checked = checkDuplicates(clients);
    setParsedClients(checked);
    setStep("review");
  };

  const checkDuplicates = (clients: ParsedClient[]): ParsedClient[] => {
    return clients.map((c) => {
      if (c.cnpj_cpf) {
        const dup = existingClients.find((ec) => ec.cnpj_cpf && ec.cnpj_cpf === c.cnpj_cpf);
        if (dup) return { ...c, _status: "duplicate_cnpj" as const, _action: "skip" as const, _existingId: dup.id, _existingName: dup.razao_social };
      }
      if (c.telefone) {
        const dup = existingClients.find((ec) => ec.telefone && ec.telefone === c.telefone);
        if (dup) return { ...c, _status: "duplicate_phone" as const, _action: "skip" as const, _existingId: dup.id, _existingName: dup.razao_social };
      }
      return { ...c, _status: "new" as const, _action: "create" as const };
    });
  };

  const setClientAction = (index: number, action: "create" | "update" | "skip") => {
    setParsedClients((prev) => prev.map((c, i) => i === index ? { ...c, _action: action } : c));
  };

  const handleImport = async () => {
    setSaving(true);
    let imported = 0, updated = 0, skipped = 0;

    for (const client of parsedClients) {
      try {
        if (client._action === "skip") { skipped++; continue; }

        const formData: ClientFormData = {
          razao_social: client.razao_social,
          nome_fantasia: client.nome_fantasia,
          cnpj_cpf: client.cnpj_cpf,
          telefone: client.telefone,
          email: client.email,
          endereco: client.endereco,
          cidade: client.cidade,
          estado: client.estado,
          observacoes: client.observacoes,
          vendedor_responsavel: client.vendedor_responsavel,
        };

        if (client._action === "update" && client._existingId) {
          await updateClient.mutateAsync({ id: client._existingId, data: formData });
          updated++;
        } else {
          await createClient.mutateAsync(formData);
          imported++;
        }
      } catch {
        skipped++;
      }
    }

    setResult({ imported, updated, skipped });
    setStep("result");
    setSaving(false);
  };

  const dupsCount = parsedClients.filter((c) => c._status?.startsWith("duplicate")).length;
  const newCount = parsedClients.filter((c) => c._status === "new").length;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />Importar Clientes
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle>Importar Clientes</DialogTitle>
        </DialogHeader>

        {step === "choose" && (
          <div className="space-y-4 py-4 px-6">
            <p className="text-sm text-muted-foreground">Escolha a fonte de importação:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card
                className={`cursor-pointer hover:border-primary transition-colors ${importType === "spreadsheet" ? "border-primary ring-1 ring-primary" : ""}`}
                onClick={() => setImportType("spreadsheet")}
              >
                <CardContent className="p-6 text-center space-y-3">
                  <FileSpreadsheet className="mx-auto h-10 w-10 text-green-600" />
                  <div>
                    <p className="font-semibold">Planilha</p>
                    <p className="text-xs text-muted-foreground">XLS, XLSX ou CSV</p>
                  </div>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer hover:border-primary transition-colors ${importType === "pdf" ? "border-primary ring-1 ring-primary" : ""}`}
                onClick={() => setImportType("pdf")}
              >
                <CardContent className="p-6 text-center space-y-3">
                  <FileText className="mx-auto h-10 w-10 text-red-500" />
                  <div>
                    <p className="font-semibold">PDF</p>
                    <p className="text-xs text-muted-foreground">Extração via IA</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={importType === "spreadsheet" ? ".xls,.xlsx,.csv" : ".pdf"}
              className="hidden"
              onChange={importType === "spreadsheet" ? handleSpreadsheetUpload : handlePdfUpload}
            />
            <Button
              className="w-full"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processando...</>
              ) : (
                <><FileUp className="mr-2 h-4 w-4" />Selecionar Arquivo</>
              )}
            </Button>
          </div>
        )}

        {step === "mapping" && (
          <div className="flex-1 overflow-y-auto px-6 min-h-0">
            <div className="space-y-4 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{sheetRows.length} registros encontrados</Badge>
                <Badge variant="outline">{sheetColumns.length} colunas</Badge>
              </div>

              <p className="text-sm font-medium">Mapeie as colunas para os campos do CRM:</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CLIENT_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-1">
                    <Label className="text-xs">{field.label} {field.key === "razao_social" && "*"}</Label>
                    <Select
                      value={columnMapping[field.key] || ""}
                      onValueChange={(v) => setColumnMapping((p) => ({ ...p, [field.key]: v === "_none_" ? "" : v }))}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Não mapeado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none_">— Não mapeado —</SelectItem>
                        {sheetColumns.map((col) => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              {sheetRows.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Pré-visualização (5 primeiros):</p>
                  <ScrollArea className="max-h-40">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {sheetColumns.slice(0, 6).map((c) => (
                            <TableHead key={c} className="text-xs whitespace-nowrap">{c}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sheetRows.slice(0, 5).map((row, i) => (
                          <TableRow key={i}>
                            {sheetColumns.slice(0, 6).map((c) => (
                              <TableCell key={c} className="text-xs">{String(row[c] || "").slice(0, 40)}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              )}

            </div>
          </div>
          <div className="flex justify-between px-6 py-3 border-t shrink-0">
            <Button variant="outline" onClick={() => setStep("choose")}>Voltar</Button>
            <Button onClick={processMapping} disabled={!columnMapping.razao_social}>
              Continuar para Revisão
            </Button>
          </div>
        )}

        {step === "review" && (
          <div className="flex-1 overflow-y-auto px-6 min-h-0">
            <div className="space-y-4 pb-4">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">{parsedClients.length} registros</Badge>
                <Badge className="bg-green-100 text-green-800">{newCount} novos</Badge>
                {dupsCount > 0 && <Badge className="bg-amber-100 text-amber-800">{dupsCount} duplicados</Badge>}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Nome</TableHead>
                    <TableHead className="text-xs">CNPJ/CPF</TableHead>
                    <TableHead className="text-xs">Telefone</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedClients.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-medium">{c.razao_social}</TableCell>
                      <TableCell className="text-xs">{c.cnpj_cpf || "—"}</TableCell>
                      <TableCell className="text-xs">{c.telefone || "—"}</TableCell>
                      <TableCell>
                        {c._status === "new" && <Badge className="text-[10px] bg-green-100 text-green-800">Novo</Badge>}
                        {c._status === "duplicate_cnpj" && (
                          <Badge className="text-[10px] bg-amber-100 text-amber-800">CNPJ duplicado ({c._existingName})</Badge>
                        )}
                        {c._status === "duplicate_phone" && (
                          <Badge className="text-[10px] bg-amber-100 text-amber-800">Tel. duplicado ({c._existingName})</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {c._status?.startsWith("duplicate") ? (
                          <Select value={c._action || "skip"} onValueChange={(v) => setClientAction(i, v as any)}>
                            <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="create">Criar novo</SelectItem>
                              <SelectItem value="update">Atualizar</SelectItem>
                              <SelectItem value="skip">Ignorar</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground">Criar</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

            </div>
          </div>
          <div className="flex justify-between px-6 py-3 border-t shrink-0">
            <Button variant="outline" onClick={() => setStep(sheetColumns.length > 0 ? "mapping" : "choose")}>Voltar</Button>
            <Button onClick={handleImport} disabled={saving}>
              {saving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importando...</>
              ) : (
                <><CheckCircle2 className="mr-2 h-4 w-4" />Importar {parsedClients.filter((c) => c._action !== "skip").length} clientes</>
              )}
            </Button>
          </div>
        )}

        {step === "result" && (
          <div className="space-y-6 py-6 text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
            <h3 className="text-lg font-semibold">Importação Concluída!</h3>
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-green-600">{result.imported}</p>
                  <p className="text-xs text-muted-foreground">Importados</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-blue-600">{result.updated}</p>
                  <p className="text-xs text-muted-foreground">Atualizados</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-muted-foreground">{result.skipped}</p>
                  <p className="text-xs text-muted-foreground">Ignorados</p>
                </CardContent>
              </Card>
            </div>
            <Button onClick={() => { setOpen(false); resetState(); }}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
