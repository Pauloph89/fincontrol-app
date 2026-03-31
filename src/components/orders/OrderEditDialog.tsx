import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useOrders, calcCommissions } from "@/hooks/useOrders";
import { useAuditLog } from "@/hooks/useAuditLog";
import { formatCurrency, commissionStatusFlow } from "@/lib/financial-utils";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { History, Loader2 } from "lucide-react";

const BRAZILIAN_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

interface OrderEditDialogProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderEditDialog({ order, open, onOpenChange }: OrderEditDialogProps) {
  const { updateOrder, cancelOrder, reactivateOrder } = useOrders();
  const { logsQuery } = useAuditLog("orders", order?.id);
  const [form, setForm] = useState({
    order_number: "", factory_invoice_number: "", order_date: "", billing_date: "",
    factory: "", client: "", client_cnpj: "", client_city: "", client_state: "",
    salesperson: "", pre_posto: "", commission_base_value: 0, invoice_total_value: 0,
    commission_percent_rep: 8, commission_percent_preposto: 0, observations: "", status: "pedido_enviado",
    order_type: "venda", origin_order_id: "",
  });

  useEffect(() => {
    if (order) {
      setForm({
        order_number: order.order_number || "",
        factory_invoice_number: order.factory_invoice_number || "",
        order_date: order.order_date || "",
        billing_date: order.billing_date || "",
        factory: order.factory || "",
        client: order.client || "",
        client_cnpj: order.client_cnpj || "",
        client_city: order.client_city || "",
        client_state: order.client_state || "",
        salesperson: order.salesperson || "",
        pre_posto: order.pre_posto || "",
        commission_base_value: order.commission_base_value || 0,
        invoice_total_value: order.invoice_total_value || 0,
        commission_percent_rep: order.commission_percent_rep || 8,
        commission_percent_preposto: order.commission_percent_preposto || 0,
        observations: order.observations || "",
        status: order.status || "pedido_enviado",
      });
    }
  }, [order]);

  if (!order) return null;

  const { totalRep, totalPreposto, netRep } = calcCommissions(
    form.commission_base_value, form.commission_percent_rep, form.commission_percent_preposto
  );

  const valueChanged = form.commission_base_value !== order.commission_base_value ||
    form.commission_percent_rep !== order.commission_percent_rep ||
    form.commission_percent_preposto !== order.commission_percent_preposto;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateOrder.mutateAsync({ id: order.id, data: form as any, recalcInstallments: valueChanged });
    onOpenChange(false);
  };

  const auditLogs = logsQuery.data || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar Pedido</DialogTitle></DialogHeader>
        <Tabs defaultValue="edit">
          <TabsList className="w-full">
            <TabsTrigger value="edit" className="flex-1">Editar</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">
              <History className="mr-1 h-3 w-3" />Histórico ({auditLogs.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="edit">
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Nº Pedido</Label>
                  <Input value={form.order_number} onChange={(e) => setForm((p) => ({ ...p, order_number: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>NF da Fábrica</Label>
                  <Input value={form.factory_invoice_number} onChange={(e) => setForm((p) => ({ ...p, factory_invoice_number: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Fábrica</Label>
                  <Input value={form.factory} onChange={(e) => setForm((p) => ({ ...p, factory: e.target.value }))} required />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Input value={form.client} onChange={(e) => setForm((p) => ({ ...p, client: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ Cliente</Label>
                  <Input value={form.client_cnpj} onChange={(e) => setForm((p) => ({ ...p, client_cnpj: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input value={form.client_city} onChange={(e) => setForm((p) => ({ ...p, client_city: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>UF</Label>
                    <Select value={form.client_state || ""} onValueChange={(v) => setForm((p) => ({ ...p, client_state: v }))}>
                      <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                      <SelectContent>
                        {BRAZILIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Data Pedido</Label>
                  <Input type="date" value={form.order_date} onChange={(e) => setForm((p) => ({ ...p, order_date: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Data Faturamento</Label>
                  <Input type="date" value={form.billing_date} onChange={(e) => setForm((p) => ({ ...p, billing_date: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Vendedor</Label>
                  <Input value={form.salesperson} onChange={(e) => setForm((p) => ({ ...p, salesperson: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Pré-posto</Label>
                  <Input value={form.pre_posto} onChange={(e) => setForm((p) => ({ ...p, pre_posto: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Valor Base Comissão</Label>
                  <Input type="number" step="0.01" value={form.commission_base_value || ""} onChange={(e) => setForm((p) => ({ ...p, commission_base_value: parseFloat(e.target.value) || 0 }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Valor Total NF</Label>
                  <Input type="number" step="0.01" value={form.invoice_total_value || ""} onChange={(e) => setForm((p) => ({ ...p, invoice_total_value: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>% Comissão Rep.</Label>
                  <Input type="number" step="0.01" value={form.commission_percent_rep} onChange={(e) => setForm((p) => ({ ...p, commission_percent_rep: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>% Pré-posto</Label>
                  <Input type="number" step="0.01" value={form.commission_percent_preposto} onChange={(e) => setForm((p) => ({ ...p, commission_percent_preposto: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="rounded-lg bg-accent p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Comissão Representante:</span>
                  <span className="font-semibold">{formatCurrency(totalRep)}</span>
                </div>
                {form.commission_percent_preposto > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Pré-posto:</span><span>{formatCurrency(totalPreposto)}</span>
                  </div>
                )}
                {valueChanged && <p className="text-xs text-destructive mt-1">⚠ Parcelas não recebidas serão recalculadas</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {commissionStatusFlow.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea value={form.observations} onChange={(e) => setForm((p) => ({ ...p, observations: e.target.value }))} rows={2} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={updateOrder.isPending}>
                  {updateOrder.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : "Salvar Alterações"}
                </Button>
                {order.status === "cancelado" ? (
                  <Button type="button" variant="outline" onClick={async () => { await reactivateOrder.mutateAsync(order.id); onOpenChange(false); }}>Reativar</Button>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="destructive">Cancelar</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Cancelar pedido?</AlertDialogTitle>
                        <AlertDialogDescription>Parcelas não recebidas serão canceladas.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => { await cancelOrder.mutateAsync(order.id); onOpenChange(false); }} className="bg-destructive text-destructive-foreground">Confirmar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </form>
          </TabsContent>
          <TabsContent value="history" className="pt-2">
            {auditLogs.length === 0 ? (
              <div className="text-center py-8"><div className="text-2xl mb-2">📝</div><p className="text-sm text-muted-foreground">Nenhuma alteração registrada.</p></div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {auditLogs.map((log: any) => (
                  <div key={log.id} className="rounded-lg border p-3 text-xs">
                    <div className="flex justify-between mb-1">
                      <Badge variant="outline">{log.action}</Badge>
                      <span className="text-muted-foreground">{new Date(log.created_at).toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
