import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Phone, AlertTriangle, Send, UserCheck } from "lucide-react";
import { differenceInDays, startOfDay } from "date-fns";
import { formatDate } from "@/lib/financial-utils";

interface AgendaTask {
  id: string;
  client: string;
  type: "no_order_90d" | "lead_stale" | "proposal_followup" | "new_lead";
  description: string;
  priority: "high" | "medium" | "low";
  date: string;
}

const taskConfig = {
  no_order_90d: { icon: AlertTriangle, label: "Sem pedido 90+ dias", className: "text-destructive" },
  lead_stale: { icon: Phone, label: "Follow-up necessário", className: "text-warning" },
  proposal_followup: { icon: Send, label: "Retorno proposta", className: "text-info" },
  new_lead: { icon: UserCheck, label: "Novo lead", className: "text-success" },
};

const priorityBadge = {
  high: { label: "Alta", className: "bg-destructive/10 text-destructive border-destructive/20" },
  medium: { label: "Média", className: "bg-warning/10 text-warning border-warning/20" },
  low: { label: "Baixa", className: "bg-info/10 text-info border-info/20" },
};

interface CommercialAgendaProps {
  clients: any[];
  orders: any[];
}

export function CommercialAgenda({ clients, orders }: CommercialAgendaProps) {
  const tasks = useMemo(() => {
    const today = startOfDay(new Date());
    const result: AgendaTask[] = [];

    // Active clients with no order in 90+ days
    const activeClients = clients.filter((c) => c.status_funil === "cliente_ativo");
    activeClients.forEach((client) => {
      const clientOrders = orders.filter(
        (o: any) => (o.client_id === client.id || o.client?.toLowerCase() === client.razao_social?.toLowerCase()) &&
          o.status !== "deleted" && o.status !== "cancelado"
      );
      const lastOrderDate = clientOrders.length > 0
        ? new Date(Math.max(...clientOrders.map((o: any) => new Date(o.order_date).getTime())))
        : null;

      if (lastOrderDate && differenceInDays(today, startOfDay(lastOrderDate)) >= 90) {
        result.push({
          id: `no_order_${client.id}`,
          client: client.razao_social,
          type: "no_order_90d",
          description: `Último pedido há ${differenceInDays(today, startOfDay(lastOrderDate))} dias`,
          priority: "high",
          date: lastOrderDate.toISOString().split("T")[0],
        });
      }
    });

    // Leads/negotiation stale for 7+ days
    const staleStatuses = ["contato_realizado", "apresentacao_feita", "negociacao"];
    clients.filter((c) => staleStatuses.includes(c.status_funil || "")).forEach((client) => {
      const daysSinceUpdate = differenceInDays(today, startOfDay(new Date(client.updated_at)));
      if (daysSinceUpdate >= 7) {
        result.push({
          id: `stale_${client.id}`,
          client: client.razao_social,
          type: "lead_stale",
          description: `Sem atualização há ${daysSinceUpdate} dias`,
          priority: daysSinceUpdate >= 14 ? "high" : "medium",
          date: client.updated_at,
        });
      }
    });

    // Clients with "pedido_enviado" status - follow up
    clients.filter((c) => c.status_funil === "pedido_enviado").forEach((client) => {
      const daysSinceUpdate = differenceInDays(today, startOfDay(new Date(client.updated_at)));
      if (daysSinceUpdate >= 3) {
        result.push({
          id: `proposal_${client.id}`,
          client: client.razao_social,
          type: "proposal_followup",
          description: `Pedido enviado há ${daysSinceUpdate} dias - aguardando retorno`,
          priority: daysSinceUpdate >= 7 ? "high" : "medium",
          date: client.updated_at,
        });
      }
    });

    // New leads (created in last 7 days)
    clients.filter((c) => c.status_funil === "lead").forEach((client) => {
      const daysSinceCreated = differenceInDays(today, startOfDay(new Date(client.created_at)));
      if (daysSinceCreated <= 7) {
        result.push({
          id: `new_${client.id}`,
          client: client.razao_social,
          type: "new_lead",
          description: "Novo lead - realizar primeiro contato",
          priority: "low",
          date: client.created_at,
        });
      }
    });

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return result.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [clients, orders]);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          Agenda Comercial ({tasks.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 max-h-[350px] overflow-y-auto">
        {tasks.length === 0 ? (
          <p className="text-muted-foreground text-xs text-center py-4">Nenhuma tarefa pendente</p>
        ) : (
          tasks.slice(0, 15).map((task) => {
            const config = taskConfig[task.type];
            const Icon = config.icon;
            const badge = priorityBadge[task.priority];
            return (
              <div key={task.id} className="flex items-start gap-2.5 rounded-lg border border-border/50 p-2.5 text-sm">
                <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${config.className}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] text-muted-foreground">{config.label}</span>
                    <Badge variant="outline" className={`text-[9px] px-1 py-0 ${badge.className}`}>{badge.label}</Badge>
                  </div>
                  <p className="truncate font-medium text-xs">{task.client}</p>
                  <p className="text-[10px] text-muted-foreground">{task.description}</p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
