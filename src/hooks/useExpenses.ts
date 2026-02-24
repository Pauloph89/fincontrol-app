import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ExpenseFormData {
  type: string;
  category: string;
  description: string;
  value: number;
  account: string;
  due_date: string;
  payment_date?: string;
}

export function useExpenses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const expensesQuery = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("due_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createExpense = useMutation({
    mutationFn: async (form: ExpenseFormData) => {
      if (!user) throw new Error("Not authenticated");
      const status = form.payment_date ? "pago" : "a_vencer";
      const { error } = await supabase.from("expenses").insert({
        user_id: user.id,
        type: form.type,
        category: form.category,
        description: form.description,
        value: form.value,
        account: form.account,
        due_date: form.due_date,
        payment_date: form.payment_date || null,
        status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "Despesa cadastrada com sucesso!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao cadastrar despesa", description: err.message, variant: "destructive" });
    },
  });

  const markExpensePaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("expenses")
        .update({ status: "pago", payment_date: new Date().toISOString().split("T")[0] })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "Despesa marcada como paga!" });
    },
  });

  return { expensesQuery, createExpense, markExpensePaid };
}
