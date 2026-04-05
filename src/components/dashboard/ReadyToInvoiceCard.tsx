import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/financial-utils";
import { Banknote, Factory } from "lucide-react";
import { addBusinessDays } from "@/lib/date-utils";
import { format } from "date-fns";

interface FactoryReady {
  name: string;
  value: number;
}

interface ReadyToInvoiceCardProps {
  factoryReadyList: FactoryReady[];
  totalReady: number;
}

export function ReadyToInvoiceCard({ factoryReadyList, totalReady }: ReadyToInvoiceCardProps) {
  if (totalReady <= 0) return null;

  const forecastDate = addBusinessDays(new Date(), 5);
  const forecastLabel = format(forecastDate, "dd/MM/yyyy");

  return (
    <Card className="glass-card border-emerald-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Banknote className="h-4 w-4 text-emerald-600" />
          Pronto para Faturar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {factoryReadyList.map((f) => (
          <div key={f.name} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 truncate max-w-[60%]">
              <Factory className="h-3 w-3 text-muted-foreground" />
              {f.name}
            </span>
            <span className="font-semibold">{formatCurrency(f.value)}</span>
          </div>
        ))}
        <div className="border-t pt-1.5 flex items-center justify-between text-sm">
          <span className="font-medium">Total</span>
          <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(totalReady)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Previsão receb.</span>
          <span className="font-bold text-[hsl(215,76%,35%)]">{forecastLabel}</span>
        </div>
      </CardContent>
    </Card>
  );
}
