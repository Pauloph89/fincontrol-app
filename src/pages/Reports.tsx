import { useState, useMemo } from "react";
import { useCommissions } from "@/hooks/useCommissions";
import { useExpenses } from "@/hooks/useExpenses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReportFilters, ReportFilterValues } from "@/components/reports/ReportFilters";
import { ExportButtons } from "@/components/reports/ExportButtons";
import { formatCurrency, formatDate, getInstallmentStatus, statusLabels } from "@/lib/financial-utils";
import { Loader2 } from "lucide-react";
import { startOfMonth, endOfMonth, isBefore, startOfDay } from "date-fns";

const today = new Date();
const defaultFilters: ReportFilterValues = {
  startDate: startOfMonth(today).toISOString().split("T")[0],
  endDate: endOfMonth(today).toISOString().split("T")[0],
  factory: "all",
  account: "all",
  status: "all",
};

export default function Reports() {
  const { commissionsQuery } = useCommissions();
  const { expensesQuery } = useExpenses();
  const [tab, setTab] = useState("cashflow");
  const [filters, setFilters] = useState<ReportFilterValues>(defaultFilters);

  const commissions = commissionsQuery.data || [];
  const expenses = expensesQuery.data || [];
  const factories = [...new Set(commissions.map((c) => c.factory))].sort();

  const allInstallments = useMemo(() => {
    return commissions
      .filter((c: any) => c.status !== "deleted")
      .flatMap((c: any) =>
        (c.commission_installments || []).map((i: any) => ({
          ...i,
          factory: c.factory,
          client: c.client,
          order_number: c.order_number,
        }))
      );
  }, [commissions]);

  // Filtered installments
  const filteredInstallments = useMemo(() => {
    return allInstallments.filter((i: any) => {
      const dueDate = new Date(i.due_date);
      if (filters.startDate && dueDate < new Date(filters.startDate)) return false;
      if (filters.endDate && dueDate > new Date(filters.endDate)) return false;
      if (filters.factory !== "all" && i.factory !== filters.factory) return false;
      const realStatus = getInstallmentStatus(i.due_date, i.status);
      if (filters.status !== "all" && realStatus !== filters.status) return false;
      return true;
    });
  }, [allInstallments, filters]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const dueDate = new Date(e.due_date);
      if (filters.startDate && dueDate < new Date(filters.startDate)) return false;
      if (filters.endDate && dueDate > new Date(filters.endDate)) return false;
      if (filters.account !== "all" && e.account !== filters.account) return false;
      if (filters.status !== "all") {
        if (filters.status === "pago" && e.status !== "pago") return false;
        if (filters.status === "a_vencer" && e.status === "pago") return false;
      }
      return true;
    });
  }, [expenses, filters]);

  // Cashflow data
  const cashflowData = useMemo(() => {
    const entries: any[] = [];
    filteredInstallments.forEach((i: any) => {
      entries.push({
        date: i.due_date,
        dateFormatted: formatDate(i.due_date),
        type: "Receita",
        description: `${i.factory} - ${i.client} (P${i.installment_number})`,
        value: Number(i.value),
        valueFormatted: formatCurrency(Number(i.value)),
        status: statusLabels[getInstallmentStatus(i.due_date, i.status)] || i.status,
      });
    });
    filteredExpenses.forEach((e) => {
      entries.push({
        date: e.due_date,
        dateFormatted: formatDate(e.due_date),
        type: "Despesa",
        description: e.description,
        value: -Number(e.value),
        valueFormatted: formatCurrency(Number(e.value)),
        status: statusLabels[e.status] || e.status,
      });
    });
    return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredInstallments, filteredExpenses]);

  // Received commissions
  const receivedData = useMemo(() => {
    return filteredInstallments
      .filter((i: any) => i.status === "recebido")
      .map((i: any) => ({
        date: i.paid_date || i.due_date,
        dateFormatted: formatDate(i.paid_date || i.due_date),
        factory: i.factory,
        client: i.client,
        order_number: i.order_number,
        installment: `P${i.installment_number}`,
        value: Number(i.value),
        valueFormatted: formatCurrency(Number(i.value)),
      }));
  }, [filteredInstallments]);

  // Pending commissions
  const pendingData = useMemo(() => {
    return filteredInstallments
      .filter((i: any) => i.status !== "recebido" && i.status !== "cancelado")
      .map((i: any) => ({
        due_date: i.due_date,
        dueDateFormatted: formatDate(i.due_date),
        factory: i.factory,
        client: i.client,
        order_number: i.order_number,
        installment: `P${i.installment_number}`,
        value: Number(i.value),
        valueFormatted: formatCurrency(Number(i.value)),
        status: statusLabels[getInstallmentStatus(i.due_date, i.status)] || i.status,
      }));
  }, [filteredInstallments]);

  // Expenses by category
  const expByCatData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + Number(e.value);
    });
    return Object.entries(map).map(([category, total]) => ({
      category,
      total,
      totalFormatted: formatCurrency(total),
    })).sort((a, b) => b.total - a.total);
  }, [filteredExpenses]);

  // Monthly result
  const monthlyResultData = useMemo(() => {
    const months: Record<string, { receitas: number; despesas: number }> = {};
    filteredInstallments.forEach((i: any) => {
      if (i.status !== "recebido") return;
      const d = new Date(i.paid_date || i.due_date);
      const key = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
      if (!months[key]) months[key] = { receitas: 0, despesas: 0 };
      months[key].receitas += Number(i.value);
    });
    filteredExpenses.forEach((e) => {
      if (e.status !== "pago") return;
      const d = new Date(e.payment_date || e.due_date);
      const key = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
      if (!months[key]) months[key] = { receitas: 0, despesas: 0 };
      months[key].despesas += Number(e.value);
    });
    return Object.entries(months)
      .map(([month, v]) => ({
        month,
        receitas: v.receitas,
        receitasFormatted: formatCurrency(v.receitas),
        despesas: v.despesas,
        despesasFormatted: formatCurrency(v.despesas),
        resultado: v.receitas - v.despesas,
        resultadoFormatted: formatCurrency(v.receitas - v.despesas),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredInstallments, filteredExpenses]);

  if (commissionsQuery.isLoading || expensesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const expenseStatusOptions = [
    { value: "all", label: "Todos" },
    { value: "a_vencer", label: "A Vencer" },
    { value: "pago", label: "Pago" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground text-sm">Análises financeiras com exportação</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full flex-wrap h-auto gap-1">
              <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
              <TabsTrigger value="received">Comissões Recebidas</TabsTrigger>
              <TabsTrigger value="pending">Comissões Pendentes</TabsTrigger>
              <TabsTrigger value="expenses_cat">Despesas por Categoria</TabsTrigger>
              <TabsTrigger value="monthly">Resultado Mensal</TabsTrigger>
            </TabsList>

            {/* Cashflow */}
            <TabsContent value="cashflow" className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <ReportFilters filters={filters} onChange={setFilters} factories={factories} />
                <ExportButtons
                  data={cashflowData}
                  columns={[
                    { key: "dateFormatted", label: "Data" },
                    { key: "type", label: "Tipo" },
                    { key: "description", label: "Descrição" },
                    { key: "valueFormatted", label: "Valor" },
                    { key: "status", label: "Status" },
                  ]}
                  filename="fluxo-de-caixa"
                  title="Fluxo de Caixa"
                />
              </div>
              <ReportTable
                data={cashflowData}
                columns={["dateFormatted", "type", "description", "valueFormatted", "status"]}
                headers={["Data", "Tipo", "Descrição", "Valor", "Status"]}
                emptyMessage="Nenhuma movimentação encontrada no período."
              />
            </TabsContent>

            {/* Received */}
            <TabsContent value="received" className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <ReportFilters filters={filters} onChange={setFilters} factories={factories} showStatus={false} showAccount={false} />
                <ExportButtons
                  data={receivedData}
                  columns={[
                    { key: "dateFormatted", label: "Data" },
                    { key: "factory", label: "Fábrica" },
                    { key: "client", label: "Cliente" },
                    { key: "order_number", label: "Pedido" },
                    { key: "installment", label: "Parcela" },
                    { key: "valueFormatted", label: "Valor" },
                  ]}
                  filename="comissoes-recebidas"
                  title="Comissões Recebidas"
                />
              </div>
              <ReportTable
                data={receivedData}
                columns={["dateFormatted", "factory", "client", "order_number", "installment", "valueFormatted"]}
                headers={["Data", "Fábrica", "Cliente", "Pedido", "Parcela", "Valor"]}
                emptyMessage="Nenhuma comissão recebida no período."
              />
              <TotalRow data={receivedData} valueKey="value" />
            </TabsContent>

            {/* Pending */}
            <TabsContent value="pending" className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <ReportFilters filters={filters} onChange={setFilters} factories={factories} showAccount={false} />
                <ExportButtons
                  data={pendingData}
                  columns={[
                    { key: "dueDateFormatted", label: "Vencimento" },
                    { key: "factory", label: "Fábrica" },
                    { key: "client", label: "Cliente" },
                    { key: "order_number", label: "Pedido" },
                    { key: "installment", label: "Parcela" },
                    { key: "valueFormatted", label: "Valor" },
                    { key: "status", label: "Status" },
                  ]}
                  filename="comissoes-pendentes"
                  title="Comissões Pendentes"
                />
              </div>
              <ReportTable
                data={pendingData}
                columns={["dueDateFormatted", "factory", "client", "order_number", "installment", "valueFormatted", "status"]}
                headers={["Vencimento", "Fábrica", "Cliente", "Pedido", "Parcela", "Valor", "Status"]}
                emptyMessage="Nenhuma comissão pendente no período."
              />
              <TotalRow data={pendingData} valueKey="value" />
            </TabsContent>

            {/* Expenses by Category */}
            <TabsContent value="expenses_cat" className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <ReportFilters
                  filters={filters}
                  onChange={setFilters}
                  factories={factories}
                  showFactory={false}
                  statusOptions={expenseStatusOptions}
                />
                <ExportButtons
                  data={expByCatData}
                  columns={[
                    { key: "category", label: "Categoria" },
                    { key: "totalFormatted", label: "Total" },
                  ]}
                  filename="despesas-por-categoria"
                  title="Despesas por Categoria"
                />
              </div>
              <ReportTable
                data={expByCatData}
                columns={["category", "totalFormatted"]}
                headers={["Categoria", "Total"]}
                emptyMessage="Nenhuma despesa encontrada no período."
              />
              <TotalRow data={expByCatData} valueKey="total" />
            </TabsContent>

            {/* Monthly Result */}
            <TabsContent value="monthly" className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <ReportFilters filters={filters} onChange={setFilters} factories={factories} showStatus={false} />
                <ExportButtons
                  data={monthlyResultData}
                  columns={[
                    { key: "month", label: "Mês" },
                    { key: "receitasFormatted", label: "Receitas" },
                    { key: "despesasFormatted", label: "Despesas" },
                    { key: "resultadoFormatted", label: "Resultado" },
                  ]}
                  filename="resultado-mensal"
                  title="Resultado Mensal"
                />
              </div>
              <ReportTable
                data={monthlyResultData}
                columns={["month", "receitasFormatted", "despesasFormatted", "resultadoFormatted"]}
                headers={["Mês", "Receitas", "Despesas", "Resultado"]}
                emptyMessage="Nenhum resultado no período."
                highlightColumn="resultadoFormatted"
                highlightData={monthlyResultData.map((r) => r.resultado)}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function ReportTable({ data, columns, headers, emptyMessage, highlightColumn, highlightData }: {
  data: any[];
  columns: string[];
  headers: string[];
  emptyMessage: string;
  highlightColumn?: string;
  highlightData?: number[];
}) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-3xl mb-2">📊</div>
        <p className="text-muted-foreground text-sm">{emptyMessage}</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h) => <TableHead key={h}>{h}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, idx) => (
            <TableRow key={idx}>
              {columns.map((col) => (
                <TableCell
                  key={col}
                  className={
                    highlightColumn === col && highlightData
                      ? highlightData[idx] >= 0
                        ? "text-emerald-600 font-semibold"
                        : "text-destructive font-semibold"
                      : ""
                  }
                >
                  {row[col]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TotalRow({ data, valueKey }: { data: any[]; valueKey: string }) {
  const total = data.reduce((s, r) => s + Number(r[valueKey] || 0), 0);
  return (
    <div className="flex justify-end">
      <div className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold">
        Total: {formatCurrency(total)}
      </div>
    </div>
  );
}
