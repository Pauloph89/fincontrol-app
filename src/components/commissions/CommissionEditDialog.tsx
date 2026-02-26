import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCommissions } from "@/hooks/useCommissions";
import { useAuditLog } from "@/hooks/useAuditLog";
import { formatCurrency, formatDate } from "@/lib/financial-utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { History, Loader2 } from "lucide-react";

interface CommissionEditDialogProps {
  commission: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommissionEditDialog({ commission, open, onOpenChange }: CommissionEditDialogProps) {
  const { updateCommission, cancelCommission, reactivateCommission } = useCommissions();
  const { logsQuery } = useAuditLog("commissions", commission?.id);
  const [form, setForm] = useState({
    factory: "",
    client: "",
    order_number: "",
    sale_value: 0,
    commission_percent: 8,
    sale_date: "",
    billing_date: "",
    observations: "",
  });

  useEffect(() => {
    if (commission) {
      setForm({
        factory: commission.factory,
        client: commission.client,
        order_number: commission.order_number,
        sale_value: commission.sale_value,
        commission_percent: commission.commission_percent,
        sale_date: commission.sale_date,
        billing_date: commission.billing_date || "",
        observations: commission.observations || "",
      });
    }
  }, [commission]);

  if (!commission) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valueChanged = form.sale_value !== commission.sale_value || form.commission_percent !== commission.commission_percent;
    await updateCommission.mutateAsync({
      id: commission.id,
      data: form as any,
      recalcInstallments: valueChanged,
    });
    onOpenChange(false);
  };

  const handleCancel = async () => {
    await cancelCommission.mutateAsync(commission.id);
    onOpenChange(false);
  };

  const handleReactivate = async () => {
    await reactivateCommission.mutateAsync(commission.id);
    onOpenChange(false);
  };

  const auditLogs = logsQuery.data || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Comissão</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="edit">
          <TabsList className="w-full">
            <TabsTrigger value="edit" className="flex-1">Editar</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">
              <History className="mr-1 h-3 w-3" />
              Histórico ({auditLogs.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="edit">
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fábrica</Label>
                  <Input value={form.factory} onChange={(e) => setForm((p) => ({ ...p, factory: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Input value={form.client} onChange={(e) => setForm((p) => ({ ...p, client: e.target.value }))} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nº Pedido</Label>
                  <Input value={form.order_number} onChange={(e) => setForm((p) => ({ ...p, order_number: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Data da Venda</Label>
                  <Input type="date" value={form.sale_date} onChange={(e) => setForm((p) => ({ ...p, sale_date: e.target.value }))} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Data de Faturamento</Label>
                <Input type="date" value={form.billing_date} onChange={(e) => setForm((p) => ({ ...p, billing_date: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor da Venda</Label>
                  <Input type="number" step="0.01" value={form.sale_value || ""} onChange={(e) => setForm((p) => ({ ...p, sale_value: parseFloat(e.target.value) || 0 }))} required />
                </div>
                <div className="space-y-2">
                  <Label>% Comissão</Label>
                  <Input type="number" step="0.01" value={form.commission_percent} onChange={(e) => setForm((p) => ({ ...p, commission_percent: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="rounded-lg bg-accent p-3 text-sm">
                <span className="font-medium">Nova Comissão Total: </span>
                {formatCurrency((form.sale_value * form.commission_percent) / 100)}
                {(form.sale_value !== commission.sale_value || form.commission_percent !== commission.commission_percent) && (
                  <p className="text-xs text-warning mt-1">⚠ Parcelas não recebidas serão recalculadas</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={form.observations} onChange={(e) => setForm((p) => ({ ...p, observations: e.target.value }))} rows={2} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={updateCommission.isPending}>
                  {updateCommission.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                  ) : "Salvar Alterações"}
                </Button>
                {commission.status === "cancelada" ? (
                  <Button type="button" variant="outline" onClick={handleReactivate} disabled={reactivateCommission.isPending}>
                    Reativar
                  </Button>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="destructive" disabled={cancelCommission.isPending}>
                        Cancelar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar comissão?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Parcelas não recebidas serão canceladas. Você poderá reativar a comissão depois.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground">
                          Confirmar Cancelamento
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </form>
          </TabsContent>
          <TabsContent value="history" className="pt-2">
            {auditLogs.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-2xl mb-2">📝</div>
                <p className="text-sm text-muted-foreground">Nenhuma alteração registrada ainda.</p>
              </div>
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
