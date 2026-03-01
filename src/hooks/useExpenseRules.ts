import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ExpenseRule {
  id: string;
  user_id: string;
  name: string;
  category: string;
  value: number;
  account: string;
  recurrence_type: string;
  recurrence_days: number[];
  start_date: string;
  end_date: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseRuleFormData {
  name: string;
  category: string;
  value: number;
  account: string;
  recurrence_type: string;
  recurrence_days: number[];
  start_date: string;
  end_date?: string;
}

export function useExpenseRules() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const rulesQuery = useQuery({
    queryKey: ["expense_rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_rules" as any)
        .select("*")
        .order("name");
      if (error) throw error;
      return (data as any[]) as ExpenseRule[];
    },
    enabled: !!user,
  });

  const createRule = useMutation({
    mutationFn: async (form: ExpenseRuleFormData) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("expense_rules" as any).insert({
        user_id: user.id,
        name: form.name,
        category: form.category,
        value: form.value,
        account: form.account,
        recurrence_type: form.recurrence_type,
        recurrence_days: form.recurrence_days,
        start_date: form.start_date,
        end_date: form.end_date || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_rules"] });
      toast({ title: "Regra de recorrência criada!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao criar regra", description: err.message, variant: "destructive" });
    },
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ExpenseRuleFormData> & { active?: boolean } }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("expense_rules" as any).update(data as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_rules"] });
      toast({ title: "Regra atualizada!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar regra", description: err.message, variant: "destructive" });
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expense_rules" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_rules"] });
      toast({ title: "Regra excluída!" });
    },
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("expense_rules" as any).update({ active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_rules"] });
      toast({ title: "Status da regra alterado!" });
    },
  });

  return { rulesQuery, createRule, updateRule, deleteRule, toggleRule };
}
