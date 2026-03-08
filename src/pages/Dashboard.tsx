import { useMemo, useState } from "react";
import { useCommissions } from "@/hooks/useCommissions";
import { useExpenses } from "@/hooks/useExpenses";
import { useExpenseProjection } from "@/hooks/useExpenseProjection";
import { useOrders } from "@/hooks/useOrders";
import { useUserRole } from "@/hooks/useUserRole";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { PeriodSelector, getDefaultPeriod, PeriodRange } from "@/components/dashboard/PeriodSelector";
import { differenceInBusinessDays, isBefore, startOfDay, addDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/financial-utils";

export default function Dashboard() {
  const { commissionsQuery } = useCommissions();
  const { expensesQuery } = useExpenses();
  const { projections } = useExpenseProjection();
  const { ordersQuery } = useOrders();
  const { role } = useUserRole();
  const [periodKey, setPeriodKey] = useState("current_month");
  const [period, setPeriod] = useState<PeriodRange>(getDefaultPeriod());

  const commissions = commissionsQuery.data || [];
  const expenses = expensesQuery.data || [];
  const orders = (ordersQuery.data || []).filter((o: any) => o.status !== "deleted" && o.status !== "cancelado");

  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const { start, end } = period;

    const ordersInPeriod = orders.filter((o: any) => {
      const d = new Date(o.order_date);
      return d >= start && d <= end;
    });
    const totalSales = ordersInPeriod.reduce((s: number, o: any) => s + Number(o.commission_base_value), 0);
    const totalCommissionExpected = ordersInPeriod.reduce((s: number, o: any) => s + Number(o.commission_total_rep), 0);
    const totalOrdersCount = ordersInPeriod.length;

    const allOrderInstallments = orders.flatMap((o: any) =>
      (o.order_installments || []).map((i: any) => ({ ...i, factory: o.factory, client: o.client, salesperson: o.salesperson }))
    );

    const receivedCommission = allOrderInstallments
      .filter((i: any) => i.status === "recebido" && i.paid_date && new Date(i.paid_date) >= start && new Date(i.paid_date) <= end)
      .reduce((s: number, i: any) => s + Number(i.commission_value_rep || i.value), 0);

    const pendingCommission = allOrderInstallments
      .filter((i: any) => i.status !== "recebido" && i.status !== "cancelado")
      .reduce((s: number, i: any) => s + Number(i.commission_value_rep || i.value), 0);

    const allInstallments = commissions.flatMap((c: any) =>
      (c.commission_installments || []).map((i: any) => ({ ...i, factory: c.factory, client: c.client }))
    );

    const legacyReceived = allInstallments
      .filter((i: any) => i.status === "recebido" && i.paid_date && new Date(i.paid_date) >= start && new Date(i.paid_date) <= end)
      .reduce((sum: number, i: any) => sum + Number(i.value), 0);

    const totalReceived = receivedCommission + legacyReceived;

    const expensesPaidInPeriod = expenses
      .filter((e) => e.status === "pago" && e.payment_date && new Date(e.payment_date) >= start && new Date(e.payment_date) <= end)
      .reduce((sum, e) => sum + Number(e.value), 0);

    const toReceive = pendingCommission + allInstallments
      .filter((i: any) => i.status !== "recebido" && i.status !== "cancelado")
      .reduce((sum: number, i: any) => sum + Number(i.value), 0);

    const realToPay = expenses.filter((e) => e.status !== "pago").reduce((sum, e) => sum + Number(e.value), 0);
    const projectedToPay = projections.filter((p) => new Date(p.due_date) >= today).reduce((sum, p) => sum + p.value, 0);
    const toPay = realToPay + projectedToPay;

    const lateCommissions = [...allOrderInstallments, ...allInstallments]
      .filter((i: any) => i.status !== "recebido" && i.status !== "cancelado" && isBefore(startOfDay(new Date(i.due_date)), today))
      .reduce((sum: number, i: any) => sum + Number(i.value), 0);
    const lateExpenses = expenses
      .filter((e) => e.status !== "pago" && isBefore(startOfDay(new Date(e.due_date)), today))
      .reduce((sum, e) => sum + Number(e.value), 0);
    const inadimplencia = lateCommissions + lateExpenses;

    const in90days = addDays(today, 90);
    const forecast90in = [...allOrderInstallments, ...allInstallments]
      .filter((i: any) => i.status !== "recebido" && i.status !== "cancelado" && new Date(i.due_date) >= today && new Date(i.due_date) <= in90days)
      .reduce((sum: number, i: any) => sum + Number(i.value), 0);
    const forecast90outReal = expenses
      .filter((e) => e.status !== "pago" && new Date(e.due_date) >= today && new Date(e.due_date) <= in90days)
      .reduce((sum, e) => sum + Number(e.value), 0);
    const forecast90outProjected = projections
      .filter((p) => new Date(p.due_date) >= today && new Date(p.due_date) <= in90days)
      .reduce((sum, p) => sum + p.value, 0);
    const forecast90 = forecast90in - forecast90outReal - forecast90outProjected;

    // Alerts
    const alerts: any[] = [];
    [...allOrderInstallments, ...allInstallments].forEach((i: any) => {
      if (i.status === "recebido" || i.status === "cancelado") return;
      const due = startOfDay(new Date(i.due_date));
      if (isBefore(due, today)) {
        alerts.push({ type: "commission_late", description: `${i.factory} - ${i.client} (P${i.installment_number})`, value: Number(i.value), date: i.due_date });
      } else if (differenceInBusinessDays(due, today) <= 3) {
        alerts.push({ type: "commission_soon", description: `${i.factory} - ${i.client} (P${i.installment_number})`, value: Number(i.value), date: i.due_date });
      }
    });
    expenses.forEach((e) => {
      if (e.status === "pago") return;
      const due = startOfDay(new Date(e.due_date));
      if (isBefore(due, today)) {
        alerts.push({ type: "expense_late", description: e.description, value: Number(e.value), date: e.due_date });
      } else if (differenceInBusinessDays(due, today) <= 3) {
        alerts.push({ type: "expense_soon", description: e.description, value: Number(e.value), date: e.due_date });
      }
    });

    // Charts
    const allOrdersForCharts = ordersQuery.data || [];
    const revenueByFactory = Object.entries(
      allOrdersForCharts.reduce((acc: Record<string, number>, o: any) => {
        if (o.status === "deleted" || o.status === "cancelado") return acc;
        acc[o.factory] = (acc[o.factory] || 0) + Number(o.commission_base_value);
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value: value as number })).sort((a, b) => b.value - a.value);

    const expensesByCategory = Object.entries(
      expenses.reduce((acc: Record<string, number>, e) => {
        acc[e.category] = (acc[e.category] || 0) + Number(e.value);
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value: value as number }));

    const monthlyEvolution: { month: string; receitas: number; despesas: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const label = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
      const mRec = [...allOrderInstallments, ...allInstallments]
        .filter((inst: any) => inst.status === "recebido" && inst.paid_date && new Date(inst.paid_date) >= d && new Date(inst.paid_date) <= mEnd)
        .reduce((s: number, inst: any) => s + Number(inst.value), 0);
      const mExp = expenses
        .filter((e) => e.status === "pago" && e.payment_date && new Date(e.payment_date) >= d && new Date(e.payment_date) <= mEnd)
        .reduce((s, e) => s + Number(e.value), 0);
      monthlyEvolution.push({ month: label, receitas: mRec, despesas: mExp });
    }

    // Rankings
    const clientRanking = Object.entries(
      allOrdersForCharts.reduce((acc: Record<string, number>, o: any) => {
        if (o.status === "deleted" || o.status === "cancelado") return acc;
        acc[o.client] = (acc[o.client] || 0) + Number(o.commission_base_value);
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value: value as number })).sort((a, b) => b.value - a.value).slice(0, 10);

    // Commission by vendor
    const commissionByVendor = Object.entries(
      allOrdersForCharts.reduce((acc: Record<string, number>, o: any) => {
        if (o.status === "deleted" || o.status === "cancelado") return acc;
        const vendor = o.salesperson || "Sem vendedor";
        acc[vendor] = (acc[vendor] || 0) + Number(o.commission_total_rep);
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value: value as number })).sort((a, b) => b.value - a.value).slice(0, 10);

    // Commission by factory
    const commissionByFactory = Object.entries(
      allOrdersForCharts.reduce((acc: Record<string, number>, o: any) => {
        if (o.status === "deleted" || o.status === "cancelado") return acc;
        acc[o.factory] = (acc[o.factory] || 0) + Number(o.commission_total_rep);
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value: value as number })).sort((a, b) => b.value - a.value).slice(0, 10);

    // Vendor ranking (by sales)
    const vendorRanking = Object.entries(
      allOrdersForCharts.reduce((acc: Record<string, { vendas: number; comissao: number }>, o: any) => {
        if (o.status === "deleted" || o.status === "cancelado") return acc;
        const vendor = o.salesperson || "Sem vendedor";
        if (!acc[vendor]) acc[vendor] = { vendas: 0, comissao: 0 };
        acc[vendor].vendas += Number(o.commission_base_value);
        acc[vendor].comissao += Number(o.commission_total_rep);
        return acc;
      }, {})
    ).map(([name, data]) => ({ name, ...(data as { vendas: number; comissao: number }) })).sort((a, b) => b.vendas - a.vendas).slice(0, 10);

    return {
      totalSales, totalCommissionExpected, receivedInPeriod: totalReceived,
      expensesPaidInPeriod, toReceive, toPay, inadimplencia, forecast90,
      pendingCommission, totalOrdersCount, alerts, revenueByFactory, expensesByCategory,
      monthlyEvolution, clientRanking, commissionByVendor, commissionByFactory, vendorRanking,
    };
  }, [commissions, expenses, projections, period, orders]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Visão geral financeira e de vendas</p>
        </div>
        <PeriodSelector value={periodKey} onChange={(v, r) => { setPeriodKey(v); setPeriod(r); }} />
      </div>

      {/* Sales KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="glass-card"><CardContent className="p-3">
          <span className="text-[10px] font-medium text-muted-foreground">Vendas do Mês</span>
          <p className="text-sm font-bold text-foreground">{formatCurrency(stats.totalSales)}</p>
        </CardContent></Card>
        <Card className="glass-card"><CardContent className="p-3">
          <span className="text-[10px] font-medium text-muted-foreground">Pedidos do Mês</span>
          <p className="text-sm font-bold text-foreground">{stats.totalOrdersCount}</p>
        </CardContent></Card>
        <Card className="glass-card"><CardContent className="p-3">
          <span className="text-[10px] font-medium text-muted-foreground">Comissão Prevista</span>
          <p className="text-sm font-bold text-info">{formatCurrency(stats.totalCommissionExpected)}</p>
        </CardContent></Card>
        <Card className="glass-card"><CardContent className="p-3">
          <span className="text-[10px] font-medium text-muted-foreground">Comissão Recebida</span>
          <p className="text-sm font-bold text-success">{formatCurrency(stats.receivedInPeriod)}</p>
        </CardContent></Card>
        <Card className="glass-card"><CardContent className="p-3">
          <span className="text-[10px] font-medium text-muted-foreground">Comissão a Receber</span>
          <p className="text-sm font-bold text-warning">{formatCurrency(stats.pendingCommission)}</p>
        </CardContent></Card>
      </div>

      <KpiCards
        revenue={stats.receivedInPeriod}
        expenses={stats.expensesPaidInPeriod}
        toReceive={stats.toReceive}
        toPay={stats.toPay}
        inadimplencia={stats.inadimplencia}
        forecast90={stats.forecast90}
        alerts={stats.alerts.length}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DashboardCharts
            revenueByFactory={stats.revenueByFactory}
            expensesByCategory={stats.expensesByCategory}
            monthlyEvolution={stats.monthlyEvolution}
            commissionByVendor={stats.commissionByVendor}
            commissionByFactory={stats.commissionByFactory}
          />
        </div>
        <div className="space-y-6">
          <AlertsPanel alerts={stats.alerts} />

          {/* Client Ranking */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Top Clientes (por vendas)</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.clientRanking.length === 0 ? (
                <p className="text-muted-foreground text-xs">Sem dados</p>
              ) : (
                <div className="space-y-1.5">
                  {stats.clientRanking.map((c, i) => (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <span className="truncate max-w-[60%]">
                        <span className="text-muted-foreground mr-1">{i + 1}.</span>
                        {c.name}
                      </span>
                      <span className="font-semibold">{formatCurrency(c.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vendor Ranking */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ranking Vendedores</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.vendorRanking.length === 0 ? (
                <p className="text-muted-foreground text-xs">Sem dados</p>
              ) : (
                <div className="space-y-1.5">
                  {stats.vendorRanking.map((v, i) => (
                    <div key={v.name} className="flex items-center justify-between text-xs">
                      <span className="truncate max-w-[45%]">
                        <span className="text-muted-foreground mr-1">{i + 1}.</span>
                        {v.name}
                      </span>
                      <div className="text-right">
                        <span className="font-semibold">{formatCurrency(v.vendas)}</span>
                        <span className="text-muted-foreground ml-1 text-[10px]">({formatCurrency(v.comissao)} com.)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
