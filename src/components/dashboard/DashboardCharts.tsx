import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, LabelList } from "recharts";
import { formatCurrency } from "@/lib/financial-utils";
import { useIsMobile } from "@/hooks/use-mobile";

const COLORS = [
  "hsl(215, 76%, 56%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 65%, 60%)",
  "hsl(0, 72%, 51%)",
  "hsl(190, 70%, 50%)",
  "hsl(340, 65%, 55%)",
  "hsl(160, 60%, 45%)",
];

interface DashboardChartsProps {
  revenueByFactory: { name: string; value: number }[];
  expensesByCategory: { name: string; value: number }[];
  monthlyEvolution: { month: string; receitas: number; despesas: number }[];
  commissionByVendor?: { name: string; value: number }[];
  commissionByFactory?: { name: string; value: number }[];
  commissionMonthlyEvolution?: { month: string; recebido: number; previsto: number }[];
}

const RADIAN = Math.PI / 180;
const renderPieLabel = ({ cx, cy, midAngle, outerRadius, name, percent }: any) => {
  if (percent < 0.05) return null;
  const radius = outerRadius + 20;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const short = name.length > 14 ? name.slice(0, 14) + "…" : name;
  return (
    <text x={x} y={y} textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" className="fill-foreground" style={{ fontSize: 11, fontWeight: 500 }}>
      {short} {(percent * 100).toFixed(0)}%
    </text>
  );
};

const formatBarLabel = (v: number) => {
  if (v === 0) return "";
  if (v >= 1000) return `R$${(v / 1000).toFixed(0)}k`;
  return `R$${v.toFixed(0)}`;
};

export function DashboardCharts({ revenueByFactory, expensesByCategory, monthlyEvolution, commissionByVendor, commissionByFactory, commissionMonthlyEvolution }: DashboardChartsProps) {
  const isMobile = useIsMobile();
  // Reduced heights by ~35%
  const chartHeight = isMobile ? 150 : 195;
  const pieSize = isMobile ? 160 : 210;
  const pieOuterRadius = isMobile ? 50 : 72;
  const pieInnerRadius = isMobile ? 28 : 40;

  // Compute current month summary for commission chart
  const currentMonthLabel = commissionMonthlyEvolution
    ? (() => {
        const now = new Date();
        return `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
      })()
    : "";
  const currentMonth = commissionMonthlyEvolution?.find((m) => m.month === currentMonthLabel);
  const cmRecebido = currentMonth?.recebido || 0;
  const cmPrevisto = currentMonth?.previsto || 0;
  const cmTotal = cmRecebido + cmPrevisto;

  // Transform data for grouped bars (add total)
  const groupedCommissionData = commissionMonthlyEvolution?.map((m) => ({
    ...m,
    total: m.recebido + m.previsto,
  }));

  return (
    <div className="space-y-4">
      {/* Commission Monthly Evolution — Grouped Bar */}
      {groupedCommissionData && groupedCommissionData.some((m) => m.recebido > 0 || m.previsto > 0) && (
        <Card className="glass-card">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Evolução Mensal de Comissões</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-4 pb-3">
            {/* Summary cards for current month */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-md border border-border/50 p-2 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Recebido</p>
                <p className="text-sm font-bold" style={{ color: "#3a7d44" }}>{formatCurrency(cmRecebido)}</p>
              </div>
              <div className="rounded-md border border-border/50 p-2 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Previsto</p>
                <p className="text-sm font-bold" style={{ color: "#378add" }}>{formatCurrency(cmPrevisto)}</p>
              </div>
              <div className="rounded-md border border-border/50 p-2 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
                <p className="text-sm font-bold" style={{ color: "#888780" }}>{formatCurrency(cmTotal)}</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart data={groupedCommissionData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 88%)" />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={48} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="recebido" name="Recebido" fill="#3a7d44" radius={[3, 3, 0, 0]}>
                  <LabelList dataKey="recebido" position="top" formatter={formatBarLabel} style={{ fontSize: 8, fill: "#3a7d44" }} />
                </Bar>
                <Bar dataKey="previsto" name="Previsto" fill="#378add" radius={[3, 3, 0, 0]}>
                  <LabelList dataKey="previsto" position="top" formatter={formatBarLabel} style={{ fontSize: 8, fill: "#378add" }} />
                </Bar>
                <Bar dataKey="total" name="Total" fill="#888780" radius={[3, 3, 0, 0]}>
                  <LabelList dataKey="total" position="top" formatter={formatBarLabel} style={{ fontSize: 8, fill: "#888780" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Monthly evolution — Receitas x Despesas */}
      <Card className="glass-card">
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">Evolução Mensal — Receitas × Despesas (12 meses)</CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-4 pb-3">
          {monthlyEvolution.every((m) => m.receitas === 0 && m.despesas === 0) ? (
            <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ height: chartHeight }}>Sem dados ainda</div>
          ) : (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <LineChart data={monthlyEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 88%)" />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={48} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="receitas" name="Receitas" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="despesas" name="Despesas" stroke="hsl(0, 72%, 51%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Pie chart: Expenses by category */}
      <Card className="glass-card">
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">Despesas por Categoria</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-4 pb-3">
          {expensesByCategory.length === 0 ? (
            <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ height: 160 }}>Sem dados</div>
          ) : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={pieSize}>
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={pieInnerRadius}
                    outerRadius={pieOuterRadius}
                    paddingAngle={2}
                    dataKey="value"
                    label={!isMobile ? renderPieLabel : false}
                    labelLine={!isMobile ? { strokeWidth: 0.5, stroke: "hsl(215, 20%, 70%)" } : false}
                  >
                    {expensesByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="max-h-24 overflow-y-auto mt-1 px-3 w-full">
                <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
                  {expensesByCategory.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap">
                      <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="truncate max-w-[120px]">{item.name}</span>
                      <span className="font-medium text-foreground">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commission charts: vendor + factory */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {commissionByVendor && commissionByVendor.length > 0 && (
          <Card className="glass-card">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Comissão por Vendedor</CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-4 pb-3">
              <ResponsiveContainer width="100%" height={Math.max(chartHeight - 30, commissionByVendor.length * 28 + 20)}>
                <BarChart data={commissionByVendor} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 88%)" />
                  <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={80} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="value" fill="hsl(142, 71%, 45%)" radius={[0, 3, 3, 0]}>
                    <LabelList dataKey="value" position="right" formatter={formatBarLabel} style={{ fontSize: 8, fill: "hsl(215, 20%, 40%)" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {commissionByFactory && commissionByFactory.length > 0 && (
          <Card className="glass-card">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Comissão por Fábrica</CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-4 pb-3">
              <ResponsiveContainer width="100%" height={Math.max(chartHeight - 30, commissionByFactory.length * 28 + 20)}>
                <BarChart data={commissionByFactory} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 88%)" />
                  <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={80} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="value" fill="hsl(38, 92%, 50%)" radius={[0, 3, 3, 0]}>
                    <LabelList dataKey="value" position="right" formatter={formatBarLabel} style={{ fontSize: 8, fill: "hsl(215, 20%, 40%)" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
