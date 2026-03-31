import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, PlusCircle, Loader2, CalendarCog } from "lucide-react";
import { useOrders, OrderFormData, calcCommissions } from "@/hooks/useOrders";
import { formatCurrency, formatDate, commissionStatusFlow } from "@/lib/financial-utils";
import { normalizeInstallments, NormalizedInstallment } from "@/lib/normalize-installments";
import { addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const INTERVAL_OPTIONS = [
  { label: "30 dias", value: 30 },
  { label: "45 dias", value: 45 },
  { label: "60 dias", value: 60 },
  { label: "75 dias", value: 75 },
  { label: "90 dias", value: 90 },
  { label: "120 dias", value: 120 },
];

const BRAZILIAN_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export function OrderForm() {
  const [open, setOpen] = useState(false);
  const { createOrder } = useOrders();
  const { toast } = useToast();
  const [parcelMode, setParcelMode] = useState<"auto" | "manual" | "custom_days">("auto");
  const [editingAutoDates, setEditingAutoDates] = useState(false);
  const [customDaysInput, setCustomDaysInput] = useState("");
  const [form, setForm] = useState<OrderFormData>({
    order_number: "",
    factory_invoice_number: "",
    order_date: new Date().toISOString().split("T")[0],
    billing_date: "",
    factory: "",
    client: "",
    client_cnpj: "",
    client_city: "",
    client_state: "",
    salesperson: "",
    pre_posto: "",
    commission_base_value: 0,
    invoice_total_value: 0,
    commission_percent_rep: 8,
    commission_percent_preposto: 0,
    observations: "",
    status: "pedido_enviado",
    num_installments: 4,
    installment_interval: 30,
  });

  const { totalRep, totalPreposto, netRep } = calcCommissions(
    form.commission_base_value,
    form.commission_percent_rep,
    form.commission_percent_preposto
  );

  // Auto installment preview
  const autoPreview = useMemo(() => {
    if (form.commission_base_value <= 0 || form.num_installments <= 0) return [];
    const instValue = Math.round((form.commission_base_value / form.num_installments) * 100) / 100;
    const lastVal = Math.round((form.commission_base_value - instValue * (form.num_installments - 1)) * 100) / 100;
    const baseDate = new Date(form.billing_date || form.order_date);
    return Array.from({ length: form.num_installments }, (_, i) => ({
      number: i + 1,
      value: i === form.num_installments - 1 ? lastVal : instValue,
      date: addDays(baseDate, form.installment_interval * (i + 1)),
      dateStr: addDays(baseDate, form.installment_interval * (i + 1)).toISOString().split("T")[0],
    }));
  }, [form.commission_base_value, form.num_installments, form.installment_interval, form.order_date, form.billing_date]);

  // Custom days preview
  const customDaysPreview = useMemo(() => {
    if (!customDaysInput.trim() || form.commission_base_value <= 0) return [];
    const days = customDaysInput.split(",").map((d) => parseInt(d.trim())).filter((d) => !isNaN(d) && d > 0);
    if (days.length === 0) return [];
    const instValue = Math.round((form.commission_base_value / days.length) * 100) / 100;
    const lastVal = Math.round((form.commission_base_value - instValue * (days.length - 1)) * 100) / 100;
    const baseDate = new Date(form.billing_date || form.order_date);
    return days.sort((a, b) => a - b).map((d, i) => ({
      number: i + 1,
      value: i === days.length - 1 ? lastVal : instValue,
      date: addDays(baseDate, d).toISOString().split("T")[0],
      observation: "",
    }));
  }, [customDaysInput, form.commission_base_value, form.billing_date, form.order_date]);

  // Editable auto dates
  const [editableDates, setEditableDates] = useState<string[]>([]);
  const handleAdjustDates = () => {
    setEditableDates(autoPreview.map((p) => p.dateStr));
    setEditingAutoDates(true);
  };

  // Manual installments
  const [manualInstallments, setManualInstallments] = useState<NormalizedInstallment[]>([]);

  const initManualFromAuto = () => {
    const items = autoPreview.map((p) => ({
      number: p.number, value: p.value, date: p.dateStr, observation: "",
    }));
    setManualInstallments(items.length > 0 ? items : [
      { number: 1, value: form.commission_base_value, date: form.order_date, observation: "" },
    ]);
    setParcelMode("manual");
    setEditingAutoDates(false);
  };

  const addManualInstallment = () => {
    const last = manualInstallments[manualInstallments.length - 1];
    setManualInstallments([...manualInstallments, {
      number: manualInstallments.length + 1,
      value: 0,
      date: last ? addDays(new Date(last.date), 30).toISOString().split("T")[0] : form.order_date,
      observation: "",
    }]);
  };

  const removeManualInstallment = (index: number) => {
    setManualInstallments(manualInstallments.filter((_, i) => i !== index).map((inst, i) => ({ ...inst, number: i + 1 })));
  };

  const updateManualInstallment = (index: number, field: keyof NormalizedInstallment, value: any) => {
    setManualInstallments(manualInstallments.map((inst, i) => i === index ? { ...inst, [field]: value } : inst));
  };

  const manualTotal = manualInstallments.reduce((s, i) => s + i.value, 0);
  const manualDiff = Math.abs(form.commission_base_value - manualTotal);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let installmentsToSend: NormalizedInstallment[] | undefined;

    if (parcelMode === "custom_days" && customDaysPreview.length > 0) {
      const result = normalizeInstallments(customDaysPreview);
      if (!result.valid) { toast({ title: "Erro nas parcelas", description: result.error, variant: "destructive" }); return; }
      installmentsToSend = result.data;
    } else if (editingAutoDates) {
      const asManual = autoPreview.map((p, i) => ({
        number: i + 1, value: p.value, date: editableDates[i] || p.dateStr, observation: "",
      }));
      const result = normalizeInstallments(asManual);
      if (!result.valid) { toast({ title: "Erro nas parcelas", description: result.error, variant: "destructive" }); return; }
      installmentsToSend = result.data;
    } else if (parcelMode === "manual") {
      const result = normalizeInstallments(manualInstallments);
      if (!result.valid) { toast({ title: "Erro nas parcelas", description: result.error, variant: "destructive" }); return; }
      installmentsToSend = result.data;
    }

    const submissionData: OrderFormData = {
      ...form,
      ...(installmentsToSend ? {
        manual_installments: installmentsToSend.map((inst) => ({
          number: inst.number, value: inst.value, date: inst.date, observation: inst.observation,
        })),
      } : {}),
    };

    await createOrder.mutateAsync(submissionData);
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setForm({
      order_number: "", factory_invoice_number: "", order_date: new Date().toISOString().split("T")[0],
      billing_date: "", factory: "", client: "", client_cnpj: "", client_city: "", client_state: "",
      salesperson: "", pre_posto: "", commission_base_value: 0, invoice_total_value: 0,
      commission_percent_rep: 8, commission_percent_preposto: 0, observations: "",
      status: "pedido_enviado", num_installments: 4, installment_interval: 30,
    });
    setManualInstallments([]);
    setParcelMode("auto");
    setEditingAutoDates(false);
    setEditableDates([]);
    setCustomDaysInput("");
  };

  const update = (field: keyof OrderFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (editingAutoDates) setEditingAutoDates(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" />Novo Pedido</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Pedido</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Order info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Nº Pedido *</Label>
              <Input value={form.order_number} onChange={(e) => update("order_number", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>NF da Fábrica</Label>
              <Input value={form.factory_invoice_number || ""} onChange={(e) => update("factory_invoice_number", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fábrica *</Label>
              <Input value={form.factory} onChange={(e) => update("factory", e.target.value)} required />
            </div>
          </div>

          {/* Row 2: Client */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Input value={form.client} onChange={(e) => update("client", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>CNPJ Cliente</Label>
              <Input value={form.client_cnpj || ""} onChange={(e) => update("client_cnpj", e.target.value)} placeholder="00.000.000/0001-00" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={form.client_city || ""} onChange={(e) => update("client_city", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>UF</Label>
                <Select value={form.client_state || ""} onValueChange={(v) => update("client_state", v)}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>
                    {BRAZILIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Row 3: Dates & Status */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Data Pedido *</Label>
              <Input type="date" value={form.order_date} onChange={(e) => update("order_date", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Data Faturamento</Label>
              <Input type="date" value={form.billing_date || ""} onChange={(e) => update("billing_date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Vendedor</Label>
              <Input value={form.salesperson || ""} onChange={(e) => update("salesperson", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Pré-posto</Label>
              <Input value={form.pre_posto || ""} onChange={(e) => update("pre_posto", e.target.value)} />
            </div>
          </div>

          {/* Row 4: Values */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Valor Base Comissão *</Label>
              <Input type="number" step="0.01" min="0" value={form.commission_base_value || ""} onChange={(e) => update("commission_base_value", parseFloat(e.target.value) || 0)} required />
            </div>
            <div className="space-y-2">
              <Label>Valor Total NF</Label>
              <Input type="number" step="0.01" min="0" value={form.invoice_total_value || ""} onChange={(e) => update("invoice_total_value", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>% Comissão Rep.</Label>
              <Input type="number" step="0.01" min="0" max="100" value={form.commission_percent_rep} onChange={(e) => update("commission_percent_rep", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>% Pré-posto (s/ comissão)</Label>
              <Input type="number" step="0.01" min="0" max="100" value={form.commission_percent_preposto} onChange={(e) => update("commission_percent_preposto", parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          {/* Commission summary */}
          {form.commission_base_value > 0 && (
            <div className="rounded-lg bg-accent p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Comissão Representante:</span>
                <span className="font-semibold">{formatCurrency(totalRep)}</span>
              </div>
              {form.commission_percent_preposto > 0 && (
                <>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Comissão Pré-posto ({form.commission_percent_preposto}% da comissão):</span>
                    <span>{formatCurrency(totalPreposto)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t border-border pt-1">
                    <span>Líquido Representante:</span>
                    <span>{formatCurrency(netRep)}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status do Pedido</Label>
              <Select value={form.status || "pedido_enviado"} onValueChange={(v) => update("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {commissionStatusFlow.filter(s => s.value !== "cancelada").map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.observations || ""} onChange={(e) => update("observations", e.target.value)} rows={2} />
            </div>
          </div>

          {/* Installment Mode Tabs */}
          {form.commission_base_value > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Parcelas</Label>
              <Tabs value={parcelMode} onValueChange={(v) => {
                if (v === "manual") initManualFromAuto();
                else { setParcelMode(v as any); setEditingAutoDates(false); }
              }}>
                <TabsList className="w-full">
                  <TabsTrigger value="auto" className="flex-1">DDL Automático</TabsTrigger>
                  <TabsTrigger value="custom_days" className="flex-1">Dias Personalizados</TabsTrigger>
                  <TabsTrigger value="manual" className="flex-1">Manual</TabsTrigger>
                </TabsList>

                <TabsContent value="auto" className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nº de Parcelas</Label>
                      <Select value={String(form.num_installments)} onValueChange={(v) => update("num_installments", parseInt(v))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}x</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Intervalo DDL</Label>
                      <Select value={String(form.installment_interval)} onValueChange={(v) => update("installment_interval", parseInt(v))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {INTERVAL_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-3 max-h-48 overflow-y-auto space-y-1">
                    {editingAutoDates ? (
                      editableDates.map((date, i) => (
                        <div key={i} className="flex justify-between items-center text-xs gap-2">
                          <span className="text-muted-foreground">Parcela {i + 1} — {formatCurrency(autoPreview[i]?.value || 0)}</span>
                          <Input type="date" value={date} onChange={(e) => {
                            const nd = [...editableDates]; nd[i] = e.target.value; setEditableDates(nd);
                          }} className="h-7 text-xs w-40" />
                        </div>
                      ))
                    ) : (
                      autoPreview.map((inst) => (
                        <div key={inst.number} className="flex justify-between text-xs text-muted-foreground">
                          <span>Parcela {inst.number}</span>
                          <span>{formatCurrency(inst.value)} — {formatDate(inst.dateStr)}</span>
                        </div>
                      ))
                    )}
                  </div>
                  {autoPreview.length > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={editingAutoDates ? () => setEditingAutoDates(false) : handleAdjustDates}>
                      <CalendarCog className="mr-1 h-3 w-3" />
                      {editingAutoDates ? "Restaurar datas automáticas" : "Ajustar datas"}
                    </Button>
                  )}
                </TabsContent>

                <TabsContent value="custom_days" className="space-y-3">
                  <div className="space-y-2">
                    <Label>Dias após faturamento (separados por vírgula)</Label>
                    <Input placeholder="Ex: 30, 60, 90 ou 45DDL" value={customDaysInput} onChange={(e) => setCustomDaysInput(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Informe os dias corridos (DDL). Ex: 30,60,90 ou 45DDL</p>
                  </div>
                  {customDaysPreview.length > 0 && (
                    <div className="rounded-lg border border-border p-3 max-h-48 overflow-y-auto space-y-1">
                      {customDaysPreview.map((inst, i) => (
                        <div key={i} className="flex justify-between text-xs text-muted-foreground">
                          <span>Parcela {inst.number}</span>
                          <span>{formatCurrency(inst.value)} — {formatDate(inst.date)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="manual" className="space-y-3">
                  <div className="rounded-lg border border-border overflow-hidden max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Observação</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {manualInstallments.map((inst, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium text-xs">{inst.number}</TableCell>
                            <TableCell>
                              <Input type="date" value={inst.date} onChange={(e) => updateManualInstallment(i, "date", e.target.value)} className="h-8 text-xs" />
                            </TableCell>
                            <TableCell>
                              <Input type="number" step="0.01" min="0" value={inst.value || ""} onChange={(e) => updateManualInstallment(i, "value", parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
                            </TableCell>
                            <TableCell>
                              <Input value={inst.observation} onChange={(e) => updateManualInstallment(i, "observation", e.target.value)} className="h-8 text-xs" placeholder="Obs" />
                            </TableCell>
                            <TableCell>
                              {manualInstallments.length > 1 && (
                                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeManualInstallment(i)}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex items-center justify-between">
                    <Button type="button" variant="outline" size="sm" onClick={addManualInstallment}>
                      <PlusCircle className="mr-1 h-3 w-3" />Adicionar Parcela
                    </Button>
                    <div className="text-xs">
                      <span className={manualDiff > 0.01 ? "text-destructive font-semibold" : "text-muted-foreground"}>
                        Total: {formatCurrency(manualTotal)} / {formatCurrency(form.commission_base_value)}
                      </span>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={createOrder.isPending}>
            {createOrder.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : "Cadastrar Pedido"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
