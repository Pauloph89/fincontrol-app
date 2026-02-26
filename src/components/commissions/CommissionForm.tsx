import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, PlusCircle, Loader2 } from "lucide-react";
import { useCommissions, CommissionFormData } from "@/hooks/useCommissions";
import { formatCurrency, formatDate } from "@/lib/financial-utils";
import { addDays } from "date-fns";

const INTERVAL_OPTIONS = [
  { label: "30 dias", value: 30 },
  { label: "45 dias", value: 45 },
  { label: "60 dias", value: 60 },
  { label: "75 dias", value: 75 },
  { label: "90 dias", value: 90 },
  { label: "120 dias", value: 120 },
];

interface ManualInstallment {
  number: number;
  value: number;
  date: string;
  observation: string;
}

export function CommissionForm() {
  const [open, setOpen] = useState(false);
  const { createCommission } = useCommissions();
  const [parcelMode, setParcelMode] = useState<"auto" | "manual">("auto");
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
    }));
  }, [form.sale_value, form.commission_percent, form.num_installments, form.installment_interval, form.sale_date, form.billing_date, commissionTotal]);

  // Manual installments state
  const [manualInstallments, setManualInstallments] = useState<ManualInstallment[]>([]);

  const initManualFromAuto = () => {
    const items = autoPreview.map((p) => ({
      number: p.number,
      value: p.value,
      date: p.date.toISOString().split("T")[0],
      observation: "",
    }));
    setManualInstallments(items.length > 0 ? items : [
      { number: 1, value: commissionTotal, date: form.sale_date, observation: "" },
    ]);
    setParcelMode("manual");
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

  const updateManualInstallment = (index: number, field: keyof ManualInstallment, value: any) => {
    setManualInstallments(manualInstallments.map((inst, i) => i === index ? { ...inst, [field]: value } : inst));
  };

  const manualTotal = manualInstallments.reduce((s, i) => s + i.value, 0);
  const manualDiff = Math.abs(commissionTotal - manualTotal);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submissionData: CommissionFormData = {
      ...form,
      ...(parcelMode === "manual" ? {
        manual_installments: manualInstallments.map((inst) => ({
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
    });
    setManualInstallments([]);
    setParcelMode("auto");
  };

  const update = (field: keyof CommissionFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
              <Label>Data da Venda *</Label>
              <Input type="date" value={form.sale_date} onChange={(e) => update("sale_date", e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Data de Faturamento (opcional)</Label>
            <Input type="date" value={form.billing_date || ""} onChange={(e) => update("billing_date", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor da Venda *</Label>
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
                else setParcelMode("auto");
              }}>
                <TabsList className="w-full">
                  <TabsTrigger value="auto" className="flex-1">Automático</TabsTrigger>
                  <TabsTrigger value="manual" className="flex-1">Personalizado (PRO)</TabsTrigger>
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
                      <Label>Intervalo</Label>
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
                    {autoPreview.map((inst) => (
                      <div key={inst.number} className="flex justify-between text-xs text-muted-foreground">
                        <span>Parcela {inst.number}</span>
                        <span>{formatCurrency(inst.value)} — {formatDate(inst.date.toISOString().split("T")[0])}</span>
                      </div>
                    ))}
                  </div>
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
