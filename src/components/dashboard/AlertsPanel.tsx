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
  commission_late: { icon: AlertCircle, label: "Comissão atrasada", className: "text-destructive", severity: "critical" },
  commission_soon: { icon: Clock, label: "Comissão próxima", className: "text-warning", severity: "warning" },
  expense_late: { icon: AlertCircle, label: "Despesa vencida", className: "text-destructive", severity: "critical" },
  expense_soon: { icon: Clock, label: "Despesa vencendo", className: "text-warning", severity: "warning" },
};

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const criticalCount = alerts.filter((a) => alertConfig[a.type].severity === "critical").length;
  const warningCount = alerts.filter((a) => alertConfig[a.type].severity === "warning").length;

  const commissionAlerts = alerts.filter((a) => a.type.startsWith("commission_"));
  const expenseAlerts = alerts.filter((a) => a.type.startsWith("expense_"));

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

  const renderAlerts = (items: Alert[]) =>
    items.map((alert, i) => {
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
    });

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Alertas ({alerts.length})
        </CardTitle>
        <div className="flex gap-2 mt-1">
          {criticalCount > 0 && <Badge variant="destructive" className="text-[10px]">{criticalCount} crítico(s)</Badge>}
          {warningCount > 0 && <Badge className="text-[10px] bg-warning text-warning-foreground">{warningCount} atenção</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
        {commissionAlerts.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Comissões</p>
            <div className="space-y-1.5">{renderAlerts(commissionAlerts)}</div>
          </div>
        )}
        {expenseAlerts.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Despesas</p>
            <div className="space-y-1.5">{renderAlerts(expenseAlerts)}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
