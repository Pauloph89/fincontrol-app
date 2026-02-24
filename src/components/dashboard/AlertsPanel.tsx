import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, AlertCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/financial-utils";

interface Alert {
  type: "commission_late" | "commission_soon" | "expense_late" | "expense_soon";
  description: string;
  value: number;
  date: string;
}

interface AlertsPanelProps {
  alerts: Alert[];
}

const alertConfig = {
  commission_late: { icon: AlertCircle, label: "Comissão atrasada", className: "text-destructive" },
  commission_soon: { icon: Clock, label: "Comissão próxima", className: "text-warning" },
  expense_late: { icon: AlertCircle, label: "Despesa vencida", className: "text-destructive" },
  expense_soon: { icon: Clock, label: "Despesa vencendo", className: "text-warning" },
};

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  if (alerts.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Alertas Financeiros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-success text-sm">
            <AlertTriangle className="h-4 w-4" />
            Nenhum alerta ativo
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Alertas Financeiros ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.slice(0, 8).map((alert, i) => {
          const config = alertConfig[alert.type];
          const Icon = config.icon;
          return (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-border/50 p-2.5 text-sm">
              <Icon className={`h-4 w-4 shrink-0 ${config.className}`} />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-muted-foreground">{config.label}</span>
                <p className="truncate font-medium">{alert.description}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-xs">{formatCurrency(alert.value)}</p>
                <p className="text-[10px] text-muted-foreground">{formatDate(alert.date)}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
