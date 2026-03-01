import { useMemo, useState } from "react";
import { useCommissions } from "@/hooks/useCommissions";
import { useExpenses } from "@/hooks/useExpenses";
import { useExpenseProjection } from "@/hooks/useExpenseProjection";
import { formatCurrency, formatDate, statusLabels } from "@/lib/financial-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { startOfDay, startOfWeek, startOfMonth, addMonths, format, isSameMonth, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CashFlowEntry {
  date: string;
  description: string;
  type: "entrada" | "saida";
  value: number;
  status: string;
  source: "comissao" | "despesa" | "projecao";
}

export default function CashFlow() {
  const { commissionsQuery } = useCommissions();
  const { expensesQuery } = useExpenses();
  const { projections } = useExpenseProjection();
  const [view, setView] = useState("mensal");

  const commissions = commissionsQuery.data || [];
  const expenses = expensesQuery.data || [];

  const { entries, currentBalance, projectedBalance, riskMonths, monthlyData } = useMemo(() => {
    const today = startOfDay(new Date());
    const allEntries: CashFlowEntry[] = [];

    // Commission installments
    commissions.forEach((c: any) => {
      (c.commission_installments || []).forEach((inst: any) => {
        if (inst.status === "cancelado") return;
        allEntries.push({
          date: inst.paid_date || inst.due_date,
          description: `${c.factory} - ${c.client} (P${inst.installment_number})`,
          type: "entrada",
          value: Number(inst.value),
          status: inst.status === "recebido" ? "recebido" : (isBefore(startOfDay(new Date(inst.due_date)), today) ? "atrasado" : "previsto"),
          source: "comissao",
        });
      });
    });

    // Real expenses
    expenses.forEach((e) => {
      allEntries.push({
        date: e.payment_date || e.due_date,
        description: e.description,
        type: "saida",
        value: Number(e.value),
        status: e.status === "pago" ? "pago" : (isBefore(startOfDay(new Date(e.due_date)), today) ? "vencido" : "a_vencer"),
        source: "despesa",
      });
    });

    // Projected expenses from rules (virtual, future only, exclude duplicates with real)
    const realExpenseKeys = new Set(expenses.map((e) => `${(e as any).generated_from_rule_id}_${e.due_date}`));
    projections.forEach((p) => {
      if (new Date(p.due_date) < today) return;
      if (realExpenseKeys.has(`${p.rule_id}_${p.due_date}`)) return;
      allEntries.push({
        date: p.due_date,
        description: `📋 ${p.name} (projeção)`,
        type: "saida",
        value: p.value,
        status: "projetado",
        source: "projecao",
      });
    });

    allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const received = allEntries.filter((e) => e.type === "entrada" && e.status === "recebido").reduce((s, e) => s + e.value, 0);
    const paid = allEntries.filter((e) => e.type === "saida" && e.status === "pago").reduce((s, e) => s + e.value, 0);
    const currentBalance = received - paid;

    const futureIn = allEntries.filter((e) => e.type === "entrada" && e.status === "previsto").reduce((s, e) => s + e.value, 0);
    const futureOut = allEntries.filter((e) => e.type === "saida" && (e.status === "a_vencer" || e.status === "projetado")).reduce((s, e) => s + e.value, 0);
    const projectedBalance = currentBalance + futureIn - futureOut;

    const months: { month: string; entradas: number; saidas: number; saldo: number }[] = [];
    let runningBalance = currentBalance;
    for (let i = 0; i < 12; i++) {
      const monthStart = startOfMonth(addMonths(today, i));
      const monthLabel = format(monthStart, "MMM/yy", { locale: ptBR });
      const monthEntries = allEntries.filter((e) => isSameMonth(new Date(e.date), monthStart) && new Date(e.date).getFullYear() === monthStart.getFullYear());
      const monthIn = monthEntries.filter((e) => e.type === "entrada").reduce((s, e) => s + e.value, 0);
      const monthOut = monthEntries.filter((e) => e.type === "saida").reduce((s, e) => s + e.value, 0);
      if (i > 0) runningBalance += monthIn - monthOut;
      months.push({ month: monthLabel, entradas: monthIn, saidas: monthOut, saldo: i === 0 ? currentBalance : runningBalance });
    }

    const riskMonths = months.filter((m) => m.saldo < 0).map((m) => m.month);
    return { entries: allEntries, currentBalance, projectedBalance, riskMonths, monthlyData: months };
  }, [commissions, expenses, projections]);

  const groupedEntries = useMemo(() => {
    const groups: Record<string, CashFlowEntry[]> = {};
    entries.forEach((e) => {
      let key: string;
      const d = new Date(e.date);
      if (view === "diario") key = e.date;
      else if (view === "semanal") key = format(startOfWeek(d, { locale: ptBR }), "dd/MM/yyyy");
      else if (view === "mensal") key = format(d, "MMM/yyyy", { locale: ptBR });
      else key = format(d, "yyyy");
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    return groups;
  }, [entries, view]);

  const lateTotal = entries.filter((e) => e.status === "atrasado" || e.status === "vencido").reduce((s, e) => s + e.value, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fluxo de Caixa</h1>
        <p className="text-muted-foreground text-sm">Projeção financeira consolidada (real + projeções de regras)</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Saldo Atual</span>
              <DollarSign className={`h-4 w-4 ${currentBalance >= 0 ? "text-success" : "text-destructive"}`} />
            </div>
            <p className={`text-lg font-bold ${currentBalance >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(currentBalance)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Saldo Projetado</span>
              {projectedBalance >= 0 ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
            </div>
            <p className={`text-lg font-bold ${projectedBalance >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(projectedBalance)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Atrasados</span>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-lg font-bold text-destructive">{formatCurrency(lateTotal)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Meses em Risco</span>
              <AlertTriangle className={`h-4 w-4 ${riskMonths.length > 0 ? "text-warning" : "text-success"}`} />
            </div>
            <p className="text-lg font-bold">{riskMonths.length > 0 ? riskMonths.join(", ") : "Nenhum"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Projeção de Caixa (12 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Area type="monotone" dataKey="saldo" stroke="hsl(215, 76%, 56%)" fill="hsl(215, 76%, 56%)" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Entradas vs Saídas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Line type="monotone" dataKey="entradas" name="Entradas" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="saidas" name="Saídas" stroke="hsl(0, 72%, 51%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Movimentações</CardTitle>
            <Tabs value={view} onValueChange={setView}>
              <TabsList>
                <TabsTrigger value="diario">Diário</TabsTrigger>
                <TabsTrigger value="semanal">Semanal</TabsTrigger>
                <TabsTrigger value="mensal">Mensal</TabsTrigger>
                <TabsTrigger value="anual">Anual</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupedEntries).slice(0, 50).map(([group, items]) => (
                items.map((entry, i) => (
                  <TableRow key={`${group}-${i}`} className={entry.source === "projecao" ? "opacity-60" : ""}>
                    {i === 0 && <TableCell rowSpan={items.length} className="font-medium align-top border-r">{group}</TableCell>}
                    <TableCell>{entry.description}</TableCell>
                    <TableCell>
                      {entry.type === "entrada" ? (
                        <span className="flex items-center gap-1 text-success text-xs"><ArrowDownLeft className="h-3 w-3" /> Entrada</span>
                      ) : (
                        <span className="flex items-center gap-1 text-destructive text-xs"><ArrowUpRight className="h-3 w-3" /> Saída</span>
                      )}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${entry.type === "entrada" ? "text-success" : "text-destructive"}`}>
                      {entry.type === "entrada" ? "+" : "-"}{formatCurrency(entry.value)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${
                        entry.status === "recebido" || entry.status === "pago" ? "status-recebido" :
                        entry.status === "atrasado" || entry.status === "vencido" ? "status-atrasado" :
                        entry.status === "projetado" ? "status-previsto" :
                        "status-previsto"
                      }`}>
                        {entry.status === "projetado" ? "Projetado" : (statusLabels[entry.status] || entry.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
