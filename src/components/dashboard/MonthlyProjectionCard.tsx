import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/financial-utils";
import { CalendarCheck, Factory, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FactoryProjection {
  name: string;
  value: number;
}

interface MonthlyProjectionCardProps {
  factoryProjections: FactoryProjection[];
  totalToReceive: number;
  totalFixedCosts: number;
}

export function MonthlyProjectionCard({ factoryProjections, totalToReceive, totalFixedCosts }: MonthlyProjectionCardProps) {
  const surplus = totalToReceive - totalFixedCosts;
  const isPositive = surplus >= 0;
  const monthLabel = format(new Date(), "MMMM/yyyy", { locale: ptBR });

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-primary" />
          Projeção do Mês — {monthLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* By factory */}
        {factoryProjections.length > 0 ? (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Previsão por Fábrica</p>
            {factoryProjections.map((f) => (
              <div key={f.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 truncate max-w-[60%]">
                  <Factory className="h-3 w-3 text-muted-foreground" />
                  {f.name}
                </span>
                <span className="font-semibold">{formatCurrency(f.value)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhuma parcela prevista para este mês</p>
        )}

        {/* Summary */}
        <div className="border-t pt-2 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              Total a Receber
            </span>
            <span className="font-bold text-emerald-600">{formatCurrency(totalToReceive)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <TrendingDown className="h-3 w-3 text-destructive" />
              Custos Fixos do Mês
            </span>
            <span className="font-bold text-destructive">{formatCurrency(totalFixedCosts)}</span>
          </div>
          <div className="border-t pt-1.5 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 font-medium">
              <Minus className="h-3 w-3" />
              Sobra Líquida
            </span>
            <span className={`font-bold ${isPositive ? "text-emerald-600" : "text-destructive"}`}>
              {formatCurrency(surplus)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
