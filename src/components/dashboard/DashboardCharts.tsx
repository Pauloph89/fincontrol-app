import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { formatCurrency } from "@/lib/financial-utils";

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

const renderPieLabel = ({ name, percent, x, y, midAngle }: any) => {
  const short = name.length > 10 ? name.slice(0, 10) + "…" : name;
  return (
    <text x={x} y={y} textAnchor={midAngle > 180 ? "end" : "start"} dominantBaseline="central" className="fill-foreground" style={{ fontSize: 9 }}>
      {short} {(percent * 100).toFixed(0)}%
    </text>
  );
};

export function DashboardCharts({ revenueByFactory, expensesByCategory, monthlyEvolution, commissionByVendor, commissionByFactory }: DashboardChartsProps) {
  return (
    <div className="space-y-6">
      {/* Monthly evolution */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Evolução Mensal (12 meses)</CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          {monthlyEvolution.every((m) => m.receitas === 0 && m.despesas === 0) ? (
            <div className="h-[200px] sm:h-[220px] flex items-center justify-center text-muted-foreground text-sm">Sem dados ainda</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={50} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="receitas" name="Receitas" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="despesas" name="Despesas" stroke="hsl(0, 72%, 51%)" strokeWidth={2} dot={false} />
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
              <div className="h-[200px] sm:h-[220px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={revenueByFactory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={50} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
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
          <CardContent className="px-2 sm:px-6">
            {expensesByCategory.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
            ) : (
              <div className="flex flex-col">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={expensesByCategory} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value" label={renderPieLabel} labelLine={{ strokeWidth: 0.5 }}>
                      {expensesByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="max-h-20 overflow-y-auto mt-2 px-2">
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {expensesByCategory.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground whitespace-nowrap">
                        <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="truncate max-w-[120px]">{item.name}</span>
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
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={commissionByVendor} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                  <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={80} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
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
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={commissionByFactory} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                  <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={80} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
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
