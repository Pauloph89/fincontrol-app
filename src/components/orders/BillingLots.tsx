import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/financial-utils";
import { Plus, Package, Loader2 } from "lucide-react";
import { addDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";

interface Props {
  order: any;
  canEdit: boolean;
}

export function BillingLots({ order, canEdit }: Props) {
  const { user, companyId } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lotForm, setLotForm] = useState({
    billed_value: 0,
    billing_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const lotsQuery = useQuery({
    queryKey: ["billing-lots", order.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_billing_lots")
        .select("*")
        .eq("order_id", order.id)
        .order("lot_number", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const lots = lotsQuery.data || [];

  const handleAddLot = async () => {
    if (!user || !companyId || lotForm.billed_value <= 0) return;
    setSaving(true);
    try {
      const lotNumber = lots.length + 1;
      const commissionPercent = Number(order.commission_percent_rep) || 8;
      const commissionValue = Math.round((lotForm.billed_value * commissionPercent) / 100 * 100) / 100;

      // Create the lot
      const { data: lot, error: lotErr } = await supabase
        .from("order_billing_lots")
        .insert({
          order_id: order.id,
          lot_number: lotNumber,
          billed_value: lotForm.billed_value,
          billing_date: lotForm.billing_date,
          commission_percent: commissionPercent,
          commission_value: commissionValue,
          notes: lotForm.notes || null,
        } as any)
        .select()
        .single();
      if (lotErr) throw lotErr;

      // Find the commission for this order
      const { data: commission } = await supabase
        .from("commissions")
        .select("id")
        .eq("external_order_id", order.id)
        .maybeSingle();

      if (commission) {
        // Parse factory payment terms to generate installment dates
        const factory = order.factory;
        const { data: factoryData } = await supabase
          .from("factories")
          .select("prazo_pagamento")
          .ilike("nome", factory)
          .maybeSingle();

        let intervals = [30]; // default
        if (factoryData?.prazo_pagamento) {
          const parsed = factoryData.prazo_pagamento
            .replace(/DDL/gi, "")
            .split(/[\/,;\s]+/)
            .map((s: string) => parseInt(s.trim()))
            .filter((n: number) => !isNaN(n) && n > 0);
          if (parsed.length > 0) intervals = parsed;
        }

        const baseDate = new Date(lotForm.billing_date);
        const instValue = Math.round((commissionValue / intervals.length) * 100) / 100;
        const lastVal = Math.round((commissionValue - instValue * (intervals.length - 1)) * 100) / 100;

        const installments = intervals.map((days: number, i: number) => ({
          commission_id: commission.id,
          installment_number: 900 + lotNumber * 10 + i + 1, // high number to not conflict
          value: i === intervals.length - 1 ? lastVal : instValue,
          due_date: addDays(baseDate, days).toISOString().split("T")[0],
          status: "previsto",
          notes: `Lote ${lotNumber} — P${i + 1}`,
          lot_id: lot.id,
        }));

        await supabase.from("commission_installments").insert(installments);
      }

      toast({ title: `Lote ${lotNumber} adicionado com sucesso!` });
      qc.invalidateQueries({ queryKey: ["billing-lots", order.id] });
      qc.invalidateQueries({ queryKey: ["commissions"] });
      setOpen(false);
      setLotForm({ billed_value: 0, billing_date: new Date().toISOString().split("T")[0], notes: "" });
    } catch (err: any) {
      toast({ title: "Erro ao adicionar lote", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <Package className="h-3 w-3" /> Faturamentos (Lotes)
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-3 w-3" />Adicionar Lote
          </Button>
        )}
      </div>

      {lots.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum lote de faturamento registrado. Funcionalidade opcional.</p>
      ) : (
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {lots.map((lot: any) => (
            <div key={lot.id} className="rounded-lg border bg-background p-2.5">
              <div className="flex items-center justify-between mb-1">
                <Badge variant="outline" className="text-[10px]">Lote {lot.lot_number}</Badge>
                <span className="text-[10px] text-muted-foreground">{formatDate(lot.billing_date)}</span>
              </div>
              <div className="text-sm font-bold">{formatCurrency(lot.billed_value)}</div>
              <div className="text-[10px] text-muted-foreground">
                Comissão: {formatCurrency(lot.commission_value)} ({lot.commission_percent}%)
              </div>
              {lot.notes && <div className="text-[10px] italic text-muted-foreground mt-1">{lot.notes}</div>}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Adicionar Lote de Faturamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Valor Faturado *</Label>
              <Input type="number" step="0.01" min="0" value={lotForm.billed_value || ""} onChange={(e) => setLotForm(p => ({ ...p, billed_value: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-2">
              <Label>Data do Faturamento *</Label>
              <Input type="date" value={lotForm.billing_date} onChange={(e) => setLotForm(p => ({ ...p, billing_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input value={lotForm.notes} onChange={(e) => setLotForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="rounded-lg bg-muted p-3 text-xs space-y-1">
              <p>Comissão: <strong>{formatCurrency(Math.round((lotForm.billed_value * (Number(order.commission_percent_rep) || 8)) / 100 * 100) / 100)}</strong> ({order.commission_percent_rep || 8}%)</p>
              <p className="text-muted-foreground">Parcelas serão geradas automaticamente com base nos prazos da fábrica.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddLot} disabled={saving || lotForm.billed_value <= 0}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Adicionar Lote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
