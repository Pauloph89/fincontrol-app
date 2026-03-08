import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ClientInteraction {
  id: string;
  client_id: string;
  company_id: string | null;
  user_id: string;
  type: string;
  description: string;
  date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InteractionFormData {
  client_id: string;
  type: string;
  description: string;
  date: string;
  notes?: string;
}

export function useClientInteractions(clientId?: string) {
  const { user, companyId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const interactionsQuery = useQuery({
    queryKey: ["client-interactions", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_interactions")
        .select("*")
        .eq("client_id", clientId!)
        .order("date", { ascending: false });
      if (error) throw error;
      return data as ClientInteraction[];
    },
    enabled: !!user && !!companyId && !!clientId,
  });

  const createInteraction = useMutation({
    mutationFn: async (form: InteractionFormData) => {
      if (!user || !companyId) throw new Error("Não autenticado");
      const { error } = await supabase.from("client_interactions").insert({
        client_id: form.client_id,
        company_id: companyId,
        user_id: user.id,
        type: form.type,
        description: form.description,
        date: form.date,
        notes: form.notes || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-interactions", clientId] });
      toast({ title: "Interação registrada!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao registrar interação", description: err.message, variant: "destructive" });
    },
  });

  const deleteInteraction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_interactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-interactions", clientId] });
      toast({ title: "Interação removida!" });
    },
  });

  return { interactionsQuery, createInteraction, deleteInteraction };
}
