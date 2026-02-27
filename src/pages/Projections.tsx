import { useMemo, useState } from "react";
import { useCommissions } from "@/hooks/useCommissions";
import { formatCurrency, formatDate, statusLabels, getInstallmentStatus } from "@/lib/financial-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, AlertTriangle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { startOfDay, addMonths, startOfMonth, endOfMonth, format, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Projections() {
  const { commissionsQuery } = useCommissions();
  const [filterFactory, setFilterFactory] = useState("all");
  const [months, setMonths] = useState(12);

  const commissions = commissionsQuery.data || [];
  const factories = [...new Set(commissions.filter((c: any) => c.status !== "deleted").map((c) => c.factory))].sort();

  const allInstallments = useMemo(() => {
    return commissions
      .filter((c: any) => c.status !== "deleted" && c.status !== "cancelada")
      .filter((c: any) => filterFactory === "all" || c.factory === filterFactory)
      .flatMap((c: any) =>
        (c.commission_installments || []).map((i: any) => ({
          ...i,
          factory: c.factory,
          client: c.client,
          order_number: c.order_number,
        }))
      )
      .filter((i: any) => i.status !== "cancelado");
  }, [commissions, filterFactory]);

  const today = startOfDay(new Date());

  const stats = useMemo(() => {
    const received = allInstallments.filter((i: any) => i.status === "recebido");
    const late = allInstallments.filter((i: any) => i.status !== "recebido" && isBefore(startOfDay(new Date(i.due_date)), today));
    const upcoming = allInstallments.filter((i: any) => i.status !== "recebido" && !isBefore(startOfDay(new Date(i.due_date)), today));

    const totalReceived = received.reduce((s: number, i: any) => s + Number(i.value), 0);
    const totalLate = late.reduce((s: number, i: any) => s + Number(i.value), 0);
    const totalUpcoming = upcoming.reduce((s: number, i: any) => s + Number(i.value), 0);

    return { received, late, upcoming, totalReceived, totalLate, totalUpcoming };
  }, [allInstallments, today]);

  // Monthly chart data
  const monthlyData = useMemo(() => {
    const data: { month: string; previsto: number; recebido: number; atrasado: number }[] = [];
    for (let i = 0; i < months; i++) {
      const monthStart = startOfMonth(addMonths(today, i - 2)); // 2 months back + future
      const monthEnd = endOfMonth(monthStart);
      const label = format(monthStart, "MMM/yy", { locale: ptBR });

      const monthInst = allInstallments.filter((inst: any) => {
        const d = new Date(inst.paid_date || inst.due_date);
        return d >= monthStart && d <= monthEnd;
      });

      const recebido = monthInst.filter((i: any) => i.status === "recebido").reduce((s: number, i: any) => s + Number(i.value), 0);
      const atrasado = monthInst.filter((i: any) => i.status !== "recebido" && isBefore(startOfDay(new Date(i.due_date)), today)).reduce((s: number, i: any) => s + Number(i.value), 0);
      const previsto = monthInst.filter((i: any) => i.status !== "recebido" && !isBefore(startOfDay(new Date(i.due_date)), today)).reduce((s: number, i: any) => s + Number(i.value), 0);

      data.push({ month: label, previsto, recebido, atrasado });
    }
    return data;
  }, [allInstallments, months, today]);

  // Detailed upcoming installments
  const upcomingDetailed = useMemo(() => {
    return [...stats.upcoming, ...stats.late]
      .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [stats]);

  if (commissionsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projeções de Recebimentos</h1>
          <p className="text-muted-foreground text-sm">Quanto a empresa receberá nos próximos meses</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterFactory} onValueChange={setFilterFactory}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Fábrica" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Fábricas</SelectItem>
              {factories.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Total Previsto</span>
              <Clock className="h-4 w-4 text-info" />
            </div>
            <p className="text-lg font-bold text-info">{formatCurrency(stats.totalUpcoming)}</p>
            <p className="text-xs text-muted-foreground">{stats.upcoming.length} parcelas</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Já Recebido</span>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </div>
            <p className="text-lg font-bold text-success">{formatCurrency(stats.totalReceived)}</p>
            <p className="text-xs text-muted-foreground">{stats.received.length} parcelas</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Em Atraso</span>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-lg font-bold text-destructive">{formatCurrency(stats.totalLate)}</p>
            <p className="text-xs text-muted-foreground">{stats.late.length} parcelas</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Total Geral</span>
              <TrendingUp className="h-4 w-4 text-foreground" />
            </div>
            <p className="text-lg font-bold">{formatCurrency(stats.totalReceived + stats.totalUpcoming + stats.totalLate)}</p>
            <p className="text-xs text-muted-foreground">{allInstallments.length} parcelas</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Projeção Mensal de Recebimentos</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="recebido" name="Recebido" fill="hsl(142, 71%, 45%)" stackId="a" />
              <Bar dataKey="previsto" name="Previsto" fill="hsl(215, 76%, 56%)" stackId="a" />
              <Bar dataKey="atrasado" name="Atrasado" fill="hsl(0, 72%, 51%)" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Parcelas Pendentes & Atrasadas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vencimento</TableHead>
                <TableHead>Fábrica</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Parcela</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingDetailed.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma parcela pendente encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                upcomingDetailed.map((inst: any) => {
                  const realStatus = getInstallmentStatus(inst.due_date, inst.status);
                  return (
                    <TableRow key={inst.id}>
                      <TableCell className="font-medium">{formatDate(inst.due_date)}</TableCell>
                      <TableCell>{inst.factory}</TableCell>
                      <TableCell>{inst.client}</TableCell>
                      <TableCell>{inst.order_number}</TableCell>
                      <TableCell>P{inst.installment_number}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(Number(inst.value))}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${realStatus === "atrasado" ? "status-atrasado" : "status-previsto"}`}>
                          {statusLabels[realStatus] || realStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
