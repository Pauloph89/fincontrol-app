import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const FUNNEL_STAGES = [
  { value: "lead", label: "Lead" },
  { value: "contato_realizado", label: "Contato realizado" },
  { value: "apresentacao_feita", label: "Apresentação feita" },
  { value: "negociacao", label: "Negociação" },
  { value: "pedido_enviado", label: "Pedido enviado" },
  { value: "cliente_ativo", label: "Cliente ativo" },
  { value: "perdido", label: "Perdido" },
] as const;

export const CLIENT_CATEGORIES = [
  "Varejo", "Atacado", "Distribuidor", "Construtora",
  "Arquitetura", "Representante", "Supermercado", "Padaria",
  "Restaurante", "Distribuidora", "Indústria", "Papelaria",
  "Farmácia", "Pet Shop", "Outros",
] as const;

export interface Client {
  id: string;
  company_id: string | null;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj_cpf: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  observacoes: string | null;
  vendedor_responsavel: string | null;
  categoria: string | null;
  status_funil: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientFormData {
  razao_social: string;
  nome_fantasia?: string;
  cnpj_cpf?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  observacoes?: string;
  vendedor_responsavel?: string;
  categoria?: string;
  status_funil?: string;
}

export function useClients() {
  const { user, companyId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const clientsQuery = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("razao_social", { ascending: true });
      if (error) throw error;
      return data as Client[];
    },
    enabled: !!user && !!companyId,
  });

  const createClient = useMutation({
    mutationFn: async (form: ClientFormData) => {
      if (!user || !companyId) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("clients")
        .insert({
          company_id: companyId,
          razao_social: form.razao_social,
          nome_fantasia: form.nome_fantasia || null,
          cnpj_cpf: form.cnpj_cpf || null,
          telefone: form.telefone || null,
          email: form.email || null,
          endereco: form.endereco || null,
          cidade: form.cidade || null,
          estado: form.estado || null,
          observacoes: form.observacoes || null,
          vendedor_responsavel: form.vendedor_responsavel || null,
          categoria: form.categoria || 'outros',
          status_funil: form.status_funil || 'lead',
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Cliente cadastrado com sucesso!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao cadastrar cliente", description: err.message, variant: "destructive" });
    },
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, data: updateData }: { id: string; data: Partial<ClientFormData> }) => {
      if (!user || !companyId) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("clients")
        .update(updateData as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Cliente atualizado!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar cliente", description: err.message, variant: "destructive" });
    },
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      if (!user || !companyId) throw new Error("Não autenticado");
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Cliente excluído." });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao excluir cliente", description: err.message, variant: "destructive" });
    },
  });

  return { clientsQuery, createClient, updateClient, deleteClient };
}
