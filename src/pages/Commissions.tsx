import { useMemo } from "react";
import { CommissionForm } from "@/components/commissions/CommissionForm";
import { CommissionsList } from "@/components/commissions/CommissionsList";
import { AdelbrasImportDialog } from "@/components/commissions/AdelbrasImportDialog";
import { useCommissions } from "@/hooks/useCommissions";
import { formatCurrency } from "@/lib/financial-utils";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { isBefore, startOfDay, startOfMonth, endOfMonth } from "date-fns";

export default function Commissions() {
  const { commissionsQuery } = useCommissions();
  const commissions = commissionsQuery.data || [];

  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    const allInst = commissions
      .filter((c: any) => c.status !== "deleted" && c.status !== "cancelada")
      .flatMap((c: any) => (c.commission_installments || []));

    const total = allInst.reduce((s: number, i: any) => s + Number(i.value), 0);
    const pending = allInst
      .filter((i: any) => i.status !== "recebido" && i.status !== "cancelado")
      .reduce((s: number, i: any) => s + Number(i.value), 0);
    const late = allInst
      .filter((i: any) => i.status !== "recebido" && i.status !== "cancelado" && isBefore(startOfDay(new Date(i.due_date)), today))
      .reduce((s: number, i: any) => s + Number(i.value), 0);
    const receivedThisMonth = allInst
      .filter((i: any) => i.status === "recebido" && i.paid_date && new Date(i.paid_date) >= monthStart && new Date(i.paid_date) <= monthEnd)
      .reduce((s: number, i: any) => s + Number(i.paid_value ?? i.value), 0);

    return { total, pending, late, receivedThisMonth };
  }, [commissions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comissões</h1>
          <p className="text-muted-foreground text-sm">Gerencie suas comissões e parcelas de recebimento</p>
        </div>
        <div className="flex items-center gap-2">
          <AdelbrasImportDialog />
          <CommissionForm />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground">Total de Comissões</span>
              <DollarSign className="h-3.5 w-3.5 text-foreground" />
            </div>
            <p className="text-sm font-bold">{formatCurrency(stats.total)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground">A Receber</span>
              <Clock className="h-3.5 w-3.5 text-info" />
            </div>
            <p className="text-sm font-bold text-info">{formatCurrency(stats.pending)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground">Em Atraso</span>
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            </div>
            <p className="text-sm font-bold text-destructive">{formatCurrency(stats.late)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground">Recebido no Mês</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            </div>
            <p className="text-sm font-bold text-success">{formatCurrency(stats.receivedThisMonth)}</p>
          </CardContent>
        </Card>
      </div>

      <CommissionsList />
    </div>
  );
}
