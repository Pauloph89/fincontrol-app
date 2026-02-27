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
import { useCommissions, CommissionFormData } from "@/hooks/useCommissions";
import { formatCurrency, formatDate, commissionStatusFlow } from "@/lib/financial-utils";
import { normalizeInstallments, NormalizedInstallment } from "@/lib/normalize-installments";
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

export function CommissionForm() {
  const [open, setOpen] = useState(false);
  const { createCommission } = useCommissions();
  const { toast } = useToast();
  const [parcelMode, setParcelMode] = useState<"auto" | "manual" | "custom_days">("auto");
  const [editingAutoDates, setEditingAutoDates] = useState(false);
  const [customDaysInput, setCustomDaysInput] = useState("");
  const [form, setForm] = useState<CommissionFormData>({
    factory: "",
    client: "",
    order_number: "",
    sale_value: 0,
    commission_percent: 8,
    sale_date: new Date().toISOString().split("T")[0],
    observations: "",
    crm_deal_id: "",
    num_installments: 4,
    installment_interval: 30,
    commission_status: "pedido_enviado",
  });

  const commissionTotal = (form.sale_value * form.commission_percent) / 100;

  // Auto installment preview
  const autoPreview = useMemo(() => {
    if (form.sale_value <= 0 || form.num_installments <= 0) return [];
    const instValue = Math.round((commissionTotal / form.num_installments) * 100) / 100;
    const lastVal = Math.round((commissionTotal - instValue * (form.num_installments - 1)) * 100) / 100;
    const baseDate = new Date(form.billing_date || form.sale_date);
    return Array.from({ length: form.num_installments }, (_, i) => ({
      number: i + 1,
      value: i === form.num_installments - 1 ? lastVal : instValue,
      date: addDays(baseDate, form.installment_interval * (i + 1)),
      dateStr: addDays(baseDate, form.installment_interval * (i + 1)).toISOString().split("T")[0],
    }));
  }, [form.sale_value, form.commission_percent, form.num_installments, form.installment_interval, form.sale_date, form.billing_date, commissionTotal]);

  // Custom days preview
  const customDaysPreview = useMemo(() => {
    if (!customDaysInput.trim() || form.sale_value <= 0) return [];
    const days = customDaysInput.split(",").map((d) => parseInt(d.trim())).filter((d) => !isNaN(d) && d > 0);
    if (days.length === 0) return [];
    const instValue = Math.round((commissionTotal / days.length) * 100) / 100;
    const lastVal = Math.round((commissionTotal - instValue * (days.length - 1)) * 100) / 100;
    const baseDate = new Date(form.billing_date || form.sale_date);
    return days.sort((a, b) => a - b).map((d, i) => ({
      number: i + 1,
      value: i === days.length - 1 ? lastVal : instValue,
      date: addDays(baseDate, d).toISOString().split("T")[0],
      observation: "",
    }));
  }, [customDaysInput, form.sale_value, form.commission_percent, form.billing_date, form.sale_date, commissionTotal]);

  // Editable auto dates
  const [editableDates, setEditableDates] = useState<string[]>([]);

  const handleAdjustDates = () => {
    setEditableDates(autoPreview.map((p) => p.dateStr));
    setEditingAutoDates(true);
  };

  // Manual installments state
  const [manualInstallments, setManualInstallments] = useState<NormalizedInstallment[]>([]);

  const initManualFromAuto = () => {
    const items = autoPreview.map((p) => ({
      number: p.number,
      value: p.value,
      date: p.dateStr,
      observation: "",
    }));
    setManualInstallments(items.length > 0 ? items : [
      { number: 1, value: commissionTotal, date: form.sale_date, observation: "" },
    ]);
    setParcelMode("manual");
    setEditingAutoDates(false);
  };

  const addManualInstallment = () => {
    const last = manualInstallments[manualInstallments.length - 1];
    setManualInstallments([...manualInstallments, {
      number: manualInstallments.length + 1,
      value: 0,
      date: last ? addDays(new Date(last.date), 30).toISOString().split("T")[0] : form.sale_date,
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
  const manualDiff = Math.abs(commissionTotal - manualTotal);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let installmentsToSend: NormalizedInstallment[] | undefined;

    if (parcelMode === "custom_days" && customDaysPreview.length > 0) {
      const result = normalizeInstallments(customDaysPreview);
      if (!result.valid) {
        toast({ title: "Erro nas parcelas", description: result.error, variant: "destructive" });
        return;
      }
      installmentsToSend = result.data;
    } else if (editingAutoDates) {
      const asManual = autoPreview.map((p, i) => ({
        number: i + 1,
        value: p.value,
        date: editableDates[i] || p.dateStr,
        observation: "",
      }));
      const result = normalizeInstallments(asManual);
      if (!result.valid) {
        toast({ title: "Erro nas parcelas", description: result.error, variant: "destructive" });
        return;
      }
      installmentsToSend = result.data;
    } else if (parcelMode === "manual") {
      const result = normalizeInstallments(manualInstallments);
      if (!result.valid) {
        toast({ title: "Erro nas parcelas", description: result.error, variant: "destructive" });
        return;
      }
      installmentsToSend = result.data;
    }

    const submissionData: CommissionFormData = {
      ...form,
      ...(installmentsToSend ? {
        manual_installments: installmentsToSend.map((inst) => ({
          number: inst.number,
          value: inst.value,
          date: inst.date,
          observation: inst.observation,
        })),
      } : {}),
    };

    await createCommission.mutateAsync(submissionData);

    setOpen(false);
    setForm({
      factory: "", client: "", order_number: "", sale_value: 0,
      commission_percent: 8, sale_date: new Date().toISOString().split("T")[0],
      observations: "", crm_deal_id: "", num_installments: 4, installment_interval: 30,
      commission_status: "pedido_enviado",
    });
    setManualInstallments([]);
    setParcelMode("auto");
    setEditingAutoDates(false);
    setEditableDates([]);
    setCustomDaysInput("");
  };

  const update = (field: keyof CommissionFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (editingAutoDates) setEditingAutoDates(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nova Comissão
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Comissão</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fábrica *</Label>
              <Input value={form.factory} onChange={(e) => update("factory", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Input value={form.client} onChange={(e) => update("client", e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nº Pedido *</Label>
              <Input value={form.order_number} onChange={(e) => update("order_number", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Data do Pedido *</Label>
              <Input type="date" value={form.sale_date} onChange={(e) => update("sale_date", e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Faturamento (opcional)</Label>
              <Input type="date" value={form.billing_date || ""} onChange={(e) => update("billing_date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status do Pedido</Label>
              <Select value={form.commission_status || "pedido_enviado"} onValueChange={(v) => update("commission_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {commissionStatusFlow.filter(s => s.value !== "cancelada").map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor do Pedido *</Label>
              <Input type="number" step="0.01" min="0" value={form.sale_value || ""} onChange={(e) => update("sale_value", parseFloat(e.target.value) || 0)} required />
            </div>
            <div className="space-y-2">
              <Label>% Comissão</Label>
              <Input type="number" step="0.01" min="0" max="100" value={form.commission_percent} onChange={(e) => update("commission_percent", parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          {form.sale_value > 0 && (
            <div className="rounded-lg bg-accent p-3">
              <p className="text-sm font-semibold text-accent-foreground">
                Comissão Total: {formatCurrency(commissionTotal)}
              </p>
            </div>
          )}

          {/* Installment Mode Tabs */}
          {form.sale_value > 0 && (
            <div className="space-y-3">
              <Tabs value={parcelMode} onValueChange={(v) => {
                if (v === "manual") initManualFromAuto();
                else { setParcelMode(v as any); setEditingAutoDates(false); }
              }}>
                <TabsList className="w-full">
                  <TabsTrigger value="auto" className="flex-1">DDL Automático</TabsTrigger>
                  <TabsTrigger value="custom_days" className="flex-1">Dias Personalizados</TabsTrigger>
                  <TabsTrigger value="manual" className="flex-1">Manual (PRO)</TabsTrigger>
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

                  <div className="rounded-lg border border-border p-3 space-y-1">
                    {editingAutoDates ? (
                      editableDates.map((date, i) => (
                        <div key={i} className="flex justify-between items-center text-xs gap-2">
                          <span className="text-muted-foreground">Parcela {i + 1} — {formatCurrency(autoPreview[i]?.value || 0)}</span>
                          <Input
                            type="date"
                            value={date}
                            onChange={(e) => {
                              const nd = [...editableDates];
                              nd[i] = e.target.value;
                              setEditableDates(nd);
                            }}
                            className="h-7 text-xs w-40"
                          />
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={editingAutoDates ? () => setEditingAutoDates(false) : handleAdjustDates}
                    >
                      <CalendarCog className="mr-1 h-3 w-3" />
                      {editingAutoDates ? "Restaurar datas automáticas" : "Ajustar datas após gerar parcelas"}
                    </Button>
                  )}
                </TabsContent>

                <TabsContent value="custom_days" className="space-y-3">
                  <div className="space-y-2">
                    <Label>Dias após faturamento (separados por vírgula)</Label>
                    <Input
                      placeholder="Ex: 31, 46, 61, 76"
                      value={customDaysInput}
                      onChange={(e) => setCustomDaysInput(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Informe os dias corridos após a data base (faturamento ou pedido). Ex: 31,46,61,76
                    </p>
                  </div>

                  {customDaysPreview.length > 0 && (
                    <div className="rounded-lg border border-border p-3 space-y-1">
                      {customDaysPreview.map((inst, i) => (
                        <div key={i} className="flex justify-between text-xs text-muted-foreground">
                          <span>Parcela {inst.number}</span>
                          <span>{formatCurrency(inst.value)} — {formatDate(inst.date)}</span>
                        </div>
                      ))}
                      <div className="pt-1 border-t border-border mt-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span>Total: {customDaysPreview.length} parcelas</span>
                          <span>{formatCurrency(commissionTotal)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="manual" className="space-y-3">
                  <div className="rounded-lg border border-border overflow-hidden">
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
                              <Input
                                type="date"
                                value={inst.date}
                                onChange={(e) => updateManualInstallment(i, "date", e.target.value)}
                                className="h-8 text-xs"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={inst.value || ""}
                                onChange={(e) => updateManualInstallment(i, "value", parseFloat(e.target.value) || 0)}
                                className="h-8 text-xs w-28"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={inst.observation}
                                onChange={(e) => updateManualInstallment(i, "observation", e.target.value)}
                                className="h-8 text-xs"
                                placeholder="Opcional"
                              />
                            </TableCell>
                            <TableCell>
                              {manualInstallments.length > 1 && (
                                <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeManualInstallment(i)}>
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
                      <PlusCircle className="mr-1 h-3 w-3" /> Adicionar Parcela
                    </Button>
                    <div className="text-xs text-right">
                      <p>Total parcelas: <span className="font-semibold">{formatCurrency(manualTotal)}</span></p>
                      {manualDiff > 0.01 && (
                        <p className="text-destructive">Diferença: {formatCurrency(manualDiff)}</p>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          <div className="space-y-2">
            <Label>ID CRM (opcional)</Label>
            <Input value={form.crm_deal_id || ""} onChange={(e) => update("crm_deal_id", e.target.value)} placeholder="Preparado para integração" />
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={form.observations || ""} onChange={(e) => update("observations", e.target.value)} rows={2} />
          </div>
          <Button type="submit" className="w-full" disabled={createCommission.isPending}>
            {createCommission.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
            ) : "Cadastrar Comissão"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
