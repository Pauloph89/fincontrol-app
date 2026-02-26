import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
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

export function CommissionForm() {
  const [open, setOpen] = useState(false);
  const { createCommission } = useCommissions();
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

  const installmentPreview = useMemo(() => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCommission.mutateAsync(form);
    setOpen(false);
    setForm({
      factory: "", client: "", order_number: "", sale_value: 0,
      commission_percent: 8, sale_date: new Date().toISOString().split("T")[0],
      observations: "", crm_deal_id: "", num_installments: 4, installment_interval: 30,
    });
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
              <Label>Intervalo entre Parcelas</Label>
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

          {form.sale_value > 0 && (
            <div className="rounded-lg bg-accent p-4 space-y-2">
              <p className="text-sm font-medium text-accent-foreground">
                Comissão Total: {formatCurrency(commissionTotal)}
              </p>
              <div className="space-y-1">
                {installmentPreview.map((inst) => (
                  <div key={inst.number} className="flex justify-between text-xs text-muted-foreground">
                    <span>Parcela {inst.number}</span>
                    <span>{formatCurrency(inst.value)} — {formatDate(inst.date.toISOString().split("T")[0])}</span>
                  </div>
                ))}
              </div>
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
            {createCommission.isPending ? "Salvando..." : "Cadastrar Comissão"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
