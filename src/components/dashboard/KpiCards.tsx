import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, ArrowDownLeft, ArrowUpRight, ShieldAlert, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/financial-utils";

interface KpiCardsProps {
  revenue: number;
  expenses: number;
  toReceive: number;
  toPay: number;
  inadimplencia: number;
  forecast90: number;
  alerts: number;
}

export function KpiCards({ revenue, expenses, toReceive, toPay, inadimplencia, forecast90, alerts }: KpiCardsProps) {
  const profit = revenue - expenses;
  const cards = [
    { title: "Receita", value: revenue, icon: ArrowDownLeft, color: "text-success" },
    { title: "Despesas", value: expenses, icon: ArrowUpRight, color: "text-destructive" },
    { title: "Lucro Líquido", value: profit, icon: profit >= 0 ? TrendingUp : TrendingDown, color: profit >= 0 ? "text-success" : "text-destructive" },
    { title: "A Receber", value: toReceive, icon: DollarSign, color: "text-info" },
    { title: "A Pagar", value: toPay, icon: DollarSign, color: "text-warning" },
    { title: "Inadimplência", value: inadimplencia, icon: ShieldAlert, color: inadimplencia > 0 ? "text-destructive" : "text-success" },
    { title: "Previsão 90d", value: forecast90, icon: Calendar, color: forecast90 >= 0 ? "text-success" : "text-destructive" },
    { title: "Alertas", value: alerts, icon: AlertTriangle, color: alerts > 0 ? "text-destructive" : "text-muted-foreground", isCurrency: false },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8 gap-3">
      {cards.map((card) => (
        <Card key={card.title} className="glass-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground leading-tight">{card.title}</span>
              <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
            </div>
            <p className="text-sm font-bold">
              {card.isCurrency === false ? card.value : formatCurrency(card.value)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
