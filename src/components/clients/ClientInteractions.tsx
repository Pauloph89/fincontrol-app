import { useState } from "react";
import { useClientInteractions, InteractionFormData } from "@/hooks/useClientInteractions";
import { useUserRole } from "@/hooks/useUserRole";
import { formatDate } from "@/lib/financial-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Phone, Mail, MapPin, Handshake, MessageSquare, Loader2 } from "lucide-react";

const INTERACTION_TYPES = [
  { value: "contato", label: "Contato", icon: MessageSquare },
  { value: "ligacao", label: "Ligação", icon: Phone },
  { value: "email", label: "E-mail", icon: Mail },
  { value: "visita", label: "Visita", icon: MapPin },
  { value: "negociacao", label: "Negociação", icon: Handshake },
];

const typeLabels: Record<string, string> = Object.fromEntries(INTERACTION_TYPES.map((t) => [t.value, t.label]));

interface Props {
  clientId: string;
}

export function ClientInteractions({ clientId }: Props) {
  const { interactionsQuery, createInteraction, deleteInteraction } = useClientInteractions(clientId);
  const { canEdit, canDelete } = useUserRole();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<InteractionFormData, "client_id">>({
    type: "contato",
    description: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const interactions = interactionsQuery.data || [];

  const handleSubmit = async () => {
    if (!form.description.trim()) return;
    await createInteraction.mutateAsync({ ...form, client_id: clientId });
    setForm({ type: "contato", description: "", date: new Date().toISOString().split("T")[0], notes: "" });
    setShowForm(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Histórico de Interações</h3>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-1 h-3 w-3" />Registrar
          </Button>
        )}
      </div>

      {showForm && (
        <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/30">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTERACTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="h-8 text-xs" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Descrição *</Label>
            <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="h-8 text-xs" placeholder="Ex: Ligação para acompanhar pedido" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Observações</Label>
            <Textarea value={form.notes || ""} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} className="text-xs" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSubmit} disabled={createInteraction.isPending || !form.description.trim()}>
              {createInteraction.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      )}

      {interactions.length === 0 ? (
        <p className="text-muted-foreground text-xs">Nenhuma interação registrada.</p>
      ) : (
        <div className="max-h-60 overflow-y-auto space-y-2">
          {interactions.map((i) => (
            <div key={i.id} className="flex items-start gap-2 rounded-lg border border-border p-2 text-xs">
              <Badge variant="outline" className="text-[10px] shrink-0">{typeLabels[i.type] || i.type}</Badge>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{i.description}</p>
                {i.notes && <p className="text-muted-foreground mt-0.5">{i.notes}</p>}
                <p className="text-muted-foreground mt-0.5">{formatDate(i.date)}</p>
              </div>
              {canDelete && (
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0" onClick={() => deleteInteraction.mutate(i.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
