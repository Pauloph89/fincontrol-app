import { useMemo, useState } from "react";
import { useCommissions } from "@/hooks/useCommissions";
import { useExpenses } from "@/hooks/useExpenses";
import { useExpenseProjection } from "@/hooks/useExpenseProjection";
import { useOrders } from "@/hooks/useOrders";
import { useClients } from "@/hooks/useClients";
import { useUserRole } from "@/hooks/useUserRole";
import { useFactories } from "@/hooks/useFactories";
import { normalizeDisplayName } from "@/lib/display-utils";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { SalesGoalCard } from "@/components/dashboard/SalesGoalCard";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { CommercialAgenda } from "@/components/dashboard/CommercialAgenda";
import { MonthlyClosingByFactory } from "@/components/dashboard/MonthlyClosingByFactory";
import { MonthlyProjectionCard } from "@/components/dashboard/MonthlyProjectionCard";
import { PeriodSelector, getDefaultPeriod, PeriodRange } from "@/components/dashboard/PeriodSelector";
import { differenceInBusinessDays, isBefore, startOfDay, addDays, startOfMonth, endOfMonth } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/financial-utils";

export default function Dashboard() {
  const { commissionsQuery } = useCommissions();
  const { expensesQuery } = useExpenses();
  const { projections } = useExpenseProjection();
  const { ordersQuery } = useOrders();
  const { clientsQuery } = useClients();
  const { role } = useUserRole();
  const { factoriesQuery } = useFactories();
  const [periodKey, setPeriodKey] = useState("current_month");
  const [period, setPeriod] = useState<PeriodRange>(getDefaultPeriod());

  const commissions = commissionsQuery.data || [];
  const expenses = expensesQuery.data || [];
  const orders = (ordersQuery.data || []).filter((o: any) => o.status !== "deleted" && o.status !== "cancelado");
  const clients = clientsQuery.data || [];

  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const { start, end } = period;

    // --- SALES metrics from orders ---
    const ordersInPeriod = orders.filter((o: any) => {
      const d = new Date(o.order_date);
      return d >= start && d <= end;
    });
    const totalSales = ordersInPeriod.reduce((s: number, o: any) => s + Number(o.commission_base_value), 0);
    const totalCommissionExpected = ordersInPeriod.reduce((s: number, o: any) => s + Number(o.commission_total_rep), 0);
    const totalOrdersCount = ordersInPeriod.length;

    // --- COMMISSION metrics from commission_installments ONLY ---
    const allCommissionInstallments = commissions
      .filter((c: any) => c.status !== "deleted" && c.status !== "cancelada")
      .flatMap((c: any) =>
        (c.commission_installments || []).map((i: any) => ({
          ...i,
          factory: c.factory,
          client: c.client,
        }))
      );

    const receivedCommission = allCommissionInstallments
      .filter((i: any) => i.status === "recebido" && i.paid_date && new Date(i.paid_date) >= start && new Date(i.paid_date) <= end)
      .reduce((s: number, i: any) => s + Number(i.value), 0);

    const pendingCommission = allCommissionInstallments
      .filter((i: any) => i.status !== "recebido" && i.status !== "cancelado")
      .reduce((s: number, i: any) => s + Number(i.value), 0);

    const expensesPaidInPeriod = expenses
      .filter((e) => e.status === "pago" && e.payment_date && new Date(e.payment_date) >= start && new Date(e.payment_date) <= end)
      .reduce((sum, e) => sum + Number(e.value), 0);

    const expensesFixaInPeriod = expenses
      .filter((e) => e.status === "pago" && e.payment_date && new Date(e.payment_date) >= start && new Date(e.payment_date) <= end && e.type === "fixa")
      .reduce((sum, e) => sum + Number(e.value), 0);

    const expensesVarInPeriod = expenses
      .filter((e) => e.status === "pago" && e.payment_date && new Date(e.payment_date) >= start && new Date(e.payment_date) <= end && e.type !== "fixa")
      .reduce((sum, e) => sum + Number(e.value), 0);

    const toReceive = pendingCommission;

    // A Pagar: only real unpaid expenses due in current month or overdue + projected for current month
    const currentMonthStart = startOfMonth(today);
    const currentMonthEnd = endOfMonth(today);
    const realToPay = expenses
      .filter((e) => e.status !== "pago" && (isBefore(startOfDay(new Date(e.due_date)), today) || (new Date(e.due_date) >= currentMonthStart && new Date(e.due_date) <= currentMonthEnd)))
      .reduce((sum, e) => sum + Number(e.value), 0);
    const projectedToPay = projections
      .filter((p) => {
        const due = new Date(p.due_date);
        return due >= currentMonthStart && due <= currentMonthEnd;
      })
      .reduce((sum, p) => sum + p.value, 0);
    // Deduplicate projected vs real
    const realExpenseKeys = new Set<string>();
    expenses.forEach((e) => {
      const mk = e.due_date.substring(0, 7);
      realExpenseKeys.add(`${e.description.trim().toLowerCase()}_${mk}`);
    });
    const deduplicatedProjectedToPay = projections
      .filter((p) => {
        const due = new Date(p.due_date);
        if (due < currentMonthStart || due > currentMonthEnd) return false;
        const mk = p.due_date.substring(0, 7);
        return !realExpenseKeys.has(`${p.name.trim().toLowerCase()}_${mk}`);
      })
      .reduce((sum, p) => sum + p.value, 0);
    const toPay = realToPay + deduplicatedProjectedToPay;

    const lateCommissions = allCommissionInstallments
      .filter((i: any) => i.status !== "recebido" && i.status !== "cancelado" && isBefore(startOfDay(new Date(i.due_date)), today))
      .reduce((sum: number, i: any) => sum + Number(i.value), 0);

    // Inadimplência: only commission installments overdue by 30+ days (not expenses)
    const thirtyDaysAgo = addDays(today, -30);
    const inadimplencia = allCommissionInstallments
      .filter((i: any) => i.status !== "recebido" && i.status !== "cancelado" && isBefore(startOfDay(new Date(i.due_date)), thirtyDaysAgo))
      .reduce((sum: number, i: any) => sum + Number(i.value), 0);

    // Forecast next 30 and 90 days
    const in30days = addDays(today, 30);
    const in90days = addDays(today, 90);

    const forecast30commission = allCommissionInstallments
      .filter((i: any) => i.status !== "recebido" && i.status !== "cancelado" && new Date(i.due_date) >= today && new Date(i.due_date) <= in30days)
      .reduce((sum: number, i: any) => sum + Number(i.value), 0);

    const forecast90 = allCommissionInstallments
      .filter((i: any) => i.status !== "recebido" && i.status !== "cancelado" && new Date(i.due_date) >= today && new Date(i.due_date) <= in90days)
      .reduce((sum: number, i: any) => sum + Number(i.value), 0);

    // Alerts — from commission_installments + expenses + recurring projections
    const alerts: any[] = [];
    const in7days = addDays(today, 7);

    allCommissionInstallments.forEach((i: any) => {
      if (i.status === "recebido" || i.status === "cancelado") return;
      const due = startOfDay(new Date(i.due_date));
      if (isBefore(due, today)) {
        alerts.push({ type: "commission_late", description: `${i.factory} - ${normalizeDisplayName(i.client)} (P${i.installment_number})`, value: Number(i.value), date: i.due_date });
      } else if (differenceInBusinessDays(due, today) <= 3) {
        alerts.push({ type: "commission_soon", description: `${i.factory} - ${normalizeDisplayName(i.client)} (P${i.installment_number})`, value: Number(i.value), date: i.due_date });
      }
    });

    // Real expense alerts
    expenses.forEach((e) => {
      if (e.status === "pago") return;
      const due = startOfDay(new Date(e.due_date));
      if (isBefore(due, today)) {
        alerts.push({ type: "expense_late", description: e.description, value: Number(e.value), date: e.due_date });
      } else if (due <= in7days) {
        alerts.push({ type: "expense_soon", description: e.description, value: Number(e.value), date: e.due_date });
      }
    });

    // Recurring projection alerts — only for next 7 days or overdue, deduplicated against real expenses
    const realExpenseDescMonthKeys = new Set<string>();
    expenses.forEach((e) => {
      const monthKey = e.due_date.substring(0, 7);
      realExpenseDescMonthKeys.add(`${e.description.trim().toLowerCase()}_${monthKey}`);
    });

    projections.forEach((p) => {
      const due = startOfDay(new Date(p.due_date));
      // Only alert for overdue or within 7 days
      if (due > in7days) return;
      // Skip if already covered by a real expense
      const monthKey = p.due_date.substring(0, 7);
      if (realExpenseDescMonthKeys.has(`${p.name.trim().toLowerCase()}_${monthKey}`)) return;

      if (isBefore(due, today)) {
        alerts.push({ type: "expense_late", description: `🔄 ${p.name}`, value: p.value, date: p.due_date });
      } else {
        alerts.push({ type: "expense_soon", description: `🔄 ${p.name}`, value: p.value, date: p.due_date });
      }
    });

    // Idle clients alert (no order in 90+ days)
    const idleClients = clients.filter((c) => {
      if (c.status_funil !== "cliente_ativo") return false;
      const clientOrders = orders.filter(
        (o: any) => (o.client_id === c.id || o.client?.toLowerCase() === c.razao_social?.toLowerCase())
      );
      if (clientOrders.length === 0) return false;
      const lastOrder = new Date(Math.max(...clientOrders.map((o: any) => new Date(o.order_date).getTime())));
      return differenceInBusinessDays(today, startOfDay(lastOrder)) >= 90;
    });

    idleClients.forEach((c) => {
      alerts.push({ type: "commission_soon", description: `${normalizeDisplayName(c.razao_social)} — sem pedido há 90+ dias`, value: 0, date: c.updated_at });
    });

    // Stale leads alert
    const staleLeads = clients.filter((c) => {
      const staleStatuses = ["negociacao", "apresentacao_feita"];
      if (!staleStatuses.includes(c.status_funil || "")) return false;
      const daysSince = differenceInBusinessDays(today, startOfDay(new Date(c.updated_at)));
      return daysSince >= 14;
    });

    staleLeads.forEach((c) => {
      alerts.push({ type: "commission_soon", description: `Lead parado: ${normalizeDisplayName(c.razao_social)}`, value: 0, date: c.updated_at });
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
      const mRec = allCommissionInstallments
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

    // Commission by factory ranking
    const commissionByFactory = Object.entries(
      allOrdersForCharts.reduce((acc: Record<string, number>, o: any) => {
        if (o.status === "deleted" || o.status === "cancelado") return acc;
        acc[o.factory] = (acc[o.factory] || 0) + Number(o.commission_total_rep);
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value: value as number })).sort((a, b) => b.value - a.value).slice(0, 10);

    // Vendor ranking
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
      totalSales, totalCommissionExpected, receivedInPeriod: receivedCommission,
      expensesPaidInPeriod, expensesFixaInPeriod, expensesVarInPeriod,
      toReceive, toPay, inadimplencia, forecast90,
      pendingCommission, totalOrdersCount, alerts, revenueByFactory, expensesByCategory,
      monthlyEvolution, clientRanking, commissionByVendor, commissionByFactory, vendorRanking,
      forecast30commission, lateCommissions,
    };
  }, [commissions, expenses, projections, period, orders, clients]);

  // Count leads
  const leadsCount = clients.filter((c) => c.status_funil === "lead" || c.status_funil === "contato_realizado" || c.status_funil === "negociacao").length;

  // Sales goal data
  const currentMonthSales = useMemo(() => {
    const now = new Date();
    const mStart = startOfMonth(now);
    const mEnd = endOfMonth(now);
    return orders
      .filter((o: any) => {
        const d = new Date(o.order_date);
        return d >= mStart && d <= mEnd;
      })
      .reduce((s: number, o: any) => s + Number(o.commission_base_value), 0);
  }, [orders]);

  const negotiationValue = useMemo(() => {
    return orders
      .filter((o: any) => {
        const client = clients.find((c) =>
          c.id === o.client_id || c.razao_social?.toLowerCase() === o.client?.toLowerCase()
        );
        return client?.status_funil === "negociacao";
      })
      .reduce((s: number, o: any) => s + Number(o.commission_base_value), 0);
  }, [orders, clients]);

  // Monthly projection card data
  const monthlyProjection = useMemo(() => {
    const now = new Date();
    const mStart = startOfMonth(now);
    const mEnd = endOfMonth(now);

    const allInstallments = commissions
      .filter((c: any) => c.status !== "deleted" && c.status !== "cancelada")
      .flatMap((c: any) =>
        (c.commission_installments || []).map((i: any) => ({ ...i, factory: c.factory }))
      );

    const monthInstallments = allInstallments.filter(
      (i: any) => i.status !== "recebido" && i.status !== "cancelado" && new Date(i.due_date) >= mStart && new Date(i.due_date) <= mEnd
    );

    const byFactory: Record<string, number> = {};
    monthInstallments.forEach((i: any) => {
      byFactory[i.factory] = (byFactory[i.factory] || 0) + Number(i.value);
    });
    const factoryProjections = Object.entries(byFactory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const totalToReceive = factoryProjections.reduce((s, f) => s + f.value, 0);

    // Fixed costs: real unpaid expenses + deduplicated projections for current month
    const realUnpaid = expenses
      .filter((e) => e.status !== "pago" && new Date(e.due_date) >= mStart && new Date(e.due_date) <= mEnd)
      .reduce((s, e) => s + Number(e.value), 0);

    const realKeys = new Set<string>();
    expenses.forEach((e) => {
      const mk = e.due_date.substring(0, 7);
      realKeys.add(`${e.description.trim().toLowerCase()}_${mk}`);
    });
    const projCosts = projections
      .filter((p) => {
        const due = new Date(p.due_date);
        if (due < mStart || due > mEnd) return false;
        const mk = p.due_date.substring(0, 7);
        return !realKeys.has(`${p.name.trim().toLowerCase()}_${mk}`);
      })
      .reduce((s, p) => s + p.value, 0);

    const totalFixedCosts = realUnpaid + projCosts;

    return { factoryProjections, totalToReceive, totalFixedCosts };
  }, [commissions, expenses, projections]);

  // Commission monthly evolution for dedicated chart
  const commissionMonthlyEvolution = useMemo(() => {
    const today = new Date();
    const allCommissionInstallments = commissions
      .filter((c: any) => c.status !== "deleted" && c.status !== "cancelada")
      .flatMap((c: any) => (c.commission_installments || []));

    const months: { month: string; recebido: number; previsto: number }[] = [];
    for (let i = 5; i >= -3; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const label = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

      const recebido = allCommissionInstallments
        .filter((inst: any) => inst.status === "recebido" && inst.paid_date && new Date(inst.paid_date) >= d && new Date(inst.paid_date) <= mEnd)
        .reduce((s: number, inst: any) => s + Number(inst.value), 0);

      const previsto = allCommissionInstallments
        .filter((inst: any) => inst.status !== "recebido" && inst.status !== "cancelado" && new Date(inst.due_date) >= d && new Date(inst.due_date) <= mEnd)
        .reduce((s: number, inst: any) => s + Number(inst.value), 0);

      months.push({ month: label, recebido, previsto });
    }
    return months;
  }, [commissions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Visão geral financeira e de vendas</p>
        </div>
        <PeriodSelector value={periodKey} onChange={(v, r) => { setPeriodKey(v); setPeriod(r); }} />
      </div>

      <KpiCards
        revenue={stats.receivedInPeriod}
        expenses={stats.expensesPaidInPeriod}
        expensesFixa={stats.expensesFixaInPeriod}
        expensesVariavel={stats.expensesVarInPeriod}
        toReceive={stats.toReceive}
        toPay={stats.toPay}
        inadimplencia={stats.inadimplencia}
        forecast90={stats.forecast90}
        alerts={stats.alerts.length}
        totalSales={stats.totalSales}
        totalOrdersCount={stats.totalOrdersCount}
        leadsCount={leadsCount}
        commissionExpected={stats.totalCommissionExpected}
        commissionReceived={stats.receivedInPeriod}
        forecast30={stats.forecast30commission}
        lateCommissions={stats.lateCommissions}
      />

      <SalesGoalCard currentSales={currentMonthSales} negotiationValue={negotiationValue} />

      <MonthlyClosingByFactory
        factories={factoriesQuery.data || []}
        commissions={commissions}
        orders={orders}
      />

      <MonthlyProjectionCard
        factoryProjections={monthlyProjection.factoryProjections}
        totalToReceive={monthlyProjection.totalToReceive}
        totalFixedCosts={monthlyProjection.totalFixedCosts}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[62%_38%] gap-6">
        <div className="space-y-6">
          <DashboardCharts
            revenueByFactory={stats.revenueByFactory}
            expensesByCategory={stats.expensesByCategory}
            monthlyEvolution={stats.monthlyEvolution}
            commissionByVendor={stats.commissionByVendor}
            commissionByFactory={stats.commissionByFactory}
            commissionMonthlyEvolution={commissionMonthlyEvolution}
          />
        </div>
        <div className="space-y-4">
          <AlertsPanel alerts={stats.alerts} />
          <CommercialAgenda clients={clients} orders={orders} />
        </div>
      </div>

      {/* Bottom section: rankings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        {/* Revenue by Factory - moved here */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita por Fábrica</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.revenueByFactory.length === 0 ? (
              <p className="text-muted-foreground text-xs">Sem dados</p>
            ) : (
              <div className="space-y-1.5">
                {stats.revenueByFactory.slice(0, 10).map((f, i) => (
                  <div key={f.name} className="flex items-center justify-between text-xs">
                    <span className="truncate max-w-[60%]">
                      <span className="text-muted-foreground mr-1">{i + 1}.</span>
                      {f.name}
                    </span>
                    <span className="font-semibold">{formatCurrency(f.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
