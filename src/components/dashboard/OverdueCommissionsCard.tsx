import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/financial-utils";
import { AlertTriangle, Factory } from "lucide-react";

interface FactoryOverdue {
  name: string;
  value: number;
}

interface OverdueCommissionsCardProps {
  factoryOverdues: FactoryOverdue[];
  totalOverdue: number;
  totalToReceive?: number;
}

export function OverdueCommissionsCard({ factoryOverdues, totalOverdue, totalToReceive = 0 }: OverdueCommissionsCardProps) {
  if (totalOverdue <= 0) return null;

  return (
    <Card className="glass-card border-destructive/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Comissões em Atraso
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {factoryOverdues.map((f) => (
          <div key={f.name} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 truncate max-w-[60%]">
              <Factory className="h-3 w-3 text-muted-foreground" />
              {f.name}
            </span>
            <span className="font-semibold text-destructive">{formatCurrency(f.value)}</span>
          </div>
        ))}
        <div className="border-t pt-1.5 flex items-center justify-between text-sm">
          <span className="font-medium">Total Atrasado</span>
          <span className="font-bold text-destructive">{formatCurrency(totalOverdue)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Total Geral Pendente</span>
          <span className="font-bold text-[hsl(215,76%,35%)]">{formatCurrency(totalOverdue + totalToReceive)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
