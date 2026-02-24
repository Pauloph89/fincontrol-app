import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useCommissions, CommissionFormData } from "@/hooks/useCommissions";
import { formatCurrency } from "@/lib/financial-utils";

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
  });

  const commissionTotal = (form.sale_value * form.commission_percent) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCommission.mutateAsync(form);
    setOpen(false);
    setForm({
      factory: "", client: "", order_number: "", sale_value: 0,
      commission_percent: 8, sale_date: new Date().toISOString().split("T")[0],
      observations: "", crm_deal_id: "",
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
            <div className="rounded-lg bg-accent p-4 space-y-1">
              <p className="text-sm font-medium text-accent-foreground">Comissão Total: {formatCurrency(commissionTotal)}</p>
              <p className="text-xs text-muted-foreground">4 parcelas de ~{formatCurrency(commissionTotal / 4)} (30/60/90/120 dias)</p>
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
