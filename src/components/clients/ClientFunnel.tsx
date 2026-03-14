import { useState } from "react";
import { Client, FUNNEL_STAGES } from "@/hooks/useClients";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { normalizeDisplayName, getEffectiveFunnelStatus } from "@/lib/display-utils";

interface Props {
  clients: Client[];
  orders: any[];
  commissions: any[];
  onMoveClient: (clientId: string, newStatus: string) => void;
  onClickClient: (client: Client) => void;
}

const stageColors: Record<string, string> = {
  lead: "bg-muted",
  contato_realizado: "bg-info/10",
  apresentacao_feita: "bg-info/20",
  negociacao: "bg-warning/15",
  pedido_enviado: "bg-success/15",
  cliente_ativo: "bg-success/25",
  perdido: "bg-destructive/10",
};

export function ClientFunnel({ clients, orders, commissions, onMoveClient, onClickClient }: Props) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [hoverStage, setHoverStage] = useState<string | null>(null);

  const getClientsForStage = (stage: string) =>
    clients.filter((c) => (c.status_funil || "lead") === stage);

  const handleDragStart = (e: React.DragEvent, clientId: string) => {
    setDraggedId(clientId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setHoverStage(stage);
  };

  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    if (draggedId) {
      onMoveClient(draggedId, stage);
    }
    setDraggedId(null);
    setHoverStage(null);
  };

  const handleDragLeave = () => setHoverStage(null);
  const handleDragEnd = () => { setDraggedId(null); setHoverStage(null); };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
      {FUNNEL_STAGES.map((stage) => {
        const stageClients = getClientsForStage(stage.value);
        return (
          <div
            key={stage.value}
            className={cn(
              "flex-shrink-0 w-52 rounded-lg border p-2 transition-colors",
              stageColors[stage.value] || "bg-muted",
              hoverStage === stage.value && "ring-2 ring-primary"
            )}
            onDragOver={(e) => handleDragOver(e, stage.value)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.value)}
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-semibold text-foreground truncate">{stage.label}</span>
              <Badge variant="secondary" className="text-xs h-5 min-w-[1.5rem] justify-center">
                {stageClients.length}
              </Badge>
            </div>

            <div className="space-y-1.5 min-h-[60px]">
              {stageClients.map((c) => (
                <Card
                  key={c.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, c.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onClickClient(c)}
                  className={cn(
                    "p-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow border",
                    draggedId === c.id && "opacity-40"
                  )}
                >
                  <p className="text-xs font-medium text-foreground truncate">{c.razao_social}</p>
                  {c.nome_fantasia && (
                    <p className="text-[10px] text-muted-foreground truncate">{c.nome_fantasia}</p>
                  )}
                  {c.cidade && (
                    <p className="text-[10px] text-muted-foreground">{c.cidade}/{c.estado}</p>
                  )}
                  {c.categoria && c.categoria !== "outros" && (
                    <Badge variant="outline" className="text-[9px] h-4 mt-1">{c.categoria}</Badge>
                  )}
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
