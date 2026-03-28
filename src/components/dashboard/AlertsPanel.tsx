// v2.0 - versão estável - não sobrescrever
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, AlertCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/financial-utils";
import { Badge } from "@/components/ui/badge";

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
  commission_late: { icon: AlertCircle, label: "Comissão atrasada", className: "text-destructive", severity: "critical", order: 0 },
  expense_late: { icon: AlertCircle, label: "Despesa vencida", className: "text-destructive", severity: "critical", order: 1 },
  commission_soon: { icon: Clock, label: "Comissão próxima", className: "text-warning", severity: "warning", order: 2 },
  expense_soon: { icon: Clock, label: "Despesa vencendo", className: "text-warning", severity: "warning", order: 3 },
};

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const criticalCount = alerts.filter((a) => alertConfig[a.type].severity === "critical").length;
  const warningCount = alerts.filter((a) => alertConfig[a.type].severity === "warning").length;

  // Sort by priority: critical first, then warning
  const sorted = [...alerts].sort((a, b) => alertConfig[a.type].order - alertConfig[b.type].order);

  if (alerts.length === 0) {
    return (
      <Card className="glass-card h-full">
        <CardHeader className="pb-2 py-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Alertas Financeiros</CardTitle>
        </CardHeader>
        <CardContent className="pb-3 flex-1">
          <div className="flex items-center gap-2 text-success text-sm">
            <AlertTriangle className="h-4 w-4" />
            Nenhum alerta ativo
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card h-full">
      <CardHeader className="pb-1 py-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Alertas ({alerts.length})
        </CardTitle>
        <div className="flex gap-2 mt-1">
          {criticalCount > 0 && <Badge variant="destructive" className="text-[10px]">{criticalCount} crítico(s)</Badge>}
          {warningCount > 0 && <Badge className="text-[10px] bg-warning text-warning-foreground">{warningCount} atenção</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-1 pb-3">
        {sorted.map((alert, i) => {
          const config = alertConfig[alert.type];
          const Icon = config.icon;
          return (
            <div key={i} className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1.5 text-xs">
              <Icon className={`h-3.5 w-3.5 shrink-0 ${config.className}`} />
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium leading-tight">{alert.description}</p>
              </div>
              <div className="text-right shrink-0">
                {alert.value > 0 && <p className="font-semibold text-[10px]">{formatCurrency(alert.value)}</p>}
                <p className="text-[10px] text-muted-foreground">{formatDate(alert.date)}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
