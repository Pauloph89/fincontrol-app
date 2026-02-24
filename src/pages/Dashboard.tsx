import { useMemo } from "react";
import { useCommissions } from "@/hooks/useCommissions";
import { useExpenses } from "@/hooks/useExpenses";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { differenceInBusinessDays, isBefore, startOfDay, startOfMonth, endOfMonth } from "date-fns";

export default function Dashboard() {
  const { commissionsQuery } = useCommissions();
  const { expensesQuery } = useExpenses();

  const commissions = commissionsQuery.data || [];
  const expenses = expensesQuery.data || [];

  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    // Revenue this month: installments received this month
    const allInstallments = commissions.flatMap((c: any) => 
      (c.commission_installments || []).map((i: any) => ({ ...i, factory: c.factory, client: c.client }))
    );

    const receivedThisMonth = allInstallments
      .filter((i: any) => i.status === "recebido" && i.paid_date && new Date(i.paid_date) >= monthStart && new Date(i.paid_date) <= monthEnd)
      .reduce((sum: number, i: any) => sum + Number(i.value), 0);

    const expensesPaidThisMonth = expenses
      .filter((e) => e.status === "pago" && e.payment_date && new Date(e.payment_date) >= monthStart && new Date(e.payment_date) <= monthEnd)
      .reduce((sum, e) => sum + Number(e.value), 0);

    const toReceive = allInstallments
      .filter((i: any) => i.status !== "recebido")
      .reduce((sum: number, i: any) => sum + Number(i.value), 0);

    const toPay = expenses
      .filter((e) => e.status !== "pago")
      .reduce((sum, e) => sum + Number(e.value), 0);

    // Alerts
    const alerts: any[] = [];
    allInstallments.forEach((i: any) => {
      if (i.status === "recebido") return;
      const due = startOfDay(new Date(i.due_date));
      if (isBefore(due, today)) {
        alerts.push({ type: "commission_late", description: `${i.factory} - ${i.client}`, value: Number(i.value), date: i.due_date });
      } else if (differenceInBusinessDays(due, today) <= 3) {
        alerts.push({ type: "commission_soon", description: `${i.factory} - ${i.client}`, value: Number(i.value), date: i.due_date });
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
    const revenueByFactory = Object.entries(
      commissions.reduce((acc: Record<string, number>, c: any) => {
        acc[c.factory] = (acc[c.factory] || 0) + Number(c.commission_total);
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value: value as number }));

    const expensesByCategory = Object.entries(
      expenses.reduce((acc: Record<string, number>, e) => {
        acc[e.category] = (acc[e.category] || 0) + Number(e.value);
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value: value as number }));

    return { receivedThisMonth, expensesPaidThisMonth, toReceive, toPay, alerts, revenueByFactory, expensesByCategory };
  }, [commissions, expenses]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Visão geral financeira</p>
      </div>

      <KpiCards
        revenue={stats.receivedThisMonth}
        expenses={stats.expensesPaidThisMonth}
        toReceive={stats.toReceive}
        toPay={stats.toPay}
        alerts={stats.alerts.length}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DashboardCharts
            revenueByFactory={stats.revenueByFactory}
            expensesByCategory={stats.expensesByCategory}
          />
        </div>
        <AlertsPanel alerts={stats.alerts} />
      </div>
    </div>
  );
}
