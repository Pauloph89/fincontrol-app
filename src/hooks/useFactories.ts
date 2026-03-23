import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Factory {
  id: string;
  company_id: string | null;
  nome: string;
  comissao_padrao: number;
  prazo_pagamento: string | null;
  contato_comercial: string | null;
  email_financeiro: string | null;
  politica_comissao: string | null;
  observacoes: string | null;
  telefone: string | null;
  dia_recebimento: number | null;
  created_at: string;
  updated_at: string;
}

export interface FactoryFormData {
  nome: string;
  comissao_padrao: number;
  prazo_pagamento?: string;
  contato_comercial?: string;
  email_financeiro?: string;
  politica_comissao?: string;
  observacoes?: string;
  telefone?: string;
}

export function useFactories() {
  const { user, companyId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const factoriesQuery = useQuery({
    queryKey: ["factories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("factories")
        .select("*")
        .order("nome", { ascending: true });
      if (error) throw error;
      return data as Factory[];
    },
    enabled: !!user && !!companyId,
  });

  const createFactory = useMutation({
    mutationFn: async (form: FactoryFormData) => {
      if (!user || !companyId) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("factories")
        .insert({
          company_id: companyId,
          nome: form.nome,
          comissao_padrao: form.comissao_padrao,
          prazo_pagamento: form.prazo_pagamento || null,
          contato_comercial: form.contato_comercial || null,
          email_financeiro: form.email_financeiro || null,
          politica_comissao: form.politica_comissao || null,
          observacoes: form.observacoes || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["factories"] });
      toast({ title: "Fábrica cadastrada com sucesso!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao cadastrar fábrica", description: err.message, variant: "destructive" });
    },
  });

  const updateFactory = useMutation({
    mutationFn: async ({ id, data: updateData }: { id: string; data: Partial<FactoryFormData> }) => {
      if (!user || !companyId) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("factories")
        .update(updateData as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["factories"] });
      toast({ title: "Fábrica atualizada!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar fábrica", description: err.message, variant: "destructive" });
    },
  });

  const deleteFactory = useMutation({
    mutationFn: async (id: string) => {
      if (!user || !companyId) throw new Error("Não autenticado");
      const { error } = await supabase.from("factories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["factories"] });
      toast({ title: "Fábrica excluída." });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao excluir fábrica", description: err.message, variant: "destructive" });
    },
  });

  return { factoriesQuery, createFactory, updateFactory, deleteFactory };
}
