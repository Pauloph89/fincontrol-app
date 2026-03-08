import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileUp, Loader2, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOrders, OrderFormData, calcCommissions } from "@/hooks/useOrders";
import { useFactories } from "@/hooks/useFactories";
import { formatCurrency } from "@/lib/financial-utils";
import { supabase } from "@/integrations/supabase/client";

interface ExtractedOrder {
  order_number?: string | null;
  client?: string | null;
  client_cnpj?: string | null;
  client_city?: string | null;
  client_state?: string | null;
  order_date?: string | null;
  billing_date?: string | null;
  factory?: string | null;
  factory_invoice_number?: string | null;
  commission_base_value?: number | null;
  invoice_total_value?: number | null;
  salesperson?: string | null;
  observations?: string | null;
  payment_terms?: string | null;
  products?: Array<{ name: string; quantity: number; unit_price: number; total: number }>;
}

const BRAZILIAN_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

/**
 * Parse DDL payment terms like "30DDL", "30/60/90 DDL", "30-60-90", "30,60,90 dias"
 * Returns array of day intervals, or null if not parseable.
 */
function parseDDLTerms(terms: string | null | undefined): number[] | null {
  if (!terms) return null;
  const cleaned = terms.toUpperCase().replace(/DDL|DIAS|DIA|D\.D\.L\./gi, "").trim();
  const days = cleaned.split(/[\/,\-;\s]+/).map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d > 0);
  return days.length > 0 ? days.sort((a, b) => a - b) : null;
}

export function PdfImportDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedOrder | null>(null);
  const [form, setForm] = useState<OrderFormData | null>(null);
  const [paymentTerms, setPaymentTerms] = useState<string>("");
  const [customDaysInput, setCustomDaysInput] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { createOrder } = useOrders();
  const { factoriesQuery } = useFactories();
  const factories = factoriesQuery.data || [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast({ title: "Formato inválido", description: "Selecione um arquivo PDF.", variant: "destructive" });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 20MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

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

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || err.details || "Erro ao processar PDF");
      }

      const result = await res.json();
      const order = result.orders?.[0] || {};
      setExtractedData(order);

      // Find matching factory
      const matchedFactory = order.factory
        ? factories.find((f) =>
            f.nome.toLowerCase().includes(order.factory!.toLowerCase()) ||
            order.factory!.toLowerCase().includes(f.nome.toLowerCase())
          )
        : null;

      const commPercent = matchedFactory?.comissao_padrao ?? 8;

      // Parse DDL terms
      const ddlDays = parseDDLTerms(order.payment_terms);
      const numInst = ddlDays ? ddlDays.length : 4;
      const interval = ddlDays && ddlDays.length === 1 ? ddlDays[0] : 30;

      setPaymentTerms(order.payment_terms || "");
      setCustomDaysInput(ddlDays ? ddlDays.join(", ") : "");

      setForm({
        order_number: order.order_number || "",
        factory_invoice_number: order.factory_invoice_number || "",
        order_date: order.order_date || new Date().toISOString().split("T")[0],
        billing_date: order.billing_date || "",
        factory: matchedFactory?.nome || order.factory || "",
        client: order.client || "",
        client_cnpj: order.client_cnpj || "",
        client_city: order.client_city || "",
        client_state: order.client_state || "",
        salesperson: order.salesperson || "",
        pre_posto: "",
        commission_base_value: order.commission_base_value || order.invoice_total_value || 0,
        invoice_total_value: order.invoice_total_value || 0,
        commission_percent_rep: commPercent,
        commission_percent_preposto: 0,
        observations: order.observations || "",
        status: "pedido_enviado",
        num_installments: numInst,
        installment_interval: interval,
      });

      setStep("review");
      toast({ title: "PDF processado!", description: "Revise os dados extraídos antes de salvar." });
    } catch (err: any) {
      toast({ title: "Erro ao importar PDF", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const update = (field: keyof OrderFormData, value: string | number) => {
    setForm((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const handleSave = async () => {
    if (!form) return;
    if (!form.order_number || !form.client || !form.factory) {
      toast({ title: "Campos obrigatórios", description: "Preencha nº pedido, cliente e fábrica.", variant: "destructive" });
      return;
    }

    // If custom days are set, pass as manual installments
    const ddlDays = parseDDLTerms(customDaysInput);
    let submissionForm = { ...form };

    if (ddlDays && ddlDays.length > 0 && form.commission_base_value > 0) {
      const baseDate = new Date(form.billing_date || form.order_date);
      const instValue = Math.round((form.commission_base_value / ddlDays.length) * 100) / 100;
      const lastVal = Math.round((form.commission_base_value - instValue * (ddlDays.length - 1)) * 100) / 100;

      submissionForm.manual_installments = ddlDays.map((d, i) => ({
        number: i + 1,
        value: i === ddlDays.length - 1 ? lastVal : instValue,
        date: new Date(baseDate.getTime() + d * 86400000).toISOString().split("T")[0],
        observation: `${d} DDL`,
      }));
    }

    setSaving(true);
    try {
      await createOrder.mutateAsync(submissionForm);
      setOpen(false);
      resetState();
      toast({ title: "Pedido importado com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar pedido", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resetState = () => {
    setStep("upload");
    setExtractedData(null);
    setForm(null);
    setPaymentTerms("");
    setCustomDaysInput("");
  };

  const commCalc = form ? calcCommissions(form.commission_base_value, form.commission_percent_rep, form.commission_percent_preposto) : null;

  // Preview installments from DDL
  const ddlPreview = (() => {
    if (!form || form.commission_base_value <= 0) return [];
    const days = parseDDLTerms(customDaysInput);
    if (!days || days.length === 0) return [];
    const baseDate = new Date(form.billing_date || form.order_date);
    const instValue = Math.round((form.commission_base_value / days.length) * 100) / 100;
    const lastVal = Math.round((form.commission_base_value - instValue * (days.length - 1)) * 100) / 100;
    return days.map((d, i) => ({
      number: i + 1,
      value: i === days.length - 1 ? lastVal : instValue,
      date: new Date(baseDate.getTime() + d * 86400000).toLocaleDateString("pt-BR"),
      days: d,
    }));
  })();

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { resetState(); document.body.style.removeProperty('overflow'); document.body.style.removeProperty('pointer-events'); } }} modal={true}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <FileUp className="mr-2 h-4 w-4" />Importar PDF
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Importar Pedido via PDF
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-4">
              <FileUp className="mx-auto h-12 w-12 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Arraste ou selecione um arquivo PDF</p>
                <p className="text-xs text-muted-foreground mt-1">O sistema irá extrair automaticamente os dados do pedido</p>
              </div>
              <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
              <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processando PDF...</>
                ) : (
                  <><FileUp className="mr-2 h-4 w-4" />Selecionar PDF</>
                )}
              </Button>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Como funciona:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>O sistema usa IA para ler o conteúdo do PDF</li>
                <li>Dados como nº pedido, cliente, valores e datas são extraídos automaticamente</li>
                <li>Prazos como 30DDL, 45DDL, 30/60/90 são interpretados automaticamente</li>
                <li>Você poderá revisar e editar todos os campos antes de salvar</li>
              </ul>
            </div>
          </div>
        )}

        {step === "review" && form && (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 pb-4">
              <Badge variant="secondary" className="mb-2">
                <CheckCircle2 className="mr-1 h-3 w-3" />Dados extraídos — revise e edite antes de salvar
              </Badge>

              {/* Payment terms detected */}
              {paymentTerms && (
                <div className="rounded-lg bg-accent/50 border border-accent p-2.5 text-sm">
                  <span className="text-muted-foreground">Prazo detectado: </span>
                  <span className="font-semibold">{paymentTerms}</span>
                  {parseDDLTerms(paymentTerms) && (
                    <span className="text-muted-foreground ml-2">
                      → {parseDDLTerms(paymentTerms)!.join(", ")} dias
                    </span>
                  )}
                </div>
              )}

              {/* Products found */}
              {extractedData?.products && extractedData.products.length > 0 && (
                <Card>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm">Produtos Identificados</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="max-h-40">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Produto</TableHead>
                            <TableHead className="text-xs text-right">Qtd</TableHead>
                            <TableHead className="text-xs text-right">Unit.</TableHead>
                            <TableHead className="text-xs text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {extractedData.products.map((p, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-xs">{p.name}</TableCell>
                              <TableCell className="text-xs text-right">{p.quantity}</TableCell>
                              <TableCell className="text-xs text-right">{formatCurrency(p.unit_price)}</TableCell>
                              <TableCell className="text-xs text-right">{formatCurrency(p.total)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Order form fields */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nº Pedido *</Label>
                  <Input value={form.order_number} onChange={(e) => update("order_number", e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">NF Fábrica</Label>
                  <Input value={form.factory_invoice_number || ""} onChange={(e) => update("factory_invoice_number", e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Fábrica *</Label>
                  <Input value={form.factory} onChange={(e) => update("factory", e.target.value)} className="h-8 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Cliente *</Label>
                  <Input value={form.client} onChange={(e) => update("client", e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">CNPJ Cliente</Label>
                  <Input value={form.client_cnpj || ""} onChange={(e) => update("client_cnpj", e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Cidade</Label>
                    <Input value={form.client_city || ""} onChange={(e) => update("client_city", e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">UF</Label>
                    <Select value={form.client_state || ""} onValueChange={(v) => update("client_state", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="UF" /></SelectTrigger>
                      <SelectContent>
                        {BRAZILIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Data Pedido *</Label>
                  <Input type="date" value={form.order_date} onChange={(e) => update("order_date", e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Data Faturamento</Label>
                  <Input type="date" value={form.billing_date || ""} onChange={(e) => update("billing_date", e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Vendedor</Label>
                  <Input value={form.salesperson || ""} onChange={(e) => update("salesperson", e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pré-posto</Label>
                  <Input value={form.pre_posto || ""} onChange={(e) => update("pre_posto", e.target.value)} className="h-8 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Valor Base Comissão *</Label>
                  <Input type="number" step="0.01" value={form.commission_base_value || ""} onChange={(e) => update("commission_base_value", parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor Total NF</Label>
                  <Input type="number" step="0.01" value={form.invoice_total_value || ""} onChange={(e) => update("invoice_total_value", parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">% Comissão Rep.</Label>
                  <Input type="number" step="0.01" value={form.commission_percent_rep} onChange={(e) => update("commission_percent_rep", parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">% Pré-posto</Label>
                  <Input type="number" step="0.01" value={form.commission_percent_preposto} onChange={(e) => update("commission_percent_preposto", parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                </div>
              </div>

              {/* Commission summary */}
              {commCalc && form.commission_base_value > 0 && (
                <div className="rounded-lg bg-accent p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Comissão Representante:</span>
                    <span className="font-semibold">{formatCurrency(commCalc.totalRep)}</span>
                  </div>
                  {form.commission_percent_preposto > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Comissão Pré-posto:</span>
                      <span>{formatCurrency(commCalc.totalPreposto)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Installment config with DDL */}
              <div className="space-y-3 rounded-lg border border-border p-3">
                <Label className="text-sm font-semibold">Parcelas / Prazo de Pagamento</Label>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Dias DDL (separados por vírgula)</Label>
                  <Input
                    value={customDaysInput}
                    onChange={(e) => setCustomDaysInput(e.target.value)}
                    placeholder="Ex: 30, 60, 90 (ou 45DDL)"
                    className="h-8 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Informe os dias após faturamento. Ex: 30, 60, 90 ou 45DDL
                  </p>
                </div>

                {ddlPreview.length > 0 && (
                  <ScrollArea className="max-h-32">
                    <div className="space-y-1">
                      {ddlPreview.map((inst) => (
                        <div key={inst.number} className="flex justify-between text-xs text-muted-foreground px-1">
                          <span>Parcela {inst.number} ({inst.days} DDL)</span>
                          <span>{formatCurrency(inst.value)} — {inst.date}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {ddlPreview.length === 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nº Parcelas</Label>
                      <Select value={String(form.num_installments)} onValueChange={(v) => update("num_installments", parseInt(v))}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}x</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Intervalo (dias)</Label>
                      <Select value={String(form.installment_interval)} onValueChange={(v) => update("installment_interval", parseInt(v))}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[30, 45, 60, 75, 90, 120].map((d) => (
                            <SelectItem key={d} value={String(d)}>{d} dias</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Observações</Label>
                <Textarea value={form.observations || ""} onChange={(e) => update("observations", e.target.value)} rows={2} className="text-sm" />
              </div>

              <div className="flex justify-between pt-2 sticky bottom-0 bg-background pb-2">
                <Button variant="outline" onClick={() => { resetState(); }}>
                  Voltar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
                  ) : (
                    <><CheckCircle2 className="mr-2 h-4 w-4" />Salvar Pedido</>
                  )}
                </Button>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
