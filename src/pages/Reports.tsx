import { useState, useMemo } from "react";
import { useCommissions } from "@/hooks/useCommissions";
import { useExpenses } from "@/hooks/useExpenses";
import { useOrders } from "@/hooks/useOrders";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReportFilters, ReportFilterValues } from "@/components/reports/ReportFilters";
import { ExportButtons } from "@/components/reports/ExportButtons";
import { formatCurrency, formatDate, getInstallmentStatus, statusLabels } from "@/lib/financial-utils";
import { Loader2 } from "lucide-react";
import { startOfMonth, endOfMonth } from "date-fns";

const today = new Date();
const defaultFilters: ReportFilterValues = {
  startDate: startOfMonth(today).toISOString().split("T")[0],
  endDate: endOfMonth(today).toISOString().split("T")[0],
  factory: "all",
  account: "all",
  status: "all",
  vendor: "all",
};

export default function Reports() {
  const { commissionsQuery } = useCommissions();
  const { expensesQuery } = useExpenses();
  const { ordersQuery } = useOrders();
  const [tab, setTab] = useState("cashflow");
  const [filters, setFilters] = useState<ReportFilterValues>(defaultFilters);

  const commissions = commissionsQuery.data || [];
  const expenses = expensesQuery.data || [];
  const orders = (ordersQuery.data || []).filter((o: any) => o.status !== "deleted");
  const factories = [...new Set([...commissions.map((c) => c.factory), ...orders.map((o: any) => o.factory)])].sort();
  const vendors = [...new Set(orders.map((o: any) => o.salesperson).filter(Boolean))].sort();

  // Commission installments from standalone commissions (NOT linked to orders)
  const standaloneCommissionInstallments = useMemo(() => {
    return commissions
      .filter((c: any) => c.status !== "deleted" && !c.external_order_id)
      .flatMap((c: any) =>
        (c.commission_installments || []).map((i: any) => ({
          ...i, factory: c.factory, client: c.client, order_number: c.order_number, salesperson: null,
        }))
      );
  }, [commissions]);

  // Commission installments from orders (using order_installments with commission values)
  const orderInstallments = useMemo(() => {
    return orders.flatMap((o: any) =>
      (o.order_installments || []).map((i: any) => ({
        ...i,
        factory: o.factory,
        client: o.client,
        order_number: o.order_number,
        salesperson: o.salesperson,
        value: Number(i.commission_value_rep || 0) + Number(i.commission_value_preposto || 0),
      }))
    );
  }, [orders]);

  const combinedInstallments = useMemo(() => [...standaloneCommissionInstallments, ...orderInstallments], [standaloneCommissionInstallments, orderInstallments]);

  const filteredInstallments = useMemo(() => {
    return combinedInstallments.filter((i: any) => {
      const dueDate = new Date(i.due_date);
      if (filters.startDate && dueDate < new Date(filters.startDate)) return false;
      if (filters.endDate && dueDate > new Date(filters.endDate)) return false;
      if (filters.factory !== "all" && i.factory !== filters.factory) return false;
      if (filters.vendor !== "all" && (i.salesperson || "") !== filters.vendor) return false;
      const realStatus = getInstallmentStatus(i.due_date, i.status);
      if (filters.status !== "all" && realStatus !== filters.status) return false;
      return true;
    });
  }, [combinedInstallments, filters]);

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
        date: i.due_date, dateFormatted: formatDate(i.due_date), type: "Receita",
        description: `${i.factory} - ${i.client} (P${i.installment_number})`,
        value: Number(i.value), valueFormatted: formatCurrency(Number(i.value)),
        status: statusLabels[getInstallmentStatus(i.due_date, i.status)] || i.status,
      });
    });
    filteredExpenses.forEach((e) => {
      entries.push({
        date: e.due_date, dateFormatted: formatDate(e.due_date), type: "Despesa",
        description: e.description, value: -Number(e.value), valueFormatted: formatCurrency(Number(e.value)),
        status: statusLabels[e.status] || e.status,
      });
    });
    return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredInstallments, filteredExpenses]);

  const receivedData = useMemo(() => {
    return filteredInstallments
      .filter((i: any) => i.status === "recebido")
      .map((i: any) => ({
        date: i.paid_date || i.due_date, dateFormatted: formatDate(i.paid_date || i.due_date),
        factory: i.factory, client: i.client, order_number: i.order_number,
        salesperson: i.salesperson || "—", installment: `P${i.installment_number}`,
        value: Number(i.value), valueFormatted: formatCurrency(Number(i.value)),
      }));
  }, [filteredInstallments]);

  const pendingData = useMemo(() => {
    return filteredInstallments
      .filter((i: any) => i.status !== "recebido" && i.status !== "cancelado")
      .map((i: any) => ({
        due_date: i.due_date, dueDateFormatted: formatDate(i.due_date),
        factory: i.factory, client: i.client, order_number: i.order_number,
        salesperson: i.salesperson || "—", installment: `P${i.installment_number}`,
        value: Number(i.value), valueFormatted: formatCurrency(Number(i.value)),
        status: statusLabels[getInstallmentStatus(i.due_date, i.status)] || i.status,
      }));
  }, [filteredInstallments]);

  // Sales by vendor
  const salesByVendor = useMemo(() => {
    const filteredOrders = orders.filter((o: any) => {
      const d = new Date(o.order_date);
      if (filters.startDate && d < new Date(filters.startDate)) return false;
      if (filters.endDate && d > new Date(filters.endDate)) return false;
      if (filters.factory !== "all" && o.factory !== filters.factory) return false;
      if (filters.vendor !== "all" && (o.salesperson || "") !== filters.vendor) return false;
      return o.status !== "cancelado";
    });
    const map: Record<string, { pedidos: number; vendas: number; comissao: number }> = {};
    filteredOrders.forEach((o: any) => {
      const v = o.salesperson || "Sem vendedor";
      if (!map[v]) map[v] = { pedidos: 0, vendas: 0, comissao: 0 };
      map[v].pedidos++;
      map[v].vendas += Number(o.commission_base_value);
      map[v].comissao += Number(o.commission_total_rep);
    });
    return Object.entries(map).map(([vendor, d]) => ({
      vendor, pedidos: d.pedidos, vendas: d.vendas, vendasFormatted: formatCurrency(d.vendas),
      comissao: d.comissao, comissaoFormatted: formatCurrency(d.comissao),
    })).sort((a, b) => b.vendas - a.vendas);
  }, [orders, filters]);

  // Sales by client
  const salesByClient = useMemo(() => {
    const filteredOrders = orders.filter((o: any) => {
      const d = new Date(o.order_date);
      if (filters.startDate && d < new Date(filters.startDate)) return false;
      if (filters.endDate && d > new Date(filters.endDate)) return false;
      if (filters.factory !== "all" && o.factory !== filters.factory) return false;
      if (filters.vendor !== "all" && (o.salesperson || "") !== filters.vendor) return false;
      return o.status !== "cancelado";
    });
    const map: Record<string, { pedidos: number; vendas: number; comissao: number }> = {};
    filteredOrders.forEach((o: any) => {
      const c = o.client;
      if (!map[c]) map[c] = { pedidos: 0, vendas: 0, comissao: 0 };
      map[c].pedidos++;
      map[c].vendas += Number(o.commission_base_value);
      map[c].comissao += Number(o.commission_total_rep);
    });
    return Object.entries(map).map(([client, d]) => ({
      client, pedidos: d.pedidos, vendas: d.vendas, vendasFormatted: formatCurrency(d.vendas),
      comissao: d.comissao, comissaoFormatted: formatCurrency(d.comissao),
    })).sort((a, b) => b.vendas - a.vendas);
  }, [orders, filters]);

  // Sales by factory
  const salesByFactory = useMemo(() => {
    const filteredOrders = orders.filter((o: any) => {
      const d = new Date(o.order_date);
      if (filters.startDate && d < new Date(filters.startDate)) return false;
      if (filters.endDate && d > new Date(filters.endDate)) return false;
      if (filters.vendor !== "all" && (o.salesperson || "") !== filters.vendor) return false;
      return o.status !== "cancelado";
    });
    const map: Record<string, { pedidos: number; vendas: number; comissao: number }> = {};
    filteredOrders.forEach((o: any) => {
      if (!map[o.factory]) map[o.factory] = { pedidos: 0, vendas: 0, comissao: 0 };
      map[o.factory].pedidos++;
      map[o.factory].vendas += Number(o.commission_base_value);
      map[o.factory].comissao += Number(o.commission_total_rep);
    });
    return Object.entries(map).map(([factory, d]) => ({
      factory, pedidos: d.pedidos, vendas: d.vendas, vendasFormatted: formatCurrency(d.vendas),
      comissao: d.comissao, comissaoFormatted: formatCurrency(d.comissao),
    })).sort((a, b) => b.vendas - a.vendas);
  }, [orders, filters]);

  const expByCatData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => { map[e.category] = (map[e.category] || 0) + Number(e.value); });
    return Object.entries(map).map(([category, total]) => ({ category, total, totalFormatted: formatCurrency(total) })).sort((a, b) => b.total - a.total);
  }, [filteredExpenses]);

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
    return Object.entries(months).map(([month, v]) => ({
      month, receitas: v.receitas, receitasFormatted: formatCurrency(v.receitas),
      despesas: v.despesas, despesasFormatted: formatCurrency(v.despesas),
      resultado: v.receitas - v.despesas, resultadoFormatted: formatCurrency(v.receitas - v.despesas),
    })).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredInstallments, filteredExpenses]);

  if (commissionsQuery.isLoading || expensesQuery.isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
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
        <p className="text-muted-foreground text-sm">Análises financeiras e comerciais com exportação</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full flex-wrap h-auto gap-1">
              <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
              <TabsTrigger value="received">Comissões Recebidas</TabsTrigger>
              <TabsTrigger value="pending">Comissões Pendentes</TabsTrigger>
              <TabsTrigger value="by_vendor">Vendas por Vendedor</TabsTrigger>
              <TabsTrigger value="by_client">Vendas por Cliente</TabsTrigger>
              <TabsTrigger value="by_factory">Vendas por Fábrica</TabsTrigger>
              <TabsTrigger value="expenses_cat">Despesas</TabsTrigger>
              <TabsTrigger value="monthly">Resultado Mensal</TabsTrigger>
            </TabsList>

            <TabsContent value="cashflow" className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <ReportFilters filters={filters} onChange={setFilters} factories={factories} vendors={vendors} showVendor />
                <ExportButtons data={cashflowData} columns={[
                  { key: "dateFormatted", label: "Data" }, { key: "type", label: "Tipo" },
                  { key: "description", label: "Descrição" }, { key: "valueFormatted", label: "Valor" },
                  { key: "status", label: "Status" },
                ]} filename="fluxo-de-caixa" title="Fluxo de Caixa" />
              </div>
              <ReportTable data={cashflowData} columns={["dateFormatted", "type", "description", "valueFormatted", "status"]}
                headers={["Data", "Tipo", "Descrição", "Valor", "Status"]} emptyMessage="Nenhuma movimentação encontrada." />
              {cashflowData.length > 0 && (() => {
                const totalReceitas = cashflowData.filter(r => r.type === "Receita").reduce((s, r) => s + r.value, 0);
                const totalDespesas = cashflowData.filter(r => r.type === "Despesa").reduce((s, r) => s + Math.abs(r.value), 0);
                return (
                  <div className="flex flex-wrap gap-4 justify-end">
                    <div className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold">Receitas: {formatCurrency(totalReceitas)}</div>
                    <div className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold">Despesas: {formatCurrency(totalDespesas)}</div>
                    <div className={`rounded-lg px-4 py-2 text-sm font-semibold ${totalReceitas - totalDespesas >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      Saldo: {formatCurrency(totalReceitas - totalDespesas)}
                    </div>
                  </div>
                );
              })()}
            </TabsContent>

            <TabsContent value="received" className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <ReportFilters filters={filters} onChange={setFilters} factories={factories} vendors={vendors} showVendor showStatus={false} showAccount={false} />
                <ExportButtons data={receivedData} columns={[
                  { key: "dateFormatted", label: "Data" }, { key: "factory", label: "Fábrica" },
                  { key: "client", label: "Cliente" }, { key: "salesperson", label: "Vendedor" },
                  { key: "order_number", label: "Pedido" }, { key: "installment", label: "Parcela" },
                  { key: "valueFormatted", label: "Valor" },
                ]} filename="comissoes-recebidas" title="Comissões Recebidas" />
              </div>
              <ReportTable data={receivedData} columns={["dateFormatted", "factory", "client", "salesperson", "order_number", "installment", "valueFormatted"]}
                headers={["Data", "Fábrica", "Cliente", "Vendedor", "Pedido", "Parcela", "Valor"]} emptyMessage="Nenhuma comissão recebida." />
              <TotalRow data={receivedData} valueKey="value" />
            </TabsContent>

            <TabsContent value="pending" className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <ReportFilters filters={filters} onChange={setFilters} factories={factories} vendors={vendors} showVendor showAccount={false} />
                <ExportButtons data={pendingData} columns={[
                  { key: "dueDateFormatted", label: "Vencimento" }, { key: "factory", label: "Fábrica" },
                  { key: "client", label: "Cliente" }, { key: "salesperson", label: "Vendedor" },
                  { key: "order_number", label: "Pedido" }, { key: "installment", label: "Parcela" },
                  { key: "valueFormatted", label: "Valor" }, { key: "status", label: "Status" },
                ]} filename="comissoes-pendentes" title="Comissões Pendentes" />
              </div>
              <ReportTable data={pendingData} columns={["dueDateFormatted", "factory", "client", "salesperson", "order_number", "installment", "valueFormatted", "status"]}
                headers={["Vencimento", "Fábrica", "Cliente", "Vendedor", "Pedido", "Parcela", "Valor", "Status"]} emptyMessage="Nenhuma comissão pendente." />
              <TotalRow data={pendingData} valueKey="value" />
            </TabsContent>

            <TabsContent value="by_vendor" className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <ReportFilters filters={filters} onChange={setFilters} factories={factories} vendors={vendors} showVendor showStatus={false} showAccount={false} />
                <ExportButtons data={salesByVendor} columns={[
                  { key: "vendor", label: "Vendedor" }, { key: "pedidos", label: "Pedidos" },
                  { key: "vendasFormatted", label: "Vendas" }, { key: "comissaoFormatted", label: "Comissão" },
                ]} filename="vendas-por-vendedor" title="Vendas por Vendedor" />
              </div>
              <ReportTable data={salesByVendor} columns={["vendor", "pedidos", "vendasFormatted", "comissaoFormatted"]}
                headers={["Vendedor", "Pedidos", "Vendas", "Comissão"]} emptyMessage="Nenhum dado encontrado." />
              <TotalRow data={salesByVendor} valueKey="vendas" />
            </TabsContent>

            <TabsContent value="by_client" className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <ReportFilters filters={filters} onChange={setFilters} factories={factories} vendors={vendors} showVendor showStatus={false} showAccount={false} />
                <ExportButtons data={salesByClient} columns={[
                  { key: "client", label: "Cliente" }, { key: "pedidos", label: "Pedidos" },
                  { key: "vendasFormatted", label: "Vendas" }, { key: "comissaoFormatted", label: "Comissão" },
                ]} filename="vendas-por-cliente" title="Vendas por Cliente" />
              </div>
              <ReportTable data={salesByClient} columns={["client", "pedidos", "vendasFormatted", "comissaoFormatted"]}
                headers={["Cliente", "Pedidos", "Vendas", "Comissão"]} emptyMessage="Nenhum dado encontrado." />
              <TotalRow data={salesByClient} valueKey="vendas" />
            </TabsContent>

            <TabsContent value="by_factory" className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <ReportFilters filters={filters} onChange={setFilters} factories={factories} vendors={vendors} showVendor showStatus={false} showAccount={false} showFactory={false} />
                <ExportButtons data={salesByFactory} columns={[
                  { key: "factory", label: "Fábrica" }, { key: "pedidos", label: "Pedidos" },
                  { key: "vendasFormatted", label: "Vendas" }, { key: "comissaoFormatted", label: "Comissão" },
                ]} filename="vendas-por-fabrica" title="Vendas por Fábrica" />
              </div>
              <ReportTable data={salesByFactory} columns={["factory", "pedidos", "vendasFormatted", "comissaoFormatted"]}
                headers={["Fábrica", "Pedidos", "Vendas", "Comissão"]} emptyMessage="Nenhum dado encontrado." />
              <TotalRow data={salesByFactory} valueKey="vendas" />
            </TabsContent>

            <TabsContent value="expenses_cat" className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <ReportFilters filters={filters} onChange={setFilters} factories={factories} showFactory={false} statusOptions={expenseStatusOptions} />
                <ExportButtons data={expByCatData} columns={[
                  { key: "category", label: "Categoria" }, { key: "totalFormatted", label: "Total" },
                ]} filename="despesas-por-categoria" title="Despesas por Categoria" />
              </div>
              <ReportTable data={expByCatData} columns={["category", "totalFormatted"]} headers={["Categoria", "Total"]} emptyMessage="Nenhuma despesa encontrada." />
              <TotalRow data={expByCatData} valueKey="total" />
            </TabsContent>

            <TabsContent value="monthly" className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <ReportFilters filters={filters} onChange={setFilters} factories={factories} showStatus={false} />
                <ExportButtons data={monthlyResultData} columns={[
                  { key: "month", label: "Mês" }, { key: "receitasFormatted", label: "Receitas" },
                  { key: "despesasFormatted", label: "Despesas" }, { key: "resultadoFormatted", label: "Resultado" },
                ]} filename="resultado-mensal" title="Resultado Mensal" />
              </div>
              <ReportTable data={monthlyResultData} columns={["month", "receitasFormatted", "despesasFormatted", "resultadoFormatted"]}
                headers={["Mês", "Receitas", "Despesas", "Resultado"]} emptyMessage="Nenhum resultado no período."
                highlightColumn="resultadoFormatted" highlightData={monthlyResultData.map((r) => r.resultado)} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function ReportTable({ data, columns, headers, emptyMessage, highlightColumn, highlightData }: {
  data: any[]; columns: string[]; headers: string[]; emptyMessage: string;
  highlightColumn?: string; highlightData?: number[];
}) {
  if (data.length === 0) {
    return <div className="text-center py-12"><div className="text-3xl mb-2">📊</div><p className="text-muted-foreground text-sm">{emptyMessage}</p></div>;
  }
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader><TableRow>{headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
        <TableBody>
          {data.map((row, idx) => (
            <TableRow key={idx}>
              {columns.map((col) => (
                <TableCell key={col} className={
                  highlightColumn === col && highlightData
                    ? highlightData[idx] >= 0 ? "text-emerald-600 font-semibold" : "text-destructive font-semibold"
                    : ""
                }>{row[col]}</TableCell>
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
  return <div className="flex justify-end"><div className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold">Total: {formatCurrency(total)}</div></div>;
}
