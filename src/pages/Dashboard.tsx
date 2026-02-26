import { useMemo, useState } from "react";
import { useCommissions } from "@/hooks/useCommissions";
import { useExpenses } from "@/hooks/useExpenses";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { PeriodSelector, getDefaultPeriod, PeriodRange } from "@/components/dashboard/PeriodSelector";
import { differenceInBusinessDays, isBefore, startOfDay, addDays } from "date-fns";

export default function Dashboard() {
  const { commissionsQuery } = useCommissions();
  const { expensesQuery } = useExpenses();
  const [periodKey, setPeriodKey] = useState("current_month");
  const [period, setPeriod] = useState<PeriodRange>(getDefaultPeriod());

  const commissions = commissionsQuery.data || [];
  const expenses = expensesQuery.data || [];

  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const { start, end } = period;

    const allInstallments = commissions.flatMap((c: any) =>
      (c.commission_installments || []).map((i: any) => ({ ...i, factory: c.factory, client: c.client }))
    );

    // Revenue in period
    const receivedInPeriod = allInstallments
      .filter((i: any) => i.status === "recebido" && i.paid_date && new Date(i.paid_date) >= start && new Date(i.paid_date) <= end)
      .reduce((sum: number, i: any) => sum + Number(i.value), 0);

    const expensesPaidInPeriod = expenses
      .filter((e) => e.status === "pago" && e.payment_date && new Date(e.payment_date) >= start && new Date(e.payment_date) <= end)
      .reduce((sum, e) => sum + Number(e.value), 0);

    const toReceive = allInstallments
      .filter((i: any) => i.status !== "recebido" && i.status !== "cancelado")
      .reduce((sum: number, i: any) => sum + Number(i.value), 0);

    const toPay = expenses
      .filter((e) => e.status !== "pago")
      .reduce((sum, e) => sum + Number(e.value), 0);

    // Inadimplência: total atrasado
    const lateCommissions = allInstallments
      .filter((i: any) => i.status !== "recebido" && i.status !== "cancelado" && isBefore(startOfDay(new Date(i.due_date)), today))
      .reduce((sum: number, i: any) => sum + Number(i.value), 0);
    const lateExpenses = expenses
      .filter((e) => e.status !== "pago" && isBefore(startOfDay(new Date(e.due_date)), today))
      .reduce((sum, e) => sum + Number(e.value), 0);
    const inadimplencia = lateCommissions + lateExpenses;

    // Previsão 90 dias
    const in90days = addDays(today, 90);
    const forecast90in = allInstallments
      .filter((i: any) => i.status !== "recebido" && i.status !== "cancelado" && new Date(i.due_date) >= today && new Date(i.due_date) <= in90days)
      .reduce((sum: number, i: any) => sum + Number(i.value), 0);
    const forecast90out = expenses
      .filter((e) => e.status !== "pago" && new Date(e.due_date) >= today && new Date(e.due_date) <= in90days)
      .reduce((sum, e) => sum + Number(e.value), 0);
    const forecast90 = forecast90in - forecast90out;

    // Alerts
    const alerts: any[] = [];
    allInstallments.forEach((i: any) => {
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

    // Monthly evolution (last 12 months) for line chart
    const monthlyEvolution: { month: string; receitas: number; despesas: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const label = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
      const mRec = allInstallments
        .filter((inst: any) => inst.status === "recebido" && inst.paid_date && new Date(inst.paid_date) >= d && new Date(inst.paid_date) <= mEnd)
        .reduce((s: number, inst: any) => s + Number(inst.value), 0);
      const mExp = expenses
        .filter((e) => e.status === "pago" && e.payment_date && new Date(e.payment_date) >= d && new Date(e.payment_date) <= mEnd)
        .reduce((s, e) => s + Number(e.value), 0);
      monthlyEvolution.push({ month: label, receitas: mRec, despesas: mExp });
    }

    return { receivedInPeriod, expensesPaidInPeriod, toReceive, toPay, inadimplencia, forecast90, alerts, revenueByFactory, expensesByCategory, monthlyEvolution };
  }, [commissions, expenses, period]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Visão geral financeira</p>
        </div>
        <PeriodSelector value={periodKey} onChange={(v, r) => { setPeriodKey(v); setPeriod(r); }} />
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

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DashboardCharts
            revenueByFactory={stats.revenueByFactory}
            expensesByCategory={stats.expensesByCategory}
            monthlyEvolution={stats.monthlyEvolution}
          />
        </div>
        <AlertsPanel alerts={stats.alerts} />
      </div>
    </div>
  );
}
