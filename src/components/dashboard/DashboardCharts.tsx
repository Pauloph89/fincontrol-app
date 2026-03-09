import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
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

export function DashboardCharts({ revenueByFactory, expensesByCategory, monthlyEvolution, commissionByVendor, commissionByFactory }: DashboardChartsProps) {
  const isMobile = useIsMobile();
  const chartHeight = isMobile ? 220 : 300;
  const pieSize = isMobile ? 220 : 300;
  const pieOuterRadius = isMobile ? 70 : 100;
  const pieInnerRadius = isMobile ? 38 : 55;

  return (
    <div className="space-y-6">
      {/* Monthly evolution */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Evolução Mensal (12 meses)</CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          {monthlyEvolution.every((m) => m.receitas === 0 && m.despesas === 0) ? (
            <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ height: chartHeight }}>Sem dados ainda</div>
          ) : (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <LineChart data={monthlyEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 88%)" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={55} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="receitas" name="Receitas" stroke="hsl(142, 71%, 45%)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="despesas" name="Despesas" stroke="hsl(0, 72%, 51%)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita por Fábrica</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            {revenueByFactory.length === 0 ? (
              <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ height: chartHeight }}>Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={revenueByFactory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={55} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={55} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="value" fill="hsl(215, 76%, 56%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="px-0 sm:px-4">
            {expensesByCategory.length === 0 ? (
              <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ height: chartHeight }}>Sem dados</div>
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
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="max-h-28 overflow-y-auto mt-1 px-3 w-full">
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center">
                    {expensesByCategory.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground whitespace-nowrap">
                        <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="truncate max-w-[140px]">{item.name}</span>
                        <span className="font-medium text-foreground">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Commission charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {commissionByVendor && commissionByVendor.length > 0 && (
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Comissão por Vendedor</CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <ResponsiveContainer width="100%" height={Math.max(chartHeight - 40, commissionByVendor.length * 35 + 30)}>
                <BarChart data={commissionByVendor} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 88%)" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="value" fill="hsl(142, 71%, 45%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {commissionByFactory && commissionByFactory.length > 0 && (
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Comissão por Fábrica</CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <ResponsiveContainer width="100%" height={Math.max(chartHeight - 40, commissionByFactory.length * 35 + 30)}>
                <BarChart data={commissionByFactory} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 88%)" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="value" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
